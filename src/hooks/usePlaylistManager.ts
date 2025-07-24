
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
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const isSeekingRef = useRef(false);
  // Ref pour suivre l'utterance TTS en cours
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Flag pour savoir si on doit ignorer les événements TTS
  const shouldIgnoreTtsRef = useRef(false);
  // Flag pour empêcher les TTS simultanés
  const ttsInProgressRef = useRef(false);

  // Référence pour nextTrack
  const nextTrackRef = useRef<() => void>();

  // Reset when station changes
  useEffect(() => {
    isMountedRef.current = true;
    // Annule le TTS en cours si changement de station
    if (utteranceRef.current) {
      shouldIgnoreTtsRef.current = true;
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      // Réactiver après un délai
      setTimeout(() => {
        shouldIgnoreTtsRef.current = false;
      }, 500);
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
        shouldIgnoreTtsRef.current = true;
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
    
    playTrack(nextIndex).finally(() => {
        if(isMountedRef.current) {
            isSeekingRef.current = false;
        }
    });

  }, [station, currentTrackIndex]);

  // Mettre à jour la référence
  nextTrackRef.current = nextTrack;


  const playTrack = useCallback(async (trackIndex: number): Promise<boolean> => {
    if (!station || !station.playlist[trackIndex] || !isMountedRef.current || !user) {
      console.log('playTrack bloqué:', { hasStation: !!station, hasTrack: !!station?.playlist[trackIndex], isMounted: isMountedRef.current, hasUser: !!user });
      return false;
    }

    const track = station.playlist[trackIndex];
    const trackId = track.id;

    if (failedTracks.has(trackId)) {
        console.log(`Piste ${track.title} déjà en échec, passage à la suivante.`);
        if (nextTrackRef.current) {
            nextTrackRef.current();
        }
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
        const result = await getAudioForTrack(track, station.djCharacterId, user?.uid || 'anonymous', station.theme);
        
        if (!isMountedRef.current || !audioRef.current) return false;

        if (result.error || !result.audioUrl) {
          throw new Error(result.error || 'URL audio introuvable');
        }

        // Gérer TTS ou audio normal
        if (track.type === 'message' && result.audioUrl.startsWith('data:audio/wav;base64,')) {
          // C'est un message généré par TTS - utiliser directement l'audio généré
          console.log('🎤 Lecture audio TTS généré par IA');
          audioRef.current.src = result.audioUrl;
          audioRef.current.load();
          
          // Afficher le contenu du message
          setTtsMessage(`Message de ${track.artist}: ${track.content}`);
          
          // Attendre que l'audio soit prêt et le jouer
          await new Promise((resolve, reject) => {
            const handleCanPlay = () => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              setIsLoadingTrack(false);
              audioRef.current?.play().then(() => {
                setIsPlaying(true);
                setErrorMessage(null);
                resolve(true);
              }).catch((playError) => {
                console.warn('Autoplay bloqué, lecture manuelle requise:', playError);
                setIsPlaying(false);
                setErrorMessage('Cliquez pour démarrer la lecture');
                resolve(true); // Ne pas bloquer, juste informer
              });
            };
            
            const handleError = (e: any) => {
              console.error('Erreur chargement audio TTS:', e);
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              reject(new Error(`Erreur de lecture audio TTS: ${e.message || 'Format non supporté'}`));
            };
            
            audioRef.current?.addEventListener('canplay', handleCanPlay);
            audioRef.current?.addEventListener('error', handleError);
            
            // Timeout de 5 secondes
            setTimeout(() => {
              audioRef.current?.removeEventListener('canplay', handleCanPlay);
              audioRef.current?.removeEventListener('error', handleError);
              reject(new Error('Timeout chargement audio TTS'));
            }, 5000);
          });
          
          return true;
        } else if (track.type === 'message' && result.audioUrl.startsWith('tts:')) {
          // Fallback: synthèse vocale manuelle
          const textToSpeak = decodeURIComponent(result.audioUrl.substring(4));
          setTtsMessage(textToSpeak); // Affiche le TTS en cours
          
          // Limiter la longueur des messages TTS pour éviter les coupures
          if (textToSpeak.length > 200) {
            console.log('⚠️ Message TTS très long (' + textToSpeak.length + ' caractères), risque de coupure');
          }
          
          // Utiliser la Web Speech API
          if ('speechSynthesis' in window) {
            // Activer automatiquement le TTS si pas encore fait
            if (!ttsEnabled) {
              console.log('🎤 Activation automatique du TTS');
              setTtsEnabled(true);
            }
            
            // Empêcher les TTS simultanés
            if (ttsInProgressRef.current) {
              console.log('TTS déjà en cours, annulation du précédent');
            }
            
            // Forcer l'arrêt complet de toute synthèse vocale en cours
            if (utteranceRef.current || window.speechSynthesis.speaking || window.speechSynthesis.pending) {
              shouldIgnoreTtsRef.current = true;
              ttsInProgressRef.current = false;
              
              // Annuler plusieurs fois pour être sûr
              window.speechSynthesis.cancel();
              window.speechSynthesis.cancel();
              
              // Vider la queue complètement
              while (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
                await new Promise(resolve => setTimeout(resolve, 50));
              }
              
              utteranceRef.current = null;
              
              // Attendre que tout soit vraiment arrêté
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // Réinitialiser les flags
            shouldIgnoreTtsRef.current = false;
            ttsInProgressRef.current = true;
            
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utteranceRef.current = utterance;
            
            // Essayer de trouver une voix française
            const voices = window.speechSynthesis.getVoices();
            const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
            if (frenchVoice) {
              utterance.voice = frenchVoice;
            }
            
            // Paramètres de voix optimisés pour éviter les coupures
            utterance.rate = 0.8; // Vitesse légèrement plus rapide
            utterance.pitch = 1;
            utterance.volume = 1;
            
            return new Promise((resolve, reject) => {
              let finished = false;
              const startTime = Date.now(); // Mesurer le temps réel de lecture
              
              // Pas de timeout - laisser le TTS se terminer naturellement

              
              utterance.onend = () => {
                const endTime = Date.now();
                const actualDuration = (endTime - startTime) / 1000; // en secondes
                
                if (!finished && !shouldIgnoreTtsRef.current) {
                  console.log(`🎵 TTS terminé naturellement après ${actualDuration.toFixed(1)}s pour:`, textToSpeak.substring(0, 30) + '...');
                  setIsPlaying(false);
                  utteranceRef.current = null;
                  setTtsMessage(null);
                  ttsInProgressRef.current = false;
                  finished = true;
                  resolve(true);
                  // Attendre 3 secondes avant le prochain message pour laisser le temps
                  console.log('⏰ Planification prochaine piste dans 3 secondes');
                  setTimeout(() => {
                    if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                      console.log('▶️ Passage automatique à la piste suivante');
                      nextTrackRef.current();
                    } else {
                      console.log('❌ Passage automatique annulé (conditions non remplies)');
                    }
                  }, 3000);
                } else if (shouldIgnoreTtsRef.current) {
                  console.log('TTS terminé mais ignoré (flag)');
                  ttsInProgressRef.current = false;
                }
              };
              
              utterance.onerror = (e) => {
                if (!finished && !shouldIgnoreTtsRef.current) {
                  // Ignorer les erreurs "interrupted" car elles sont normales lors du passage à la piste suivante
                  if (e.error === 'interrupted') {
                    console.log('TTS interrupted (normal lors du changement de piste)');
                    setIsPlaying(false);
                    utteranceRef.current = null;
                    setTtsMessage(null);
                    ttsInProgressRef.current = false;
                    finished = true;
                    resolve(true); // Considérer comme succès
                    return;
                  }

                  // Gestion spéciale pour l'erreur "not-allowed"
                  if (e.error === 'not-allowed') {
                    console.log('TTS non autorisé - activation requise');
                    setTtsEnabled(false);
                    setErrorMessage('Cliquez sur Play pour activer la synthèse vocale');
                    setIsPlaying(false);
                    setIsLoadingTrack(false);
                    utteranceRef.current = null;
                    setTtsMessage(null);
                    ttsInProgressRef.current = false;
                    finished = true;
                    resolve(false);
                    return;
                  }
                  
                  console.error('Erreur TTS:', e.error);
                  setIsPlaying(false);
                  utteranceRef.current = null;
                  setTtsMessage(null);
                  ttsInProgressRef.current = false;
                  setErrorMessage('Erreur lors de la lecture du message vocal. Passage à la piste suivante.');
                  finished = true;
                  reject(new Error(`Erreur TTS: ${e.error}`));
                  // Utiliser nextTrackRef.current() au lieu de playTrack() directement
                  setTimeout(() => {
                    if (isMountedRef.current && !isSeekingRef.current && nextTrackRef.current) {
                      nextTrackRef.current();
                    }
                  }, 1000);
                } else if (shouldIgnoreTtsRef.current) {
                  console.log('Erreur TTS ignorée (flag):', e.error);
                  ttsInProgressRef.current = false;
                }
              };
              
              // Vérifier si le TTS démarre dans les 3 secondes
              const startCheckTimeout = setTimeout(() => {
                if (!finished && !window.speechSynthesis.speaking) {
                  console.log('🔄 TTS ne démarre pas, forçage...');
                  window.speechSynthesis.cancel();
                  // Réessayer une fois
                  setTimeout(() => {
                    if (!finished) {
                      try {
                        window.speechSynthesis.speak(utterance);
                      } catch (e) {
                        console.log('❌ TTS définitivement en échec, passage suivante');
                        finished = true;
                        resolve(true);
                        setTimeout(() => {
                          if (nextTrackRef.current) nextTrackRef.current();
                        }, 500);
                      }
                    }
                  }, 100);
                }
              }, 3000);
              
              try {
                console.log('🎤 Lancement TTS...');
                window.speechSynthesis.speak(utterance);
                
                // Nettoyer le timeout de vérification si ça démarre
                utterance.onstart = () => {
                  clearTimeout(startCheckTimeout);
                  if (shouldIgnoreTtsRef.current) {
                    console.log('TTS démarré mais ignoré (flag)');
                    return;
                  }
                  console.log('🎤 TTS démarré:', textToSpeak.substring(0, 50) + '...');
                  setIsLoadingTrack(false);
                  setIsPlaying(true);
                  setErrorMessage(null);
                };
                
              } catch (speechError) {
                clearTimeout(startCheckTimeout);
                console.error('❌ Impossible de lancer TTS:', speechError);
                utteranceRef.current = null;
                setTtsMessage(null);
                ttsInProgressRef.current = false;
                finished = true;
                resolve(true); // Continuer quand même
                setTimeout(() => {
                  if (isMountedRef.current && nextTrackRef.current) {
                    nextTrackRef.current();
                  }
                }, 500);
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

  const enableTTS = useCallback(() => {
    if ('speechSynthesis' in window && !ttsEnabled) {
      try {
        // Créer un utterance de test pour déclencher l'autorisation
        const testUtterance = new SpeechSynthesisUtterance('');
        testUtterance.volume = 0;
        
        // Gestionnaire pour confirmer le succès
        const onTestStart = () => {
          setTtsEnabled(true);
          setErrorMessage(null);
          console.log('✅ TTS activé avec succès');
        };
        
        const onTestError = (e: any) => {
          console.warn('TTS toujours non autorisé:', e.error);
          if (e.error === 'not-allowed') {
            setErrorMessage('Synthèse vocale toujours bloquée - essayez de cliquer à nouveau');
          }
        };
        
        testUtterance.onstart = onTestStart;
        testUtterance.onerror = onTestError;
        
        window.speechSynthesis.speak(testUtterance);
        window.speechSynthesis.cancel();
        
        // Fallback - considérer comme activé si pas d'erreur immédiate
        setTimeout(() => {
          if (!ttsEnabled) {
            setTtsEnabled(true);
            setErrorMessage(null);
            console.log('✅ TTS activé (fallback)');
          }
        }, 500);
        
      } catch (error) {
        console.warn('Impossible d\'activer TTS:', error);
        setErrorMessage('Erreur d\'activation de la synthèse vocale');
      }
    }
  }, [ttsEnabled]);

  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current || isLoadingTrack) return;

    // Activer TTS lors du premier clic
    if (!ttsEnabled) {
      enableTTS();
    }

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
  }, [isPlaying, isLoadingTrack, currentTrack, playTrack, nextTrack, ttsEnabled, enableTTS]);

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
    console.log('🔍 Auto-play check:', {
      hasStation: !!station,
      playlistLength: station?.playlist.length || 0,
      isPlaying,
      isLoadingTrack,
      hasCurrentTrack: !!currentTrack,
      currentTrackIndex,
      isSeekingRef: isSeekingRef.current
    });
    
    if (station && station.playlist.length > 0 && !isPlaying && !isLoadingTrack && !currentTrack && currentTrackIndex === 0 && !isSeekingRef.current) {
      console.log('🎵 Auto-démarrage de la lecture pour la station:', station.name);
      // Petite pause pour éviter les race conditions
      setTimeout(() => {
        if (isMountedRef.current && !isSeekingRef.current && !isLoadingTrack && !currentTrack) {
          console.log('🚀 Lancement playTrack(0)');
          playTrack(0);
        } else {
          console.log('❌ Auto-play annulé - conditions changées');
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
    ttsEnabled,
    enableTTS,
  };
}
