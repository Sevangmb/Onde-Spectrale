import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Station, PlaylistItem, User } from '@/lib/types';

// Enhanced State Types
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

// Combined Store State
interface EnhancedRadioStore {
  radio: RadioState;
  playback: PlaybackState;
  data: DataState;
  ui: UIState;
  user: UserState;
  
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
    
    // Utility actions
    reset: () => void;
    invalidateCache: (key?: string) => void;
  };
}

// Initial states
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

// Store implementation with optimistic updates
export const useEnhancedRadioStore = create<EnhancedRadioStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        radio: initialRadioState,
        playback: initialPlaybackState,
        data: initialDataState,
        ui: initialUIState,
        user: initialUserState,
        
        actions: {
          // Radio actions with optimistic updates
          setFrequency: async (frequency: number) => {
            // Optimistic update
            set((state) => {
              state.radio.frequency = frequency;
              state.radio.sliderValue = frequency;
              state.data.isLoadingStation = true;
              state.radio.error = null;
            });
            
            // Background station loading will be handled by services
            // This allows immediate UI feedback
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
          
          // Playback actions with optimistic updates
          playTrack: async (track: PlaylistItem) => {
            // Optimistic update
            set((state) => {
              state.playback.currentTrack = track;
              state.playback.isLoading = true;
              state.playback.errorMessage = null;
            });
            
            // Actual audio loading will be handled by AudioService
          },
          
          togglePlayback: async () => {
            const { playback } = get();
            
            if (playback.isLoading) return;
            
            set((state) => {
              state.playback.isPlaying = !state.playback.isPlaying;
            });
            
            // Actual audio control will be handled by AudioService
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
          
          // Data actions
          setCurrentStation: (station: Station | null) => {
            set((state) => {
              state.data.currentStation = station;
              state.data.isLoadingStation = false;
              
              // Cache the station
              if (station) {
                state.data.stations.set(station.frequency, station);
                state.data.lastUpdated[`station_${station.frequency}`] = Date.now();
              }
              
              // Reset playback when station changes
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
          
          // UI actions
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
          
          // User actions
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
          
          // Utility actions
          reset: () => {
            set((state) => {
              state.radio = initialRadioState;
              state.playback = initialPlaybackState;
              state.data = initialDataState;
              state.ui = initialUIState;
              state.user = initialUserState;
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
        name: 'enhanced-onde-spectrale-radio-store',
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
        }),
      }
    ),
    { name: 'enhanced-radio-store' }
  )
);

// Selector hooks for performance
export const useRadioState = () => useEnhancedRadioStore(state => state.radio);
export const usePlaybackState = () => useEnhancedRadioStore(state => state.playback);
export const useDataState = () => useEnhancedRadioStore(state => state.data);
export const useUIState = () => useEnhancedRadioStore(state => state.ui);
export const useUserState = () => useEnhancedRadioStore(state => state.user);
export const useRadioActions = () => useEnhancedRadioStore(state => state.actions);