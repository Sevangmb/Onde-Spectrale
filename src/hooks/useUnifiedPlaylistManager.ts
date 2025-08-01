'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEnhancedRadioStore, useRadioActions, usePlaybackState as usePlaybackStateOriginal, useDataState as useDataStateOriginal, useUIState as useUIStateOriginal } from '@/stores/enhancedRadioStore';
// Import dynamique d'AudioService pour éviter les erreurs SSR
import { getAudioForTrack } from '@/app/actions';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter, User } from '@/lib/types';
import { getAppUserId } from '@/lib/userConverter';
import logger from '@/lib/logger';

interface UnifiedPlaylistManagerProps {
  station: Station | null;
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

interface Dependencies {
  usePlaybackState: () => ReturnType<typeof usePlaybackStateOriginal>;
  useDataState: () => ReturnType<typeof useDataStateOriginal>;
  useUIState: () => ReturnType<typeof useUIStateOriginal>;
  useRadioActions: () => ReturnType<typeof useRadioActions>;
  playlistManagerService: any;
}

/**
 * Hook unifié de gestion de playlist avec intelligence intégrée
 * Combine les meilleures fonctionnalités des deux approches (ancien et enhanced)
 */
export function useUnifiedPlaylistManager(
  { station, user, allDjs }: UnifiedPlaylistManagerProps,
  dependencies: Dependencies
) {
  const {
    usePlaybackState,
    useDataState,
    useUIState,
    useRadioActions,
    playlistManagerService,
  } = dependencies;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const currentOperationId = useRef<string | null>(null);
  const audioServiceRef = useRef<import('@/services/AudioService').AudioService | null>(null);
  
  // Store selectors
  const playback = usePlaybackState();
  const data = useDataState();
  const ui = useUIState();
  const actions = useRadioActions();
  
  // Initialize audio element and load AudioService dynamically
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.preload = 'metadata';
      audioRef.current.volume = playback.volume;
   
        // Load AudioService dynamically
        import('@/services/AudioService')
          .then((module) => {
            audioServiceRef.current = module.audioService;
          })
          .catch((error) => logger.error(String(error)));
      }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [playback.volume]);
  
  // Volume synchronization
  useEffect(() => {
    if (audioRef.current && audioServiceRef.current) {
      audioServiceRef.current.setVolume(audioRef.current, playback.volume);
    }
  }, [playback.volume]);
  
  
  const findNextAvailableTrack = useCallback((startIndex: number, direction: 'next' | 'previous'): PlaylistItem | null => {
    if (!station) return null;
    
    const playlist = station.playlist;
    let currentIndex = startIndex;
    let attempts = 0;
    
    while (attempts < playlist.length) {
      const nextIndex = direction === 'next' ? (currentIndex + 1) % playlist.length : (currentIndex > 0 ? currentIndex - 1 : playlist.length - 1);
      const nextTrack = playlist[nextIndex];
      
      if (nextTrack && !data.failedTracks.has(nextTrack.id)) {
        return nextTrack;
      }
      
      currentIndex = nextIndex;
      attempts++;
    }
    
    return null;
  }, [station, data.failedTracks]);
  

  
  // Enhanced previous track
  const previousTrack = useCallback(async () => {
    if (!station || !playback.currentTrack) return;
    
    const playlist = station.playlist;
    const currentIndex = playlist.findIndex(track => track.id === playback.currentTrack?.id);
    
    const prevTrack = findNextAvailableTrack(currentIndex, 'previous');
    
    if (prevTrack) {
      await playTrackById(prevTrack.id);
      return;
    }
  }, [station, data.failedTracks, playback.currentTrack, actions, findNextAvailableTrack]);
    // Enhanced next track with smart selection
    const nextTrack: () => Promise<void> = useCallback(async () => {
      if (!station || !playback.currentTrack) return;
      
      const playlist = station.playlist;
      const currentIndex = playlist.findIndex(track => track.id === playback.currentTrack?.id);
      
      const nextTrack = findNextAvailableTrack(currentIndex, 'next');
      
      if (nextTrack) {
        await playTrackById(nextTrack.id);
        return;
      }
      
      // If all tracks failed, clearing failed tracks list
      actions.clearFailedTracks();
      const firstTrack = playlist[0];
      if (firstTrack) {
        await playTrackById(firstTrack.id);
      }
    }, [station, data.failedTracks, playback.currentTrack, actions, findNextAvailableTrack]);
  
    const getFirstAvailableTrack = useCallback((): PlaylistItem | null => {
      if (!station) return null;
      
      return station ? station.playlist.find(track => 
        !data.failedTracks.has(track.id)
      ) || null : null;
    }, [station, data.failedTracks]);

    const playTrackById: (trackId: string) => Promise<void> = useCallback(async (trackId: string): Promise<void> => {
      const validate = validateTrackAndOperation(trackId);
      if (!validate) return;
  
      try {
        if (!station) return;
        const track = station.playlist.find(t => t.id === trackId);
        if (!track) {
          throw new Error(`Track ${trackId} not found`);
        }
  
        if (track.type === 'message' && !track.content?.trim()) {
          await nextTrack();
          return;
        }
  
        // Check if track has failed before
        if (data.failedTracks.has(trackId)) {
          await nextTrack();
          return;
        }
  
        // Optimistic update
        await actions.playTrack(track);
  
        await getAudioAndLoadTrack(track);
  
        // Handle TTS message
        if (audioRef.current?.src.startsWith('data:audio')) {
          handleTTSMessage(track, { audioUrl: audioRef.current.src });
        }
  
        await startPlayback();
  
      } catch (error: any) {
        handlePlaybackError(trackId, error);
      } finally {
        if (currentOperationId.current === trackId) {
          currentOperationId.current = null;
        }
      }
    }, [station, data.failedTracks, user, ui.autoPlayEnabled, actions, findNextAvailableTrack, nextTrack]);
  
    const validateTrackAndOperation = useCallback((trackId: string): boolean => {
      if (!isMountedRef.current || !station || currentOperationId.current === trackId) {
        return false;
      }
  
      currentOperationId.current = trackId;
      return true;
    }, [isMountedRef, station, currentOperationId]);
  
    const getAudioAndLoadTrack = useCallback(async (track: PlaylistItem): Promise<void> => {
      if (!audioRef.current) {
        throw new Error('Audio element not available');
      }
  
      // Get audio URL
      const userId = getAppUserId(user) || 'anonymous';
      const result = await getAudioForTrack(
        track,
        station?.djCharacterId!,
        userId,
        station?.theme!
      );
  
      if (!isMountedRef.current || currentOperationId.current !== track.id) return;
  
      if (result.error || !result.audioUrl) {
        throw new Error(result.error || 'Missing audio URL');
      }
  
      // Load and play audio using service
      if (!audioServiceRef.current) {
        throw new Error('Audio service not available');
      }
      await audioServiceRef.current.loadTrack({...track, url: result.audioUrl}, audioRef.current);
    }, [station, user, isMountedRef, currentOperationId, audioRef, audioServiceRef, getAudioForTrack]);
  
    const handleTTSMessage = useCallback((track: PlaylistItem, result: { audioUrl: string }): void => {
      if (audioRef.current && audioRef.current.src.startsWith('data:audio')) {
        actions.setTTSMessage(`Message from ${track.artist}: ${track.content}`);
      }
    }, [actions, audioRef]);
  
    const startPlayback = useCallback(async (): Promise<void> => {
      try {
        if (!audioServiceRef.current || !audioRef.current) {
          throw new Error('Audio service not available');
        }
        await audioServiceRef.current.play(audioRef.current);
  
        // Auto-enable autoplay after successful play
        if (!ui.autoPlayEnabled) {
          actions.enableAutoPlay();
        }
  
      } catch (playError: any) {
        if (playError.message.includes('User interaction required')) {
          actions.togglePlayback(); // Set up for user activation
          return;
        }
        throw playError;
      }
    }, [audioServiceRef, audioRef, ui.autoPlayEnabled, actions]);
  
    const handlePlaybackError = useCallback((trackId: string, error: any): void => {
      logger.error(`Failed to play track ${trackId}: ${String(error.message)}`, String({ trackId, error }));
      actions.setError(`Impossible de lire la piste. Passage à la piste suivante.`);
  
      // Add to failed tracks
      actions.addFailedTrack(trackId);
  
      // Auto-skip to next track after error
      if (ui.autoPlayEnabled) {
        setTimeout(() => {
          if (isMountedRef.current) {
            nextTrack();
          }
        }, 1500);
      }
    }, [actions, ui.autoPlayEnabled, nextTrack, isMountedRef]);

  const handlePause = useCallback(async (): Promise<void> => {
    if (audioServiceRef.current && audioRef.current) {
      audioServiceRef.current.pause(audioRef.current);
    }
  }, [audioServiceRef, audioRef]);

  const handlePlay = useCallback(async (): Promise<void> => {
    if (audioServiceRef.current && audioRef.current) {
      await audioServiceRef.current.play(audioRef.current);
    }
    if (!ui.autoPlayEnabled) {
      actions.enableAutoPlay();
    }
  }, [audioServiceRef, audioRef, ui.autoPlayEnabled, actions]);

  const startWithFirstTrack = useCallback(async (): Promise<void> => {
    const firstTrack = getFirstAvailableTrack();
    if (firstTrack) {
      await playTrackById(firstTrack.id);
    }
  }, [getFirstAvailableTrack, playTrackById]);
  
  // Enhanced toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (playback.isLoading) return;
    
    if (!audioRef.current) {
      logger.error('Audio element not available');
      return;
    }
    
    try {
      if (playback.isPlaying) {
        await handlePause();
      } else if (playback.currentTrack) {
        await handlePlay();
      } else {
        await startWithFirstTrack();
      }
      
      // Update store state
      await actions.togglePlayback();
      
    } catch (error: any) {
      logger.error(`Playback error: ${String(error.message)}`, String({ error }));
      actions.setError(`Erreur de lecture : ${error.message}`);
      if (error.message.includes('User interaction required')) {
        actions.enableAudioContext();
      }
    }
  }, [playback.isPlaying, playback.isLoading, playback.currentTrack, ui.autoPlayEnabled, actions, handlePause, handlePlay, startWithFirstTrack]);
  

// PLAYLIST MANAGEMENT FEATURES
// ========================================

// Reorder playlist with optimization
const reorderPlaylist = useCallback(
  async (newOrder: PlaylistItem[], optimize = true) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.reorderPlaylist(
      station.id,
      newOrder,
      { validateTracks: true, optimizeOrder: optimize }
   );
  },
  [station, dependencies.playlistManagerService]
);

// Remove multiple tracks
const removeMultipleTracks = useCallback(
  async (trackIds: string[]) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.removeMultipleTracks(
      station.id,
      trackIds
    );
  },
  [station, dependencies.playlistManagerService]
);

// Duplicate track
const duplicateTrack = useCallback(
  async (trackId: string, insertPosition?: number) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.duplicateTrack(
      station.id,
      trackId,
      insertPosition
    );
  },
  [station, dependencies.playlistManagerService]
);

// Generate smart playlist
const generateSmartPlaylist = useCallback(
  async (options: {
    targetDuration?: number;
    messageRatio?: number;
    theme?: string;
    djStyle?: 'energetic' | 'calm' | 'mysterious' | 'professional';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  } = {}) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.generateSmartPlaylist(
      station.id,
      options
    );
  },
  [station, dependencies.playlistManagerService]
);

// Apply template to current station
const applyTemplate = useCallback(
  async (templateId: string, replaceExisting = false) => {
    if (!station) return { success: false, error: 'No station available' };

    const dj = allDjs.find((d) => d.id === station.djCharacterId);
    if (!dj) return { success: false, error: 'DJ character not found' };

    return await dependencies.playlistManagerService.applyTemplateToStation(
      station.id,
      templateId,
      dj,
      station.theme,
      replaceExisting
    );
  },
  [station, allDjs, dependencies.playlistManagerService]
);

// Export playlist
const exportPlaylist = useCallback(
  async (includeMetadata = true) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.exportPlaylist(
      station.id,
      includeMetadata
    );
  },
  [station, dependencies.playlistManagerService]
);

// Import playlist
const importPlaylist = useCallback(
  async (importData: unknown, replaceExisting = false) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.importPlaylist(
      station.id,
      importData,
      replaceExisting
    );
  },
  [station, dependencies.playlistManagerService]
);

// Analyze playlist performance
const analyzePlaylist = useCallback(async () => {
  if (!station) return { success: false, error: 'No station available' };

  return await dependencies.playlistManagerService.analyzePlaylistPerformance(station.id);
}, [station, dependencies.playlistManagerService]);

// Get personalized recommendations
const getRecommendations = useCallback(
  async (userHistory?: unknown[]) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.getPersonalizedRecommendations(
      station.id,
      userHistory
    );
  },
  [station, dependencies.playlistManagerService]
);

// Optimize existing playlist
const optimizePlaylist = useCallback(
  async (options: {
    maxDuration?: number;
    targetMessageRatio?: number;
    removeDuplicates?: boolean;
    sortByDuration?: boolean;
  } = {}) => {
    if (!station) return { success: false, error: 'No station available' };

    return await dependencies.playlistManagerService.optimizePlaylist(station.id, options);
  }, [station, dependencies.playlistManagerService]);

// Get available templates
const getAvailableTemplates = useCallback(
  () => {
    return dependencies.playlistManagerService.getAvailableTemplates();
  },
  [dependencies.playlistManagerService]
);

// ========================================
// EVENT HANDLERS
// ========================================

// Auto-ended handler
  const handleAudioEnded = useCallback(() => {
    if (isMountedRef.current && ui.autoPlayEnabled) {
      nextTrack();
    }
  }, [ui.autoPlayEnabled, nextTrack]);
  
  // Auto-play effect when station changes
  useEffect(() => {
    if (station && station.playlist.length > 0) {
      const firstTrack = getFirstAvailableTrack();
      if (firstTrack && !playback.currentTrack) {
        // Auto-select first track but don't play until user interaction
        actions.playTrack(firstTrack);
      }
    }
  }, [station?.id, station, getFirstAvailableTrack, playback.currentTrack, actions]);
  
  // Auto-play effect for continuous playback
  useEffect(() => {
    if (ui.autoPlayEnabled && 
        playback.currentTrack && 
        !playback.isPlaying && 
        !playback.isLoading && 
        ui.audioContextEnabled) {
      
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && playback.currentTrack) {
          playTrackById(playback.currentTrack.id);
        }
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    ui.autoPlayEnabled,
    playback.currentTrack,
    playback.currentTrack?.id,
    playback.isPlaying,
    playback.isLoading,
    ui.audioContextEnabled,
    playTrackById
  ]);
  
  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnded = () => handleAudioEnded();
    const handleError = (event: Event) => {
      logger.error(`Audio error: ${String(event)}`, String({ event }));
      if (playback.currentTrack) {
        actions.addFailedTrack(playback.currentTrack.id);
        if (ui.autoPlayEnabled) {
          nextTrack();
        }
      }
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [handleAudioEnded, nextTrack, playback.currentTrack, ui.autoPlayEnabled, actions]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // ========================================
  // PUBLIC API
  // = =======================================
  
  return {
    // Basic playback state
    currentTrack: playback.currentTrack,
    isPlaying: playback.isPlaying,
    isLoading: playback.isLoading,
    errorMessage: playback.errorMessage,
    volume: playback.volume,
    
    // UI state
    autoPlayEnabled: ui.autoPlayEnabled,
    ttsEnabled: ui.ttsEnabled,
    ttsMessage: ui.ttsMessage,
    audioContextEnabled: ui.audioContextEnabled,
    
    // Data state
    failedTracks: data.failedTracks,
    playlistLength: station?.playlist.length || 0,
    
    // Navigation state
    canGoBack: station && playback.currentTrack ? 
      station.playlist.findIndex(t => t.id === playback.currentTrack?.id) > 0 : false,
    canGoForward: station && playback.currentTrack ?
      station.playlist.findIndex(t => t.id === playback.currentTrack?.id) < station.playlist.length - 1 : false,
    
    // Basic playback actions
    playTrackById,
    togglePlayPause,
    nextTrack,
    previousTrack,
    
    // Store actions pass-through
    enableAutoPlay: actions.enableAutoPlay,
    enableTTS: actions.enableTTS,
    setVolume: actions.setVolume,
    addFailedTrack: actions.addFailedTrack,
    clearFailedTracks: actions.clearFailedTracks,
    enableAudioContext: actions.enableAudioContext,
    
    // Playlist management features
    reorderPlaylist,
    removeMultipleTracks,
    duplicateTrack,
    generateSmartPlaylist,
    applyTemplate,
    exportPlaylist,
    importPlaylist,
    analyzePlaylist,
    getRecommendations,
    optimizePlaylist,
    getAvailableTemplates,
    
    // Audio ref for compatibility
    audioRef,
    
    
  };
}