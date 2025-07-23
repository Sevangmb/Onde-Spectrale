
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
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [playlistHistory, setPlaylistHistory] = useState<string[]>([]);
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
  const [ttsMessage, setTtsMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const nextTrackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
  }, []);

  // Reset when station changes
  useEffect(() => {
    isMountedRef.current = true;
    stopPlayback();

    setCurrentTrack(undefined);
    setIsLoadingTrack(false);
    setPlaylistHistory([]);
    setFailedTracks(new Set());
    setTtsMessage(null);
    setErrorMessage(null);
    utteranceRef.current = null;
    
    // Auto-play first track of new station
    if (station && station.playlist.length > 0) {
        setTimeout(() => playTrackById(station.playlist[0].id), 500);
    }

    return () => {
      isMountedRef.current = false;
      stopPlayback();
    };
  }, [station?.id, stopPlayback]);

  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (!station) return;
    const track = station.playlist.find(t => t.id === trackId);
    if (!track) return;

    if (track.type === 'message' && !track.content?.trim()) {
        console.warn(`Skipping empty message track: ${track.id}`);
        nextTrack();
        return;
    }
    
    stopPlayback();
    setIsLoadingTrack(true);
    setCurrentTrack(track);
    setErrorMessage(null);
    setTtsMessage(null);

    const result = await getAudioForTrack(track, station.djCharacterId, user?.uid);

    if (!isMountedRef.current) return;
    
    if (result.error || !result.audioUrl) {
      setErrorMessage(result.error || `Impossible d'obtenir l'audio pour ${track.title}.`);
      setFailedTracks(prev => new Set(prev).add(track.id));
      setIsLoadingTrack(false);
      nextTrackTimeoutRef.current = setTimeout(nextTrack, 2000);
      return;
    }
    
    setPlaylistHistory(prev => [...prev.slice(-9), track.id]);

    if (result.audioUrl.startsWith('tts:')) {
      const textToSpeak = decodeURIComponent(result.audioUrl.substring(4));
      setTtsMessage(textToSpeak);
      setIsLoadingTrack(false);

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find(v => v.lang.startsWith('fr')) || voices[0];
        utterance.rate = 0.9;
        
        utterance.onstart = () => setIsPlaying(true);
        utterance.onend = () => {
          setIsPlaying(false);
          nextTrackTimeoutRef.current = setTimeout(nextTrack, 1500);
        };
        utterance.onerror = (e) => {
          setErrorMessage(`Erreur TTS: ${e.error}`);
          setIsPlaying(false);
          nextTrackTimeoutRef.current = setTimeout(nextTrack, 1500);
        };
        
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    } else {
      if (!audioRef.current) return;
      audioRef.current.src = result.audioUrl;
      try {
        await audioRef.current.play();
        setIsLoadingTrack(false);
        setIsPlaying(true);
      } catch (e) {
        setErrorMessage("La lecture automatique a été bloquée.");
        setIsLoadingTrack(false);
        setIsPlaying(false);
      }
    }
  }, [station, user, stopPlayback]);


  const nextTrack = useCallback(() => {
    if (!station || station.playlist.length === 0) return;

    const currentIndex = station.playlist.findIndex(t => t.id === currentTrack?.id);
    let nextIndex = (currentIndex + 1) % station.playlist.length;
    
    // Skip failed tracks
    let attempts = 0;
    while(failedTracks.has(station.playlist[nextIndex].id) && attempts < station.playlist.length) {
        nextIndex = (nextIndex + 1) % station.playlist.length;
        attempts++;
    }
    
    if(attempts >= station.playlist.length) {
        setErrorMessage("Toutes les pistes ont échoué.");
        return;
    }

    playTrackById(station.playlist[nextIndex].id);
  }, [station, currentTrack, failedTracks, playTrackById]);

  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    playTrackById(prevTrackId);
  }, [playlistHistory, playTrackById]);


  const togglePlayPause = useCallback(async () => {
    if (isLoadingTrack) return;
    
    if (isPlaying) {
      if (utteranceRef.current) window.speechSynthesis.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack && station && station.playlist.length > 0) {
        playTrackById(station.playlist[0].id);
      } else {
        if (utteranceRef.current) window.speechSynthesis.resume();
        if (audioRef.current && audioRef.current.src) {
           try {
             await audioRef.current.play();
             setIsPlaying(true);
           } catch(e) {
             console.error("Play error:", e);
           }
        }
      }
    }
  }, [isLoadingTrack, isPlaying, currentTrack, station, playTrackById]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnd = () => {
        if (isPlaying) {
             nextTrackTimeoutRef.current = setTimeout(nextTrack, 1000);
        }
    };
    audio.addEventListener('ended', handleEnd);
    
    return () => audio.removeEventListener('ended', handleEnd);
  }, [isPlaying, nextTrack]);

  return {
    currentTrack,
    isPlaying,
    isLoadingTrack,
    failedTracks,
    audioRef,
    playTrackById,
    nextTrack,
    previousTrack,
    togglePlayPause,
    canGoBack: playlistHistory.length > 1,
    playlistLength: station?.playlist.length || 0,
    ttsMessage,
    errorMessage,
  };
}
