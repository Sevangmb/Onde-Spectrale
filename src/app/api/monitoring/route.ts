import { NextRequest, NextResponse } from 'next/server';
import { backendMonitoringService } from '@/services/BackendMonitoringService';
import { enhancedCacheService } from '@/services/EnhancedCacheService';
import { errorHandler } from '@/lib/errors';

// ========================================
// API MONITORING ET HEALTH CHECKS
// ========================================

// export const runtime = 'edge'; // Disabled for Node.js API compatibility

// GET /api/monitoring - Dashboard de monitoring complet
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        // Vue d'ensemble du système
        const systemMetrics = backendMonitoringService.getSystemMetrics();
        const healthStatus = backendMonitoringService.getOverallHealth();
        
        return NextResponse.json({
          success: true,
          data: {
            system: systemMetrics,
            health: healthStatus,
            timestamp: new Date(),
          },
          responseTime: Date.now() - startTime,
        });

      case 'health':
        // Health checks détaillés
        const detailedHealth = backendMonitoringService.getHealthStatus();
        const overall = backendMonitoringService.getOverallHealth();
        
        return NextResponse.json({
          success: true,
          data: {
            overall,
            services: detailedHealth,
          },
          responseTime: Date.now() - startTime,
        });

      case 'performance':
        // Métriques de performance
        const operation = searchParams.get('operation');
        const limit = parseInt(searchParams.get('limit') || '100');
        
        const performanceHistory = backendMonitoringService.getPerformanceHistory(
          operation || undefined,
          limit
        );
        
        return NextResponse.json({
          success: true,
          data: {
            history: performanceHistory,
            operation: operation || 'all',
            totalEntries: performanceHistory.length,
          },
          responseTime: Date.now() - startTime,
        });

      case 'cache':
        // Statistiques de cache
        const cacheStats = enhancedCacheService.getStats();
        
        return NextResponse.json({
          success: true,
          data: {
            stats: cacheStats,
            recommendations: generateCacheRecommendations(cacheStats),
          },
          responseTime: Date.now() - startTime,
        });

      case 'errors':
        // Statistiques d'erreurs
        const errorStats = errorHandler.getErrorStats();
        const recentErrors = errorHandler.getRecentErrors(50);
        
        return NextResponse.json({
          success: true,
          data: {
            stats: errorStats,
            recentErrors: recentErrors.map(error => ({
              ...error,
              stack: undefined, // Ne pas exposer la stack trace
            })),
          },
          responseTime: Date.now() - startTime,
        });

      case 'export':
        // Export complet pour monitoring externe
        const exportData = backendMonitoringService.exportMetrics();
        
        return NextResponse.json({
          success: true,
          data: exportData,
          responseTime: Date.now() - startTime,
        });

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_TYPE',
            message: `Type de monitoring '${type}' non supporté`,
            supportedTypes: ['overview', 'health', 'performance', 'cache', 'errors', 'export'],
          },
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur API monitoring:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'MONITORING_ERROR',
        message: 'Erreur lors de la récupération des métriques',
      },
    }, { status: 500 });
  }
}

// POST /api/monitoring - Actions de maintenance
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { action, parameters = {} } = body;

    switch (action) {
      case 'clear-cache':
        // Nettoyer le cache
        const level = parameters.level; // L1_MEMORY, L2_SESSION, L3_LOCAL
        await enhancedCacheService.clear(level);
        
        return NextResponse.json({
          success: true,
          message: `Cache ${level || 'complet'} nettoyé avec succès`,
          responseTime: Date.now() - startTime,
        });

      case 'clear-performance-history':
        // Nettoyer l'historique des performances
        backendMonitoringService.clearPerformanceHistory();
        
        return NextResponse.json({
          success: true,
          message: 'Historique des performances nettoyé',
          responseTime: Date.now() - startTime,
        });

      case 'clear-error-logs':
        // Nettoyer les logs d'erreurs anciens
        const days = parameters.olderThanDays || 7;
        errorHandler.clearOldLogs(days);
        
        return NextResponse.json({
          success: true,
          message: `Logs d'erreurs de plus de ${days} jours supprimés`,
          responseTime: Date.now() - startTime,
        });

      case 'force-health-check':
        // Forcer une vérification de santé
        // Nous ne pouvons pas directement déclencher les health checks privés,
        // mais nous pouvons retourner le statut actuel
        const healthStatus = backendMonitoringService.getHealthStatus();
        
        return NextResponse.json({
          success: true,
          data: healthStatus,
          message: 'Health check forcé (statut actuel retourné)',
          responseTime: Date.now() - startTime,
        });

      case 'cache-preload':
        // Précharger des éléments en cache
        const keys = parameters.keys || [];
        if (Array.isArray(keys) && keys.length > 0) {
          await enhancedCacheService.preload(keys);
          
          return NextResponse.json({
            success: true,
            message: `${keys.length} éléments préchargés en cache`,
            responseTime: Date.now() - startTime,
          });
        } else {
          return NextResponse.json({
            success: false,
            error: {
              code: 'INVALID_PARAMETERS',
              message: 'Paramètre keys requis (array)',
            },
          }, { status: 400 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: {
            code: 'INVALID_ACTION',
            message: `Action '${action}' non supportée`,
            supportedActions: [
              'clear-cache',
              'clear-performance-history', 
              'clear-error-logs',
              'force-health-check',
              'cache-preload'
            ],
          },
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Erreur action monitoring:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'ACTION_ERROR',
        message: 'Erreur lors de l\'exécution de l\'action',
      },
    }, { status: 500 });
  }
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

function generateCacheRecommendations(stats: any): string[] {
  const recommendations: string[] = [];
  
  if (stats.hitRate < 70) {
    recommendations.push('Taux de hit faible (<70%) - Considérer augmenter la TTL ou précharger plus de données');
  }
  
  if (stats.memoryUsage > 100 * 1024 * 1024) { // 100MB
    recommendations.push('Usage mémoire élevé (>100MB) - Considérer activer la compression ou réduire la taille du cache');
  }
  
  if (stats.totalEntries < 10) {
    recommendations.push('Peu d\'entrées en cache - Vérifier que les données sont correctement mises en cache');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Performance du cache optimale ✅');
  }
  
  return recommendations;
}