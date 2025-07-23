
// src/hooks/usePlaylistManager.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { getAudioForTrack } from '@/app/actions';
import { pushPlayerLog, updatePlayerState } from '@/lib/firestorePlayer';

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
  // Ajout : texte TTS en cours
  const [ttsMessage, setTtsMessage] = useState<string | null>(null);
  // Ajout : dernier message d'erreur
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const isSeekingRef = useRef(false);
  // Ref pour suivre l'utterance TTS en cours
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Référence pour nextTrack
  const nextTrackRef = useRef<() => void>();

  // Reset when station changes
  useEffect(() => {
    isMountedRef.current = true;
    // Annule le TTS en cours si changement de station
    if (utteranceRef.current) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
    }
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
      // Nettoie le TTS si le composant est démonté
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
    }
  }, [station?.id]);


  const nextTrack = useCallback(() => {
    if (!station || station.playlist.length === 0 || isSeekingRef.current) {
      console.log('nextTrack bloqué:', { 
        hasStation: !!station, 
        playlistLength: station?.playlist.length || 0, 
        isSeekingRef: isSeekingRef.current 
      });
      return;
    }
    
    isSeekingRef.current = true;
    console.log('nextTrack: passage de', currentTrackIndex, 'vers', (currentTrackIndex + 1) % station.playlist.length);
    let nextIndex = (currentTrackIndex + 1) % station.playlist.length;
    
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    playTrack(nextIndex).finally(() => {
        if(isMountedRef.current) {
            isSeekingRef.current = false;
        }
    });

  }, [station, currentTrackIndex]);

  // Mettre à jour la référence
  nextTrackRef.current = nextTrack;


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

    // Log vers Firestore si disponible
    if (station?.id) {
      try {
        await pushPlayerLog(station.id, {
          type: 'info',
          message: `Lecture de "${track.title}" (${track.type})`,
        });
      } catch (error) {
        console.warn('Erreur log Firestore:', error);
      }
    }

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
          setTtsMessage(textToSpeak); // Affiche le TTS en cours
          
          // Utiliser la Web Speech API
          if ('speechSynthesis' in window) {
            // Annule tout TTS en cours avant d'en lancer un nouveau
            if (utteranceRef.current) {
              window.speechSynthesis.cancel();
              // Attendre un peu que l'annulation soit effective
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utteranceRef.current = utterance;
            
            // Essayer de trouver une voix française
            const voices = window.speechSynthesis.getVoices();
            const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
            if (frenchVoice) {
              utterance.voice = frenchVoice;
            }
            
            // Ralentir la vitesse pour une meilleure compréhension
            utterance.rate = 0.7;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            return new Promise((resolve, reject) => {
              let finished = false;
              const timeout = setTimeout(() => {
                if (!finished) {
                  console.log('TTS timeout après 30s');
                  window.speechSynthesis.cancel();
                  utteranceRef.current = null;
                  setTtsMessage(null);
                  setErrorMessage('Le message vocal a mis trop de temps à être lu. Passage à la piste suivante.');
                  finished = true;
                  reject(new Error('TTS timeout - passage à la piste suivante'));
                  // Utiliser nextTrackRef.current() au lieu de playTrack() directement
                  setTimeout(() => {
                    if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                      nextTrackRef.current();
                    }
                  }, 1000);
                }
              }, 30000);

              utterance.onstart = () => {
                console.log('TTS démarré:', textToSpeak.substring(0, 50) + '...');
                setIsLoadingTrack(false);
                setIsPlaying(true);
                setErrorMessage(null);
              };
              
              utterance.onend = () => {
                if (!finished) {
                  console.log('TTS terminé naturellement');
                  clearTimeout(timeout);
                  setIsPlaying(false);
                  utteranceRef.current = null;
                  setTtsMessage(null);
                  finished = true;
                  resolve(true);
                  // Attendre 2 secondes avant le prochain message pour laisser le temps
                  setTimeout(() => {
                    if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                      nextTrackRef.current();
                    }
                  }, 2000);
                }
              };
              
              utterance.onerror = (e) => {
                if (!finished) {
                  console.error('Erreur TTS:', e.error);
                  clearTimeout(timeout);
                  setIsPlaying(false);
                  utteranceRef.current = null;
                  setTtsMessage(null);
                  setErrorMessage('Erreur lors de la lecture du message vocal. Passage à la piste suivante.');
                  finished = true;
                  reject(new Error(`Erreur TTS: ${e.error}`));
                  // Utiliser nextTrackRef.current() au lieu de playTrack() directement
                  setTimeout(() => {
                    if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                      nextTrackRef.current();
                    }
                  }, 1000);
                }
              };
              
              try {
                window.speechSynthesis.speak(utterance);
              } catch (speechError) {
                console.error('Impossible de lancer TTS:', speechError);
                clearTimeout(timeout);
                utteranceRef.current = null;
                setTtsMessage(null);
                setErrorMessage('Impossible de lancer la synthèse vocale. Passage à la piste suivante.');
                finished = true;
                reject(new Error(`Impossible de lancer TTS: ${speechError}`));
                setTimeout(() => {
                  if (isMountedRef.current && !isSeekingRef.current) {
                    nextTrack();
                  }
                }, 1000);
              }
            });
          } else {
            console.error('Synthèse vocale non supportée');
            setErrorMessage('Synthèse vocale non supportée par ce navigateur. Passage à la piste suivante.');
            setTimeout(() => {
              if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                nextTrackRef.current();
              }
            }, 1000);
            throw new Error('Synthèse vocale non supportée par ce navigateur');
          }
        } else {
          // Audio normal
          console.log('Chargement audio:', result.audioUrl);
          audioRef.current.src = result.audioUrl;
          audioRef.current.load();
          
          // Attendre que l'audio soit prêt
          await new Promise((resolve, reject) => {
            const handleCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              resolve(true);
            };
            
            const handleError = (e: any) => {
              console.error('Erreur chargement audio:', e);
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
            console.log('Audio démarré avec succès');
            setIsLoadingTrack(false);
            setIsPlaying(true);
            setErrorMessage(null);
          } catch (playError: any) {
            console.warn('Autoplay bloqué par le navigateur:', playError);
            setIsLoadingTrack(false);
            setIsPlaying(false);
            setErrorMessage('Lecture automatique bloquée - cliquez pour démarrer');
            return true;
          }
        }
        
        // Mettre à jour l'historique uniquement si la piste a commencé avec succès
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
            setErrorMessage(`Piste "${track.title}" non disponible après ${maxRetries + 1} tentatives`);
            console.error(`Piste "${track.title}" marquée comme défaillante après ${maxRetries + 1} tentatives`);
            
            // Log l'erreur vers Firestore
            if (station?.id) {
              try {
                await pushPlayerLog(station.id, {
                  type: 'error',
                  message: `Échec de lecture "${track.title}" après ${maxRetries + 1} tentatives`,
                });
              } catch (logError) {
                console.warn('Erreur log Firestore:', logError);
              }
            }
            
            // Attendre avant de passer à la suivante pour éviter les loops
            setTimeout(() => {
              if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                nextTrackRef.current();
              }
            }, 2000);
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
    if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
        console.log('Audio terminé, passage à la suivante');
        setIsPlaying(false);
        nextTrackRef.current();
    }
  }, []);

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
    if (station && station.playlist.length > 0 && !isPlaying && !isLoadingTrack && !currentTrack && currentTrackIndex === 0 && !isSeekingRef.current) {
      console.log('Auto-démarrage de la lecture pour la station:', station.name);
      // Petite pause pour éviter les race conditions
      setTimeout(() => {
        if (isMountedRef.current && !isSeekingRef.current && !isLoadingTrack && !currentTrack) {
          playTrack(0);
        }
      }, 100);
    }
  }, [station?.id, isPlaying, isLoadingTrack, currentTrack, currentTrackIndex, playTrack]);


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
    // Nouveaux états pour le monitoring
    ttsMessage,
    errorMessage,
  };
}
