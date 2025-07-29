import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  Station, 
  PlaylistItem, 
  User, 
  AdminMonitoringState, 
  SystemStatus, 
  AdminPlayerState, 
  AdminErrorLog, 
  StationHealthMetrics, 
  AdminAnalytics, 
  SystemAlert 
} from '@/lib/types';
import { adminMonitoringService } from '@/services/AdminMonitoringService';

// Enhanced State Types - Extend existing types
interface RadioState {
  frequency: number;
  signalStrength: number;
  isScanning: boolean;
  sliderValue: number;
  error: string | null;
}

interface PlaybackState {
  currentTrack: PlaylistItem | null;
  isPlaying: boolean;
  isLoading: boolean;
  position: number;
  volume: number;
  errorMessage: string | null;
}

interface DataState {
  stations: Map<number, Station>;
  currentStation: Station | null;
  playlists: Map<string, PlaylistItem[]>;
  failedTracks: Set<string>;
  lastUpdated: Record<string, number>;
  isLoadingStation: boolean;
}

interface UIState {
  showPlaylist: boolean;
  autoPlayEnabled: boolean;
  ttsEnabled: boolean;
  audioContextEnabled: boolean;
  ttsMessage: string | null;
}

interface UserState {
  user: User | null;
  customDJs: any[];
}

// Extended Store State with Admin Monitoring
interface ExtendedRadioStore {
  radio: RadioState;
  playback: PlaybackState;
  data: DataState;
  ui: UIState;
  user: UserState;
  
  // NEW: Admin monitoring state
  admin: AdminMonitoringState;
  
  // Actions
  actions: {
    // Radio actions
    setFrequency: (frequency: number) => Promise<void>;
    setSliderValue: (value: number) => void;
    setIsScanning: (scanning: boolean) => void;
    setSignalStrength: (strength: number) => void;
    setError: (error: string | null) => void;
    
    // Playback actions
    playTrack: (track: PlaylistItem) => Promise<void>;
    togglePlayback: () => Promise<void>;
    nextTrack: () => void;
    previousTrack: () => void;
    setVolume: (volume: number) => void;
    
    // Data actions
    setCurrentStation: (station: Station | null) => void;
    cacheStation: (frequency: number, station: Station) => void;
    addFailedTrack: (trackId: string) => void;
    clearFailedTracks: () => void;
    
    // UI actions
    togglePlaylist: () => void;
    enableAutoPlay: () => void;
    enableTTS: () => void;
    setTTSMessage: (message: string | null) => void;
    enableAudioContext: () => void;
    
    // User actions
    setUser: (user: User | null) => void;
    setCustomDJs: (djs: any[]) => void;
    
    // NEW: Admin monitoring actions
    initializeAdminMonitoring: () => Promise<void>;
    cleanupAdminMonitoring: () => void;
    updateSystemStatus: (status: SystemStatus) => void;
    addSystemAlert: (alert: SystemAlert) => void;
    acknowledgeAlert: (alertId: string) => void;
    clearAcknowledgedAlerts: () => void;
    updateActivePlayers: (players: AdminPlayerState[]) => void;
    updateErrorLogs: (errors: AdminErrorLog[]) => void;
    updateStationHealth: (health: StationHealthMetrics[]) => void;
    updateRealTimeAnalytics: (analytics: AdminAnalytics) => void;
    updateAdminSettings: (settings: Partial<AdminMonitoringState['settings']>) => void;
    
    // NEW: Playlist management actions
    reorderPlaylist: (stationId: string, newOrder: PlaylistItem[]) => Promise<boolean>;
    removeMultipleTracks: (stationId: string, trackIds: string[]) => Promise<boolean>;
    duplicateTrack: (stationId: string, trackId: string, position?: number) => Promise<boolean>;
    applyPlaylistTemplate: (stationId: string, templateId: string) => Promise<boolean>;
    exportPlaylist: (stationId: string) => Promise<any>;
    importPlaylist: (stationId: string, data: any) => Promise<boolean>;
    optimizePlaylist: (stationId: string, options?: any) => Promise<boolean>;
    analyzePlaylistPerformance: (stationId: string) => Promise<any>;
    
    // Admin actions for user management
    kickUser: (userId: string) => Promise<void>;
    pauseUserPlayback: (userId: string) => Promise<void>;
    restartStation: (frequency: number) => Promise<void>;
    resolveError: (errorId: string, adminId: string) => Promise<void>;
    logAdminError: (error: Omit<AdminErrorLog, 'id' | 'timestamp'>) => Promise<void>;
    
    // Utility actions
    reset: () => void;
    invalidateCache: (key?: string) => void;
  };
}

// Initial states - Keep existing ones and add admin monitoring
const initialRadioState: RadioState = {
  frequency: 100.7,
  signalStrength: 0,
  isScanning: false,
  sliderValue: 100.7,
  error: null,
};

const initialPlaybackState: PlaybackState = {
  currentTrack: null,
  isPlaying: false,
  isLoading: false,
  position: 0,
  volume: 0.8,
  errorMessage: null,
};

const initialDataState: DataState = {
  stations: new Map(),
  currentStation: null,
  playlists: new Map(),
  failedTracks: new Set(),
  lastUpdated: {},
  isLoadingStation: false,
};

const initialUIState: UIState = {
  showPlaylist: false,
  autoPlayEnabled: false,
  ttsEnabled: false,
  audioContextEnabled: false,
  ttsMessage: null,
};

const initialUserState: UserState = {
  user: null,
  customDJs: [],
};

// NEW: Initial admin monitoring state
const initialAdminState: AdminMonitoringState = {
  isMonitoringActive: false,
  monitoringStartTime: null,
  lastUpdateTime: null,
  
  systemStatus: {
    server: 'offline',
    database: 'offline',
    plex: 'offline',
    ai: 'offline',
    lastChecked: new Date(),
  },
  systemAlerts: [],
  
  activePlayers: new Map(),
  totalActivePlayers: 0,
  
  errorLogs: [],
  recentErrors: [],
  errorStats: {},
  
  stationHealth: new Map(),
  offlineStations: [],
  degradedStations: [],
  
  realTimeAnalytics: {
    period: '1h',
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
  },
  
  settings: {
    refreshInterval: 30000, // 30 seconds
    maxErrorLogs: 1000,
    alertThresholds: {
      maxErrorRate: 0.05, // 5%
      minUptime: 0.95, // 95%
      maxResponseTime: 2000, // 2 seconds
    },
    enableNotifications: true,
  },
};

// Extended Store implementation with admin monitoring
export const useExtendedRadioStore = create<ExtendedRadioStore>()( 
  devtools(
    persist(
      immer((set, get) => ({
        radio: initialRadioState,
        playback: initialPlaybackState,
        data: initialDataState,
        ui: initialUIState,
        user: initialUserState,
        admin: initialAdminState, // NEW: Add admin state
        
        actions: {
          // Existing radio actions with optimistic updates
          setFrequency: async (frequency: number) => {
            set((state) => {
              state.radio.frequency = frequency;
              state.radio.sliderValue = frequency;
              state.data.isLoadingStation = true;
              state.radio.error = null;
            });
          },
          
          setSliderValue: (value: number) => {
            set((state) => {
              state.radio.sliderValue = value;
            });
          },
          
          setIsScanning: (scanning: boolean) => {
            set((state) => {
              state.radio.isScanning = scanning;
            });
          },
          
          setSignalStrength: (strength: number) => {
            set((state) => {
              state.radio.signalStrength = strength;
            });
          },
          
          setError: (error: string | null) => {
            set((state) => {
              state.radio.error = error;
            });
          },
          
          // Existing playback actions
          playTrack: async (track: PlaylistItem) => {
            set((state) => {
              state.playback.currentTrack = track;
              state.playback.isLoading = true;
              state.playback.errorMessage = null;
            });
          },
          
          togglePlayback: async () => {
            const { playback } = get();
            if (playback.isLoading) return;
            
            set((state) => {
              state.playback.isPlaying = !state.playback.isPlaying;
            });
          },
          
          nextTrack: () => {
            const { data, playback } = get();
            const currentStation = data.currentStation;
            
            if (!currentStation || !playback.currentTrack) return;
            
            const currentIndex = currentStation.playlist.findIndex(
              track => track.id === playback.currentTrack?.id
            );
            
            const nextIndex = (currentIndex + 1) % currentStation.playlist.length;
            const nextTrack = currentStation.playlist[nextIndex];
            
            if (nextTrack) {
              get().actions.playTrack(nextTrack);
            }
          },
          
          previousTrack: () => {
            const { data, playback } = get();
            const currentStation = data.currentStation;
            
            if (!currentStation || !playback.currentTrack) return;
            
            const currentIndex = currentStation.playlist.findIndex(
              track => track.id === playback.currentTrack?.id
            );
            
            const prevIndex = currentIndex > 0 
              ? currentIndex - 1 
              : currentStation.playlist.length - 1;
            const prevTrack = currentStation.playlist[prevIndex];
            
            if (prevTrack) {
              get().actions.playTrack(prevTrack);
            }
          },
          
          setVolume: (volume: number) => {
            set((state) => {
              state.playback.volume = Math.max(0, Math.min(1, volume));
            });
          },
          
          // Existing data actions
          setCurrentStation: (station: Station | null) => {
            set((state) => {
              state.data.currentStation = station;
              state.data.isLoadingStation = false;
              
              if (station) {
                state.data.stations.set(station.frequency, station);
                state.data.lastUpdated[`station_${station.frequency}`] = Date.now();
              }
              
              state.playback.currentTrack = null;
              state.playback.isPlaying = false;
              state.playback.isLoading = false;
            });
          },
          
          cacheStation: (frequency: number, station: Station) => {
            set((state) => {
              state.data.stations.set(frequency, station);
              state.data.lastUpdated[`station_${frequency}`] = Date.now();
            });
          },
          
          addFailedTrack: (trackId: string) => {
            set((state) => {
              state.data.failedTracks.add(trackId);
            });
          },
          
          clearFailedTracks: () => {
            set((state) => {
              state.data.failedTracks.clear();
            });
          },
          
          // Existing UI actions
          togglePlaylist: () => {
            set((state) => {
              state.ui.showPlaylist = !state.ui.showPlaylist;
            });
          },
          
          enableAutoPlay: () => {
            set((state) => {
              state.ui.autoPlayEnabled = true;
            });
          },
          
          enableTTS: () => {
            set((state) => {
              state.ui.ttsEnabled = true;
            });
          },
          
          setTTSMessage: (message: string | null) => {
            set((state) => {
              state.ui.ttsMessage = message;
            });
          },
          
          enableAudioContext: () => {
            set((state) => {
              state.ui.audioContextEnabled = true;
            });
          },
          
          // Existing user actions
          setUser: (user: User | null) => {
            set((state) => {
              state.user.user = user;
            });
          },
          
          setCustomDJs: (djs: any[]) => {
            set((state) => {
              state.user.customDJs = djs;
            });
          },
          
          // NEW: Admin monitoring actions
          initializeAdminMonitoring: async () => {
            try {
              console.log('🚀 Initializing admin monitoring in store...');
              
              // Initialize the monitoring service
              await adminMonitoringService.initialize();
              
              set((state) => {
                state.admin.isMonitoringActive = true;
                state.admin.monitoringStartTime = new Date();
                state.admin.lastUpdateTime = new Date();
              });
              
              // Set up real-time subscriptions
              const { actions } = get();
              
              // Subscribe to player states
              adminMonitoringService.subscribeToPlayerStates((players) => {
                actions.updateActivePlayers(players);
              });
              
              // Subscribe to error logs
              adminMonitoringService.subscribeToErrorLogs((errors) => {
                actions.updateErrorLogs(errors);
              });
              
              // Subscribe to station health
              adminMonitoringService.subscribeToStationHealth((health) => {
                actions.updateStationHealth(health);
              });
              
              // Subscribe to system status updates
              adminMonitoringService.onSystemStatusUpdate((status) => {
                actions.updateSystemStatus(status);
              });
              
              console.log('✅ Admin monitoring initialized successfully');
            } catch (error) {
              console.error('❌ Error initializing admin monitoring:', error);
              
              // Log the error through the admin service
              get().actions.logAdminError({
                level: 'critical',
                source: 'admin',
                message: 'Failed to initialize admin monitoring',
                stack: error instanceof Error ? error.stack : undefined,
                metadata: { error: String(error) },
              });
            }
          },
          
          cleanupAdminMonitoring: () => {
            console.log('🧹 Cleaning up admin monitoring...');
            
            adminMonitoringService.cleanup();
            
            set((state) => {
              state.admin.isMonitoringActive = false;
              state.admin.monitoringStartTime = null;
              state.admin.activePlayers.clear();
              state.admin.totalActivePlayers = 0;
            });
            
            console.log('✅ Admin monitoring cleanup completed');
          },
          
          updateSystemStatus: (status: SystemStatus) => {
            set((state) => {
              state.admin.systemStatus = status;
              state.admin.lastUpdateTime = new Date();
              
              // Generate alerts for critical status changes
              const now = new Date();
              
              Object.entries(status).forEach(([service, serviceStatus]) => {
                if (service === 'lastChecked') return;
                
                if (serviceStatus === 'offline') {
                  const alertId = `${service}-offline-${now.getTime()}`;
                  const existingAlert = state.admin.systemAlerts.find(
                    alert => alert.id.startsWith(`${service}-offline`) && !alert.acknowledged
                  );
                  
                  if (!existingAlert) {
                    state.admin.systemAlerts.push({
                      id: alertId,
                      level: 'critical',
                      message: `Service ${service} est hors ligne`,
                      timestamp: now,
                      acknowledged: false,
                    });
                  }
                } else if (serviceStatus === 'degraded') {
                  const alertId = `${service}-degraded-${now.getTime()}`;
                  const existingAlert = state.admin.systemAlerts.find(
                    alert => alert.id.startsWith(`${service}-degraded`) && !alert.acknowledged
                  );
                  
                  if (!existingAlert) {
                    state.admin.systemAlerts.push({
                      id: alertId,
                      level: 'warning',
                      message: `Service ${service} fonctionne en mode dégradé`,
                      timestamp: now,
                      acknowledged: false,
                    });
                  }
                }
              });
            });
          },
          
          addSystemAlert: (alert: SystemAlert) => {
            set((state) => {
              state.admin.systemAlerts.push(alert);
            });
          },
          
          acknowledgeAlert: (alertId: string) => {
            set((state) => {
              const alert = state.admin.systemAlerts.find(a => a.id === alertId);
              if (alert) {
                alert.acknowledged = true;
              }
            });
          },
          
          clearAcknowledgedAlerts: () => {
            set((state) => {
              state.admin.systemAlerts = state.admin.systemAlerts.filter(
                alert => !alert.acknowledged
              );
            });
          },
          
          updateActivePlayers: (players: AdminPlayerState[]) => {
            set((state) => {
              state.admin.activePlayers.clear();
              players.forEach(player => {
                state.admin.activePlayers.set(player.userId, player);
              });
              state.admin.totalActivePlayers = players.length;
              state.admin.lastUpdateTime = new Date();
            });
          },
          
          updateErrorLogs: (errors: AdminErrorLog[]) => {
            set((state) => {
              state.admin.errorLogs = errors;
              state.admin.recentErrors = errors.slice(0, 10); // Keep only 10 most recent
              
              // Update error stats
              const stats: Record<string, number> = {};
              errors.forEach(error => {
                const key = `${error.level}_${error.source}`;
                stats[key] = (stats[key] || 0) + 1;
              });
              state.admin.errorStats = stats;
              
              state.admin.lastUpdateTime = new Date();
            });
          },
          
          updateStationHealth: (health: StationHealthMetrics[]) => {
            set((state) => {
              state.admin.stationHealth.clear();
              state.admin.offlineStations = [];
              state.admin.degradedStations = [];
              
              health.forEach(metrics => {
                state.admin.stationHealth.set(metrics.frequency, metrics);
                
                if (metrics.status === 'offline') {
                  state.admin.offlineStations.push(metrics.frequency);
                } else if (metrics.status === 'degraded') {
                  state.admin.degradedStations.push(metrics.frequency);
                }
              });
              
              state.admin.lastUpdateTime = new Date();
            });
          },
          
          updateRealTimeAnalytics: (analytics: AdminAnalytics) => {
            set((state) => {
              state.admin.realTimeAnalytics = analytics;
              state.admin.lastUpdateTime = new Date();
            });
          },
          
          updateAdminSettings: (newSettings: Partial<AdminMonitoringState['settings']>) => {
            set((state) => {
              state.admin.settings = { ...state.admin.settings, ...newSettings };
            });
          },
          
          // Admin user management actions
          kickUser: async (userId: string) => {
            try {
              await adminMonitoringService.kickUser(userId);
              
              // Remove user from active players
              set((state) => {
                state.admin.activePlayers.delete(userId);
                state.admin.totalActivePlayers = state.admin.activePlayers.size;
              });
              
              // Log the action
              get().actions.logAdminError({
                level: 'info',
                source: 'admin',
                message: `User ${userId} has been kicked by admin`,
                userId,
                metadata: { action: 'kick', adminAction: true },
              });
            } catch (error) {
              get().actions.logAdminError({
                level: 'error',
                source: 'admin',
                message: `Failed to kick user ${userId}`,
                userId,
                stack: error instanceof Error ? error.stack : undefined,
                metadata: { error: String(error) },
              });
              throw error;
            }
          },
          
          pauseUserPlayback: async (userId: string) => {
            try {
              await adminMonitoringService.pauseUserPlayback(userId);
              
              // Update player state
              set((state) => {
                const player = state.admin.activePlayers.get(userId);
                if (player) {
                  player.isPlaying = false;
                  player.lastActivity = new Date();
                }
              });
              
              // Log the action
              get().actions.logAdminError({
                level: 'info',
                source: 'admin',
                message: `User ${userId} playback paused by admin`,
                userId,
                metadata: { action: 'pause', adminAction: true },
              });
            } catch (error) {
              get().actions.logAdminError({
                level: 'error',
                source: 'admin',
                message: `Failed to pause user ${userId} playback`,
                userId,
                stack: error instanceof Error ? error.stack : undefined,
                metadata: { error: String(error) },
              });
              throw error;
            }
          },
          
          restartStation: async (frequency: number) => {
            try {
              await adminMonitoringService.restartStation(frequency);
              
              // Log the action
              get().actions.logAdminError({
                level: 'info',
                source: 'admin',
                message: `Station ${frequency} MHz restart requested by admin`,
                frequency,
                metadata: { action: 'restart', adminAction: true },
              });
            } catch (error) {
              get().actions.logAdminError({
                level: 'error',
                source: 'admin',
                message: `Failed to restart station ${frequency} MHz`,
                frequency,
                stack: error instanceof Error ? error.stack : undefined,
                metadata: { error: String(error) },
              });
              throw error;
            }
          },
          
          resolveError: async (errorId: string, adminId: string) => {
            try {
              await adminMonitoringService.resolveError(errorId, adminId);
              
              // Update local error state
              set((state) => {
                const error = state.admin.errorLogs.find(e => e.id === errorId);
                if (error) {
                  error.resolved = true;
                  error.resolvedAt = new Date();
                  error.resolvedBy = adminId;
                }
              });
            } catch (error) {
              get().actions.logAdminError({
                level: 'error',
                source: 'admin',
                message: `Failed to resolve error ${errorId}`,
                stack: error instanceof Error ? error.stack : undefined,
                metadata: { error: String(error), errorId, adminId },
              });
              throw error;
            }
          },
          
          logAdminError: async (error: Omit<AdminErrorLog, 'id' | 'timestamp'>) => {
            try {
              await adminMonitoringService.logError(error);
            } catch (logError) {
              console.error('❌ Failed to log admin error:', logError);
              // Don't throw to avoid infinite loops
            }
          },
          
          // NEW: Playlist management actions implementation
          reorderPlaylist: async (stationId: string, newOrder: PlaylistItem[]) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.reorderPlaylist(stationId, newOrder)
              );
              
              if (result.success) {
                // Update cached station data
                set((state) => {
                  if (state.data.currentStation?.id === stationId) {
                    state.data.currentStation.playlist = newOrder;
                  }
                  const cachedStation = state.data.stations.get(parseInt(state.data.currentStation?.frequency.toString() || '0'));
                  if (cachedStation && cachedStation.id === stationId) {
                    cachedStation.playlist = newOrder;
                  }
                });
                
                return true;
              }
              return false;
            } catch (error) {
              console.error('Failed to reorder playlist:', error);
              return false;
            }
          },
          
          removeMultipleTracks: async (stationId: string, trackIds: string[]) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.removeMultipleTracks(stationId, trackIds)
              );
              
              if (result.success) {
                // Update cached station data
                set((state) => {
                  if (state.data.currentStation?.id === stationId) {
                    state.data.currentStation.playlist = state.data.currentStation.playlist.filter(
                      track => !trackIds.includes(track.id)
                    );
                  }
                });
                
                return true;
              }
              return false;
            } catch (error) {
              console.error('Failed to remove tracks:', error);
              return false;
            }
          },
          
          duplicateTrack: async (stationId: string, trackId: string, position?: number) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.duplicateTrack(stationId, trackId, position)
              );
              
              if (result.success && result.newTrack) {
                // Update cached station data
                set((state) => {
                  if (state.data.currentStation?.id === stationId) {
                    const insertPos = position ?? state.data.currentStation.playlist.length;
                    state.data.currentStation.playlist.splice(insertPos, 0, result.newTrack!);
                  }
                });
                
                return true;
              }
              return false;
            } catch (error) {
              console.error('Failed to duplicate track:', error);
              return false;
            }
          },
          
          applyPlaylistTemplate: async (stationId: string, templateId: string) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.applyTemplateToStation(
                  stationId, 
                  templateId, 
                  {} as any, // DJ will be resolved in service
                  undefined,
                  false
                )
              );
              
              return result.success;
            } catch (error) {
              console.error('Failed to apply template:', error);
              return false;
            }
          },
          
          exportPlaylist: async (stationId: string) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.exportPlaylist(stationId, true)
              );
              
              return result.success ? result.data : null;
            } catch (error) {
              console.error('Failed to export playlist:', error);
              return null;
            }
          },
          
          importPlaylist: async (stationId: string, data: any) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.importPlaylist(stationId, data, false)
              );
              
              return result.success;
            } catch (error) {
              console.error('Failed to import playlist:', error);
              return false;
            }
          },
          
          optimizePlaylist: async (stationId: string, options: any = {}) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.optimizePlaylist(stationId, options)
              );
              
              return result.success;
            } catch (error) {
              console.error('Failed to optimize playlist:', error);
              return false;
            }
          },
          
          analyzePlaylistPerformance: async (stationId: string) => {
            try {
              const result = await import('@/services/PlaylistManagerService').then(
                module => module.playlistManagerService.analyzePlaylistPerformance(stationId)
              );
              
              return result.success ? result.analytics : null;
            } catch (error) {
              console.error('Failed to analyze playlist:', error);
              return null;
            }
          },
          
          // Existing utility actions
          reset: () => {
            set((state) => {
              state.radio = initialRadioState;
              state.playback = initialPlaybackState;
              state.data = initialDataState;
              state.ui = initialUIState;
              state.user = initialUserState;
              // Reset admin state but preserve monitoring if active
              if (!state.admin.isMonitoringActive) {
                state.admin = initialAdminState;
              }
            });
          },
          
          invalidateCache: (key?: string) => {
            set((state) => {
              if (key) {
                delete state.data.lastUpdated[key];
              } else {
                state.data.lastUpdated = {};
                state.data.stations.clear();
                state.data.playlists.clear();
              }
            });
          },
        },
      })),
      {
        name: 'extended-onde-spectrale-radio-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          radio: {
            frequency: state.radio.frequency,
            sliderValue: state.radio.sliderValue,
          },
          playback: {
            volume: state.playback.volume,
          },
          ui: {
            autoPlayEnabled: state.ui.autoPlayEnabled,
            ttsEnabled: state.ui.ttsEnabled,
          },
          // Don't persist admin monitoring state
          // It will be reinitialized on app start
        }),
      }
    ),
    { name: 'extended-radio-store' }
  )
);

// Enhanced selector hooks for performance
export const useRadioState = () => useExtendedRadioStore(state => state.radio);
export const usePlaybackState = () => useExtendedRadioStore(state => state.playback);
export const useDataState = () => useExtendedRadioStore(state => state.data);
export const useUIState = () => useExtendedRadioStore(state => state.ui);
export const useUserState = () => useExtendedRadioStore(state => state.user);

// NEW: Admin monitoring selectors
export const useAdminState = () => useExtendedRadioStore(state => state.admin);
export const useAdminSystemStatus = () => useExtendedRadioStore(state => state.admin.systemStatus);
export const useAdminActivePlayers = () => useExtendedRadioStore(state => state.admin.activePlayers);
export const useAdminErrorLogs = () => useExtendedRadioStore(state => state.admin.errorLogs);
export const useAdminStationHealth = () => useExtendedRadioStore(state => state.admin.stationHealth);
export const useAdminAnalytics = () => useExtendedRadioStore(state => state.admin.realTimeAnalytics);
export const useAdminAlerts = () => useExtendedRadioStore(state => state.admin.systemAlerts);

// Action selectors
export const useRadioActions = () => useExtendedRadioStore(state => state.actions);
export const useAdminActions = () => useExtendedRadioStore(state => ({
  initializeAdminMonitoring: state.actions.initializeAdminMonitoring,
  cleanupAdminMonitoring: state.actions.cleanupAdminMonitoring,
  updateSystemStatus: state.actions.updateSystemStatus,
  addSystemAlert: state.actions.addSystemAlert,
  acknowledgeAlert: state.actions.acknowledgeAlert,
  clearAcknowledgedAlerts: state.actions.clearAcknowledgedAlerts,
  updateActivePlayers: state.actions.updateActivePlayers,
  updateErrorLogs: state.actions.updateErrorLogs,
  updateStationHealth: state.actions.updateStationHealth,
  updateRealTimeAnalytics: state.actions.updateRealTimeAnalytics,
  updateAdminSettings: state.actions.updateAdminSettings,
  kickUser: state.actions.kickUser,
  pauseUserPlayback: state.actions.pauseUserPlayback,
  restartStation: state.actions.restartStation,
  resolveError: state.actions.resolveError,
  logAdminError: state.actions.logAdminError,
}));

// NEW: Playlist management actions selector
export const usePlaylistActions = () => useExtendedRadioStore(state => ({
  reorderPlaylist: state.actions.reorderPlaylist,
  removeMultipleTracks: state.actions.removeMultipleTracks,
  duplicateTrack: state.actions.duplicateTrack,
  applyPlaylistTemplate: state.actions.applyPlaylistTemplate,
  exportPlaylist: state.actions.exportPlaylist,
  importPlaylist: state.actions.importPlaylist,
  optimizePlaylist: state.actions.optimizePlaylist,
  analyzePlaylistPerformance: state.actions.analyzePlaylistPerformance,
}));

// Utility to check if user is admin (placeholder)
export const useIsAdmin = () => {
  const user = useUserState().user;
  // TODO: Implement proper admin role check
  return user?.email?.includes('admin') || false;
};