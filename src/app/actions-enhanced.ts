'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter } from '@/lib/types';
import { optimizedFirebaseService } from '@/services/OptimizedFirebaseService';
import { enhancedCacheService } from '@/services/EnhancedCacheService';
import { backendMonitoringService, measurePerformance } from '@/services/BackendMonitoringService';
import { safeToISOString } from '@/lib/dateUtils';
import { 
  BackendError, 
  ErrorCode, 
  handleAsyncError, 
  ValidationError,
  ResourceNotFoundError,
  FrequencyConflictError 
} from '@/lib/errors';
import { 
  validateAndSanitize, 
  StationCreateSchema, 
  SecurityValidator,
  createSecurityContext 
} from '@/lib/validation';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { generatePlaylist, type GeneratePlaylistInput } from '@/ai/flows/generate-playlist-flow';
import { searchPlexMusic, getRandomPlexTracks } from '@/lib/plex';
import { DJ_CHARACTERS } from '@/lib/data';

// ========================================
// ACTIONS BACKEND AMÉLIORÉES
// ========================================

/**
 * Récupérer une station par fréquence avec cache optimisé
 */
// @measurePerformance('get-station-by-frequency') // Decorator disabled for ESLint compatibility
export async function getStationForFrequencyEnhanced(
  frequency: number
): Promise<Station | null> {
  try {
    // Validation de la fréquence
    if (frequency < 87.0 || frequency > 108.0) {
      throw new ValidationError(
        'Fréquence invalide (87.0-108.0 MHz)',
        'frequency'
      );
    }

    // Utiliser le service optimisé avec cache
    const station = await optimizedFirebaseService.getStationByFrequency(frequency);
    
    return station;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Erreur récupération station ${frequency} MHz`,
      500,
      { frequency }
    );
  }
}

/**
 * Créer une station avec validation et sécurité améliorées
 */
// @measurePerformance('create-station') // Decorator disabled for ESLint compatibility
export async function createStationEnhanced(
  stationData: any,
  userId: string
): Promise<Station> {
  try {
    // Validation des données
    const validation = validateAndSanitize(StationCreateSchema, stationData);
    if (!validation.success) {
      throw new ValidationError(validation.error!.message, validation.error!.field);
    }

    const validatedData = validation.data!;

    // Vérification de sécurité : limites utilisateur
    const userStations = await getUserStationsEnhanced(userId);
    const limits = SecurityValidator.validateUserLimits(userId, userStations);
    
    if (!limits.canCreate) {
      throw new BackendError(
        ErrorCode.RESOURCE_LIMIT_EXCEEDED,
        `Limite de ${limits.limit} stations atteinte (${limits.current}/${limits.limit})`,
        429,
        { userId, currentCount: limits.current, limit: limits.limit }
      );
    }

    // Validation de contenu
    const contentValidation = SecurityValidator.validateContent(validatedData.theme);
    if (!contentValidation.isValid) {
      throw new ValidationError(contentValidation.reason!, 'theme');
    }

    // Vérifier disponibilité de la fréquence
    const existingStation = await optimizedFirebaseService.getStationByFrequency(
      validatedData.frequency
    );
    
    if (existingStation) {
      throw new FrequencyConflictError(
        validatedData.frequency,
        existingStation.name
      );
    }

    // Créer la station via le service optimisé
    const newStation = await optimizedFirebaseService.createStation({
      ...validatedData,
      ownerId: userId,
    });

    // Invalider les caches pertinents
    await enhancedCacheService.invalidatePattern(/^stations_/);
    
    // Revalider les pages Next.js
    revalidatePath('/admin/stations');
    revalidatePath('/api/stations');

    return newStation;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur lors de la création de la station',
      500,
      { stationData: { ...stationData, ownerId: userId } }
    );
  }
}

/**
 * Mettre à jour une station avec validation de propriété
 */
// @measurePerformance('update-station') // Decorator disabled for ESLint compatibility
export async function updateStationEnhanced(
  stationId: string,
  updates: Partial<Station>,
  userId: string
): Promise<Station> {
  try {
    // Récupérer la station existante
    const existingStation = await getStationByIdEnhanced(stationId);
    if (!existingStation) {
      throw new ResourceNotFoundError('Station', stationId);
    }

    // Vérification de propriété
    const securityContext = createSecurityContext(userId);
    if (!SecurityValidator.validateUserOwnership(userId, existingStation.ownerId) && 
        !securityContext.permissions.canEditAnyStation) {
      throw new BackendError(
        ErrorCode.FORBIDDEN,
        'Vous n\'êtes pas autorisé à modifier cette station',
        403,
        { stationId, userId }
      );
    }

    // Validation du contenu si modifié
    if (updates.theme) {
      const contentValidation = SecurityValidator.validateContent(updates.theme);
      if (!contentValidation.isValid) {
        throw new ValidationError(contentValidation.reason!, 'theme');
      }
    }

    // Vérifier disponibilité de la nouvelle fréquence si changée
    if (updates.frequency && updates.frequency !== existingStation.frequency) {
      const conflictStation = await optimizedFirebaseService.getStationByFrequency(
        updates.frequency
      );
      
      if (conflictStation && conflictStation.id !== stationId) {
        throw new FrequencyConflictError(updates.frequency, conflictStation.name);
      }
    }

    // Mettre à jour via le service optimisé
    const updatedStation = await optimizedFirebaseService.updateStation(stationId, updates);

    // Invalider les caches
    await enhancedCacheService.invalidatePattern(/^station/);
    
    // Revalider les pages
    revalidatePath('/admin/stations');
    revalidatePath(`/admin/stations/${stationId}`);

    return updatedStation;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur lors de la mise à jour de la station',
      500,
      { stationId, updates, userId }
    );
  }
}

/**
 * Supprimer une station avec vérifications de sécurité
 */
// @measurePerformance('delete-station') // Decorator disabled for ESLint compatibility
export async function deleteStationEnhanced(
  stationId: string,
  userId: string
): Promise<boolean> {
  try {
    // Récupérer la station
    const station = await getStationByIdEnhanced(stationId);
    if (!station) {
      return false; // Déjà supprimée
    }

    // Vérification de propriété
    const securityContext = createSecurityContext(userId);
    if (!SecurityValidator.validateUserOwnership(userId, station.ownerId) && 
        !securityContext.permissions.canDeleteAnyStation) {
      throw new BackendError(
        ErrorCode.FORBIDDEN,
        'Vous n\'êtes pas autorisé à supprimer cette station',
        403,
        { stationId, userId }
      );
    }

    // Supprimer via le service optimisé
    const deleted = await optimizedFirebaseService.deleteStation(stationId);

    if (deleted) {
      // Invalider tous les caches liés
      await enhancedCacheService.invalidatePattern(/^station/);
      
      // Revalider les pages
      revalidatePath('/admin/stations');
      revalidatePath('/api/stations');
    }

    return deleted;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur lors de la suppression de la station',
      500,
      { stationId, userId }
    );
  }
}

/**
 * Récupérer une station par ID avec cache
 */
// @measurePerformance('get-station-by-id') // Decorator disabled for ESLint compatibility
export async function getStationByIdEnhanced(stationId: string): Promise<Station | null> {
  try {
    // Vérifier le cache d'abord
    const cached = await enhancedCacheService.get<Station>(`station_id_${stationId}`);
    if (cached) {
      return cached;
    }

    // Récupérer depuis Firebase (cette méthode n'existe pas encore dans optimizedFirebaseService)
    // TODO: Ajouter getStationById au service optimisé
    // Pour l'instant, utiliser l'ancienne méthode
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    const [error, stationDoc] = await handleAsyncError(
      getDoc(doc(db, 'stations', stationId))
    );

    if (error) {
      throw error;
    }

    if (!stationDoc!.exists()) {
      return null;
    }

    const stationData = stationDoc!.data();
    const station: Station = {
      id: stationDoc!.id,
      name: stationData!.name,
      frequency: stationData!.frequency,
      ownerId: stationData!.ownerId,
      djCharacterId: stationData!.djCharacterId,
      playlist: stationData!.playlist || [],
      theme: stationData!.theme,
      createdAt: safeToISOString(stationData!.createdAt),
    };

    // Mettre en cache
    await enhancedCacheService.set(`station_id_${stationId}`, station, 5 * 60 * 1000);

    return station;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Erreur récupération station ID ${stationId}`,
      500,
      { stationId }
    );
  }
}

/**
 * Récupérer les stations d'un utilisateur avec cache
 */
// @measurePerformance('get-user-stations') // Decorator disabled for ESLint compatibility
export async function getUserStationsEnhanced(userId: string): Promise<Station[]> {
  try {
    // Vérifier le cache
    const cacheKey = `user_stations_${userId}`;
    const cached = await enhancedCacheService.get<Station[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Récupérer depuis Firebase
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    
    const [error, querySnapshot] = await handleAsyncError(
      getDocs(query(
        collection(db, 'stations'),
        where('ownerId', '==', userId)
      ))
    );

    if (error) {
      throw error;
    }

    const stations: Station[] = querySnapshot!.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        frequency: data.frequency,
        ownerId: data.ownerId,
        djCharacterId: data.djCharacterId,
        playlist: data.playlist || [],
        theme: data.theme,
        createdAt: safeToISOString(data.createdAt),
      };
    });

    // Mettre en cache pendant 2 minutes
    await enhancedCacheService.set(cacheKey, stations, 2 * 60 * 1000);

    return stations;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      `Erreur récupération stations utilisateur ${userId}`,
      500,
      { userId }
    );
  }
}

/**
 * Générer une playlist optimisée avec cache Plex
 */
// @measurePerformance('generate-playlist-enhanced') // Decorator disabled for ESLint compatibility
export async function generatePlaylistEnhanced(
  input: GeneratePlaylistInput
): Promise<{ items: PlaylistItem[] }> {
  try {
    // Validation des données d'entrée
    if (!input.stationName || !input.djName || !input.theme) {
      throw new ValidationError('Données d\'entrée incomplètes pour la génération de playlist');
    }

    // Validation du contenu
    const themeValidation = SecurityValidator.validateContent(input.theme);
    if (!themeValidation.isValid) {
      throw new ValidationError(themeValidation.reason!, 'theme');
    }

    // Vérifier le cache pour des playlists similaires
    const cacheKey = `playlist_generated_${Buffer.from(JSON.stringify(input)).toString('base64').slice(0, 32)}`;
    const cached = await enhancedCacheService.get<{ items: PlaylistItem[] }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Générer la playlist via l'IA
    const generatedPlaylist = await generatePlaylist(input);

    // Enrichir avec des tracks Plex si disponibles
    const [plexError, plexTracks] = await handleAsyncError(
      getRandomPlexTracks(undefined, 10)
    );

    if (!plexError && plexTracks && plexTracks.length > 0) {
      // Remplacer quelques éléments musicaux par de vrais tracks Plex
      let plexIndex = 0;
      const enhancedItems = generatedPlaylist.items.map((item, index) => {
        if (item.type === 'music' && plexTracks[plexIndex] && Math.random() > 0.5) {
          const plexTrack = plexTracks[plexIndex];
          plexIndex++;
          
          return {
            ...plexTrack,
            id: `enhanced-${Date.now()}-${index}`,
            content: item.content, // Garder le contexte généré par l'IA
            addedAt: safeToISOString(new Date()),
          };
        }
        
        return {
          ...item,
          id: `enhanced-${Date.now()}-${index}`,
          addedAt: safeToISOString(new Date()),
          // Ensure required PlaylistItem properties
          title: (item as any).title || item.content || 'Untitled',
          url: (item as any).url || '',
          duration: (item as any).duration || 180, // Default 3 minutes
        } as PlaylistItem;
      });

      const result = { items: enhancedItems };
      
      // Mettre en cache pendant 30 minutes
      await enhancedCacheService.set(cacheKey, result, 30 * 60 * 1000);
      
      return result;
    }

    // Pas de tracks Plex disponibles, retourner la playlist générée
    const result = {
      items: generatedPlaylist.items.map((item, index) => ({
        ...item,
        id: `enhanced-${Date.now()}-${index}`,
        addedAt: safeToISOString(new Date()),
        // Ensure required PlaylistItem properties
        title: (item as any).title || item.content || 'Untitled',
        url: (item as any).url || '',
        duration: (item as any).duration || 180, // Default 3 minutes
      } as PlaylistItem))
    };

    // Mettre en cache
    await enhancedCacheService.set(cacheKey, result, 30 * 60 * 1000);

    return result;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.AI_SERVICE_ERROR,
      'Erreur lors de la génération de playlist',
      500,
      { input }
    );
  }
}

/**
 * Mettre à jour la fréquence utilisateur avec optimisations
 */
// @measurePerformance('update-user-frequency') // Decorator disabled for ESLint compatibility
export async function updateUserFrequencyEnhanced(
  userId: string,
  frequency: number
): Promise<void> {
  try {
    // Validation
    if (frequency < 87.0 || frequency > 108.0) {
      throw new ValidationError('Fréquence invalide (87.0-108.0 MHz)', 'frequency');
    }

    // Utiliser un batch pour optimiser
    optimizedFirebaseService.queueBatchOperation({
      type: 'update',
      collection: 'users',
      id: userId,
      data: {
        lastFrequency: frequency,
        lastActivity: new Date(),
      },
    });

    // Invalider le cache utilisateur
    await enhancedCacheService.delete(`user_${userId}`, true);

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur mise à jour fréquence utilisateur',
      500,
      { userId, frequency }
    );
  }
}

/**
 * Recherche de stations optimisée
 */
// @measurePerformance('search-stations') // Decorator disabled for ESLint compatibility
export async function searchStationsEnhanced(
  query: string,
  filters: {
    minFreq?: number;
    maxFreq?: number;
    ownerId?: string;
    djCharacterId?: string;
  } = {}
): Promise<Station[]> {
  try {
    // Validation
    if (!query || query.length < 2) {
      throw new ValidationError('Requête de recherche trop courte (minimum 2 caractères)');
    }

    // Validation du contenu de recherche
    const contentValidation = SecurityValidator.validateContent(query);
    if (!contentValidation.isValid) {
      throw new ValidationError(contentValidation.reason!);
    }

    const cacheKey = `search_stations_${Buffer.from(JSON.stringify({ query, filters })).toString('base64').slice(0, 32)}`;
    
    // Vérifier le cache
    const cached = await enhancedCacheService.get<Station[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Récupérer toutes les stations dans la plage (optimisé avec le service)
    const minFreq = filters.minFreq || 87.0;
    const maxFreq = filters.maxFreq || 108.0;
    
    const stations = await optimizedFirebaseService.getStationsInRange(minFreq, maxFreq);

    // Filtrer côté client (pour une recherche simple - en production, utiliser Algolia ou similar)
    const filtered = stations.filter(station => {
      const matchesQuery = station.name.toLowerCase().includes(query.toLowerCase()) ||
                          (station.theme && station.theme.toLowerCase().includes(query.toLowerCase()));
      
      const matchesOwner = !filters.ownerId || station.ownerId === filters.ownerId;
      const matchesDJ = !filters.djCharacterId || station.djCharacterId === filters.djCharacterId;
      
      return matchesQuery && matchesOwner && matchesDJ;
    });

    // Mettre en cache pendant 1 minute (recherche change souvent)
    await enhancedCacheService.set(cacheKey, filtered, 60 * 1000);

    return filtered;

  } catch (error) {
    if (error instanceof BackendError) {
      throw error;
    }
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur lors de la recherche de stations',
      500,
      { query, filters }
    );
  }
}

// ========================================
// ACTIONS DE MAINTENANCE
// ========================================

/**
 * Nettoyer les ressources backend
 */
export async function cleanupBackendResources(): Promise<{
  cacheCleared: boolean;
  performanceHistoryCleared: boolean;
  oldErrorsCleared: boolean;
}> {
  try {
    // Nettoyer le cache
    await enhancedCacheService.clear();
    
    // Nettoyer l'historique des performances
    backendMonitoringService.clearPerformanceHistory();
    
    // Nettoyer les anciens logs d'erreurs (plus de 7 jours)
    const { errorHandler } = await import('@/lib/errors');
    errorHandler.clearOldLogs(7);

    return {
      cacheCleared: true,
      performanceHistoryCleared: true,
      oldErrorsCleared: true,
    };

  } catch (error) {
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur lors du nettoyage des ressources backend',
      500
    );
  }
}

/**
 * Obtenir les métriques backend
 */
export async function getBackendMetrics() {
  try {
    return backendMonitoringService.exportMetrics();
  } catch (error) {
    throw new BackendError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'Erreur lors de la récupération des métriques',
      500
    );
  }
}