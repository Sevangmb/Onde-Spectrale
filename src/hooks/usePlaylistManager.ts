
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
        // La lecture est déclenchée par playTrackById, qui sera appelée par le useEffect
        // ou manuellement. Ici on prépare juste le terrain.
        setCurrentTrack(nextPlayableTrack);
    } else {
      setErrorMessage("Fin de la playlist. Aucune piste valide trouvée.");
      stopPlayback();
    }
  }, [currentTrack?.id, findNextValidTrack, stopPlayback]);

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
      
      await audio.play();
      setPlaylistHistory(prev => [...prev.slice(-9), track.id]);
      setPlaybackState('playing');

    } catch (error: any) {
      setErrorMessage(error.message);
      setFailedTracks(prev => new Set(prev).add(trackId));
      setPlaybackState('error');
      // On déclenche nextTrack pour passer à la suivante après un délai
      clearAutoPlayTimeout();
      autoPlayTimeoutRef.current = setTimeout(nextTrack, 1500);
    } finally {
      if (currentOperationId.current === trackId) {
        currentOperationId.current = null;
      }
    }
  }, [station, user?.uid, stopPlayback, nextTrack, clearAutoPlayTimeout]);
  
  const togglePlayPause = useCallback(async () => {
    if (isLoadingTrack) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setPlaybackState('paused');
    } else if (currentTrack) {
      try {
        await audioRef.current?.play();
        setPlaybackState('playing');
      } catch(e) {
        setErrorMessage("Lecture bloquée par le navigateur. Cliquez pour activer.");
        setPlaybackState('paused');
      }
    } else {
        const firstTrack = findNextValidTrack();
        if (firstTrack) playTrackById(firstTrack.id);
    }
  }, [isLoadingTrack, isPlaying, currentTrack, findNextValidTrack, playTrackById]);
  
  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    playTrackById(prevTrackId);
  }, [playlistHistory, playTrackById]);
  
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
        // On ne démarre pas la lecture automatiquement ici,
        // on laisse l'utilisateur le faire ou un autre effet.
        // Pour un vrai démarrage auto, on appellerait playTrackById ici.
        playTrackById(firstTrack.id);
      } else {
         setErrorMessage("Aucune piste valide dans cette station.");
      }
    } else {
      setCurrentTrack(undefined);
    }

    return () => { isMountedRef.current = false; stopPlayback(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station?.id]);
  
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
  };
}
