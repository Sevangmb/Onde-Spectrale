'use client';

import type { Station, PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { safeGetTime } from '@/lib/dateUtils';
import { updateStation, deletePlaylistItem, reorderPlaylistItems } from '@/app/actions';

export interface AdvancedStationServiceInterface {
  // DJ Management
  changeDJ(stationId: string, newDJId: string): Promise<Station>;
  getAvailableDJs(): Promise<(DJCharacter | CustomDJCharacter)[]>;
  
  // Playlist Management
  removeTrackFromPlaylist(stationId: string, trackId: string): Promise<Station>;
  reorderPlaylist(stationId: string, newOrder: string[]): Promise<Station>;
  moveTrack(stationId: string, fromIndex: number, toIndex: number): Promise<Station>;
  
  // Batch Operations
  removeMultipleTracks(stationId: string, trackIds: string[]): Promise<Station>;
  addTracksToPlaylist(stationId: string, tracks: Omit<PlaylistItem, 'id'>[]): Promise<Station>;
  
  // Station Analytics
  getPlaylistStats(station: Station): PlaylistStats;
  validatePlaylist(station: Station): PlaylistValidation;
}

export interface PlaylistStats {
  totalTracks: number;
  totalDuration: number;
  averageTrackDuration: number;
  genreDistribution: Record<string, number>;
  typeDistribution: { music: number; message: number };
  oldestTrack?: PlaylistItem;
  newestTrack?: PlaylistItem;
}

export interface PlaylistValidation {
  isValid: boolean;
  issues: PlaylistIssue[];
  recommendations: string[];
}

export interface PlaylistIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  trackId?: string;
  field?: string;
}

export class AdvancedStationService implements AdvancedStationServiceInterface {
  private djCache: (DJCharacter | CustomDJCharacter)[] | null = null;
  private djCacheTimestamp: number = 0;
  private readonly DJ_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Change le DJ d'une station
   */
  async changeDJ(stationId: string, newDJId: string): Promise<Station> {
    try {
      console.log(`🎤 Changing DJ for station ${stationId} to ${newDJId}`);
      
      const updatedStation = await updateStation(stationId, {
        djCharacterId: newDJId,
      });

      if (!updatedStation) {
        throw new Error(`Station ${stationId} not found`);
      }

      console.log(`✅ DJ changed successfully for station ${updatedStation.name}`);
      return updatedStation;
    } catch (error) {
      console.error(`❌ Error changing DJ:`, error);
      throw new Error(`Failed to change DJ: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Récupère la liste des DJs disponibles
   */
  async getAvailableDJs(): Promise<(DJCharacter | CustomDJCharacter)[]> {
    const now = Date.now();
    
    // Check cache
    if (this.djCache && (now - this.djCacheTimestamp) < this.DJ_CACHE_TTL) {
      return this.djCache;
    }

    try {
      console.log('🎭 Loading available DJs...');
      
      // Import des DJs par défaut
      const { DJ_CHARACTERS } = await import('@/lib/data');
      
      // TODO: Récupérer aussi les DJs personnalisés de l'utilisateur
      // const customDJs = await getCustomDJsForUser(userId);
      
      const allDJs = [...DJ_CHARACTERS];
      
      // Cache des résultats
      this.djCache = allDJs;
      this.djCacheTimestamp = now;
      
      console.log(`✅ Loaded ${allDJs.length} DJs`);
      return allDJs;
    } catch (error) {
      console.error('❌ Error loading DJs:', error);
      throw error;
    }
  }

  /**
   * Supprime une piste de la playlist
   */
  async removeTrackFromPlaylist(stationId: string, trackId: string): Promise<Station> {
    try {
      console.log(`❌ Removing track ${trackId} from station ${stationId}`);
      
      const updatedStation = await deletePlaylistItem(stationId, trackId);
      
      if (!updatedStation) {
        throw new Error(`Station ${stationId} not found`);
      }

      console.log(`✅ Track removed successfully from ${updatedStation.name}`);
      return updatedStation;
    } catch (error) {
      console.error(`❌ Error removing track:`, error);
      throw new Error(`Failed to remove track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Réorganise la playlist selon un nouvel ordre
   */
  async reorderPlaylist(stationId: string, newOrder: string[]): Promise<Station> {
    try {
      console.log(`🔄 Reordering playlist for station ${stationId}`);
      
      const updatedStation = await reorderPlaylistItems(stationId, newOrder);
      
      if (!updatedStation) {
        throw new Error(`Station ${stationId} not found`);
      }

      console.log(`✅ Playlist reordered successfully for ${updatedStation.name}`);
      return updatedStation;
    } catch (error) {
      console.error(`❌ Error reordering playlist:`, error);
      throw new Error(`Failed to reorder playlist: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Déplace une piste d'une position à une autre
   */
  async moveTrack(stationId: string, fromIndex: number, toIndex: number): Promise<Station> {
    try {
      // Récupérer la station actuelle pour construire le nouvel ordre
      const { getStationById } = await import('@/app/actions');
      const station = await getStationById(stationId);
      
      if (!station) {
        throw new Error(`Station ${stationId} not found`);
      }

      const playlist = [...station.playlist];
      
      // Vérifier les indices
      if (fromIndex < 0 || fromIndex >= playlist.length || toIndex < 0 || toIndex >= playlist.length) {
        throw new Error('Invalid index for track movement');
      }

      // Déplacer la piste
      const [movedTrack] = playlist.splice(fromIndex, 1);
      playlist.splice(toIndex, 0, movedTrack);

      // Créer le nouvel ordre
      const newOrder = playlist.map(track => track.id);
      
      return this.reorderPlaylist(stationId, newOrder);
    } catch (error) {
      console.error(`❌ Error moving track:`, error);
      throw error;
    }
  }

  /**
   * Supprime plusieurs pistes en une seule opération
   */
  async removeMultipleTracks(stationId: string, trackIds: string[]): Promise<Station> {
    try {
      console.log(`❌ Removing ${trackIds.length} tracks from station ${stationId}`);
      
      // Pour l'instant, on fait des suppressions séquentielles
      // TODO: Implémenter une action batch côté serveur pour plus d'efficacité
      let updatedStation: Station | null = null;
      
      for (const trackId of trackIds) {
        updatedStation = await this.removeTrackFromPlaylist(stationId, trackId);
      }

      if (!updatedStation) {
        throw new Error(`Failed to remove tracks from station ${stationId}`);
      }

      console.log(`✅ Successfully removed ${trackIds.length} tracks`);
      return updatedStation;
    } catch (error) {
      console.error(`❌ Error removing multiple tracks:`, error);
      throw error;
    }
  }

  /**
   * Ajoute plusieurs pistes à la playlist
   */
  async addTracksToPlaylist(stationId: string, tracks: Omit<PlaylistItem, 'id'>[]): Promise<Station> {
    try {
      console.log(`➕ Adding ${tracks.length} tracks to station ${stationId}`);
      
      const { addPlaylistItems } = await import('@/app/actions');
      const updatedStation = await addPlaylistItems(stationId, tracks);
      
      if (!updatedStation) {
        throw new Error(`Station ${stationId} not found`);
      }

      console.log(`✅ Successfully added ${tracks.length} tracks`);
      return updatedStation;
    } catch (error) {
      console.error(`❌ Error adding tracks:`, error);
      throw new Error(`Failed to add tracks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calcule les statistiques de la playlist
   */
  getPlaylistStats(station: Station): PlaylistStats {
    const playlist = station.playlist;
    const totalTracks = playlist.length;
    
    if (totalTracks === 0) {
      return {
        totalTracks: 0,
        totalDuration: 0,
        averageTrackDuration: 0,
        genreDistribution: {},
        typeDistribution: { music: 0, message: 0 }
      };
    }

    // Durée totale
    const totalDuration = playlist.reduce((sum, track) => sum + (track.duration || 0), 0);
    const averageTrackDuration = totalDuration / totalTracks;

    // Distribution par genre
    const genreDistribution: Record<string, number> = {};
    playlist.forEach(track => {
      if (track.genre) {
        const genres = track.genre.split(',').map(g => g.trim());
        genres.forEach(genre => {
          genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
        });
      }
    });

    // Distribution par type
    const typeDistribution = playlist.reduce(
      (acc, track) => {
        acc[track.type]++;
        return acc;
      },
      { music: 0, message: 0 }
    );

    // Pistes les plus anciennes/récentes
    const sortedByDate = playlist
      .filter(track => track.addedAt)
      .sort((a, b) => safeGetTime(a.addedAt) - safeGetTime(b.addedAt));
    
    const oldestTrack = sortedByDate[0];
    const newestTrack = sortedByDate[sortedByDate.length - 1];

    return {
      totalTracks,
      totalDuration,
      averageTrackDuration,
      genreDistribution,
      typeDistribution,
      oldestTrack,
      newestTrack
    };
  }

  /**
   * Valide la playlist et identifie les problèmes
   */
  validatePlaylist(station: Station): PlaylistValidation {
    const issues: PlaylistIssue[] = [];
    const recommendations: string[] = [];
    const playlist = station.playlist;

    // Vérifications de base
    if (playlist.length === 0) {
      issues.push({
        type: 'warning',
        message: 'La playlist est vide'
      });
      recommendations.push('Ajoutez des pistes à votre playlist pour commencer la diffusion');
    }

    // Vérifier les pistes sans URL
    const tracksWithoutUrl = playlist.filter(track => !track.url || track.url.trim() === '');
    if (tracksWithoutUrl.length > 0) {
      issues.push({
        type: 'error',
        message: `${tracksWithoutUrl.length} piste(s) sans URL de fichier audio`,
      });
      recommendations.push('Vérifiez que toutes les pistes ont un fichier audio valide');
    }

    // Vérifier les pistes sans titre
    const tracksWithoutTitle = playlist.filter(track => !track.title || track.title.trim() === '');
    if (tracksWithoutTitle.length > 0) {
      issues.push({
        type: 'warning',
        message: `${tracksWithoutTitle.length} piste(s) sans titre`,
      });
    }

    // Vérifier la durée des pistes
    const tracksWithoutDuration = playlist.filter(track => !track.duration || track.duration <= 0);
    if (tracksWithoutDuration.length > 0) {
      issues.push({
        type: 'info',
        message: `${tracksWithoutDuration.length} piste(s) sans durée définie`,
      });
    }

    // Vérifier l'équilibre musique/messages
    const stats = this.getPlaylistStats(station);
    const musicRatio = stats.typeDistribution.music / stats.totalTracks;
    
    if (musicRatio < 0.3) {
      issues.push({
        type: 'warning',
        message: 'Trop peu de musique dans la playlist'
      });
      recommendations.push('Ajoutez plus de pistes musicales pour un meilleur équilibre');
    }

    if (musicRatio > 0.95) {
      issues.push({
        type: 'info',
        message: 'Playlist principalement musicale'
      });
      recommendations.push('Considérez l\'ajout de messages DJ pour plus d\'interactivité');
    }

    // Recommandations générales
    if (stats.totalTracks < 10) {
      recommendations.push('Une playlist d\'au moins 10 pistes est recommandée pour éviter les répétitions');
    }

    if (stats.totalDuration < 1800) { // Moins de 30 minutes
      recommendations.push('Ajoutez plus de contenu pour une diffusion continue plus longue');
    }

    const isValid = !issues.some(issue => issue.type === 'error');

    return {
      isValid,
      issues,
      recommendations
    };
  }

  /**
   * Invalide le cache des DJs
   */
  invalidateDJCache(): void {
    this.djCache = null;
    this.djCacheTimestamp = 0;
    console.log('🗑️ DJ cache invalidated');
  }

  /**
   * Recherche dans la playlist
   */
  searchPlaylist(station: Station, query: string): PlaylistItem[] {
    if (!query || query.trim() === '') {
      return station.playlist;
    }

    const searchTerm = query.toLowerCase();
    
    return station.playlist.filter(track => 
      track.title.toLowerCase().includes(searchTerm) ||
      (track.artist && track.artist.toLowerCase().includes(searchTerm)) ||
      (track.album && track.album.toLowerCase().includes(searchTerm)) ||
      (track.genre && track.genre.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Filtre la playlist par type
   */
  filterPlaylistByType(station: Station, type: 'music' | 'message' | 'all'): PlaylistItem[] {
    if (type === 'all') {
      return station.playlist;
    }
    
    return station.playlist.filter(track => track.type === type);
  }

  /**
   * Obtient les duplicata potentiels dans la playlist
   */
  findDuplicateTracks(station: Station): Array<{ original: PlaylistItem; duplicates: PlaylistItem[] }> {
    const duplicates: Array<{ original: PlaylistItem; duplicates: PlaylistItem[] }> = [];
    const processed = new Set<string>();

    station.playlist.forEach((track, index) => {
      if (processed.has(track.id)) return;

      const similarTracks = station.playlist
        .slice(index + 1)
        .filter(otherTrack => 
          otherTrack.title.toLowerCase() === track.title.toLowerCase() &&
          otherTrack.artist?.toLowerCase() === track.artist?.toLowerCase()
        );

      if (similarTracks.length > 0) {
        duplicates.push({
          original: track,
          duplicates: similarTracks
        });
        
        // Marquer comme traités
        processed.add(track.id);
        similarTracks.forEach(dup => processed.add(dup.id));
      }
    });

    return duplicates;
  }
}

// Singleton instance
export const advancedStationService = new AdvancedStationService();