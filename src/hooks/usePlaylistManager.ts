
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

  // Ajout : passer à la piste suivante à la fin d'une chanson
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => {
      if (isMountedRef.current) {
        nextTrack();
      }
    };
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrackIndex, station]);

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
    
    console.log(`Lecture piste ${trackIndex}: "${track.title}" (${track.type})`);

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
              const timeout = setTimeout(() => {
                window.speechSynthesis.cancel();
                reject(new Error('TTS timeout - passage à la piste suivante'));
              }, 30000);

              utterance.onstart = () => {
                setIsLoadingTrack(false);
                setIsPlaying(true);
              };
              
              utterance.onend = () => {
                clearTimeout(timeout);
                setIsPlaying(false);
                resolve(null);
                // Passer automatiquement à la piste suivante après TTS
                setTimeout(() => {
                  if (isMountedRef.current) {
                    const nextIndex = (trackIndex + 1) % station.playlist.length;
                    console.log(`TTS terminé, passage de l'index ${trackIndex} à ${nextIndex}`);
                    playTrack(nextIndex);
                  }
                }, 500);
              };
              
              utterance.onerror = (e) => {
                clearTimeout(timeout);
                setIsPlaying(false);
                reject(new Error(`Erreur TTS: ${e.error}`));
              };
              
              try {
                window.speechSynthesis.speak(utterance);
              } catch (speechError) {
                clearTimeout(timeout);
                reject(new Error(`Impossible de lancer TTS: ${speechError}`));
              }
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
          
          try {
            await audioRef.current.play();
            setIsLoadingTrack(false);
          } catch (playError: any) {
            console.warn('Autoplay bloqué par le navigateur:', playError);
            setIsLoadingTrack(false);
            setIsPlaying(false);
            // Ne pas jeter d'erreur, juste arrêter silencieusement
            return true;
          }
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
            setIsLoadingTrack(false);
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
    
    setIsLoadingTrack(false);
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
    if (station && station.playlist.length > 0 && !isPlaying && !isLoadingTrack && !currentTrack && currentTrackIndex === 0) {
      console.log('Auto-démarrage de la lecture pour la station:', station.name);
      playTrack(0);
    }
  }, [station?.id, playTrack]);


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
