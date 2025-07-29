import { useState, useRef, useCallback } from 'react';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export const usePlaybackState = () => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading';
  const hasError = playbackState === 'error';

  const setPlaying = useCallback(() => setPlaybackState('playing'), []);
  const setPaused = useCallback(() => setPlaybackState('paused'), []);
  const setLoading = useCallback(() => setPlaybackState('loading'), []);
  const setError = useCallback((message: string) => {
    setPlaybackState('error');
    setErrorMessage(message);
  }, []);
  const setIdle = useCallback(() => {
    setPlaybackState('idle');
    setErrorMessage(null);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (playbackState === 'error') {
      setPlaybackState('idle');
    }
  }, [playbackState]);

  return {
    playbackState,
    isPlaying,
    isLoading,
    hasError,
    errorMessage,
    audioRef,
    setPlaying,
    setPaused,
    setLoading,
    setError,
    setIdle,
    clearError
  };
};