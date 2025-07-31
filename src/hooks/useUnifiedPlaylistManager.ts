'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEnhancedRadioStore, useRadioActions, usePlaybackState, useDataState, useUIState } from '@/stores/enhancedRadioStore';
import { playlistManagerService } from '@/services/PlaylistManagerService';
// Import dynamique d'AudioService pour éviter les erreurs SSR
import { getAudioForTrack } from '@/app/actions';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter, User } from '@/lib/types';
import { getAppUserId } from '@/lib/userConverter';

interface UnifiedPlaylistManagerProps {
  station: Station | null;
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

/**
 * Hook unifié de gestion de playlist avec intelligence intégrée
 * Combine les meilleures fonctionnalités des deux approches (ancien et enhanced)
 */
export function useUnifiedPlaylistManager({ station, user, allDjs }: UnifiedPlaylistManagerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMountedRef = useRef(true);
  const currentOperationId = useRef<string | null>(null);
  const audioServiceRef = useRef<any>(null);
  
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
      import('@/services/AudioService').then(({ audioService }) => {
        audioServiceRef.current = audioService;
      }).catch(console.error);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);
  
  // Volume synchronization
  useEffect(() => {
    if (audioRef.current && audioServiceRef.current) {
      audioServiceRef.current.setVolume(audioRef.current, playback.volume);
    }
  }, [playback.volume]);
  
  // Enhanced play track with smart error handling
  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (!isMountedRef.current || !station || currentOperationId.current === trackId) {
      return;
    }
    
    currentOperationId.current = trackId;
    
    try {
      const track = station.playlist.find(t => t.id === trackId);
      if (!track) {
        throw new Error(`Track ${trackId} not found`);
      }
      
      if (track.type === 'message' && !track.content?.trim()) {
        console.warn('Empty message, skipping to next');
        await nextTrack();
        return;
      }
      
      // Check if track has failed before
      if (data.failedTracks.has(trackId)) {
        console.warn(`Track ${trackId} previously failed, skipping`);
        await nextTrack();
        return;
      }
      
      // Optimistic update
      await actions.playTrack(track);
      
      if (!audioRef.current) {
        throw new Error('Audio element not available');
      }
      
      // Get audio URL
      const userId = getAppUserId(user) || 'anonymous';
      const result = await getAudioForTrack(
        track,
        station.djCharacterId,
        userId,
        station.theme
      );
      
      if (!isMountedRef.current || currentOperationId.current !== trackId) return;
      
      if (result.error || !result.audioUrl) {
        throw new Error(result.error || 'Missing audio URL');
      }
      
      // Load and play audio using service
      await audioServiceRef.current.loadTrack({...track, url: result.audioUrl}, audioRef.current);
      
      // Handle TTS message
      if (result.audioUrl.startsWith('data:audio')) {
        actions.setTTSMessage(`Message from ${track.artist}: ${track.content}`);
      }
      
      try {
        await audioServiceRef.current.play(audioRef.current);
        
        // Auto-enable autoplay after successful play
        if (!ui.autoPlayEnabled) {
          actions.enableAutoPlay();
        }
        
      } catch (playError: any) {
        console.warn('Autoplay blocked by browser:', playError);
        if (playError.message.includes('User interaction required')) {
          actions.togglePlayback(); // Set up for user activation
          return;
        }
        throw playError;
      }
      
    } catch (error: any) {
      console.error(`Failed to play track ${trackId}:`, error);
      
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
      
    } finally {
      if (currentOperationId.current === trackId) {
        currentOperationId.current = null;
      }
    }
  }, [station, data.failedTracks, user, ui.autoPlayEnabled, actions]);
  
  // Enhanced toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (playback.isLoading) return;
    
    if (!audioRef.current) {
      console.error('Audio element not available');
      return;
    }
    
    try {
      if (playback.isPlaying) {
        audioServiceRef.current.pause(audioRef.current);
      } else if (playback.currentTrack) {
        await audioServiceRef.current.play(audioRef.current);
        if (!ui.autoPlayEnabled) {
          actions.enableAutoPlay();
        }
      } else {
        // Start with first available track
        const firstTrack = getFirstAvailableTrack();
        if (firstTrack) {
          await playTrackById(firstTrack.id);
        }
      }
      
      // Update store state
      await actions.togglePlayback();
      
    } catch (error: any) {
      console.error('Playback error:', error);
      if (error.message.includes('User interaction required')) {
        actions.enableAudioContext();
      }
    }
  }, [playback.isPlaying, playback.isLoading, playback.currentTrack, ui.autoPlayEnabled, actions, playTrackById]);
  
  // Helper function to get first available track
  const getFirstAvailableTrack = useCallback((): PlaylistItem | null => {
    if (!station) return null;
    
    return station.playlist.find(track => 
      !data.failedTracks.has(track.id)
    ) || null;
  }, [station, data.failedTracks]);
  
  // Enhanced next track with smart selection
  const nextTrack = useCallback(async () => {
    if (!station || !playback.currentTrack) return;
    
    const playlist = station.playlist;
    const currentIndex = playlist.findIndex(track => track.id === playback.currentTrack?.id);
    
    // Find next available track (not in failed list)
    let nextIndex = (currentIndex + 1) % playlist.length;
    let attempts = 0;
    
    while (attempts < playlist.length) {
      const nextTrack = playlist[nextIndex];
      
      if (nextTrack && !data.failedTracks.has(nextTrack.id)) {
        await playTrackById(nextTrack.id);
        return;
      }
      
      nextIndex = (nextIndex + 1) % playlist.length;
      attempts++;
    }
    
    // If all tracks failed, clear failed tracks and try again
    if (attempts >= playlist.length) {
      console.warn('All tracks failed, clearing failed tracks list');
      actions.clearFailedTracks();
      const firstTrack = playlist[0];
      if (firstTrack) {
        await playTrackById(firstTrack.id);
      }
    }
  }, [station, data.failedTracks, playback.currentTrack, actions, playTrackById]);
  
  // Enhanced previous track
  const previousTrack = useCallback(async () => {
    if (!station || !playback.currentTrack) return;
    
    const playlist = station.playlist;
    const currentIndex = playlist.findIndex(track => track.id === playback.currentTrack?.id);
    
    // Find previous available track
    let prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    let attempts = 0;
    
    while (attempts < playlist.length) {
      const prevTrack = playlist[prevIndex];
      
      if (prevTrack && !data.failedTracks.has(prevTrack.id)) {
        await playTrackById(prevTrack.id);
        return;
      }
      
      prevIndex = prevIndex > 0 ? prevIndex - 1 : playlist.length - 1;
      attempts++;
    }
  }, [station, data.failedTracks, playback.currentTrack, playTrackById]);
  
  // ========================================
  // PLAYLIST MANAGEMENT FEATURES
  // ========================================
  
  // Reorder playlist with optimization
  const reorderPlaylist = useCallback(async (newOrder: PlaylistItem[], optimize = true) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.reorderPlaylist(
      station.id, 
      newOrder, 
      { validateTracks: true, optimizeOrder: optimize }
    );
  }, [station]);
  
  // Remove multiple tracks
  const removeMultipleTracks = useCallback(async (trackIds: string[]) => {
    if (!station) return { success: false, removedCount: 0, error: 'No station available' };
    
    return await playlistManagerService.removeMultipleTracks(station.id, trackIds);
  }, [station]);
  
  // Duplicate track
  const duplicateTrack = useCallback(async (trackId: string, insertPosition?: number) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.duplicateTrack(station.id, trackId, insertPosition);
  }, [station]);
  
  // Generate smart playlist
  const generateSmartPlaylist = useCallback(async (options: {
    targetDuration?: number;
    messageRatio?: number;
    theme?: string;
    djStyle?: 'energetic' | 'calm' | 'mysterious' | 'professional';
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  } = {}) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.generateSmartPlaylist(station.id, options);
  }, [station]);
  
  // Apply template to current station
  const applyTemplate = useCallback(async (templateId: string, replaceExisting = false) => {
    if (!station) return { success: false, error: 'No station available' };
    
    const dj = allDjs.find(d => d.id === station.djCharacterId);
    if (!dj) return { success: false, error: 'DJ character not found' };
    
    return await playlistManagerService.applyTemplateToStation(
      station.id, 
      templateId, 
      dj, 
      station.theme, 
      replaceExisting
    );
  }, [station, allDjs]);
  
  // Export playlist
  const exportPlaylist = useCallback(async (includeMetadata = true) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.exportPlaylist(station.id, includeMetadata);
  }, [station]);
  
  // Import playlist
  const importPlaylist = useCallback(async (importData: any, replaceExisting = false) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.importPlaylist(station.id, importData, replaceExisting);
  }, [station]);
  
  // Analyze playlist performance
  const analyzePlaylist = useCallback(async () => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.analyzePlaylistPerformance(station.id);
  }, [station]);
  
  // Get personalized recommendations
  const getRecommendations = useCallback(async (userHistory?: any[]) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.getPersonalizedRecommendations(station.id, userHistory);
  }, [station]);
  
  // Optimize existing playlist
  const optimizePlaylist = useCallback(async (options: {
    maxDuration?: number;
    targetMessageRatio?: number;
    removeDuplicates?: boolean;
    sortByDuration?: boolean;
  } = {}) => {
    if (!station) return { success: false, error: 'No station available' };
    
    return await playlistManagerService.optimizePlaylist(station.id, options);
  }, [station]);
  
  // Get available templates
  const getAvailableTemplates = useCallback(() => {
    return playlistManagerService.getAvailableTemplates();
  }, []);
  
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
  }, [station?.id]);
  
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
      console.error('Audio error:', event);
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
  // ========================================
  
  return {
    // Basic playback state
    currentTrack: playback.currentTrack,
    isPlaying: playback.isPlaying,
    isLoadingTrack: playback.isLoading,
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
    
    // Playlist management actions
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

// Export the service for direct access if needed
export { playlistManagerService };