import { NextRequest, NextResponse } from 'next/server';
import { optimizedFirebaseService } from '@/services/OptimizedFirebaseService';
import { enhancedCacheService } from '@/services/EnhancedCacheService';
import { BackendError, createErrorResponse, errorHandler } from '@/lib/errors';
import { validateAndSanitize, StationCreateSchema, PaginationSchema } from '@/lib/validation';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';

// ========================================
// API ROUTE STATIONS OPTIMISÉE
// ========================================

// export const runtime = 'edge'; // Disabled for Node.js API compatibility

// GET /api/stations - Récupérer les stations avec pagination et cache
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Validation des paramètres de pagination
    const paginationData = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'frequency',
      sortOrder: searchParams.get('sortOrder') || 'asc',
    };

    const validation = validateAndSanitize(PaginationSchema, paginationData);
    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse(new BackendError(
          validation.error!.code as any,
          validation.error!.message,
          400
        )),
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder } = validation.data!;

    // Paramètres de requête spécifiques
    const minFreq = parseFloat(searchParams.get('minFreq') || '87.0');
    const maxFreq = parseFloat(searchParams.get('maxFreq') || '108.0');
    const useCache = searchParams.get('cache') !== 'false';

    // Clé de cache pour cette requête
    const cacheKey = `stations_api_${page}_${limit}_${sortBy}_${sortOrder}_${minFreq}_${maxFreq}`;
    
    // Vérifier le cache si activé
    if (useCache) {
      const cached = await enhancedCacheService.get(cacheKey);
      if (cached) {
        return NextResponse.json({
          ...cached,
          cached: true,
          responseTime: Date.now() - startTime,
        });
      }
    }

    // Récupérer les stations avec pagination
    const result = await optimizedFirebaseService.getPaginatedStations(
      limit,
      undefined, // TODO: Implémenter cursor-based pagination
      {
        orderBy: sortBy,
        orderDirection: sortOrder as 'asc' | 'desc',
        useCache,
      }
    );

    // Filtrer par range de fréquences si spécifié
    const filteredStations = result.data.filter(
      station => station.frequency >= minFreq && station.frequency <= maxFreq
    );

    const response = {
      success: true,
      data: filteredStations,
      pagination: {
        page,
        limit,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
        total: filteredStations.length,
      },
      responseTime: Date.now() - startTime,
    };

    // Mettre en cache pendant 2 minutes
    if (useCache) {
      await enhancedCacheService.set(cacheKey, response, 2 * 60 * 1000);
    }

    return NextResponse.json(response);

  } catch (error) {
    errorHandler.logError(error as Error);
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur interne du serveur',
        500
      )),
      { status: 500 }
    );
  }
}

// POST /api/stations - Créer une nouvelle station
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // TODO: Implémenter l'authentification
    // const user = await getCurrentUser(request);
    // if (!user) {
    //   throw new AuthenticationError();
    // }

    const body = await request.json();
    
    // Validation des données
    const validation = validateAndSanitize(StationCreateSchema, body);
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

    const stationData = validation.data!;

    // Créer la station
    const newStation = await optimizedFirebaseService.createStation(stationData);

    // Invalider les caches de listes
    await enhancedCacheService.invalidatePattern(/^stations_api_/);

    const response = {
      success: true,
      data: newStation,
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    errorHandler.logError(error as Error);
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors de la création de la station',
        500
      )),
      { status: 500 }
    );
  }
}

// PATCH /api/stations - Mise à jour batch de stations
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { operations } = body;

    if (!Array.isArray(operations) || operations.length === 0) {
      return NextResponse.json(
        createErrorResponse(new BackendError(
          'VALIDATION_ERROR' as any,
          'Tableau d\'opérations requis',
          400
        )),
        { status: 400 }
      );
    }

    // Limiter le nombre d'opérations par batch
    if (operations.length > 50) {
      return NextResponse.json(
        createErrorResponse(new BackendError(
          'VALIDATION_ERROR' as any,
          'Maximum 50 opérations par batch',
          400
        )),
        { status: 400 }
      );
    }

    // Exécuter les opérations en batch
    await optimizedFirebaseService.executeBatch(
      operations.map((op: any) => ({
        type: op.type,
        collection: 'stations',
        id: op.id,
        data: op.data,
      }))
    );

    // Invalider les caches
    await enhancedCacheService.invalidatePattern(/^stations_/);

    const response = {
      success: true,
      message: `${operations.length} opérations exécutées avec succès`,
      responseTime: Date.now() - startTime,
    };

    return NextResponse.json(response);

  } catch (error) {
    errorHandler.logError(error as Error);
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors des opérations batch',
        500
      )),
      { status: 500 }
    );
  }
}

// DELETE /api/stations - Nettoyage et maintenance
export async function DELETE(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'cleanup-cache':
        await enhancedCacheService.clear();
        return NextResponse.json({
          success: true,
          message: 'Cache nettoyé avec succès',
          responseTime: Date.now() - startTime,
        });

      case 'invalidate-pattern':
        const pattern = searchParams.get('pattern');
        if (!pattern) {
          throw new BackendError(
            'VALIDATION_ERROR' as any,
            'Paramètre pattern requis',
            400
          );
        }
        
        const invalidated = await enhancedCacheService.invalidatePattern(
          new RegExp(pattern)
        );
        
        return NextResponse.json({
          success: true,
          message: `${invalidated} entrées de cache invalidées`,
          responseTime: Date.now() - startTime,
        });

      default:
        throw new BackendError(
          'VALIDATION_ERROR' as any,
          'Action non supportée',
          400
        );
    }

  } catch (error) {
    errorHandler.logError(error as Error);
    
    if (error instanceof BackendError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(new BackendError(
        'INTERNAL_SERVER_ERROR' as any,
        'Erreur lors de l\'opération de maintenance',
        500
      )),
      { status: 500 }
    );
  }
}

// OPTIONS - CORS et préflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}