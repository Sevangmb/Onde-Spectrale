
// src/hooks/usePlaylistManager.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { getAudioForTrack } from '@/app/actions';

interface PlaylistManagerProps {
  station: Station | null;
  user: any;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

export function usePlaylistManager({ station, user }: PlaylistManagerProps) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [playlistHistory, setPlaylistHistory] = useState<number[]>([]);
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const isSeekingRef = useRef(false);

  // Reset when station changes
  useEffect(() => {
    isMountedRef.current = true;
    if (station) {
      setCurrentTrackIndex(0);
      setCurrentTrack(undefined);
      setIsPlaying(false);
      setIsLoadingTrack(false);
      setPlaylistHistory([]);
      setFailedTracks(new Set());
      isSeekingRef.current = false;
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    }
    return () => {
      isMountedRef.current = false;
    }
  }, [station?.id]);


  const nextTrack = useCallback(() => {
    if (!station || station.playlist.length === 0 || isSeekingRef.current) return;
    
    isSeekingRef.current = true;
    let nextIndex = (currentTrackIndex + 1) % station.playlist.length;
    
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    playTrack(nextIndex).finally(() => {
        if(isMountedRef.current) {
            isSeekingRef.current = false;
        }
    });

  }, [station, currentTrackIndex]);


  const playTrack = useCallback(async (trackIndex: number): Promise<boolean> => {
    if (!station || !station.playlist[trackIndex] || !isMountedRef.current) {
      return false;
    }

    const track = station.playlist[trackIndex];
    const trackId = track.id;

    if (failedTracks.has(trackId)) {
        console.log(`Piste ${track.title} déjà en échec, passage à la suivante.`);
        nextTrack();
        return false;
    }

    setIsLoadingTrack(true);
    setCurrentTrackIndex(trackIndex);
    setCurrentTrack(track);

    try {
      const result = await getAudioForTrack(track, station.djCharacterId, user.uid);
      
      if (!isMountedRef.current || !audioRef.current) return false;

      if (result.error || !result.audioUrl) {
        throw new Error(result.error || 'URL audio introuvable');
      }

      audioRef.current.src = result.audioUrl;
      audioRef.current.load();
      await audioRef.current.play();
      
      setIsPlaying(true);
      if (playlistHistory[playlistHistory.length - 1] !== trackIndex) {
          setPlaylistHistory(prev => [...prev.slice(-9), trackIndex]);
      }
      return true;

    } catch (error) {
      console.error(`Échec du chargement de la piste "${track.title}":`, error);
      if(isMountedRef.current) {
        setFailedTracks(prev => new Set(prev).add(trackId));
        nextTrack(); // Important: move to the next track on failure
      }
      return false;
    } finally {
        if (isMountedRef.current) {
            setIsLoadingTrack(false);
        }
    }
  }, [station, user, failedTracks, nextTrack, playlistHistory]);

  const previousTrack = useCallback(async () => {
    if (!station || playlistHistory.length < 2) return;

    const currentTrackFromHistory = playlistHistory[playlistHistory.length - 1];
    const prevIndex = playlistHistory[playlistHistory.length - 2];
    
    setPlaylistHistory(prev => prev.slice(0, -1));
    await playTrack(prevIndex);
  }, [station, playlistHistory, playTrack]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || isLoadingTrack) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack) {
        await playTrack(0);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Erreur reprise lecture:', error);
          nextTrack();
        }
      }
    }
  }, [isPlaying, isLoadingTrack, currentTrack, playTrack, nextTrack]);

  // Track end handler
  const handleTrackEnd = useCallback(() => {
    if (isMountedRef.current) {
        setIsPlaying(false);
        nextTrack();
    }
  }, [nextTrack]);

  // Setup audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.addEventListener('ended', handleTrackEnd);
    
    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
    };
  }, [handleTrackEnd]);

  // Auto-play when a station is loaded
  useEffect(() => {
    if (station && station.playlist.length > 0 && !isPlaying && !isLoadingTrack && !currentTrack) {
      playTrack(0);
    }
  }, [station, isPlaying, isLoadingTrack, currentTrack, playTrack]);


  return {
    currentTrack,
    currentTrackIndex,
    isPlaying,
    isLoadingTrack,
    failedTracks,
    audioRef,
    playTrack,
    nextTrack,
    previousTrack,
    togglePlayPause,
    canGoBack: playlistHistory.length > 1,
    playlistLength: station?.playlist.length || 0,
  };
}
