'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useEnhancedRadioStore, useRadioActions, usePlaybackState, useDataState, useUIState } from '@/stores/enhancedRadioStore';
// Import dynamique d'AudioService pour éviter les erreurs SSR
import { stationService } from '@/services/StationService';
import { getAudioForTrack } from '@/app/actions';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter, User } from '@/lib/types';
import { getAppUserId } from '@/lib/userConverter';

interface EnhancedPlaylistManagerProps {
  station: Station | null;
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

export function useEnhancedPlaylistManager({ user }: EnhancedPlaylistManagerProps) {
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
      
      // Set initial volume
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
  }, [playback.volume]);
  
  // Volume synchronization
  useEffect(() => {
    if (audioRef.current && audioServiceRef.current) {
      audioServiceRef.current.setVolume(audioRef.current, playback.volume);
    }
  }, [playback.volume]);
  
  // Enhanced play track function with service integration
  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (!isMountedRef.current || !data.currentStation || currentOperationId.current === trackId) {
      return;
    }
    
    currentOperationId.current = trackId;
    
    try {
      const track = data.currentStation.playlist.find(t => t.id === trackId);
      if (!track) {
        throw new Error(`Track ${trackId} not found`);
      }
      
      if (track.type === 'message' && !track.content?.trim()) {
        throw new Error('Empty message, skipping to next');
      }
      
      // Check if track has failed before
      if (data.failedTracks.has(trackId)) {
        console.warn(`Track ${trackId} previously failed, skipping`);
        actions.nextTrack();
        return;
      }
      
      // Optimistic update
      await actions.playTrack(track);
      
      if (!audioRef.current) {
        throw new Error('Audio element not available');
      }
      
      // Get audio URL through existing action
      const userId = getAppUserId(user) || 'anonymous';
      const result = await getAudioForTrack(
        track,
        data.currentStation.djCharacterId,
        userId,
        data.currentStation.theme
      );
      
      if (!isMountedRef.current || currentOperationId.current !== trackId) return;
      
      if (result.error || !result.audioUrl) {
        throw new Error(result.error || 'Missing audio URL');
      }
      
      // Load audio using service
      await audioServiceRef.current.loadTrack({...track, url: result.audioUrl}, audioRef.current);
      
      // Handle TTS message
      if (result.audioUrl.startsWith('data:audio')) {
        actions.setTTSMessage(`Message from ${track.artist}: ${track.content}`);
      }
      
      // Play audio using service
      try {
        await audioServiceRef.current.play(audioRef.current);
        
        // Auto-enable autoplay after successful play
        if (!ui.autoPlayEnabled) {
          actions.enableAutoPlay();
        }
        
      } catch (playError: any) {
        console.warn('Autoplay blocked by browser:', playError);
        if (playError.message.includes('User interaction required')) {
          // Set up for user activation
          actions.togglePlayback(); // This will update the state to show play button
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
            actions.nextTrack();
          }
        }, 1500);
      }
      
    } finally {
      if (currentOperationId.current === trackId) {
        currentOperationId.current = null;
      }
    }
  }, [data.currentStation, data.failedTracks, user, ui.autoPlayEnabled, actions]);
  
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
        // Enable audio context for future interactions
        actions.enableAudioContext();
      }
    }
  }, [playback.isPlaying, playback.isLoading, playback.currentTrack, ui.autoPlayEnabled, actions, playTrackById, getFirstAvailableTrack]);
  
  // Helper function to get first available track
  const getFirstAvailableTrack = useCallback((): PlaylistItem | null => {
    if (!data.currentStation) return null;
    
    return data.currentStation.playlist.find(track => 
      !data.failedTracks.has(track.id)
    ) || null;
  }, [data.currentStation, data.failedTracks]);
  
  // Enhanced next track with better error handling
  const nextTrack = useCallback(() => {
    if (!data.currentStation || !playback.currentTrack) return;
    
    const playlist = data.currentStation.playlist;
    const currentIndex = playlist.findIndex(track => track.id === playback.currentTrack?.id);
    
    // Find next available track (not in failed list)
    let nextIndex = (currentIndex + 1) % playlist.length;
    let attempts = 0;
    
    while (attempts < playlist.length) {
      const nextTrack = playlist[nextIndex];
      
      if (nextTrack && !data.failedTracks.has(nextTrack.id)) {
        playTrackById(nextTrack.id);
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
        playTrackById(firstTrack.id);
      }
    }
  }, [data.currentStation, data.failedTracks, playback.currentTrack, actions, playTrackById]);
  
  // Enhanced previous track
  const previousTrack = useCallback(() => {
    if (!data.currentStation || !playback.currentTrack) return;
    
    const playlist = data.currentStation.playlist;
    const currentIndex = playlist.findIndex(track => track.id === playback.currentTrack?.id);
    
    // Find previous available track
    let prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    let attempts = 0;
    
    while (attempts < playlist.length) {
      const prevTrack = playlist[prevIndex];
      
      if (prevTrack && !data.failedTracks.has(prevTrack.id)) {
        playTrackById(prevTrack.id);
        return;
      }
      
      prevIndex = prevIndex > 0 ? prevIndex - 1 : playlist.length - 1;
      attempts++;
    }
  }, [data.currentStation, data.failedTracks, playback.currentTrack, playTrackById]);
  
  // Auto-ended handler
  const handleAudioEnded = useCallback(() => {
    if (isMountedRef.current && ui.autoPlayEnabled) {
      nextTrack();
    }
  }, [ui.autoPlayEnabled, nextTrack]);
  
  // Auto-play effect when station changes
  useEffect(() => {
    if (data.currentStation && data.currentStation.playlist.length > 0) {
      const firstTrack = getFirstAvailableTrack();
      if (firstTrack && !playback.currentTrack) {
        // Auto-select first track but don't play until user interaction
        actions.playTrack(firstTrack);
      }
    }
  }, [data.currentStation?.id, data.currentStation, getFirstAvailableTrack, playback.currentTrack, actions]);
  
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
      }, 500); // Small delay to prevent race conditions
      
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
    const handleTimeUpdate = () => {
      // Could emit time updates to store if needed
    };
    const handleLoadStart = () => {
      // Track loading started
    };
    const handleCanPlay = () => {
      // Track is ready to play
    };
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
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
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
  
  // Public API - simplified and focused
  return {
    // State (from store)
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
    playlistLength: data.currentStation?.playlist.length || 0,
    
    // Navigation state
    canGoBack: data.currentStation && playback.currentTrack ? 
      data.currentStation.playlist.findIndex(t => t.id === playback.currentTrack?.id) > 0 : false,
    canGoForward: data.currentStation && playback.currentTrack ?
      data.currentStation.playlist.findIndex(t => t.id === playback.currentTrack?.id) < data.currentStation.playlist.length - 1 : false,
    
    // Actions
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
    
    // Audio ref for compatibility
    audioRef,
  };
}