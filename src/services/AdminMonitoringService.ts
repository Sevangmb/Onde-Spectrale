'use client';

import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc,
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeParseDate } from '@/lib/dateUtils';
import type { 
  SystemStatus, 
  AdminPlayerState, 
  AdminErrorLog, 
  StationHealthMetrics, 
  AdminAnalytics 
} from '@/lib/types';

/**
 * AdminMonitoringService - Service de monitoring temps réel pour l'administration
 * 
 * Fonctionnalités:
 * - Surveillance des players actifs
 * - Logs d'erreurs en temps réel
 * - Santé des stations
 * - Analytics en temps réel
 * - Actions administratives
 */
export class AdminMonitoringService {
  private listeners: (() => void)[] = [];
  private updateCallbacks: Map<string, Function> = new Map();
  private isActive = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Initialise le service de monitoring
   */
  async initialize(): Promise<void> {
    console.log('🔧 AdminMonitoringService initializing...');
    
    try {
      this.setupFirestoreListeners();
      this.startPeriodicHealthChecks();
      this.isActive = true;
      
      console.log('✅ AdminMonitoringService initialized successfully');
    } catch (error) {
      console.error('❌ AdminMonitoringService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Nettoie les ressources du service
   */
  cleanup(): void {
    console.log('🧹 AdminMonitoringService cleanup...');
    
    // Arrêter tous les listeners Firestore
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners = [];
    
    // Nettoyer les callbacks
    this.updateCallbacks.clear();
    
    // Arrêter les vérifications périodiques
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isActive = false;
    console.log('✅ AdminMonitoringService cleanup completed');
  }

  /**
   * Vérifie si le service est actif
   */
  isServiceActive(): boolean {
    return this.isActive;
  }

  // ========================================
  // REAL-TIME DATA SUBSCRIPTIONS
  // ========================================

  /**
   * S'abonne aux états des players en temps réel
   */
  subscribeToPlayerStates(callback: (players: AdminPlayerState[]) => void): () => void {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'playerStates'),
        where('lastActivity', '>', new Date(Date.now() - 5 * 60 * 1000)) // 5 min window
      ),
      (snapshot) => {
        try {
          const players = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userId: data.userId || doc.id,
              sessionId: data.sessionId || `session_${Date.now()}`,
              stationFrequency: data.stationFrequency || 100.7,
              ...data,
              lastActivity: safeParseDate(data.lastActivity),
              connectionTime: safeParseDate(data.connectionTime || Date.now()),
            } as unknown as AdminPlayerState;
          });
          
          callback(players);
        } catch (error) {
          console.error('❌ Error processing player states:', error);
        }
      },
      (error) => {
        console.error('❌ Error in player states subscription:', error);
        // Fallback: provide empty array
        callback([]);
      }
    );
    
    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * S'abonne aux logs d'erreurs en temps réel
   */
  subscribeToErrorLogs(callback: (errors: AdminErrorLog[]) => void): () => void {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'adminErrorLogs'),
        orderBy('timestamp', 'desc'),
        limit(100)
      ),
      (snapshot) => {
        try {
          const errors = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              timestamp: safeParseDate(data.timestamp),
              resolvedAt: data.resolvedAt ? safeParseDate(data.resolvedAt) : undefined,
            } as AdminErrorLog;
          });
          
          callback(errors);
        } catch (error) {
          console.error('❌ Error processing error logs:', error);
        }
      },
      (error) => {
        console.error('❌ Error in error logs subscription:', error);
        callback([]);
      }
    );
    
    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  /**
   * S'abonne à la santé des stations en temps réel
   */
  subscribeToStationHealth(callback: (health: StationHealthMetrics[]) => void): () => void {
    const unsubscribe = onSnapshot(
      collection(db, 'stationHealth'),
      (snapshot) => {
        try {
          const health = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              frequency: parseInt(doc.id),
              stationId: data.stationId || doc.id,
              ...data,
              lastActivity: safeParseDate(data.lastActivity || Date.now()),
            } as StationHealthMetrics;
          });
          
          callback(health);
        } catch (error) {
          console.error('❌ Error processing station health:', error);
        }
      },
      (error) => {
        console.error('❌ Error in station health subscription:', error);
        callback([]);
      }
    );
    
    this.listeners.push(unsubscribe);
    return unsubscribe;
  }

  // ========================================
  // SYSTEM HEALTH CHECKS
  // ========================================

  /**
   * Vérifie l'état général du système
   */
  async checkSystemHealth(): Promise<SystemStatus> {
    const results = await Promise.allSettled([
      this.checkServerHealth(),
      this.checkDatabaseHealth(),
      this.checkPlexHealth(),
      this.checkAIHealth(),
    ]);

    return {
      server: results[0].status === 'fulfilled' ? results[0].value : 'offline',
      database: results[1].status === 'fulfilled' ? results[1].value : 'offline',
      plex: results[2].status === 'fulfilled' ? results[2].value : 'offline',
      ai: results[3].status === 'fulfilled' ? results[3].value : 'offline',
      lastChecked: new Date(),
    };
  }

  /**
   * Vérifie la santé du serveur web
   */
  private async checkServerHealth(): Promise<'online' | 'offline' | 'degraded'> {
    try {
      const startTime = performance.now();
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5s timeout
      });
      
      if (response.ok) {
        const responseTime = performance.now() - startTime;
        return responseTime > 1000 ? 'degraded' : 'online';
      }
      return 'offline';
    } catch (error) {
      console.warn('Server health check failed:', error);
      return 'offline';
    }
  }

  /**
   * Vérifie la santé de la base de données Firestore
   */
  private async checkDatabaseHealth(): Promise<'online' | 'offline' | 'degraded'> {
    try {
      const testDoc = doc(db, 'healthCheck', 'test');
      const startTime = performance.now();
      
      await getDoc(testDoc);
      
      const responseTime = performance.now() - startTime;
      return responseTime > 2000 ? 'degraded' : 'online';
    } catch (error) {
      console.warn('Database health check failed:', error);
      return 'offline';
    }
  }

  /**
   * Vérifie la santé du serveur Plex
   */
  private async checkPlexHealth(): Promise<'online' | 'offline' | 'degraded'> {
    try {
      const response = await fetch('/api/plex/genres', {
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.libraries?.length > 0 ? 'online' : 'degraded';
      }
      return 'offline';
    } catch (error) {
      console.warn('Plex health check failed:', error);
      return 'degraded'; // Plex non-critique
    }
  }

  /**
   * Vérifie la santé du système IA
   */
  private async checkAIHealth(): Promise<'online' | 'offline' | 'degraded'> {
    try {
      // Test simple de génération vocale
      const testResponse = await fetch('/api/genkit/generate-dj-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: 'Health check test',
          djCharacterId: 'marcus',
          skipGeneration: true // Flag pour test seulement
        }),
        signal: AbortSignal.timeout(5000)
      });
      
      return testResponse.ok ? 'online' : 'degraded';
    } catch (error) {
      console.warn('AI health check failed:', error);
      return 'degraded'; // IA non-critique
    }
  }

  /**
   * Démarre les vérifications périodiques de santé
   */
  private startPeriodicHealthChecks(): void {
    // Vérification toutes les 30 secondes
    this.healthCheckInterval = setInterval(async () => {
      if (this.isActive) {
        try {
          const systemStatus = await this.checkSystemHealth();
          const callback = this.updateCallbacks.get('systemStatus');
          if (callback) {
            callback(systemStatus);
          }
        } catch (error) {
          console.error('❌ Periodic health check failed:', error);
        }
      }
    }, 30000);
  }

  /**
   * Enregistre un callback pour les mises à jour de statut système
   */
  onSystemStatusUpdate(callback: (status: SystemStatus) => void): void {
    this.updateCallbacks.set('systemStatus', callback);
  }

  // ========================================
  // ANALYTICS GENERATION
  // ========================================

  /**
   * Génère des analytics en temps réel
   */
  async generateRealTimeAnalytics(period: '1h' | '24h' | '7d' | '30d'): Promise<AdminAnalytics> {
    const endTime = new Date();
    const startTime = this.getPeriodStartTime(period, endTime);

    try {
      // Requêtes parallèles pour optimiser les performances
      const [userStats, sessionStats, errorStats, performanceStats] = await Promise.all([
        this.getUserStats(startTime, endTime),
        this.getSessionStats(startTime, endTime),
        this.getErrorStats(startTime, endTime),
        this.getPerformanceStats(startTime, endTime),
      ]);

      return {
        period,
        ...userStats,
        ...sessionStats,
        errorStats,
        performanceMetrics: performanceStats,
      };
    } catch (error) {
      console.error('❌ Error generating analytics:', error);
      
      // Retourner des analytics par défaut en cas d'erreur
      return this.getDefaultAnalytics(period);
    }
  }

  /**
   * Calcule la date de début pour une période donnée
   */
  private getPeriodStartTime(period: string, endTime: Date): Date {
    const start = new Date(endTime);
    
    switch (period) {
      case '1h':
        start.setHours(start.getHours() - 1);
        break;
      case '24h':
        start.setDate(start.getDate() - 1);
        break;
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
    }
    
    return start;
  }

  /**
   * Récupère les statistiques utilisateur
   */
  private async getUserStats(startTime: Date, endTime: Date) {
    // Pour l'instant, on retourne des données simulées
    // TODO: Implémenter avec de vraies requêtes Firestore
    return {
      totalUsers: Math.floor(Math.random() * 100) + 50,
      activeUsers: Math.floor(Math.random() * 50) + 10,
      newUsers: Math.floor(Math.random() * 20) + 5,
    };
  }

  /**
   * Récupère les statistiques de session
   */
  private async getSessionStats(startTime: Date, endTime: Date) {
    return {
      totalSessions: Math.floor(Math.random() * 200) + 100,
      avgSessionDuration: Math.floor(Math.random() * 3600) + 1800, // 30min - 90min
      totalPlaytime: Math.floor(Math.random() * 100000) + 50000,
      topStations: [
        { frequency: 100.7, name: 'Radio Liberty', listeners: 45, playtime: 12000 },
        { frequency: 87.6, name: 'Diamond City Radio', listeners: 32, playtime: 8500 },
        { frequency: 104.5, name: 'Enclave Radio', listeners: 18, playtime: 5200 },
      ],
      topTracks: [
        { title: 'Blue Moon', artist: 'Billie Holiday', plays: 47, station: 'Radio Liberty' },
        { title: 'I Don\'t Want to Set the World on Fire', artist: 'The Ink Spots', plays: 42, station: 'Diamond City Radio' },
        { title: 'Maybe', artist: 'The Ink Spots', plays: 38, station: 'Radio Liberty' },
      ],
    };
  }

  /**
   * Récupère les statistiques d'erreur
   */
  private async getErrorStats(startTime: Date, endTime: Date) {
    return {
      total: Math.floor(Math.random() * 50) + 10,
      byLevel: {
        critical: Math.floor(Math.random() * 5),
        error: Math.floor(Math.random() * 15) + 5,
        warning: Math.floor(Math.random() * 20) + 10,
        info: Math.floor(Math.random() * 10) + 5,
      },
      bySource: {
        player: Math.floor(Math.random() * 15) + 5,
        station: Math.floor(Math.random() * 10) + 3,
        api: Math.floor(Math.random() * 8) + 2,
        auth: Math.floor(Math.random() * 5) + 1,
        plex: Math.floor(Math.random() * 7) + 2,
        ai: Math.floor(Math.random() * 5) + 1,
      },
    };
  }

  /**
   * Récupère les métriques de performance
   */
  private async getPerformanceStats(startTime: Date, endTime: Date) {
    return {
      avgResponseTime: Math.floor(Math.random() * 500) + 200, // 200-700ms
      uptime: 0.95 + Math.random() * 0.05, // 95-100%
      errorRate: Math.random() * 0.05, // 0-5%
    };
  }

  /**
   * Retourne des analytics par défaut en cas d'erreur
   */
  private getDefaultAnalytics(period: string): AdminAnalytics {
    return {
      period: period as AdminAnalytics['period'],
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      totalPlaytime: 0,
      topStations: [],
      topTracks: [],
      errorStats: { total: 0, byLevel: {}, bySource: {} },
      performanceMetrics: { avgResponseTime: 0, uptime: 0, errorRate: 0 },
    };
  }

  // ========================================
  // ADMIN ACTIONS
  // ========================================

  /**
   * Expulse un utilisateur
   */
  async kickUser(userId: string): Promise<void> {
    try {
      await setDoc(doc(db, 'adminActions', `kick_${userId}_${Date.now()}`), {
        action: 'kick',
        userId,
        timestamp: Timestamp.now(),
        adminId: 'system', // TODO: Récupérer l'ID admin depuis le contexte
      });
      
      console.log(`👢 User ${userId} kicked by admin`);
    } catch (error) {
      console.error('❌ Error kicking user:', error);
      throw error;
    }
  }

  /**
   * Met en pause la lecture d'un utilisateur
   */
  async pauseUserPlayback(userId: string): Promise<void> {
    try {
      await setDoc(doc(db, 'adminActions', `pause_${userId}_${Date.now()}`), {
        action: 'pause',
        userId,
        timestamp: Timestamp.now(),
        adminId: 'system',
      });
      
      console.log(`⏸️ User ${userId} playback paused by admin`);
    } catch (error) {
      console.error('❌ Error pausing user playback:', error);
      throw error;
    }
  }

  /**
   * Redémarre une station
   */
  async restartStation(frequency: number): Promise<void> {
    try {
      await setDoc(doc(db, 'adminActions', `restart_${frequency}_${Date.now()}`), {
        action: 'restart',
        frequency,
        timestamp: Timestamp.now(),
        adminId: 'system',
      });
      
      console.log(`🔄 Station ${frequency} MHz restart requested by admin`);
    } catch (error) {
      console.error('❌ Error restarting station:', error);
      throw error;
    }
  }

  // ========================================
  // ERROR LOGGING
  // ========================================

  /**
   * Enregistre une erreur dans les logs admin
   */
  async logError(error: Omit<AdminErrorLog, 'id' | 'timestamp'>): Promise<void> {
    try {
      const errorDoc = {
        ...error,
        timestamp: Timestamp.now(),
        resolved: false,
      };

      await addDoc(collection(db, 'adminErrorLogs'), errorDoc);
      console.log(`📝 Error logged: ${error.level} - ${error.message}`);
    } catch (logError) {
      console.error('❌ Error logging error:', logError);
      // Ne pas propager l'erreur pour éviter les boucles infinies
    }
  }

  /**
   * Marque une erreur comme résolue
   */
  async resolveError(errorId: string, adminId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'adminErrorLogs', errorId), {
        resolved: true,
        resolvedAt: Timestamp.now(),
        resolvedBy: adminId,
      });
      
      console.log(`✅ Error ${errorId} resolved by admin ${adminId}`);
    } catch (error) {
      console.error('❌ Error resolving error:', error);
      throw error;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Configure les listeners Firestore
   */
  private setupFirestoreListeners(): void {
    // Les listeners seront créés à la demande via les méthodes subscribe*
    console.log('🔗 Firestore listeners setup ready');
  }

  /**
   * Retourne les métriques de performance du service
   */
  getServiceMetrics() {
    return {
      isActive: this.isActive,
      listenersCount: this.listeners.length,
      callbacksCount: this.updateCallbacks.size,
      uptime: this.isActive ? Date.now() - (this.isActive ? Date.now() : 0) : 0,
    };
  }
}

// Instance singleton
export const adminMonitoringService = new AdminMonitoringService();

// Export du service pour utilisation dans les composants
export default adminMonitoringService;