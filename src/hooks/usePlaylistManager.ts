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
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [playlistHistory, setPlaylistHistory] = useState<string[]>([]);
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
  const [ttsMessage, setTtsMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const nextTrackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTrackRef = useRef<PlaylistItem | undefined>();
  const playTrackByIdRef = useRef<(trackId: string) => Promise<void>>();

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Mettre à jour la référence de playTrackById
  useEffect(() => {
    playTrackByIdRef.current = playTrackById;
  });

  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
  }, []);
  
  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (isLoadingTrack || !isMountedRef.current) return;
    
    stopPlayback();
    
    if (!station) {
      console.error("playTrackById a été appelée sans station définie.");
      return;
    }
    
    const track = station.playlist.find(t => t.id === trackId);
    if (!track) {
      console.warn(`Piste ${trackId} non trouvée. Passage à la suivante.`);
      if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
      nextTrackTimeoutRef.current = setTimeout(() => nextTrack(), 100);
      return;
    }

    if (track.type === 'message' && !track.content?.trim()) {
      setFailedTracks(prev => new Set(prev).add(track.id));
      if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
      nextTrackTimeoutRef.current = setTimeout(() => nextTrack(), 100);
      return;
    }

    setCurrentTrack(track);
    setIsLoadingTrack(true);
    setErrorMessage(null);
    setTtsMessage(null);
    
    const result = await getAudioForTrack(track, station.djCharacterId, user?.uid || 'anonymous', station.theme);

    if (!isMountedRef.current) return;

    if (result.error || !result.audioUrl) {
      setErrorMessage(result.error || `Impossible d'obtenir l'audio pour "${track.title}".`);
      setFailedTracks(prev => new Set(prev).add(track.id));
      setIsLoadingTrack(false);
      if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
      nextTrackTimeoutRef.current = setTimeout(() => nextTrack(), 2000);
      return;
    }

    setPlaylistHistory(prev => [...prev.slice(-9), track.id]);
    setIsLoadingTrack(false);

    if (result.audioUrl.startsWith('data:audio')) {
      if (!audioRef.current) return;
      setTtsMessage(`Message de ${track.artist}: ${track.content}`);
      audioRef.current.src = result.audioUrl;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        setErrorMessage("La lecture automatique a été bloquée.");
        setIsPlaying(false);
      }
    } else {
      if (!audioRef.current) return;
      audioRef.current.src = result.audioUrl;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        setErrorMessage("La lecture automatique a été bloquée.");
        setIsPlaying(false);
      }
    }
  }, [station?.id, user?.uid]);

  const playNextTrackInQueue = useCallback(() => {
      if (!station || station.playlist.length === 0) return;
  
      const currentId = currentTrackRef.current?.id;
      const currentIndex = currentId ? station.playlist.findIndex(t => t.id === currentId) : -1;
      
      let nextIndex = (currentIndex + 1) % station.playlist.length;
      for (let i = 0; i < station.playlist.length; i++) {
          const nextTrackToPlay = station.playlist[nextIndex];
  
          if (!failedTracks.has(nextTrackToPlay.id)) {
              if(nextTrackToPlay.type === 'message' && !nextTrackToPlay.content?.trim()) {
                  setFailedTracks(prev => new Set(prev).add(nextTrackToPlay.id));
              } else {
                  if (playTrackByIdRef.current) {
                    playTrackByIdRef.current(nextTrackToPlay.id);
                  }
                  return;
              }
          }
          nextIndex = (nextIndex + 1) % station.playlist.length;
      }
  
      setErrorMessage("Toutes les pistes de la playlist ont échoué.");
      stopPlayback();
  }, [station?.id, station?.playlist, failedTracks]);
  
  const nextTrack = useCallback(() => {
    playNextTrackInQueue();
  }, [playNextTrackInQueue]);

  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    if (playTrackByIdRef.current) {
      playTrackByIdRef.current(prevTrackId);
    }
  }, [playlistHistory]);

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
    if (isLoadingTrack) return;
    
    if (isPlaying) {
      if (utteranceRef.current && window.speechSynthesis.speaking) window.speechSynthesis.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack && station && station.playlist.length > 0) {
        // Démarrer la première piste directement
        const firstTrack = station.playlist[0];
        if (firstTrack && playTrackByIdRef.current) {
          playTrackByIdRef.current(firstTrack.id);
        }
      } else {
        if (utteranceRef.current && window.speechSynthesis.paused) window.speechSynthesis.resume();
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
  }, [isLoadingTrack, isPlaying, currentTrack, station?.playlist]);
  
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
    
    if (station && station.playlist.length > 0) {
        console.log('🎵 Station chargée, auto-démarrage dans 500ms:', station.name);
        if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
        nextTrackTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            console.log('🚀 Lancement auto-play');
            // Utiliser directement la fonction sans dépendance sur le callback
            const firstTrack = station.playlist[0];
            if (firstTrack && playTrackByIdRef.current) {
              playTrackByIdRef.current(firstTrack.id);
            }
          }
        }, 500);
    }

    return () => {
      isMountedRef.current = false;
      stopPlayback();
    };
  }, [station?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleEnd = () => {
        if (isMountedRef.current && isPlaying) {
            if(nextTrackTimeoutRef.current) clearTimeout(nextTrackTimeoutRef.current);
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
    ttsEnabled,
    enableTTS,
  };
}