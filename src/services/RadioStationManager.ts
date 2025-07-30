
'use client';

import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { playlistManagerService } from './PlaylistManagerService';
import { stationService } from './StationService';
import type { Station, PlaylistItem, DJCharacter, CustomDJCharacter, User } from '@/lib/types';
import { generatePlaylist } from '@/ai/flows/generate-playlist-flow';
import { getRandomPlexTracks } from '@/lib/plex';

export interface CreateStationData {
  name: string;
  frequency: number;
  djCharacterId: string;
  theme: string;
  ownerId: string;
  isActive?: boolean;
  tags?: string[];
  description?: string;
}

export interface UpdateStationData {
  name?: string;
  frequency?: number;
  djCharacterId?: string;
  theme?: string;
  isActive?: boolean;
  tags?: string[];
  description?: string;
  playlist?: PlaylistItem[];
}

export interface StationFilters {
  ownerId?: string;
  isActive?: boolean;
  frequency?: { min: number; max: number };
  tags?: string[];
  searchTerm?: string;
}

export interface StationStats {
  totalStations: number;
  activeStations: number;
  userStations: number;
  systemStations: number;
  frequencyRange: { min: number; max: number };
  averagePlaylistLength: number;
  mostUsedDJs: Array<{ djId: string; count: number }>;
}

/**
 * Service complet de gestion CRUD des stations radio
 * Fonctionnalités:
 * - Création, modification, suppression des stations
 * - Validation des fréquences et des données
 * - Gestion des playlists intégrée
 * - Statistiques et analytics
 * - Filtrage et recherche avancés
 * - Gestion des conflits de fréquence
 */
export class RadioStationManager {
  private static instance: RadioStationManager | null = null;

  static getInstance(): RadioStationManager {
    if (!RadioStationManager.instance) {
      RadioStationManager.instance = new RadioStationManager();
    }
    return RadioStationManager.instance;
  }

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  /**
   * Crée une nouvelle station radio
   */
  async createStation(
    data: CreateStationData,
    generatePlaylistAutomatically = true
  ): Promise<{ success: boolean; stationId?: string; station?: Station; error?: string }> {
    try {
      console.log('🆕 Creating new station:', data.name);

      // Validation des données
      const validation = this.validateStationData(data);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      // Vérifier si la fréquence est disponible
      const existingStation = await this.getStationByFrequency(data.frequency);
      if (existingStation) {
        return { 
          success: false, 
          error: `La fréquence ${data.frequency} MHz est déjà occupée par "${existingStation.name}"` 
        };
      }

      // Générer une playlist automatiquement si demandé
      let playlist: PlaylistItem[] = [];
      if (generatePlaylistAutomatically) {
        const playlistResult = await this.generateDefaultPlaylist(data);
        if (playlistResult.success && playlistResult.playlist) {
          playlist = playlistResult.playlist;
        } else {
          console.warn('Failed to generate playlist, continuing with empty playlist');
        }
      }

      // Créer le document station
      const stationData = {
        name: data.name,
        frequency: data.frequency,
        djCharacterId: data.djCharacterId,
        theme: data.theme,
        ownerId: data.ownerId,
        playlist,
        isActive: data.isActive ?? true,
        tags: data.tags || [],
        description: data.description || '',
        createdAt: serverTimestamp(),
        lastModified: serverTimestamp(),
        playCount: 0,
        lastPlayedAt: null
      };

      const docRef = await addDoc(collection(db, 'stations'), stationData);

      // Mettre à jour les statistiques utilisateur
      if (data.ownerId !== 'system') {
        await this.updateUserStats(data.ownerId, { stationsCreated: 1 });
      }

      // Invalider le cache
      stationService.invalidateStationCache(data.frequency);

      const createdStation: Station = {
        id: docRef.id,
        ...stationData,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        lastPlayedAt: null
      };

      console.log('✅ Station created successfully:', createdStation.name);
      return { 
        success: true, 
        stationId: docRef.id, 
        station: createdStation 
      };

    } catch (error) {
      console.error('❌ Error creating station:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue lors de la création' 
      };
    }
  }

  /**
   * Met à jour une station existante
   */
  async updateStation(
    stationId: string, 
    updates: UpdateStationData,
    updatePlaylist = false
  ): Promise<{ success: boolean; station?: Station; error?: string }> {
    try {
      console.log('📝 Updating station:', stationId);

      // Vérifier que la station existe
      const existingStation = await this.getStationById(stationId);
      if (!existingStation) {
        return { success: false, error: 'Station non trouvée' };
      }

      // Validation des données
      if (updates.frequency && updates.frequency !== existingStation.frequency) {
        const frequencyCheck = await this.getStationByFrequency(updates.frequency);
        if (frequencyCheck && frequencyCheck.id !== stationId) {
          return { 
            success: false, 
            error: `La fréquence ${updates.frequency} MHz est déjà occupée` 
          };
        }
      }

      // Préparer les mises à jour
      const updateData: any = {
        ...updates,
        lastModified: serverTimestamp()
      };

      // Gérer la mise à jour de playlist si nécessaire
      if (updatePlaylist && updates.playlist) {
        updateData.playlist = updates.playlist;
      }

      // Effectuer la mise à jour
      const stationRef = doc(db, 'stations', stationId);
      await updateDoc(stationRef, updateData);

      // Invalider le cache
      stationService.invalidateStationCache(existingStation.frequency);
      if (updates.frequency && updates.frequency !== existingStation.frequency) {
        stationService.invalidateStationCache(updates.frequency);
      }

      // Récupérer la station mise à jour
      const updatedStation = await this.getStationById(stationId);

      console.log('✅ Station updated successfully');
      return { success: true, station: updatedStation || undefined };

    } catch (error) {
      console.error('❌ Error updating station:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour' 
      };
    }
  }

  /**
   * Supprime une station
   */
  async deleteStation(
    stationId: string,
    deletePlaylistFiles = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🗑️ Deleting station:', stationId);

      // Vérifier que la station existe
      const station = await this.getStationById(stationId);
      if (!station) {
        return { success: false, error: 'Station non trouvée' };
      }

      // Supprimer les fichiers de playlist si demandé
      if (deletePlaylistFiles && station.playlist.length > 0) {
        console.log('🗑️ Deleting playlist files...');
        // TODO: Implémenter la suppression des fichiers audio
        // await this.deletePlaylistFiles(station.playlist);
      }

      // Supprimer le document
      await deleteDoc(doc(db, 'stations', stationId));

      // Mettre à jour les statistiques utilisateur
      if (station.ownerId !== 'system') {
        await this.updateUserStats(station.ownerId, { stationsCreated: -1 });
      }

      // Invalider le cache
      stationService.invalidateStationCache(station.frequency);

      console.log('✅ Station deleted successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error deleting station:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la suppression' 
      };
    }
  }

  /**
   * Duplique une station
   */
  async duplicateStation(
    stationId: string,
    newFrequency: number,
    newName?: string,
    copyPlaylist = true
  ): Promise<{ success: boolean; stationId?: string; station?: Station; error?: string }> {
    try {
      console.log('📋 Duplicating station:', stationId);

      const originalStation = await this.getStationById(stationId);
      if (!originalStation) {
        return { success: false, error: 'Station originale non trouvée' };
      }

      // Vérifier que la nouvelle fréquence est libre
      const existingStation = await this.getStationByFrequency(newFrequency);
      if (existingStation) {
        return { 
          success: false, 
          error: `La fréquence ${newFrequency} MHz est déjà occupée` 
        };
      }

      // Préparer les données pour la nouvelle station
      const duplicateData: CreateStationData = {
        name: newName || `${originalStation.name} (Copie)`,
        frequency: newFrequency,
        djCharacterId: originalStation.djCharacterId,
        theme: originalStation.theme,
        ownerId: originalStation.ownerId,
        isActive: false, // Inactive par défaut
        tags: [...(originalStation.tags || [])],
        description: originalStation.description
      };

      // Créer la nouvelle station
      const result = await this.createStation(duplicateData, false);
      
      if (!result.success || !result.stationId) {
        return result;
      }

      // Copier la playlist si demandé
      if (copyPlaylist && originalStation.playlist.length > 0) {
        const copiedPlaylist = originalStation.playlist.map((track, index) => ({
          ...track,
          id: `dup-${Date.now()}-${index}`,
          addedAt: new Date().toISOString()
        }));

        await this.updateStation(result.stationId, { playlist: copiedPlaylist }, true);
      }

      console.log('✅ Station duplicated successfully');
      return result;

    } catch (error) {
      console.error('❌ Error duplicating station:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur lors de la duplication' 
      };
    }
  }

  // ========================================
  // QUERY OPERATIONS
  // ========================================

  /**
   * Récupère une station par ID
   */
  async getStationById(stationId: string): Promise<Station | null> {
    try {
      const stationRef = doc(db, 'stations', stationId);
      const stationDoc = await getDoc(stationRef);

      if (!stationDoc.exists()) {
        return null;
      }

      return this.serializeStation(stationDoc);
    } catch (error) {
      console.error('Error fetching station by ID:', error);
      return null;
    }
  }

  /**
   * Récupère une station par fréquence
   */
  async getStationByFrequency(frequency: number): Promise<Station | null> {
    try {
      const stationsCol = collection(db, 'stations');
      const margin = 0.01;
      const q = query(
        stationsCol,
        where('frequency', '>=', frequency - margin),
        where('frequency', '<=', frequency + margin)
      );

      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        return null;
      }

      // Retourner la station la plus proche
      const stationDoc = querySnapshot.docs.sort((a, b) => 
        Math.abs(a.data().frequency - frequency) - Math.abs(b.data().frequency - frequency)
      )[0];

      return this.serializeStation(stationDoc);
    } catch (error) {
      console.error('Error fetching station by frequency:', error);
      return null;
    }
  }

  /**
   * Récupère toutes les stations avec filtres
   */
  async getStations(filters: StationFilters = {}): Promise<Station[]> {
    try {
      const stationsCol = collection(db, 'stations');
      let q = query(stationsCol, orderBy('frequency', 'asc'));

      // Appliquer les filtres
      if (filters.ownerId) {
        q = query(stationsCol, where('ownerId', '==', filters.ownerId), orderBy('frequency', 'asc'));
      }

      if (filters.isActive !== undefined) {
        q = query(stationsCol, where('isActive', '==', filters.isActive), orderBy('frequency', 'asc'));
      }

      const querySnapshot = await getDocs(q);
      let stations = querySnapshot.docs.map(doc => this.serializeStation(doc));

      // Filtres post-requête
      if (filters.frequency) {
        stations = stations.filter(station => 
          station.frequency >= filters.frequency!.min && 
          station.frequency <= filters.frequency!.max
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        stations = stations.filter(station => 
          station.tags && filters.tags!.some(tag => station.tags!.includes(tag))
        );
      }

      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        stations = stations.filter(station => 
          station.name.toLowerCase().includes(searchLower) ||
          station.theme?.toLowerCase().includes(searchLower) ||
          station.description?.toLowerCase().includes(searchLower)
        );
      }

      return stations;
    } catch (error) {
      console.error('Error fetching stations:', error);
      return [];
    }
  }

  /**
   * Récupère les stations d'un utilisateur
   */
  async getUserStations(userId: string, includeSystem = true): Promise<Station[]> {
    const filters: StationFilters = {};
    
    if (includeSystem) {
      // Récupérer les stations utilisateur et système séparément
      const [userStations, systemStations] = await Promise.all([
        this.getStations({ ownerId: userId }),
        this.getStations({ ownerId: 'system' })
      ]);
      
      return [...systemStations, ...userStations].sort((a, b) => a.frequency - b.frequency);
    } else {
      return this.getStations({ ownerId: userId });
    }
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================

  /**
   * Supprime plusieurs stations en batch
   */
  async deleteMultipleStations(stationIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    errors: Array<{ stationId: string; error: string }>;
  }> {
    console.log(`🗑️ Batch deleting ${stationIds.length} stations...`);
    
    const batch = writeBatch(db);
    const errors: Array<{ stationId: string; error: string }> = [];
    let deletedCount = 0;

    try {
      // Récupérer toutes les stations pour validation
      const stations = await Promise.all(
        stationIds.map(async (id) => {
          const station = await this.getStationById(id);
          return { id, station };
        })
      );

      // Préparer les suppressions
      for (const { id, station } of stations) {
        if (!station) {
          errors.push({ stationId: id, error: 'Station non trouvée' });
          continue;
        }

        const stationRef = doc(db, 'stations', id);
        batch.delete(stationRef);
        deletedCount++;

        // Invalider le cache
        stationService.invalidateStationCache(station.frequency);
      }

      // Exécuter le batch
      if (deletedCount > 0) {
        await batch.commit();
        console.log(`✅ Batch deletion completed: ${deletedCount} stations deleted`);
      }

      return {
        success: true,
        deletedCount,
        errors
      };

    } catch (error) {
      console.error('❌ Batch deletion failed:', error);
      return {
        success: false,
        deletedCount: 0,
        errors: [...errors, { stationId: 'batch', error: 'Erreur lors de la suppression en lot' }]
      };
    }
  }

  /**
   * Met à jour plusieurs stations en batch
   */
  async updateMultipleStations(
    updates: Array<{ stationId: string; data: UpdateStationData }>
  ): Promise<{
    success: boolean;
    updatedCount: number;
    errors: Array<{ stationId: string; error: string }>;
  }> {
    console.log(`📝 Batch updating ${updates.length} stations...`);
    
    const batch = writeBatch(db);
    const errors: Array<{ stationId: string; error: string }> = [];
    let updatedCount = 0;

    try {
      for (const { stationId, data } of updates) {
        try {
          // Validation basique
          const station = await this.getStationById(stationId);
          if (!station) {
            errors.push({ stationId, error: 'Station non trouvée' });
            continue;
          }

          const stationRef = doc(db, 'stations', stationId);
          batch.update(stationRef, {
            ...data,
            lastModified: serverTimestamp()
          });
          
          updatedCount++;

          // Invalider le cache
          stationService.invalidateStationCache(station.frequency);
          
        } catch (error) {
          errors.push({ 
            stationId, 
            error: error instanceof Error ? error.message : 'Erreur inconnue' 
          });
        }
      }

      // Exécuter le batch
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`✅ Batch update completed: ${updatedCount} stations updated`);
      }

      return {
        success: true,
        updatedCount,
        errors
      };

    } catch (error) {
      console.error('❌ Batch update failed:', error);
      return {
        success: false,
        updatedCount: 0,
        errors: [...errors, { stationId: 'batch', error: 'Erreur lors de la mise à jour en lot' }]
      };
    }
  }

  // ========================================
  // PLAYLIST MANAGEMENT
  // ========================================

  /**
   * Met à jour la playlist d'une station
   */
  async updateStationPlaylist(
    stationId: string,
    playlist: PlaylistItem[],
    optimizeOrder = true
  ): Promise<{ success: boolean; error?: string }> {
    try {
      let finalPlaylist = playlist;

      // Optimiser l'ordre si demandé
      if (optimizeOrder && playlist.length > 0) {
        const optimizeResult = await playlistManagerService.reorderPlaylist(
          stationId, 
          playlist, 
          { optimizeOrder: true }
        );
        
        if (optimizeResult.success) {
          console.log('✅ Playlist optimized during update');
        }
      }

      return await this.updateStation(stationId, { playlist: finalPlaylist }, true);
      
    } catch (error) {
      console.error('Error updating station playlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur mise à jour playlist' 
      };
    }
  }

  /**
   * Génère une playlist par défaut pour une nouvelle station
   */
  private async generateDefaultPlaylist(stationData: CreateStationData): Promise<{
    success: boolean;
    playlist?: PlaylistItem[];
    error?: string;
  }> {
    try {
      console.log('🎵 Generating default playlist for station:', stationData.name);

      // Utiliser le service de playlist pour générer intelligemment
      const playlistResult = await playlistManagerService.generateFromTemplate(
        'temp-station-id', // ID temporaire
        'balanced-mix',    // Template équilibré par défaut
        {
          id: stationData.djCharacterId,
          name: 'DJ Default',
          description: stationData.theme,
          voice: 'alloy'
        } as any,
        stationData.theme
      );

      if (playlistResult.success && playlistResult.playlist) {
        return {
          success: true,
          playlist: playlistResult.playlist
        };
      } else {
        return {
          success: false,
          error: playlistResult.error || 'Erreur génération playlist'
        };
      }

    } catch (error) {
      console.error('Error generating default playlist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur génération playlist'
      };
    }
  }

  // ========================================
  // ANALYTICS & STATISTICS
  // ========================================

  /**
   * Génère des statistiques sur les stations
   */
  async getStationStats(): Promise<StationStats> {
    try {
      const allStations = await this.getStations();
      
      const activeStations = allStations.filter(s => s.isActive);
      const userStations = allStations.filter(s => s.ownerId !== 'system');
      const systemStations = allStations.filter(s => s.ownerId === 'system');
      
      const frequencies = allStations.map(s => s.frequency);
      const playlistLengths = allStations.map(s => s.playlist.length);
      
      // Compter les DJs les plus utilisés
      const djCounts: Record<string, number> = {};
      allStations.forEach(station => {
        djCounts[station.djCharacterId] = (djCounts[station.djCharacterId] || 0) + 1;
      });
      
      const mostUsedDJs = Object.entries(djCounts)
        .map(([djId, count]) => ({ djId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalStations: allStations.length,
        activeStations: activeStations.length,
        userStations: userStations.length,
        systemStations: systemStations.length,
        frequencyRange: {
          min: Math.min(...frequencies),
          max: Math.max(...frequencies)
        },
        averagePlaylistLength: playlistLengths.reduce((sum, len) => sum + len, 0) / playlistLengths.length || 0,
        mostUsedDJs
      };
      
    } catch (error) {
      console.error('Error generating station stats:', error);
      return {
        totalStations: 0,
        activeStations: 0,
        userStations: 0,
        systemStations: 0,
        frequencyRange: { min: 87.0, max: 108.0 },
        averagePlaylistLength: 0,
        mostUsedDJs: []
      };
    }
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Sérialise un document Firestore en Station
   */
  private serializeStation(doc: any): Station {
    const data = doc.data();
    
    // Gérer les dates de manière robuste
    const createdAt = data.createdAt;
    let createdAtISO: string;
    if (createdAt instanceof Timestamp) {
      createdAtISO = createdAt.toDate().toISOString();
    } else if (createdAt) {
      createdAtISO = new Date(createdAt).toISOString();
    } else {
      console.warn(`Station ${doc.id} is missing 'createdAt' field. Using current date.`);
      createdAtISO = new Date().toISOString();
    }
    
    const lastModified = data.lastModified;
    let lastModifiedISO: string;
    if (lastModified instanceof Timestamp) {
      lastModifiedISO = lastModified.toDate().toISOString();
    } else if (lastModified) {
      lastModifiedISO = new Date(lastModified).toISOString();
    } else {
      lastModifiedISO = createdAtISO; // Fallback to createdAt
    }

    const lastPlayedAt = data.lastPlayedAt;
    let lastPlayedAtISO: string | null = null;
    if (lastPlayedAt instanceof Timestamp) {
      lastPlayedAtISO = lastPlayedAt.toDate().toISOString();
    } else if (lastPlayedAt) {
      lastPlayedAtISO = new Date(lastPlayedAt).toISOString();
    }

    return {
      id: doc.id,
      ...data,
      createdAt: createdAtISO,
      lastModified: lastModifiedISO,
      lastPlayedAt: lastPlayedAtISO,
      playlist: data.playlist || [],
      tags: data.tags || [],
      description: data.description || '',
      isActive: data.isActive ?? true,
      playCount: data.playCount || 0
    } as Station;
  }

  /**
   * Valide les données d'une station
   */
  private validateStationData(data: CreateStationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || data.name.trim().length < 3) {
      errors.push('Le nom doit contenir au moins 3 caractères');
    }

    if (!data.frequency || data.frequency < 87.0 || data.frequency > 108.0) {
      errors.push('La fréquence doit être entre 87.0 et 108.0 MHz');
    }

    if (!data.djCharacterId) {
      errors.push('Un DJ doit être sélectionné');
    }

    if (!data.theme || data.theme.trim().length < 3) {
      errors.push('Le thème doit contenir au moins 3 caractères');
    }

    if (!data.ownerId) {
      errors.push('Un propriétaire doit être spécifié');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Met à jour les statistiques utilisateur
   */
  private async updateUserStats(userId: string, updates: { stationsCreated?: number }): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      const updateData: any = {};

      if (updates.stationsCreated) {
        updateData.stationsCreated = increment(updates.stationsCreated);
      }

      if (Object.keys(updateData).length > 0) {
        await updateDoc(userRef, updateData);
      }
    } catch (error) {
      console.warn('Failed to update user stats:', error);
    }
  }
}

// Export singleton instance
export const radioStationManager = RadioStationManager.getInstance();
export default radioStationManager;

    