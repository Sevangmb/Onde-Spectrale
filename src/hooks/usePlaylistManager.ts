
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { getAudioForTrack } from '@/app/actions';

interface PlaylistManagerProps {
  station: Station | null;
  user: any;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export function usePlaylistManager({ station, user }: PlaylistManagerProps) {
  // États principaux
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [playlistHistory, setPlaylistHistory] = useState<string[]>([]);
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
  const [ttsMessage, setTtsMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const currentOperationId = useRef<string | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // États dérivés
  const isPlaying = playbackState === 'playing';
  const isLoadingTrack = playbackState === 'loading';

  const clearAutoPlayTimeout = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    
    clearAutoPlayTimeout();
    setPlaybackState('idle');
    setErrorMessage(null);
    setTtsMessage(null);
  }, [clearAutoPlayTimeout]);

  const findNextValidTrack = useCallback((startId?: string): PlaylistItem | null => {
    if (!station || station.playlist.length === 0) return null;

    const currentIndex = startId ? station.playlist.findIndex(t => t.id === startId) : -1;
    
    for (let i = 1; i <= station.playlist.length; i++) {
      const nextIndex = (currentIndex + i) % station.playlist.length;
      const track = station.playlist[nextIndex];
      if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
        return track;
      }
    }
    
    return null;
  }, [station, failedTracks]);

  const nextTrack = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const nextPlayableTrack = findNextValidTrack(currentTrack?.id);

    if (nextPlayableTrack) {
        // Démarrer automatiquement la prochaine piste si autoplay est activé
        if (autoPlayEnabled) {
          // Call playTrackById directly without dependency
          setCurrentTrack(nextPlayableTrack);
          // The autoplay effect will handle the actual playing
        } else {
          setCurrentTrack(nextPlayableTrack);
        }
    } else {
      // Recommencer la playlist du début
      const firstTrack = findNextValidTrack();
      if (firstTrack && autoPlayEnabled) {
        console.log('🔄 Playlist terminée, recommencement depuis le début');
        setCurrentTrack(firstTrack);
        // The autoplay effect will handle the actual playing
      } else {
        setErrorMessage("Fin de la playlist. Aucune piste valide trouvée.");
        stopPlayback();
      }
    }
  }, [currentTrack?.id, findNextValidTrack, stopPlayback, autoPlayEnabled]);

  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (!isMountedRef.current || !station || currentOperationId.current === trackId) return;

    currentOperationId.current = trackId;

    try {
      stopPlayback();
      const track = station.playlist.find(t => t.id === trackId);

      if (!track) {
        throw new Error(`Piste ${trackId} non trouvée`);
      }
      
      if (track.type === 'message' && !track.content?.trim()) {
        throw new Error('Message vide, passage à la suivante');
      }

      setCurrentTrack(track);
      setPlaybackState('loading');
      setErrorMessage(null);
      setTtsMessage(null);

      const result = await getAudioForTrack(track, station.djCharacterId, user?.uid || 'anonymous', station.theme);

      if (!isMountedRef.current || currentOperationId.current !== trackId) return;

      if (result.error || !result.audioUrl) {
        throw new Error(result.error || 'URL audio manquante');
      }

      if (!audioRef.current) {
        throw new Error("Lecteur audio non disponible");
      }
      
      const audio = audioRef.current;
      audio.src = result.audioUrl;
      
      if (result.audioUrl.startsWith('data:audio')) {
        setTtsMessage(`Message de ${track.artist}: ${track.content}`);
      }
      
      try {
        await audio.play();
        setPlaylistHistory(prev => [...prev.slice(-9), track.id]);
        setPlaybackState('playing');
        // Une fois qu'une piste joue avec succès, activer l'autoplay pour les suivantes
        if (!autoPlayEnabled) {
          console.log('✅ Autoplay activé - les pistes suivantes se lanceront automatiquement');
          setAutoPlayEnabled(true);
        }
      } catch (playError: any) {
        console.warn('Autoplay bloqué par le navigateur:', playError);
        setPlaybackState('paused');
        setErrorMessage('🎵 Cliquez pour démarrer la lecture audio');
        // Ne pas marquer comme échec, juste attendre l'interaction utilisateur
        return;
      }

    } catch (error: any) {
      setErrorMessage(error.message);
      setFailedTracks(prev => new Set(prev).add(trackId));
      setPlaybackState('error');
      // On déclenche une transition vers la piste suivante après un délai
      clearAutoPlayTimeout();
      autoPlayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && station && station.playlist.length > 0) {
          // Find next valid track inline
          const currentIndex = station.playlist.findIndex(t => t.id === trackId);
          let nextTrack = null;
          
          for (let i = 1; i <= station.playlist.length; i++) {
            const nextIndex = (currentIndex + i) % station.playlist.length;
            const track = station.playlist[nextIndex];
            if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
              nextTrack = track;
              break;
            }
          }
          
          if (nextTrack) {
            setCurrentTrack(nextTrack);
          } else {
            // Find first valid track from beginning
            for (const track of station.playlist) {
              if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
                if (autoPlayEnabled) {
                  console.log('🔄 Playlist terminée, recommencement depuis le début');
                  setCurrentTrack(track);
                  break;
                } else {
                  setErrorMessage("Fin de la playlist. Aucune piste valide trouvée.");
                  stopPlayback();
                  break;
                }
              }
            }
          }
        }
      }, 1500);
    } finally {
      if (currentOperationId.current === trackId) {
        currentOperationId.current = null;
      }
    }
  }, [station, user?.uid, stopPlayback, clearAutoPlayTimeout, autoPlayEnabled, failedTracks]);
  
  const togglePlayPause = useCallback(async () => {
    if (isLoadingTrack) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setPlaybackState('paused');
    } else if (currentTrack) {
      try {
        await audioRef.current?.play();
        setPlaybackState('playing');
        // Activer l'autoplay après interaction utilisateur réussie
        if (!autoPlayEnabled) {
          console.log('✅ Autoplay activé après interaction utilisateur');
          setAutoPlayEnabled(true);
        }
      } catch(e) {
        setErrorMessage("Lecture bloquée par le navigateur. Cliquez pour activer.");
        setPlaybackState('paused');
      }
    } else {
        const firstTrack = findNextValidTrack();
        if (firstTrack) {
          setCurrentTrack(firstTrack);
          // Activer l'autoplay dès le premier lancement
          setAutoPlayEnabled(true);
        }
    }
  }, [isLoadingTrack, isPlaying, currentTrack, findNextValidTrack, autoPlayEnabled]);
  
  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    // Find the track and set it directly
    if (station) {
      const track = station.playlist.find(t => t.id === prevTrackId);
      if (track) {
        setCurrentTrack(track);
        // Autoplay effect will handle playing if enabled
      }
    }
  }, [playlistHistory, station]);
  
  const handleAudioEnded = useCallback(() => {
    if (isMountedRef.current) nextTrack();
  }, [nextTrack]);

  // Initialisation et changement de station
  useEffect(() => {
    isMountedRef.current = true;
    stopPlayback();
    
    if (station && station.playlist.length > 0) {
      const firstTrack = findNextValidTrack();
      if (firstTrack) {
        setCurrentTrack(firstTrack);
        console.log('🎵 Station chargée - première piste prête');
      } else {
         setErrorMessage("Aucune piste valide dans cette station.");
      }
    } else {
      setCurrentTrack(undefined);
    }

    return () => { isMountedRef.current = false; stopPlayback(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station?.id]);

  // Démarrage automatique quand autoplay est activé
  useEffect(() => {
    if (autoPlayEnabled && currentTrack && !isPlaying && !isLoadingTrack && station) {
      console.log('🎵 Autoplay activé - démarrage automatique de la piste');
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && currentTrack && !isPlaying && !isLoadingTrack) {
          // Appel direct pour éviter la dépendance circulaire
          const trackToPlay = currentTrack;
          if (trackToPlay && station) {
            setPlaybackState('loading');
            setErrorMessage(null);
            setTtsMessage(null);
            
            getAudioForTrack(trackToPlay, station.djCharacterId, user?.uid || 'anonymous', station.theme)
              .then(result => {
                if (!isMountedRef.current) return;
                if (result.error || !result.audioUrl) {
                  setErrorMessage(result.error || 'URL audio manquante');
                  setFailedTracks(prev => new Set(prev).add(trackToPlay.id));
                  setPlaybackState('error');
                  
                  // Auto-skip to next track after error
                  setTimeout(() => {
                    if (isMountedRef.current && station && station.playlist.length > 0) {
                      // Find next valid track inline
                      const currentIndex = station.playlist.findIndex(t => t.id === trackToPlay.id);
                      let nextTrack = null;
                      
                      for (let i = 1; i <= station.playlist.length; i++) {
                        const nextIndex = (currentIndex + i) % station.playlist.length;
                        const track = station.playlist[nextIndex];
                        if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
                          nextTrack = track;
                          break;
                        }
                      }
                      
                      if (nextTrack) {
                        setCurrentTrack(nextTrack);
                      } else {
                        // Find first valid track from beginning
                        for (const track of station.playlist) {
                          if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
                            console.log('🔄 Playlist terminée, recommencement depuis le début');
                            setCurrentTrack(track);
                            break;
                          }
                        }
                      }
                    }
                  }, 1500);
                  return;
                }
                const audio = audioRef.current;
                if (audio) {
                  audio.src = result.audioUrl;
                  if (result.audioUrl.startsWith('data:audio')) {
                    setTtsMessage(`Message de ${trackToPlay.artist}: ${trackToPlay.content}`);
                  }
                  audio.play()
                    .then(() => {
                      setPlaylistHistory(prev => [...prev.slice(-9), trackToPlay.id]);
                      setPlaybackState('playing');
                    })
                    .catch(() => {
                      setPlaybackState('paused');
                      setErrorMessage('🎵 Cliquez pour démarrer la lecture audio');
                    });
                }
              })
              .catch(() => {
                setPlaybackState('error');
                setErrorMessage('Erreur de lecture');
                // Auto-skip to next track after error
                setTimeout(() => {
                  if (isMountedRef.current && station && station.playlist.length > 0) {
                    // Find next valid track inline
                    const currentIndex = station.playlist.findIndex(t => t.id === trackToPlay.id);
                    let nextTrack = null;
                    
                    for (let i = 1; i <= station.playlist.length; i++) {
                      const nextIndex = (currentIndex + i) % station.playlist.length;
                      const track = station.playlist[nextIndex];
                      if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
                        nextTrack = track;
                        break;
                      }
                    }
                    
                    if (nextTrack) {
                      setCurrentTrack(nextTrack);
                    }
                  }
                }, 1500);
              });
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [autoPlayEnabled, currentTrack?.id, isPlaying, isLoadingTrack, station?.id, user?.uid, failedTracks]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', handleAudioEnded);
      return () => audio.removeEventListener('ended', handleAudioEnded);
    }
  }, [handleAudioEnded]);

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
    ttsEnabled,
    enableTTS: () => setTtsEnabled(true),
    addFailedTrack: (trackId: string) => setFailedTracks(prev => new Set(prev).add(trackId)),
    autoPlayEnabled,
    enableAutoPlay: () => setAutoPlayEnabled(true),
  };
}
