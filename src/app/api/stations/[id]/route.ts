import { NextRequest, NextResponse } from 'next/server';
import { optimizedFirebaseService } from '@/services/OptimizedFirebaseService';
import { enhancedCacheService } from '@/services/EnhancedCacheService';
import { BackendError, createErrorResponse, errorHandler } from '@/lib/errors';
import { validateAndSanitize, StationUpdateSchema } from '@/lib/validation';

// ========================================
// API ROUTE STATION INDIVIDUELLE
// ========================================

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/stations/[id] - Récupérer une station par ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const useCache = searchParams.get('cache') !== 'false';
    const includePlaylist = searchParams.get('includePlaylist') !== 'false';

    // Vérifier le cache d'abord
    if (useCache) {
      const cacheKey = `station_id_${id}`;
      const cached = await enhancedCacheService.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          responseTime: Date.now() - startTime,
        });
      }
    }

    // Récupérer la station depuis Firebase
    const stationRef = await optimizedFirebaseService.getDocument('stations', id);
    if (!stationRef) {
      throw new BackendError(
        'RESOURCE_NOT_FOUND' as any,
        `Station avec l'ID ${id} non trouvée`,
        404,
        { stationId: id }
      );
    }

    // Filtrer la playlist si non demandée (pour économiser de la bande passante)
    let station = stationRef;
    if (!includePlaylist) {
      station = { ...station, playlist: [] };
    }

    // Mettre en cache
    if (useCache) {
      await enhancedCacheService.set(`station_id_${id}`, station, 5 * 60 * 1000);
    }

    const response = {
      success: true,
      data: station,
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    const { id } = await params;
    errorHandler.logError(error as Error, { stationId: id });
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors de la récupération de la station',
        500
      )),
      { status: 500 }
    );
  }
}

// PUT /api/stations/[id] - Mettre à jour une station
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const body = await request.json();

    // TODO: Vérifier les permissions utilisateur
    // const user = await getCurrentUser(request);
    // if (!user) {
    //   throw new AuthenticationError();
    // }

    // Validation des données
    const validation = validateAndSanitize(StationUpdateSchema, { id, ...body });
    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse(new BackendError(
          validation.error!.code as any,
          validation.error!.message,
          400,
          { field: validation.error!.field }
        )),
        { status: 400 }
      );
    }

    const updateData = validation.data!;
    const { id: _id, ...dataWithoutId } = updateData; // Retirer l'ID des données de mise à jour
    const cleanUpdateData = dataWithoutId;

    // Mettre à jour la station
    const updatedStation = await optimizedFirebaseService.updateStation(id, cleanUpdateData);

    // Invalider les caches associés
    await enhancedCacheService.delete(`station_id_${id}`, true);
    await enhancedCacheService.delete(`station_${updatedStation.frequency}`, true);
    await enhancedCacheService.invalidatePattern(/^stations_api_/);

    const response = {
      success: true,
      data: updatedStation,
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    const { id } = await params;
    errorHandler.logError(error as Error, { stationId: id });
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors de la mise à jour de la station',
        500
      )),
      { status: 500 }
    );
  }
}

// DELETE /api/stations/[id] - Supprimer une station
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;

    // TODO: Vérifier les permissions utilisateur
    // const user = await getCurrentUser(request);
    // if (!user) {
    //   throw new AuthenticationError();
    // }

    // Supprimer la station
    const deleted = await optimizedFirebaseService.deleteStation(id);

    if (!deleted) {
      throw new BackendError(
        'RESOURCE_NOT_FOUND' as any,
        `Station avec l'ID ${id} non trouvée`,
        404,
        { stationId: id }
      );
    }

    // Invalider tous les caches liés aux stations
    await enhancedCacheService.delete(`station_id_${id}`, true);
    await enhancedCacheService.invalidatePattern(/^station_/);
    await enhancedCacheService.invalidatePattern(/^stations_/);

    const response = {
      success: true,
      message: 'Station supprimée avec succès',
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    const { id } = await params;
    errorHandler.logError(error as Error, { stationId: id });
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors de la suppression de la station',
        500
      )),
      { status: 500 }
    );
  }
}

// PATCH /api/stations/[id] - Mise à jour partielle
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'update-playlist':
        // Mise à jour spécifique de la playlist
        if (!Array.isArray(data.playlist)) {
          throw new BackendError(
            'VALIDATION_ERROR' as any,
            'Playlist invalide',
            400
          );
        }

        const updatedStation = await optimizedFirebaseService.updateStation(id, {
          playlist: data.playlist,
        });

        // Invalider le cache de la playlist
        await enhancedCacheService.delete(`playlist_${id}`, true);
        await enhancedCacheService.setStation(updatedStation);

        return NextResponse.json({
          success: true,
          data: updatedStation,
          message: 'Playlist mise à jour',
          responseTime: Date.now() - startTime,
        });

      case 'change-dj':
        // Changement de DJ
        if (!data.djCharacterId) {
          throw new BackendError(
            'VALIDATION_ERROR' as any,
            'DJ Character ID requis',
            400
          );
        }

        const stationWithNewDJ = await optimizedFirebaseService.updateStation(id, {
          djCharacterId: data.djCharacterId,
        });

        return NextResponse.json({
          success: true,
          data: stationWithNewDJ,
          message: 'DJ changé avec succès',
          responseTime: Date.now() - startTime,
        });

      case 'toggle-active':
        // Activer/désactiver la station (si cette fonctionnalité existe)
        const toggledStation = await optimizedFirebaseService.updateStation(id, {
          isActive: data.active,
        });

        return NextResponse.json({
          success: true,
          data: toggledStation,
          message: `Station ${data.active ? 'activée' : 'désactivée'}`,
          responseTime: Date.now() - startTime,
        });

      default:
        throw new BackendError(
          'VALIDATION_ERROR' as any,
          `Action '${action}' non supportée`,
          400
        );
    }

  } catch (error) {
    const { id } = await params;
    errorHandler.logError(error as Error, { 
      stationId: id,
      action: (await request.json()).action 
    });
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors de l\'opération sur la station',
        500
      )),
      { status: 500 }
    );
  }
}