import { errorHandler } from '@/lib/errors';
import { enhancedCacheService } from './EnhancedCacheService';
import { optimizedFirebaseService } from './OptimizedFirebaseService';

// ========================================
// SERVICE DE MONITORING BACKEND
// ========================================

export interface SystemMetrics {
  timestamp: Date;
  
  // Métriques de performance
  responseTime: {
    avg: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
  };
  
  // Métriques de cache
  cache: {
    hitRate: number;
    totalEntries: number;
    memoryUsage: number;
    evictions: number;
  };
  
  // Métriques Firebase
  firebase: {
    activeListeners: number;
    pendingBatchOps: number;
    connectionStatus: 'connected' | 'disconnected' | 'unknown';
  };
  
  // Métriques d'erreurs
  errors: {
    total: number;
    last24h: number;
    byType: Record<string, number>;
    errorRate: number; // pourcentage
  };
  
  // Métriques système
  system: {
    uptime: number; // en millisecondes
    memoryUsage?: NodeJS.MemoryUsage;
    nodeVersion: string;
  };
}

export interface PerformanceEntry {
  timestamp: Date;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

export class BackendMonitoringService {
  private static instance: BackendMonitoringService;
  private performanceEntries: PerformanceEntry[] = [];
  private healthChecks = new Map<string, HealthCheck>();
  private startTime = Date.now();
  private readonly MAX_PERFORMANCE_ENTRIES = 1000;
  private monitoringInterval?: NodeJS.Timeout;

  private constructor() {
    this.startPeriodicHealthChecks();
  }

  static getInstance(): BackendMonitoringService {
    if (!BackendMonitoringService.instance) {
      BackendMonitoringService.instance = new BackendMonitoringService();
    }
    return BackendMonitoringService.instance;
  }

  // ========================================
  // COLLECTE DE MÉTRIQUES
  // ========================================

  // Enregistrer une opération de performance
  recordPerformance(
    operation: string,
    duration: number,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    const entry: PerformanceEntry = {
      timestamp: new Date(),
      operation,
      duration,
      success,
      error,
      metadata,
    };

    this.performanceEntries.unshift(entry);
    
    // Limiter la taille du tableau
    if (this.performanceEntries.length > this.MAX_PERFORMANCE_ENTRIES) {
      this.performanceEntries.pop();
    }
  }

  // Décorateur pour mesurer automatiquement les performances
  static measurePerformance(operation: string) {
    return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        const monitor = BackendMonitoringService.getInstance();
        
        try {
          const result = await originalMethod.apply(this, args);
          monitor.recordPerformance(
            `${target.constructor.name}.${propertyName}`,
            Date.now() - startTime,
            true,
            undefined,
            { operation }
          );
          return result;
        } catch (error) {
          monitor.recordPerformance(
            `${target.constructor.name}.${propertyName}`,
            Date.now() - startTime,
            false,
            error instanceof Error ? error.message : 'Unknown error',
            { operation }
          );
          throw error;
        }
      };

      return descriptor;
    };
  }

  // ========================================
  // HEALTH CHECKS
  // ========================================

  private async startPeriodicHealthChecks(): Promise<void> {
    // Exécuter les health checks toutes les 30 secondes
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 30 * 1000);

    // Exécuter immédiatement une fois
    await this.performHealthChecks();
  }

  private async performHealthChecks(): Promise<void> {
    const checks = [
      this.checkCacheHealth(),
      this.checkFirebaseHealth(),
      this.checkSystemHealth(),
      this.checkErrorRates(),
    ];

    await Promise.allSettled(checks);
  }

  private async checkCacheHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const stats = enhancedCacheService.getStats();
      const responseTime = Date.now() - startTime;
      
      let status: HealthCheck['status'] = 'healthy';
      
      // Déterminer le statut basé sur les métriques
      if (stats.hitRate < 50) {
        status = 'degraded'; // Taux de hit faible
      }
      if (stats.memoryUsage > 50 * 1024 * 1024) { // Plus de 50MB
        status = 'degraded';
      }
      if (responseTime > 100) { // Plus de 100ms pour les stats
        status = 'unhealthy';
      }

      this.healthChecks.set('cache', {
        service: 'Enhanced Cache Service',
        status,
        responseTime,
        lastCheck: new Date(),
      });

    } catch (error) {
      this.healthChecks.set('cache', {
        service: 'Enhanced Cache Service',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastCheck: new Date(),
      });
    }
  }

  private async checkFirebaseHealth(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test simple: essayer de récupérer une station
      await optimizedFirebaseService.getStationByFrequency(87.0);
      const responseTime = Date.now() - startTime;
      
      let status: HealthCheck['status'] = 'healthy';
      
      if (responseTime > 2000) { // Plus de 2 secondes
        status = 'degraded';
      }
      if (responseTime > 5000) { // Plus de 5 secondes
        status = 'unhealthy';
      }

      this.healthChecks.set('firebase', {
        service: 'Firebase/Firestore',
        status,
        responseTime,
        lastCheck: new Date(),
      });

    } catch (error) {
      this.healthChecks.set('firebase', {
        service: 'Firebase/Firestore',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Connection failed',
        lastCheck: new Date(),
      });
    }
  }

  private async checkSystemHealth(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      let status: HealthCheck['status'] = 'healthy';
      
      // Vérifier l'usage mémoire (en MB)
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      
      if (heapUsedMB > 500) { // Plus de 500MB utilisés
        status = 'degraded';
      }
      if (heapUsedMB > 1000) { // Plus de 1GB utilisé
        status = 'unhealthy';
      }

      this.healthChecks.set('system', {
        service: 'Node.js System',
        status,
        lastCheck: new Date(),
      });

    } catch (error) {
      this.healthChecks.set('system', {
        service: 'Node.js System',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'System check failed',
        lastCheck: new Date(),
      });
    }
  }

  private async checkErrorRates(): Promise<void> {
    try {
      const errorStats = errorHandler.getErrorStats();
      let status: HealthCheck['status'] = 'healthy';
      
      // Calculer le taux d'erreur des dernières 24h
      const totalOpsLast24h = this.getOperationsCount24h();
      const errorRate = totalOpsLast24h > 0 
        ? (errorStats.last24h / totalOpsLast24h) * 100 
        : 0;

      if (errorRate > 5) { // Plus de 5% d'erreurs
        status = 'degraded';
      }
      if (errorRate > 15) { // Plus de 15% d'erreurs
        status = 'unhealthy';
      }

      this.healthChecks.set('errors', {
        service: 'Error Monitoring',
        status,
        lastCheck: new Date(),
      });

    } catch (error) {
      this.healthChecks.set('errors', {
        service: 'Error Monitoring',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Error check failed',
        lastCheck: new Date(),
      });
    }
  }

  // ========================================
  // MÉTRIQUES ET STATISTIQUES
  // ========================================

  getSystemMetrics(): SystemMetrics {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // Métriques de performance
    const recentEntries = this.performanceEntries.filter(
      entry => entry.timestamp > last24h
    );
    
    const responseTimes = recentEntries.map(entry => entry.duration);
    responseTimes.sort((a, b) => a - b);
    
    const responseTime = responseTimes.length > 0 ? {
      avg: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
      min: responseTimes[0] || 0,
      max: responseTimes[responseTimes.length - 1] || 0,
      p95: responseTimes[Math.floor(responseTimes.length * 0.95)] || 0,
      p99: responseTimes[Math.floor(responseTimes.length * 0.99)] || 0,
    } : {
      avg: 0, min: 0, max: 0, p95: 0, p99: 0
    };

    // Métriques de cache
    const cacheStats = enhancedCacheService.getStats();
    
    // Métriques Firebase
    const firebase = {
      activeListeners: optimizedFirebaseService.getActiveListenersCount(),
      pendingBatchOps: optimizedFirebaseService.getPendingBatchOperations(),
      connectionStatus: this.healthChecks.get('firebase')?.status === 'healthy' 
        ? 'connected' as const
        : 'disconnected' as const,
    };

    // Métriques d'erreurs
    const errorStats = errorHandler.getErrorStats();
    const totalOps = this.getOperationsCount24h();
    const errorRate = totalOps > 0 ? (errorStats.last24h / totalOps) * 100 : 0;

    return {
      timestamp: now,
      responseTime,
      cache: {
        hitRate: cacheStats.hitRate,
        totalEntries: cacheStats.totalEntries,
        memoryUsage: cacheStats.memoryUsage,
        evictions: 0, // TODO: Ajouter cette métrique au cache service
      },
      firebase,
      errors: {
        total: errorStats.total,
        last24h: errorStats.last24h,
        byType: errorStats.byCode,
        errorRate: Math.round(errorRate * 100) / 100,
      },
      system: {
        uptime: Date.now() - this.startTime,
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }

  getHealthStatus(): Record<string, HealthCheck> {
    const result: Record<string, HealthCheck> = {};
    
    for (const [service, check] of this.healthChecks.entries()) {
      result[service] = { ...check };
    }
    
    return result;
  }

  getOverallHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    healthyServices: number;
    totalServices: number;
    issues: string[];
  } {
    const checks = Array.from(this.healthChecks.values());
    const healthyCount = checks.filter(check => check.status === 'healthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
    
    const issues = checks
      .filter(check => check.status !== 'healthy')
      .map(check => `${check.service}: ${check.status}${check.error ? ` (${check.error})` : ''}`);

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      healthyServices: healthyCount,
      totalServices: checks.length,
      issues,
    };
  }

  getPerformanceHistory(
    operation?: string,
    limit: number = 100
  ): PerformanceEntry[] {
    let entries = this.performanceEntries;
    
    if (operation) {
      entries = entries.filter(entry => entry.operation.includes(operation));
    }
    
    return entries.slice(0, limit);
  }

  // ========================================
  // UTILITAIRES PRIVÉS
  // ========================================

  private getOperationsCount24h(): number {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.performanceEntries.filter(
      entry => entry.timestamp > last24h
    ).length;
  }

  // ========================================
  // NETTOYAGE ET ADMINISTRATION
  // ========================================

  clearPerformanceHistory(): void {
    this.performanceEntries = [];
  }

  // Exporter les métriques pour monitoring externe
  exportMetrics(): {
    timestamp: Date;
    metrics: SystemMetrics;
    health: Record<string, HealthCheck>;
    recentPerformance: PerformanceEntry[];
  } {
    return {
      timestamp: new Date(),
      metrics: this.getSystemMetrics(),
      health: this.getHealthStatus(),
      recentPerformance: this.getPerformanceHistory(undefined, 50),
    };
  }

  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.performanceEntries = [];
    this.healthChecks.clear();
  }
}

// Instance singleton
export const backendMonitoringService = BackendMonitoringService.getInstance();

// Export du décorateur pour faciliter l'usage
export const measurePerformance = BackendMonitoringService.measurePerformance;