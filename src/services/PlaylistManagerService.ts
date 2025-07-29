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
   * Réorganise une playlist avec nouvel ordre
   */
  async reorderPlaylist(
    stationId: string, 
    newOrder: PlaylistItem[]
  ): Promise<{ success: boolean; error?: string }> {
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

      console.log('✅ Playlist reordered successfully');
      return { success: true };

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
      const shortTracks = playlist.filter(t => t.duration < 60).length;
      const mediumTracks = playlist.filter(t => t.duration >= 60 && t.duration < 300).length;
      const longTracks = playlist.filter(t => t.duration >= 300).length;

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
}

// Export singleton instance
export const playlistManagerService = PlaylistManagerService.getInstance();
export default playlistManagerService;