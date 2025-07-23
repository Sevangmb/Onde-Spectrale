
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

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && isMountedRef.current) {
      try {
        const result = await getAudioForTrack(track, station.djCharacterId, user.uid);
        
        if (!isMountedRef.current || !audioRef.current) return false;

        if (result.error || !result.audioUrl) {
          throw new Error(result.error || 'URL audio introuvable');
        }

        // Gérer TTS ou audio normal
        if (result.audioUrl.startsWith('tts:')) {
          // C'est un message TTS
          const textToSpeak = decodeURIComponent(result.audioUrl.substring(4));
          
          // Utiliser la Web Speech API
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            
            // Essayer de trouver une voix française
            const voices = window.speechSynthesis.getVoices();
            const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
            if (frenchVoice) {
              utterance.voice = frenchVoice;
            }
            
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            return new Promise((resolve, reject) => {
              utterance.onstart = () => {
                setIsPlaying(true);
              };
              
              utterance.onend = () => {
                setIsPlaying(false);
                resolve(null);
              };
              
              utterance.onerror = (e) => {
                setIsPlaying(false);
                reject(new Error(`Erreur TTS: ${e.error}`));
              };
              
              window.speechSynthesis.speak(utterance);
            });
          } else {
            throw new Error('Synthèse vocale non supportée par ce navigateur');
          }
        } else {
          // Audio normal
          audioRef.current.src = result.audioUrl;
          audioRef.current.load();
          
          // Attendre que l'audio soit prêt
          await new Promise((resolve, reject) => {
            const handleCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              resolve(null);
            };
            
            const handleError = (e: any) => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              reject(new Error(`Erreur de lecture audio: ${e.message || 'Format non supporté'}`));
            };
            
            audioRef.current?.addEventListener('canplay', handleCanPlay);
            audioRef.current?.addEventListener('error', handleError);
            
            // Timeout de 10 secondes
            setTimeout(() => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              reject(new Error('Timeout lors du chargement audio'));
            }, 10000);
          });
          
          await audioRef.current.play();
        }
        
        setIsPlaying(true);
        if (playlistHistory[playlistHistory.length - 1] !== trackIndex) {
            setPlaylistHistory(prev => [...prev.slice(-9), trackIndex]);
        }
        return true;

      } catch (error) {
        console.error(`Tentative ${retryCount + 1}/${maxRetries + 1} échouée pour "${track.title}":`, error);
        retryCount++;
        
        if (retryCount > maxRetries) {
          if(isMountedRef.current) {
            setFailedTracks(prev => new Set(prev).add(trackId));
            console.error(`Piste "${track.title}" marquée comme défaillante après ${maxRetries + 1} tentatives`);
            nextTrack();
          }
          return false;
        }
        
        // Attendre 1 seconde avant retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return false;
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
