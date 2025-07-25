
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
  
  const playTrackByIdRef = useRef<((trackId: string) => Promise<void>) | null>(null);


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

  const findNextValidTrack = useCallback((currentId?: string): PlaylistItem | null => {
    if (!station || station.playlist.length === 0) return null;

    const currentIndex = currentId ? station.playlist.findIndex(t => t.id === currentId) : -1;
    let attempts = 0;
    let nextIndex = (currentIndex + 1) % station.playlist.length;

    while (attempts < station.playlist.length) {
      const track = station.playlist[nextIndex];
      if (!failedTracks.has(track.id) && !(track.type === 'message' && !track.content?.trim())) {
        return track;
      }
      nextIndex = (nextIndex + 1) % station.playlist.length;
      attempts++;
    }

    return null;
  }, [station?.playlist, failedTracks]);

  const nextTrack = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const nextPlayableTrack = findNextValidTrack(currentTrack?.id);

    if (nextPlayableTrack) {
        playTrackByIdRef.current?.(nextPlayableTrack.id);
    } else {
      setErrorMessage("Fin de la playlist. Aucune piste valide trouvée.");
      stopPlayback();
    }
  }, [currentTrack?.id, findNextValidTrack, stopPlayback]);

  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (!isMountedRef.current || !station) return;
    
    if (currentOperationRef.current === trackId) {
      return;
    }
    
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

      if (!isMountedRef.current || currentOperationRef.current !== trackId) return;

      if (result.error || !result.audioUrl) {
        const errorMsg = result.error || 'URL audio manquante';
        setErrorMessage(`Piste indisponible: ${errorMsg}`);
        setFailedTracks(prev => new Set(prev).add(track.id));
        setPlaybackState('error');
        autoPlayTimeoutRef.current = setTimeout(() => nextTrack(), 1500);
        return;
      }

      if (!audioRef.current) {
        setErrorMessage("Lecteur audio non disponible");
        setPlaybackState('error');
        return;
      }
      const audio = audioRef.current;
      
      const handleCanPlay = async () => {
        if (!isMountedRef.current || currentOperationRef.current !== trackId) return;
        try {
          await audio.play();
          setPlaylistHistory(prev => [...prev.slice(-9), track.id]);
          setPlaybackState('playing');
          setErrorMessage(null);
        } catch (e) {
          setErrorMessage("Cliquez pour activer la lecture");
          setPlaybackState('paused');
        }
      };
      
      const handleError = () => {
        if (!isMountedRef.current || currentOperationRef.current !== trackId) return;
        setErrorMessage("Erreur de lecture, passage à la suivante...");
        setFailedTracks(prev => new Set(prev).add(track.id));
        setPlaybackState('error');
        autoPlayTimeoutRef.current = setTimeout(() => nextTrack(), 800);
      };

      audio.addEventListener('canplay', handleCanPlay, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      
      if (result.audioUrl.startsWith('data:audio')) {
        setTtsMessage(`Message de ${track.artist}: ${track.content}`);
      }

      audio.src = result.audioUrl;
      audio.load();

    } catch (error: any) {
      setErrorMessage(error.message || "Erreur de chargement");
      setPlaybackState('error');
      autoPlayTimeoutRef.current = setTimeout(() => nextTrack(), 1000);
    } finally {
        if (currentOperationRef.current === trackId) {
            currentOperationRef.current = null;
        }
    }
  }, [station, user?.uid, stopPlayback, nextTrack]);

  playTrackByIdRef.current = playTrackById;

  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    playTrackById(prevTrackId);
  }, [playlistHistory, playTrackById]);

  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'loading') return;

    if (playbackState === 'playing') {
      if (audioRef.current) audioRef.current.pause();
      if (window.speechSynthesis?.speaking) window.speechSynthesis.pause();
      setPlaybackState('paused');
    } else if (playbackState === 'paused' && audioRef.current) {
      try {
        await audioRef.current.play();
        if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
        setPlaybackState('playing');
      } catch (e) {
        setErrorMessage("Impossible de reprendre la lecture");
      }
    } else {
      if (!currentTrack && station && station.playlist.length > 0) {
        const firstTrack = findNextValidTrack();
        if (firstTrack) {
          playTrackById(firstTrack.id);
        }
      } else if (currentTrack) {
        // Retry playing current track if paused or in error state
         playTrackById(currentTrack.id);
      }
    }
  }, [playbackState, currentTrack, station, findNextValidTrack, playTrackById]);

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
    
    return () => { isMountedRef.current = false; stopPlayback(); };
  }, [station?.id, stopPlayback]);
  
  // Autoplay logic when station changes
  useEffect(() => {
    if (station && station.playlist.length > 0) {
       clearAutoPlayTimeout();
       autoPlayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          const firstTrack = findNextValidTrack();
          if (firstTrack) {
            playTrackById(firstTrack.id);
          }
        }
      }, 500); // Delay to allow UI to settle
    }
  }, [station?.id, station?.playlist, findNextValidTrack, playTrackById, clearAutoPlayTimeout]);


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
    addToPlaylist,
    addFailedTrack: (trackId: string) => setFailedTracks(prev => new Set(prev).add(trackId)),
  };
}
