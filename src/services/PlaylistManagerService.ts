'use client';

import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  writeBatch,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getRandomPlexTracks } from '@/lib/plex';
import { generatePlaylist } from '@/ai/flows/generate-playlist-flow';
import type { 
  PlaylistItem, 
  Station, 
  DJCharacter, 
  CustomDJCharacter, 
  AdminErrorLog 
} from '@/lib/types';

/**
 * PlaylistManagerService - Service avancé de gestion de playlist
 * 
 * Fonctionnalités:
 * - Réorganisation et tri des pistes
 * - Import/export de playlists
 * - Templates de playlist pré-configurés
 * - Gestion batch des modifications
 * - Validation et optimisation automatique
 * - Analytics de performance playlist
 */
export class PlaylistManagerService {
  private static instance: PlaylistManagerService | null = null;

  static getInstance(): PlaylistManagerService {
    if (!PlaylistManagerService.instance) {
      PlaylistManagerService.instance = new PlaylistManagerService();
    }
    return PlaylistManagerService.instance;
  }

  // ========================================
  // PLAYLIST MANIPULATION CORE
  // ========================================

  /**
   * Réorganise une playlist avec nouvel ordre et validation optimisée
   */
  async reorderPlaylist(
    stationId: string, 
    newOrder: PlaylistItem[],
    options: { validateTracks?: boolean; optimizeOrder?: boolean } = {}
  ): Promise<{ success: boolean; error?: string; optimizations?: string[] }> {
    try {
      console.log('🔄 Reordering playlist for station:', stationId);
      
      // Validation
      if (!newOrder || newOrder.length === 0) {
        return { success: false, error: 'Playlist vide non autorisée' };
      }

      // Validate all items have required fields
      const invalidItems = newOrder.filter(item => 
        !item.id || !item.type || !item.title || typeof item.duration !== 'number'
      );
      
      if (invalidItems.length > 0) {
        return { 
          success: false, 
          error: `${invalidItems.length} pistes invalides détectées` 
        };
      }

      // Update Firestore
      const stationRef = doc(db, 'stations', stationId);
      await updateDoc(stationRef, {
        playlist: newOrder,
        lastModified: Timestamp.now()
      });

      const optimizations: string[] = [];
      
      // Auto-optimize if requested
      if (options.optimizeOrder) {
        const optimized = this.optimizeTrackOrder(newOrder);
        if (optimized.changed) {
          newOrder = optimized.playlist;
          optimizations.push('Ordre optimisé pour meilleure expérience');
        }
      }
      
      console.log('✅ Playlist reordered successfully');
      return { success: true, optimizations };

    } catch (error) {
      console.error('❌ Error reordering playlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Supprime plusieurs pistes en batch
   */
  async removeMultipleTracks(
    stationId: string, 
    trackIds: string[]
  ): Promise<{ success: boolean; removedCount: number; error?: string }> {
    try {
      console.log('🗑️ Removing tracks:', trackIds);

      if (trackIds.length === 0) {
        return { success: true, removedCount: 0 };
      }

      // Get current station data
      const stationRef = doc(db, 'stations', stationId);
      const stationDoc = await getDoc(stationRef);
      
      if (!stationDoc.exists()) {
        return { success: false, removedCount: 0, error: 'Station non trouvée' };
      }

      const currentPlaylist = stationDoc.data().playlist || [];
      const filteredPlaylist = currentPlaylist.filter(
        (track: PlaylistItem) => !trackIds.includes(track.id)
      );

      // Update playlist
      await updateDoc(stationRef, {
        playlist: filteredPlaylist,
        lastModified: Timestamp.now()
      });

      const removedCount = currentPlaylist.length - filteredPlaylist.length;
      
      console.log(`✅ Removed ${removedCount} tracks`);
      return { success: true, removedCount };

    } catch (error) {
      console.error('❌ Error removing tracks:', error);
      return { 
        success: false, 
        removedCount: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  /**
   * Duplique une piste dans la playlist
   */
  async duplicateTrack(
    stationId: string, 
    trackId: string, 
    insertPosition?: number
  ): Promise<{ success: boolean; newTrack?: PlaylistItem; error?: string }> {
    try {
      console.log('📋 Duplicating track:', trackId);

      const stationRef = doc(db, 'stations', stationId);
      const stationDoc = await getDoc(stationRef);
      
      if (!stationDoc.exists()) {
        return { success: false, error: 'Station non trouvée' };
      }

      const currentPlaylist = stationDoc.data().playlist || [];
      const originalTrack = currentPlaylist.find(
        (track: PlaylistItem) => track.id === trackId
      );

      if (!originalTrack) {
        return { success: false, error: 'Piste non trouvée' };
      }

      // Create duplicate with new ID
      const duplicatedTrack: PlaylistItem = {
        ...originalTrack,
        id: `dup-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        title: `${originalTrack.title} (Copie)`,
        addedAt: new Date().toISOString()
      };

      // Insert at specified position or at the end
      const newPlaylist = [...currentPlaylist];
      const position = insertPosition !== undefined 
        ? Math.min(insertPosition, newPlaylist.length)
        : newPlaylist.length;
      
      newPlaylist.splice(position, 0, duplicatedTrack);

      // Update Firestore
      await updateDoc(stationRef, {
        playlist: newPlaylist,
        lastModified: Timestamp.now()
      });

      console.log('✅ Track duplicated successfully');
      return { success: true, newTrack: duplicatedTrack };

    } catch (error) {
      console.error('❌ Error duplicating track:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // ========================================
  // PLAYLIST TEMPLATES
  // ========================================

  /**
   * Templates prédéfinis de playlist
   */
  private getPlaylistTemplates() {
    return {
      'fallout-classic': {
        name: 'Fallout Classique',
        description: 'Mix nostalgique post-apocalyptique',
        structure: [
          { type: 'message', ratio: 0.2 },
          { type: 'music', ratio: 0.8 }
        ],
        totalTracks: 20,
        avgDuration: 180
      },
      'news-heavy': {
        name: 'Info Continue',
        description: 'Beaucoup de messages, peu de musique',
        structure: [
          { type: 'message', ratio: 0.6 },
          { type: 'music', ratio: 0.4 }
        ],
        totalTracks: 15,
        avgDuration: 120
      },
      'music-marathon': {
        name: 'Marathon Musical',
        description: 'Musique continue avec quelques annonces',
        structure: [
          { type: 'message', ratio: 0.1 },
          { type: 'music', ratio: 0.9 }
        ],
        totalTracks: 30,
        avgDuration: 200
      },
      'balanced-mix': {
        name: 'Mix Équilibré',
        description: 'Équilibre parfait musique/messages',
        structure: [
          { type: 'message', ratio: 0.3 },
          { type: 'music', ratio: 0.7 }
        ],
        totalTracks: 25,
        avgDuration: 160
      }
    };
  }

  /**
   * Génère une playlist basée sur un template
   */
  async generateFromTemplate(
    stationId: string,
    templateId: string,
    dj: DJCharacter | CustomDJCharacter,
    stationTheme?: string
  ): Promise<{ success: boolean; playlist?: PlaylistItem[]; error?: string }> {
    try {
      console.log('🎯 Generating playlist from template:', templateId);

      const templates = this.getPlaylistTemplates();
      const template = templates[templateId as keyof typeof templates];
      
      if (!template) {
        return { success: false, error: 'Template non trouvé' };
      }

      // Calculate track counts based on ratios
      const messageCount = Math.round(template.totalTracks * template.structure[0].ratio);
      const musicCount = template.totalTracks - messageCount;

      console.log(`📊 Template: ${messageCount} messages, ${musicCount} musiques`);

      // Generate playlist using AI
      const playlistInput = {
        stationName: stationId,
        djName: dj.name,
        djDescription: 'isCustom' in dj && dj.isCustom ? dj.description : dj.description,
        theme: stationTheme || 'radio post-apocalyptique',
        trackCount: template.totalTracks,
        messageRatio: template.structure[0].ratio
      };

      const { items } = await generatePlaylist(playlistInput);

      // Get Plex tracks for music items
      const plexTracks = await getRandomPlexTracks(undefined, musicCount);
      let plexIndex = 0;

      const generatedPlaylist: PlaylistItem[] = [];

      for (const [index, item] of items.entries()) {
        if (item.type === 'message') {
          generatedPlaylist.push({
            id: `template-${templateId}-msg-${Date.now()}-${index}`,
            type: 'message',
            title: `Message ${dj.name}`,
            content: item.content,
            artist: dj.name,
            duration: Math.floor(Math.random() * 20) + 10, // 10-30 seconds
            url: '',
            addedAt: new Date().toISOString()
          });
        } else {
          // Use Plex track if available
          if (plexTracks[plexIndex]) {
            const plexTrack = plexTracks[plexIndex];
            generatedPlaylist.push({
              ...plexTrack,
              id: `template-${templateId}-plex-${Date.now()}-${index}`,
              addedAt: new Date().toISOString()
            });
            plexIndex++;
          } else {
            // Fallback synthetic track
            generatedPlaylist.push({
              id: `template-${templateId}-synth-${Date.now()}-${index}`,
              type: 'music',
              title: `Piste ${index + 1}`,
              content: item.content,
              artist: 'Artiste Radio',
              duration: template.avgDuration + (Math.random() * 60 - 30), // ±30s variation
              url: '',
              addedAt: new Date().toISOString()
            });
          }
        }
      }

      console.log(`✅ Generated ${generatedPlaylist.length} tracks from template`);
      return { success: true, playlist: generatedPlaylist };

    } catch (error) {
      console.error('❌ Error generating from template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur génération template'
      };
    }
  }

  /**
   * Applique un template à une station existante
   */
  async applyTemplateToStation(
    stationId: string,
    templateId: string,
    dj: DJCharacter | CustomDJCharacter,
    stationTheme?: string,
    replaceExisting = false
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.generateFromTemplate(stationId, templateId, dj, stationTheme);
      
      if (!result.success || !result.playlist) {
        return { success: false, error: result.error };
      }

      const stationRef = doc(db, 'stations', stationId);
      
      if (replaceExisting) {
        // Replace entire playlist
        await updateDoc(stationRef, {
          playlist: result.playlist,
          lastModified: Timestamp.now()
        });
      } else {
        // Append to existing playlist
        const stationDoc = await getDoc(stationRef);
        const currentPlaylist = stationDoc.exists() ? stationDoc.data()?.playlist || [] : [];
        
        await updateDoc(stationRef, {
          playlist: [...currentPlaylist, ...result.playlist],
          lastModified: Timestamp.now()
        });
      }

      console.log('✅ Template applied to station successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error applying template:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur application template'
      };
    }
  }

  // ========================================
  // IMPORT/EXPORT FUNCTIONALITY
  // ========================================

  /**
   * Exporte une playlist au format JSON
   */
  async exportPlaylist(
    stationId: string,
    includeMetadata = true
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('📤 Exporting playlist for station:', stationId);

      const stationRef = doc(db, 'stations', stationId);
      const stationDoc = await getDoc(stationRef);
      
      if (!stationDoc.exists()) {
        return { success: false, error: 'Station non trouvée' };
      }

      const stationData = stationDoc.data();
      const playlist = stationData?.playlist || [];

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        stationId,
        playlist,
        ...(includeMetadata && {
          metadata: {
            stationName: stationData?.name,
            djCharacterId: stationData?.djCharacterId,
            theme: stationData?.theme,
            totalTracks: playlist.length,
            totalDuration: playlist.reduce(
              (sum: number, track: PlaylistItem) => sum + track.duration, 
              0
            ),
            trackTypes: {
              music: playlist.filter((t: PlaylistItem) => t.type === 'music').length,
              message: playlist.filter((t: PlaylistItem) => t.type === 'message').length
            }
          }
        })
      };

      console.log('✅ Playlist exported successfully');
      return { success: true, data: exportData };

    } catch (error) {
      console.error('❌ Error exporting playlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur export'
      };
    }
  }

  /**
   * Importe une playlist depuis des données JSON
   */
  async importPlaylist(
    stationId: string,
    importData: any,
    replaceExisting = false
  ): Promise<{ success: boolean; importedCount?: number; error?: string }> {
    try {
      console.log('📥 Importing playlist for station:', stationId);

      // Validate import data structure
      if (!importData || !Array.isArray(importData.playlist)) {
        return { success: false, error: 'Format de données invalide' };
      }

      const importedPlaylist = importData.playlist;
      
      // Validate each playlist item
      const validTracks: PlaylistItem[] = [];
      const invalidTracks: any[] = [];

      for (const track of importedPlaylist) {
        if (this.validatePlaylistItem(track)) {
          // Generate new ID to avoid conflicts
          validTracks.push({
            ...track,
            id: `import-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            addedAt: new Date().toISOString()
          });
        } else {
          invalidTracks.push(track);
        }
      }

      if (invalidTracks.length > 0) {
        console.warn(`⚠️ ${invalidTracks.length} invalid tracks skipped during import`);
      }

      if (validTracks.length === 0) {
        return { success: false, error: 'Aucune piste valide dans l\'import' };
      }

      // Update station
      const stationRef = doc(db, 'stations', stationId);
      
      if (replaceExisting) {
        await updateDoc(stationRef, {
          playlist: validTracks,
          lastModified: Timestamp.now()
        });
      } else {
        const stationDoc = await getDoc(stationRef);
        const currentPlaylist = stationDoc.exists() ? stationDoc.data()?.playlist || [] : [];
        
        await updateDoc(stationRef, {
          playlist: [...currentPlaylist, ...validTracks],
          lastModified: Timestamp.now()
        });
      }

      console.log(`✅ Imported ${validTracks.length} tracks successfully`);
      return { success: true, importedCount: validTracks.length };

    } catch (error) {
      console.error('❌ Error importing playlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur import'
      };
    }
  }

  // ========================================
  // PLAYLIST ANALYTICS
  // ========================================

  /**
   * Analyse les performances d'une playlist
   */
  async analyzePlaylistPerformance(
    stationId: string
  ): Promise<{ success: boolean; analytics?: any; error?: string }> {
    try {
      console.log('📊 Analyzing playlist performance for:', stationId);

      const stationRef = doc(db, 'stations', stationId);
      const stationDoc = await getDoc(stationRef);
      
      if (!stationDoc.exists()) {
        return { success: false, error: 'Station non trouvée' };
      }

      const playlist = stationDoc.data()?.playlist || [];
      
      if (playlist.length === 0) {
        return { 
          success: true, 
          analytics: { 
            message: 'Playlist vide',
            totalTracks: 0
          }
        };
      }

      // Calculate basic statistics
      const totalTracks = playlist.length;
      const totalDuration = playlist.reduce(
        (sum: number, track: PlaylistItem) => sum + track.duration, 
        0
      );
      
      const tracksByType = playlist.reduce((acc: any, track: PlaylistItem) => {
        acc[track.type] = (acc[track.type] || 0) + 1;
        return acc;
      }, {});

      const durationByType = playlist.reduce((acc: any, track: PlaylistItem) => {
        acc[track.type] = (acc[track.type] || 0) + track.duration;
        return acc;
      }, {});

      // Calculate averages
      const avgTrackDuration = totalDuration / totalTracks;
      const messageRatio = (tracksByType.message || 0) / totalTracks;
      const musicRatio = (tracksByType.music || 0) / totalTracks;

      // Analyze track distribution
      const shortTracks = playlist.filter((t: PlaylistItem) => t.duration < 60).length;
      const mediumTracks = playlist.filter((t: PlaylistItem) => t.duration >= 60 && t.duration < 300).length;
      const longTracks = playlist.filter((t: PlaylistItem) => t.duration >= 300).length;

      // Calculate estimated listening patterns
      const estimatedHours = totalDuration / 3600;
      const estimatedListeningSessions = Math.ceil(estimatedHours / 0.5); // 30min sessions

      const analytics = {
        overview: {
          totalTracks,
          totalDuration: Math.round(totalDuration),
          totalHours: parseFloat(estimatedHours.toFixed(2)),
          avgTrackDuration: Math.round(avgTrackDuration)
        },
        composition: {
          tracksByType,
          durationByType: Object.fromEntries(
            Object.entries(durationByType).map(([k, v]) => [k, Math.round(v as number)])
          ),
          ratios: {
            music: parseFloat(musicRatio.toFixed(3)),
            message: parseFloat(messageRatio.toFixed(3))
          }
        },
        distribution: {
          shortTracks: { count: shortTracks, percentage: parseFloat((shortTracks / totalTracks * 100).toFixed(1)) },
          mediumTracks: { count: mediumTracks, percentage: parseFloat((mediumTracks / totalTracks * 100).toFixed(1)) },
          longTracks: { count: longTracks, percentage: parseFloat((longTracks / totalTracks * 100).toFixed(1)) }
        },
        insights: {
          estimatedListeningSessions,
          recommendedImprovements: this.generateRecommendations(playlist, {
            messageRatio,
            avgTrackDuration,
            totalTracks
          })
        },
        generatedAt: new Date().toISOString()
      };

      console.log('✅ Playlist analytics generated');
      return { success: true, analytics };

    } catch (error) {
      console.error('❌ Error analyzing playlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur analyse'
      };
    }
  }

  /**
   * Génère des recommandations d'amélioration
   */
  private generateRecommendations(playlist: PlaylistItem[], stats: any): string[] {
    const recommendations: string[] = [];

    if (stats.messageRatio > 0.5) {
      recommendations.push('Trop de messages - ajoutez plus de musique pour équilibrer');
    } else if (stats.messageRatio < 0.1) {
      recommendations.push('Très peu de messages - ajoutez des annonces DJ pour plus d\'interactivité');
    }

    if (stats.avgTrackDuration > 300) {
      recommendations.push('Pistes très longues - variez avec des morceaux plus courts');
    } else if (stats.avgTrackDuration < 120) {
      recommendations.push('Pistes très courtes - ajoutez des morceaux plus longs pour plus de contenu');
    }

    if (stats.totalTracks < 10) {
      recommendations.push('Playlist courte - ajoutez plus de pistes pour éviter la répétition');
    } else if (stats.totalTracks > 50) {
      recommendations.push('Playlist très longue - envisagez de la diviser en plusieurs sessions');
    }

    // Check for variety in recent tracks
    const recentTracks = playlist.slice(0, 10);
    const recentTypes = recentTracks.map(t => t.type);
    const typeVariety = new Set(recentTypes).size;
    
    if (typeVariety === 1) {
      recommendations.push('Manque de variété en début de playlist - alternez musique et messages');
    }

    if (recommendations.length === 0) {
      recommendations.push('Playlist bien équilibrée - continuez sur cette voie !');
    }

    return recommendations;
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Valide la structure d'un item de playlist
   */
  private validatePlaylistItem(item: any): item is PlaylistItem {
    if (!item || typeof item !== 'object') return false;
    
    const required = ['id', 'type', 'title', 'content', 'duration'];
    const hasRequired = required.every(field => 
      field in item && item[field] !== undefined && item[field] !== null
    );
    
    if (!hasRequired) return false;
    
    if (!['music', 'message'].includes(item.type)) return false;
    if (typeof item.duration !== 'number' || item.duration <= 0) return false;
    
    return true;
  }

  /**
   * Optimise une playlist pour les performances
   */
  async optimizePlaylist(
    stationId: string,
    options: {
      maxDuration?: number;
      targetMessageRatio?: number;
      removeDuplicates?: boolean;
      sortByDuration?: boolean;
    } = {}
  ): Promise<{ success: boolean; optimizations?: string[]; error?: string }> {
    try {
      console.log('⚡ Optimizing playlist for station:', stationId);

      const stationRef = doc(db, 'stations', stationId);
      const stationDoc = await getDoc(stationRef);
      
      if (!stationDoc.exists()) {
        return { success: false, error: 'Station non trouvée' };
      }

      let playlist = [...(stationDoc.data()?.playlist || [])];
      const optimizations: string[] = [];

      // Remove duplicates if requested
      if (options.removeDuplicates) {
        const originalLength = playlist.length;
        const seen = new Set();
        playlist = playlist.filter(track => {
          const key = `${track.type}-${track.title}-${track.artist}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        
        if (playlist.length !== originalLength) {
          optimizations.push(`Supprimé ${originalLength - playlist.length} doublons`);
        }
      }

      // Limit total duration if specified
      if (options.maxDuration) {
        const currentDuration = playlist.reduce((sum, track) => sum + track.duration, 0);
        if (currentDuration > options.maxDuration) {
          let runningDuration = 0;
          playlist = playlist.filter(track => {
            runningDuration += track.duration;
            return runningDuration <= options.maxDuration!;
          });
          optimizations.push(`Durée limitée à ${Math.round(options.maxDuration / 60)} minutes`);
        }
      }

      // Adjust message ratio if specified
      if (options.targetMessageRatio !== undefined) {
        const currentMessages = playlist.filter(t => t.type === 'message').length;
        const totalTracks = playlist.length;
        const currentRatio = currentMessages / totalTracks;
        const targetMessages = Math.round(totalTracks * options.targetMessageRatio);

        if (currentMessages > targetMessages) {
          // Remove excess messages (keep the most recent ones)
          const messagesToRemove = currentMessages - targetMessages;
          const messages = playlist.filter(t => t.type === 'message');
          const oldestMessages = messages.slice(0, messagesToRemove);
          playlist = playlist.filter(track => 
            !oldestMessages.some(msg => msg.id === track.id)
          );
          optimizations.push(`Supprimé ${messagesToRemove} messages en excès`);
        }
      }

      // Sort by duration if requested
      if (options.sortByDuration) {
        playlist.sort((a, b) => a.duration - b.duration);
        optimizations.push('Pistes triées par durée croissante');
      }

      // Update station if optimizations were made
      if (optimizations.length > 0) {
        await updateDoc(stationRef, {
          playlist,
          lastModified: Timestamp.now()
        });
      }

      console.log(`✅ Playlist optimized with ${optimizations.length} improvements`);
      return { success: true, optimizations };

    } catch (error) {
      console.error('❌ Error optimizing playlist:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erreur optimisation'
      };
    }
  }

  /**
   * Obtient les templates disponibles
   */
  getAvailableTemplates() {
    return Object.entries(this.getPlaylistTemplates()).map(([id, template]) => ({
      id,
      ...template
    }));
  }

  // ========================================
  // PLAYLIST INTELLIGENCE & OPTIMIZATION
  // ========================================

  /**
   * Optimise l'ordre des pistes pour une meilleure expérience
   */
  private optimizeTrackOrder(playlist: PlaylistItem[]): { playlist: PlaylistItem[]; changed: boolean } {
    const originalOrder = playlist.map(t => t.id).join(',');
    const optimized = [...playlist];
    
    // Éviter trop de messages consécutifs
    for (let i = 1; i < optimized.length - 1; i++) {
      if (optimized[i].type === 'message' && 
          optimized[i - 1].type === 'message' && 
          optimized[i + 1].type === 'message') {
        
        // Chercher une piste musicale proche à échanger
        const nearbyMusicIndex = this.findNearbyMusic(optimized, i);
        if (nearbyMusicIndex !== -1) {
          [optimized[i], optimized[nearbyMusicIndex]] = [optimized[nearbyMusicIndex], optimized[i]];
        }
      }
    }
    
    // Équilibrer les durées (éviter trop de pistes courtes/longues consécutives)
    this.balanceTrackDurations(optimized);
    
    const newOrder = optimized.map(t => t.id).join(',');
    return {
      playlist: optimized,
      changed: originalOrder !== newOrder
    };
  }

  /**
   * Trouve une piste musicale proche pour échanger
   */
  private findNearbyMusic(playlist: PlaylistItem[], startIndex: number): number {
    const searchRadius = 3;
    
    for (let distance = 1; distance <= searchRadius; distance++) {
      // Chercher avant
      const beforeIndex = startIndex - distance;
      if (beforeIndex >= 0 && playlist[beforeIndex].type === 'music') {
        return beforeIndex;
      }
      
      // Chercher après
      const afterIndex = startIndex + distance;
      if (afterIndex < playlist.length && playlist[afterIndex].type === 'music') {
        return afterIndex;
      }
    }
    
    return -1;
  }

  /**
   * Équilibre les durées des pistes
   */
  private balanceTrackDurations(playlist: PlaylistItem[]): void {
    // Identifier les séquences de pistes très courtes ou très longues
    for (let i = 0; i < playlist.length - 2; i++) {
      const current = playlist[i];
      const next = playlist[i + 1];
      const afterNext = playlist[i + 2];
      
      // Si 3 pistes très courtes consécutives (< 60s)
      if (current.duration < 60 && next.duration < 60 && afterNext.duration < 60) {
        // Chercher une piste plus longue à proximité
        const longerTrackIndex = this.findTrackByDuration(playlist, i, 120, 5);
        if (longerTrackIndex !== -1) {
          [playlist[i + 1], playlist[longerTrackIndex]] = [playlist[longerTrackIndex], playlist[i + 1]];
        }
      }
      
      // Si 3 pistes très longues consécutives (> 300s)
      if (current.duration > 300 && next.duration > 300 && afterNext.duration > 300) {
        // Chercher une piste plus courte à proximité
        const shorterTrackIndex = this.findTrackByDuration(playlist, i, 180, 5, true);
        if (shorterTrackIndex !== -1) {
          [playlist[i + 1], playlist[shorterTrackIndex]] = [playlist[shorterTrackIndex], playlist[i + 1]];
        }
      }
    }
  }

  /**
   * Trouve une piste avec une durée spécifique dans un rayon donné
   */
  private findTrackByDuration(
    playlist: PlaylistItem[], 
    startIndex: number, 
    targetDuration: number, 
    radius: number,
    shorter = false
  ): number {
    for (let distance = 1; distance <= radius; distance++) {
      // Chercher avant
      const beforeIndex = startIndex - distance;
      if (beforeIndex >= 0) {
        const track = playlist[beforeIndex];
        if (shorter ? track.duration < targetDuration : track.duration > targetDuration) {
          return beforeIndex;
        }
      }
      
      // Chercher après
      const afterIndex = startIndex + distance + 3; // Éviter la zone des 3 pistes problématiques
      if (afterIndex < playlist.length) {
        const track = playlist[afterIndex];
        if (shorter ? track.duration < targetDuration : track.duration > targetDuration) {
          return afterIndex;
        }
      }
    }
    
    return -1;
  }

  /**
   * Génère une playlist intelligente basée sur l'historique et les préférences
   */
  async generateSmartPlaylist(
    stationId: string,
    options: {
      targetDuration?: number; // en secondes
      messageRatio?: number; // 0.0 - 1.0
      theme?: string;
      djStyle?: 'energetic' | 'calm' | 'mysterious' | 'professional';
      timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    } = {}
  ): Promise<{ success: boolean; playlist?: PlaylistItem[]; insights?: string[]; error?: string }> {
    try {
      console.log('🧠 Generating smart playlist with options:', options);
      
      const insights: string[] = [];
      const defaultDuration = options.targetDuration || 3600; // 1 heure par défaut
      const messageRatio = options.messageRatio || 0.25; // 25% messages par défaut
      
      // Calculer le nombre de pistes basé sur la durée cible
      const avgTrackDuration = 180; // 3 minutes moyenne
      const totalTracks = Math.round(defaultDuration / avgTrackDuration);
      const messageCount = Math.round(totalTracks * messageRatio);
      const musicCount = totalTracks - messageCount;
      
      insights.push(`Génération de ${totalTracks} pistes (${musicCount} musiques, ${messageCount} messages)`);
      
      // Adapter le style selon l'heure
      let adjustedTheme = options.theme || 'radio post-apocalyptique';
      if (options.timeOfDay) {
        switch (options.timeOfDay) {
          case 'morning':
            adjustedTheme += ' - Ambiance matinale énergique';
            insights.push('Style adapté pour le matin : plus énergique');
            break;
          case 'evening':
            adjustedTheme += ' - Ambiance relaxante du soir';
            insights.push('Style adapté pour le soir : plus calme');
            break;
          case 'night':
            adjustedTheme += ' - Ambiance nocturne mystérieuse';
            insights.push('Style adapté pour la nuit : plus mystérieux');
            break;
        }
      }
      
      // Générer la playlist de base
      const templateResult = await this.generateFromTemplate(
        stationId,
        'balanced-mix', // Template par défaut
        { 
          id: 'smart-dj', 
          name: 'DJ Intelligent', 
          description: adjustedTheme,
          voice: 'alloy'
        } as any,
        adjustedTheme
      );
      
      if (!templateResult.success || !templateResult.playlist) {
        return { success: false, error: templateResult.error };
      }
      
      // Optimiser l'ordre des pistes
      const optimizedResult = this.optimizeTrackOrder(templateResult.playlist);
      let finalPlaylist = optimizedResult.playlist;
      
      if (optimizedResult.changed) {
        insights.push('Ordre des pistes optimisé pour une meilleure expérience');
      }
      
      // Ajuster les durées si nécessaire
      const totalGeneratedDuration = finalPlaylist.reduce((sum, track) => sum + track.duration, 0);
      if (Math.abs(totalGeneratedDuration - defaultDuration) > defaultDuration * 0.2) {
        // Si l'écart est > 20%, ajuster
        if (totalGeneratedDuration > defaultDuration) {
          // Supprimer des pistes en commençant par les plus longues
          finalPlaylist = this.trimPlaylistToDuration(finalPlaylist, defaultDuration);
          insights.push(`Playlist raccourcie à ${Math.round(defaultDuration / 60)} minutes`);
        } else {
          // Ajouter des pistes courtes
          const additionalTracks = await this.generateAdditionalTracks(
            defaultDuration - totalGeneratedDuration,
            messageRatio
          );
          finalPlaylist = [...finalPlaylist, ...additionalTracks];
          insights.push(`${additionalTracks.length} pistes supplémentaires ajoutées`);
        }
      }
      
      console.log(`✅ Smart playlist generated: ${finalPlaylist.length} tracks, ${Math.round(finalPlaylist.reduce((s, t) => s + t.duration, 0) / 60)} minutes`);
      
      return {
        success: true,
        playlist: finalPlaylist,
        insights
      };
      
    } catch (error) {
      console.error('❌ Error generating smart playlist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur génération intelligente'
      };
    }
  }

  /**
   * Raccourcit une playlist à une durée cible
   */
  private trimPlaylistToDuration(playlist: PlaylistItem[], targetDuration: number): PlaylistItem[] {
    // Trier par durée décroissante pour supprimer les plus longues d'abord
    const sorted = [...playlist].sort((a, b) => b.duration - a.duration);
    let currentDuration = playlist.reduce((sum, track) => sum + track.duration, 0);
    const result = [...playlist];
    
    for (const track of sorted) {
      if (currentDuration <= targetDuration) break;
      
      const index = result.findIndex(t => t.id === track.id);
      if (index !== -1) {
        result.splice(index, 1);
        currentDuration -= track.duration;
      }
    }
    
    return result;
  }

  /**
   * Génère des pistes supplémentaires pour atteindre la durée cible
   */
  private async generateAdditionalTracks(
    neededDuration: number,
    messageRatio: number
  ): Promise<PlaylistItem[]> {
    const avgTrackDuration = 120; // 2 minutes pour les pistes supplémentaires
    const additionalCount = Math.ceil(neededDuration / avgTrackDuration);
    const messageCount = Math.round(additionalCount * messageRatio);
    const musicCount = additionalCount - messageCount;
    
    const tracks: PlaylistItem[] = [];
    
    // Générer des messages courts
    for (let i = 0; i < messageCount; i++) {
      tracks.push({
        id: `additional-msg-${Date.now()}-${i}`,
        type: 'message',
        title: `Message Radio ${i + 1}`,
        content: 'Message généré automatiquement pour compléter la playlist',
        artist: 'DJ Intelligent',
        duration: Math.floor(Math.random() * 30) + 15, // 15-45 secondes
        url: '',
        addedAt: new Date().toISOString()
      });
    }
    
    // Générer des pistes musicales courtes
    for (let i = 0; i < musicCount; i++) {
      tracks.push({
        id: `additional-music-${Date.now()}-${i}`,
        type: 'music',
        title: `Piste Supplémentaire ${i + 1}`,
        content: 'Piste générée pour compléter la durée cible',
        artist: 'Artiste Radio',
        duration: avgTrackDuration + (Math.random() * 60 - 30), // ±30s variation
        url: '',
        addedAt: new Date().toISOString()
      });
    }
    
    return tracks;
  }

  /**
   * Analyse et suggère des améliorations personnalisées
   */
  async getPersonalizedRecommendations(
    stationId: string,
    userListeningHistory?: any[]
  ): Promise<{ success: boolean; recommendations?: string[]; error?: string }> {
    try {
      const analyticsResult = await this.analyzePlaylistPerformance(stationId);
      
      if (!analyticsResult.success || !analyticsResult.analytics) {
        return { success: false, error: analyticsResult.error };
      }
      
      const analytics = analyticsResult.analytics;
      const recommendations: string[] = [];
      
      // Recommandations basées sur les analytics
      if (analytics.composition.ratios.message > 0.4) {
        recommendations.push('🎵 Ajoutez plus de musique pour équilibrer votre playlist');
      }
      
      if (analytics.overview.totalTracks < 15) {
        recommendations.push('📊 Votre playlist est courte - ajoutez plus de contenu pour éviter la répétition');
      }
      
      if (analytics.distribution.shortTracks.percentage > 60) {
        recommendations.push('⏱️ Beaucoup de pistes courtes - variez avec des morceaux plus longs');
      }
      
      // Recommandations basées sur l'historique (si disponible)
      if (userListeningHistory && userListeningHistory.length > 0) {
        const skipRate = userListeningHistory.filter(h => h.action === 'skip').length / userListeningHistory.length;
        
        if (skipRate > 0.3) {
          recommendations.push('⏭️ Taux de skip élevé - variez le contenu ou ajustez le style DJ');
        }
        
        const favoriteTypes = this.analyzeFavoriteTypes(userListeningHistory);
        if (favoriteTypes.music > favoriteTypes.message) {
          recommendations.push('🎶 Vous préférez la musique - réduisez les messages DJ');
        }
      }
      
      // Recommandations pour l'optimisation
      recommendations.push('⚡ Utilisez la génération intelligente pour optimiser automatiquement');
      recommendations.push('📈 Consultez régulièrement les analytics pour améliorer l\'engagement');
      
      return {
        success: true,
        recommendations
      };
      
    } catch (error) {
      console.error('❌ Error getting personalized recommendations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur recommandations'
      };
    }
  }

  /**
   * Analyse les types de contenu préférés par l'utilisateur
   */
  private analyzeFavoriteTypes(history: any[]): { music: number; message: number } {
    const completedListens = history.filter(h => h.action === 'completed');
    const musicCompleted = completedListens.filter(h => h.trackType === 'music').length;
    const messageCompleted = completedListens.filter(h => h.trackType === 'message').length;
    
    return {
      music: musicCompleted,
      message: messageCompleted
    };
  }
}

// Export singleton instance
export const playlistManagerService = PlaylistManagerService.getInstance();
export default playlistManagerService;