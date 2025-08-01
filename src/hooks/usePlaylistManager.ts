'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePlaybackState } from './audio/usePlaybackState';
import { useTrackSelection } from './audio/useTrackSelection';
import { useAutoPlay } from './audio/useAutoPlay';
import { useAudioEffects } from './audio/useAudioEffects';
import { useFailedTracks } from './audio/useFailedTracks';
import { getAudioForTrack } from '@/app/actions';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter } from '@/lib/types';

interface PlaylistManagerProps {
  station: Station | null;
  user: any;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

export function usePlaylistManager({ station, user }: PlaylistManagerProps) {
  const isMountedRef = useRef(true);
  const currentOperationId = useRef<string | null>(null);

  // Composed hooks
  const playback = usePlaybackState();
  const { failedTracks, addFailedTrack } = useFailedTracks();
  const trackSelection = useTrackSelection({ station, failedTracks });
  const autoPlay = useAutoPlay();
  const audioEffects = useAudioEffects();

  // Main play function - simplified and focused
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
        throw new Error('Empty message, skipping to next');
      }

      // Update state
      trackSelection.selectTrack(track);
      playback.setLoading();
      playback.clearError();
      audioEffects.clearTTSMessage();

      // Get audio
      const result = await getAudioForTrack(
        track, 
        station.djCharacterId, 
        user?.uid || 'anonymous', 
        station.theme
      );

      if (!isMountedRef.current || currentOperationId.current !== trackId) return;

      if (result.error || !result.audioUrl) {
        throw new Error(result.error || 'Missing audio URL');
      }

      // Setup audio
      const audio = playback.audioRef.current;
      if (!audio) {
        throw new Error("Audio player not available");
      }

      audio.src = result.audioUrl;

      // Handle TTS message
      if (result.audioUrl.startsWith('data:audio')) {
        audioEffects.playTTSMessage(`Message from ${track.artist}: ${track.content}`);
      }

      // Try to play
      try {
        await audio.play();
        playback.setPlaying();
        
        if (!autoPlay.autoPlayEnabled) {
          autoPlay.enableAutoPlay();
        }
      } catch (playError: any) {
        console.warn('Autoplay blocked by browser:', playError);
        playback.setPaused();
        playback.setError('🎵 Click to start audio playback');
        return;
      }

    } catch (error: any) {
      addFailedTrack(trackId);
      playback.setError(error.message);
      
      // Auto-skip to next track after error
      autoPlay.scheduleAutoPlay(() => {
        if (isMountedRef.current) {
          trackSelection.selectNextTrack();
        }
      }, 1500);
    } finally {
      if (currentOperationId.current === trackId) {
        currentOperationId.current = null;
      }
    }
  }, [station, user, trackSelection, playback, audioEffects, autoPlay, addFailedTrack]);

  // Simplified toggle function
  const togglePlayPause = async () => {
    if (playback.isLoading) return;

    if (playback.isPlaying) {
      playback.audioRef.current?.pause();
      playback.setPaused();
    } else if (trackSelection.currentTrack) {
      try {
        await playback.audioRef.current?.play();
        playback.setPlaying();
        autoPlay.enableAutoPlay();
      } catch(e) {
        playback.setError("Playback blocked by browser. Click to activate.");
        playback.setPaused();
      }
    } else {
      const firstTrack = trackSelection.availableTracks[0];
      if (firstTrack) {
        trackSelection.selectTrack(firstTrack);
        autoPlay.enableAutoPlay();
      }
    }
  };

  // Event handlers
  const handleAudioEnded = useCallback(() => {
    if (isMountedRef.current) {
      trackSelection.selectNextTrack();
    }
  }, [trackSelection]);

  // Effects
  useEffect(() => {
    isMountedRef.current = true;
    
    // Reset everything when station changes
    playback.setIdle();
    audioEffects.stopAllAudio();
    trackSelection.resetForNewStation();
    
    if (station && trackSelection.availableTracks.length > 0) {
      const firstTrack = trackSelection.availableTracks[0];
      trackSelection.selectTrack(firstTrack);
    }

    return () => {
      isMountedRef.current = false;
      playback.setIdle();
      audioEffects.stopAllAudio();
    };
  }, [station?.id, station, audioEffects, playback, trackSelection]);

  // Auto-play effect
  useEffect(() => {
    if (autoPlay.autoPlayEnabled && 
        trackSelection.currentTrack && 
        !playback.isPlaying && 
        !playback.isLoading && 
        station) {
      
      autoPlay.scheduleAutoPlay(() => {
        if (isMountedRef.current && trackSelection.currentTrack) {
          playTrackById(trackSelection.currentTrack.id);
        }
      });
    }
  }, [
    autoPlay.autoPlayEnabled, 
    autoPlay,
    trackSelection.currentTrack?.id, 
    trackSelection.currentTrack,
    playback.isPlaying, 
    playback.isLoading,
    station?.id,
    station,
    playTrackById
  ]);

  // Audio event listeners
  useEffect(() => {
    const audio = playback.audioRef.current;
    if (audio) {
      audio.addEventListener('ended', handleAudioEnded);
      return () => audio.removeEventListener('ended', handleAudioEnded);
    }
  }, [handleAudioEnded, playback.audioRef]);

  // Public API
  return {
    // State
    currentTrack: trackSelection.currentTrack,
    isPlaying: playback.isPlaying,
    isLoadingTrack: playback.isLoading,
    failedTracks,
    ttsMessage: audioEffects.ttsMessage,
    errorMessage: playback.errorMessage,
    ttsEnabled: audioEffects.ttsEnabled,
    autoPlayEnabled: autoPlay.autoPlayEnabled,
    canGoBack: trackSelection.canGoBack,
    playlistLength: station?.playlist.length || 0,
    
    // Actions
    playTrackById,
    togglePlayPause,
    nextTrack: trackSelection.selectNextTrack,
    previousTrack: trackSelection.selectPreviousTrack,
    enableTTS: audioEffects.enableTTS,
    enableAutoPlay: autoPlay.enableAutoPlay,
    addFailedTrack,
    
    // Refs
    audioRef: playback.audioRef
  };
}
