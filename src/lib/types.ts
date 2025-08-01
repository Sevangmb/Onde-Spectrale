// src/lib/types.ts - Version corrigée

export type DJCharacter = {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  voice?: {
    gender: string;
    tone: string;
    style: string;
  };
};

export type CustomDJCharacter = DJCharacter & {
  voice: {
    gender: string;
    tone: string;
    style: string;
  };
  isCustom: true;
  ownerId: string;
  createdAt: string;
};

export type PlaylistItem = {
  id: string;
  type: 'message' | 'music';
  title: string;
  content: string; // Contenu réel (texte du message ou nom de recherche)
  artist?: string;
  album?: string; // Album name
  year?: number; // Release year
  genre?: string; // Comma-separated genres
  artwork?: string; // Album/track artwork URL
  url: string; // URL to the audio file in Firebase Storage, Plex, or Archive.org
  duration: number; // in seconds
  addedAt?: string; // ISO string
 
  plexKey?: string; // Plex media key
  archiveId?: string; // ID spécifique Archive.org pour les musiques
  isLoading?: boolean; // État de chargement
  error?: string; // Message d'erreur
};

export type Station = {
  id: string;
  frequency: number;
  name: string;
  ownerId: string; // User ID of the owner
  djCharacterId: string;
  playlist: PlaylistItem[];
  createdAt: string; // ISO string
  theme?: string; // Thème de la station
  description?: string;
  isActive?: boolean;
  tags?: string[];
  lastModified?: string;
};

export type User = {
  id: string;
  email: string | null;
  stationsCreated: number;
  lastFrequency: number;
  createdAt: string;
  lastLogin: string;
};

// --- PlayerState pour monitoring temps réel admin ---
export type PlayerState = {
  currentTrack?: {
    title: string;
    type: 'music' | 'message';
    artist?: string;
    duration?: number;
    id?: string;
  };
  ttsMessage?: string | null;
  errorMessage?: string | null;
  isPlaying: boolean;
  updatedAt: string; // ISO string
  logs?: Array<{
    type: 'error' | 'info' | 'track' | 'tts';
    message: string;
    timestamp: string;
  }>;
};
// --- Fin PlayerState ---

// ========================================
// ADMIN MONITORING TYPES
// ========================================

export interface SystemStatus {
  server: 'online' | 'offline' | 'degraded';
  database: 'online' | 'offline' | 'degraded';
  plex: 'online' | 'offline' | 'degraded';
  ai: 'online' | 'offline' | 'degraded';
  lastChecked: Date;
}

export interface AdminPlayerState extends PlayerState {
  userId: string;
  sessionId: string;
  stationFrequency: number;
  ipAddress?: string;
  userAgent?: string;
  connectionTime: Date;
  lastActivity: Date;
  bandwidth?: number;
  audioQuality?: 'low' | 'medium' | 'high';
}

export interface AdminErrorLog {
  id: string;
  timestamp: Date;
  level: 'critical' | 'error' | 'warning' | 'info';
  source: 'player' | 'station' | 'api' | 'auth' | 'plex' | 'ai' | 'admin';
  message: string;
  userId?: string;
  stationId?: string;
  frequency?: number;
  errorCode?: string;
  stack?: string;
  metadata?: Record<string, any>;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface StationHealthMetrics {
  frequency: number;
  stationId: string;
  status: 'healthy' | 'degraded' | 'offline' | 'maintenance';
  uptime: number;
  currentListeners: number;
  peakListeners: number;
  playlistLength: number;
  playlistHealth: 'good' | 'low' | 'empty';
  lastTrackPlayed?: PlaylistItem;
  trackFailureRate: number;
  djResponseTime?: number;
  lastActivity: Date;
  errors: string[];
  metrics: {
    avgSessionTime: number;
    bounceRate: number;
    trackSkipRate: number;
  };
}

export interface AdminAnalytics {
  period: '1h' | '24h' | '7d' | '30d';
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalPlaytime: number;
  topStations: Array<{
    frequency: number;
    name: string;
    listeners: number;
    playtime: number;
  }>;
  topTracks: Array<{
    title: string;
    artist: string;
    plays: number;
    station: string;
  }>;
  errorStats: {
    total: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
  };
  performanceMetrics: {
    avgResponseTime: number;
    uptime: number;
    errorRate: number;
  };
}

export interface SystemAlert {
  id: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
}

export interface AdminMonitoringState {
  // Statut général
  isMonitoringActive: boolean;
  monitoringStartTime: Date | null;
  lastUpdateTime: Date | null;
  
  // Santé système
  systemStatus: SystemStatus;
  systemAlerts: SystemAlert[];
  
  // Players en temps réel
  activePlayers: Map<string, AdminPlayerState>;
  totalActivePlayers: number;
  
  // Logs et erreurs
  errorLogs: AdminErrorLog[];
  recentErrors: AdminErrorLog[];
  errorStats: Record<string, number>;
  
  // Santé des stations
  stationHealth: Map<number, StationHealthMetrics>;
  offlineStations: number[];
  degradedStations: number[];
  
  // Analytics temps réel
  realTimeAnalytics: AdminAnalytics;
  
  // Configuration monitoring
  settings: {
    refreshInterval: number;
    maxErrorLogs: number;
    alertThresholds: {
      maxErrorRate: number;
      minUptime: number;
      maxResponseTime: number;
    };
    enableNotifications: boolean;
  };
}
