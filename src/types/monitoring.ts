/**
 * Types pour le monitoring et les analytics
 */

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    requestsPerSecond: number;
  };
  database: {
    connections: number;
    queryTime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
  };
}

export interface PerformanceEntry {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export interface HealthCheck {
  service: string;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: number;
  responseTime: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Type SystemStatus déjà défini dans src/lib/types.ts

// Types AdminPlayerState, AdminErrorLog, StationHealthMetrics, AdminAnalytics
// sont déjà définis dans src/lib/types.ts

export interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  size: number;
  maxSize: number;
  evictions: number;
  averageAccessTime: number;
}

export interface PlaylistAnalytics {
  stationId: string;
  totalTracks: number;
  totalDuration: number;
  trackTypes: {
    music: number;
    message: number;
  };
  averageTrackDuration: number;
  mostPlayedTracks: Array<{
    id: string;
    title: string;
    artist: string;
    playCount: number;
  }>;
  skipRate: number;
  completionRate: number;
  userEngagement: {
    likes: number;
    dislikes: number;
    shares: number;
  };
}