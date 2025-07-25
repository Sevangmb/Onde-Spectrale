
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

  // Refs
  const audioRef = useRef<HTMLAudioElement>(null);
  const isMountedRef = useRef(true);
  const currentOperationRef = useRef<string | null>(null);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Correction de la dépendance circulaire
  const playTrackByIdRef = useRef<((trackId: string) => Promise<void>) | null>(null);


  // États dérivés
  const isPlaying = playbackState === 'playing';
  const isLoadingTrack = playbackState === 'loading';

  // Fonction utilitaire pour nettoyer les timeouts
  const clearAutoPlayTimeout = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  // Fonction pour arrêter complètement la lecture
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    
    clearAutoPlayTimeout();
    setPlaybackState('idle');
    setErrorMessage(null);
    setTtsMessage(null);
  }, [clearAutoPlayTimeout]);

  // Fonction pour trouver la prochaine piste valide
  const findNextValidTrack = useCallback((currentId?: string): PlaylistItem | null => {
    if (!station || station.playlist.length === 0) return null;

    const currentIndex = currentId ? station.playlist.findIndex(t => t.id === currentId) : -1;
    const startIndex = (currentIndex + 1) % station.playlist.length;
    
    // Parcourir la playlist à partir de la position suivante
    for (let i = 0; i < station.playlist.length; i++) {
      const index = (startIndex + i) % station.playlist.length;
      const track = station.playlist[index];
      
      // Ignorer les pistes échouées et les messages vides
      if (!failedTracks.has(track.id) && 
          !(track.type === 'message' && !track.content?.trim())) {
        return track;
      }
    }

    return null;
  }, [station?.playlist, failedTracks]);

  const nextTrack = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const nextPlayableTrack = findNextValidTrack(currentTrack?.id);
    if (nextPlayableTrack) {
        playTrackByIdRef.current?.(nextPlayableTrack.id);
    } else {
      setErrorMessage("Aucune piste disponible dans la playlist");
      stopPlayback();
    }
  }, [currentTrack?.id, findNextValidTrack, stopPlayback]);

  useEffect(() => {
    playTrackByIdRef.current = async (trackId: string): Promise<void> => {
        if (!isMountedRef.current || !station) return;

        if (currentOperationRef.current === trackId) return;
        currentOperationRef.current = trackId;

        try {
            stopPlayback();

            const track = station.playlist.find(t => t.id === trackId);
            if (!track) {
                console.warn(`Piste ${trackId} non trouvée dans la playlist`);
                nextTrack();
                return;
            }

            if (track.type === 'message' && !track.content?.trim()) {
                setFailedTracks(prev => new Set(prev).add(track.id));
                nextTrack();
                return;
            }

            setCurrentTrack(track);
            setPlaybackState('loading');
            setErrorMessage(null);
            setTtsMessage(null);

            const result = await getAudioForTrack(track, station.djCharacterId, user?.uid || 'anonymous', station.theme);

            if (!isMountedRef.current) return;

            if (result.error || !result.audioUrl) {
                const errorMsg = result.error || 'URL audio manquante';
                
                if (errorMsg.includes('Mode démo')) {
                    setPlaybackState('playing');
                    setErrorMessage('🎨 Mode démo - Interface fonctionnelle');
                    autoPlayTimeoutRef.current = setTimeout(() => { if (isMountedRef.current) { setPlaybackState('idle'); nextTrack(); } }, 30000);
                    return;
                }
                
                setErrorMessage(`Piste non disponible: ${track.title}`);
                setFailedTracks(prev => new Set(prev).add(track.id));
                setPlaybackState('error');
                
                autoPlayTimeoutRef.current = setTimeout(() => { if (isMountedRef.current) nextTrack(); }, 1500);
                return;
            }

            setPlaylistHistory(prev => [...prev.slice(-9), track.id]);

            if (!audioRef.current) {
                setErrorMessage("Lecteur audio non disponible");
                setPlaybackState('error');
                return;
            }
            const audio = audioRef.current;
            
            const handleLoad = async () => {
                try {
                    await audio.play();
                    setPlaybackState('playing');
                    setErrorMessage(null);
                } catch (e) {
                    setErrorMessage("Cliquez pour activer la lecture");
                    setPlaybackState('paused');
                }
            };

            const handleError = () => {
                setErrorMessage("Erreur de lecture, passage à la suivante...");
                setFailedTracks(prev => new Set(prev).add(track.id));
                setPlaybackState('error');
                autoPlayTimeoutRef.current = setTimeout(() => { if (isMountedRef.current) nextTrack(); }, 800);
            };

            audio.addEventListener('canplay', handleLoad, { once: true });
            audio.addEventListener('error', handleError, { once: true });
            
            if (result.audioUrl.startsWith('data:audio')) {
                setTtsMessage(`Message de ${track.artist}: ${track.content}`);
            }

            audio.src = result.audioUrl;
        } catch (error) {
            setErrorMessage("Erreur de chargement");
            setPlaybackState('error');
            autoPlayTimeoutRef.current = setTimeout(() => { if (isMountedRef.current) nextTrack(); }, 1000);
        } finally {
            currentOperationRef.current = null;
        }
    };
  }, [station, user, stopPlayback, findNextValidTrack, clearAutoPlayTimeout, nextTrack]);


  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    playTrackByIdRef.current?.(prevTrackId);
  }, [playlistHistory]);

  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'loading') return;

    if (playbackState === 'playing') {
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis?.speaking) window.speechSynthesis.pause();
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      try {
        if (audioRef.current) await audioRef.current.play();
        if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
        setPlaybackState('playing');
      } catch (e) {
        setErrorMessage("Impossible de reprendre la lecture");
      }
    } else {
      if (!currentTrack && station && station.playlist.length > 0) {
        const firstTrack = findNextValidTrack();
        if (firstTrack) {
          playTrackByIdRef.current?.(firstTrack.id);
        }
      }
    }
  }, [playbackState, currentTrack, station, findNextValidTrack]);

  const enableTTS = useCallback(() => {
    if ('speechSynthesis' in window && !ttsEnabled) {
      try {
        const testUtterance = new SpeechSynthesisUtterance('');
        testUtterance.volume = 0;
        testUtterance.onstart = () => { setTtsEnabled(true); setErrorMessage(null); };
        testUtterance.onerror = () => { setErrorMessage('Synthèse vocale bloquée'); };
        window.speechSynthesis.speak(testUtterance);
        window.speechSynthesis.cancel();
        setTimeout(() => { if (!ttsEnabled) { setTtsEnabled(true); setErrorMessage(null); } }, 500);
      } catch (error) {
        setErrorMessage('Erreur TTS');
      }
    }
  }, [ttsEnabled]);

  const addToPlaylist = useCallback((tracks: any[]) => {
    console.warn('addToPlaylist n\'est pas implémenté dans cette version simplifiée');
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleEnded = () => { if (isMountedRef.current) { nextTrack(); } };
    audio.addEventListener('ended', handleEnded);
    return () => { audio.removeEventListener('ended', handleEnded); };
  }, [nextTrack]);

  useEffect(() => {
    isMountedRef.current = true;
    stopPlayback();
    setCurrentTrack(undefined);
    setPlaylistHistory([]);
    setFailedTracks(new Set());
    
    if (station && station.playlist.length > 0) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          const firstTrack = findNextValidTrack();
          if (firstTrack) {
            playTrackByIdRef.current?.(firstTrack.id);
          }
        }
      }, 500);
    }
    return () => { isMountedRef.current = false; stopPlayback(); };
  }, [station?.id]);

  return {
    currentTrack,
    isPlaying,
    isLoadingTrack,
    failedTracks,
    audioRef,
    playTrackById: (trackId: string) => playTrackByIdRef.current?.(trackId),
    nextTrack,
    previousTrack,
    togglePlayPause,
    canGoBack: playlistHistory.length > 1,
    playlistLength: station?.playlist.length || 0,
    ttsMessage,
    errorMessage,
    ttsEnabled,
    enableTTS,
    addToPlaylist,
    addFailedTrack: (trackId: string) => setFailedTracks(prev => new Set(prev).add(trackId)),
  };
}
