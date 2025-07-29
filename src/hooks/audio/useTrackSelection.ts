import { useState, useCallback, useMemo } from 'react';
import type { PlaylistItem, Station } from '@/lib/types';

interface UseTrackSelectionProps {
  station: Station | null;
  failedTracks: Set<string>;
}

export const useTrackSelection = ({ station, failedTracks }: UseTrackSelectionProps) => {
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
  const [playlistHistory, setPlaylistHistory] = useState<string[]>([]);

  // Optimized track finding logic
  const availableTracks = useMemo(() => 
    station?.playlist.filter(track => 
      !failedTracks.has(track.id) && 
      !(track.type === 'message' && !track.content?.trim())
    ) || [], 
    [station?.playlist, failedTracks]
  );

  const findNextTrack = useCallback((fromTrackId?: string): PlaylistItem | null => {
    if (availableTracks.length === 0) return null;

    if (!fromTrackId) return availableTracks[0];

    const currentIndex = availableTracks.findIndex(track => track.id === fromTrackId);
    const nextIndex = (currentIndex + 1) % availableTracks.length;
    return availableTracks[nextIndex];
  }, [availableTracks]);

  const findPreviousTrack = useCallback((): PlaylistItem | null => {
    if (playlistHistory.length < 2) return null;
    
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    return availableTracks.find(track => track.id === prevTrackId) || null;
  }, [availableTracks, playlistHistory]);

  const selectTrack = useCallback((track: PlaylistItem) => {
    setCurrentTrack(track);
    setPlaylistHistory(prev => [...prev.slice(-9), track.id]);
  }, []);

  const selectNextTrack = useCallback(() => {
    const nextTrack = findNextTrack(currentTrack?.id);
    if (nextTrack) {
      selectTrack(nextTrack);
    }
    return nextTrack;
  }, [currentTrack?.id, findNextTrack, selectTrack]);

  const selectPreviousTrack = useCallback(() => {
    const prevTrack = findPreviousTrack();
    if (prevTrack) {
      setCurrentTrack(prevTrack);
      setPlaylistHistory(prev => prev.slice(0, -2));
    }
    return prevTrack;
  }, [findPreviousTrack]);

  const canGoBack = playlistHistory.length > 1;
  const canGoForward = !!findNextTrack(currentTrack?.id);

  // Reset when station changes
  const resetForNewStation = useCallback(() => {
    setCurrentTrack(undefined);
    setPlaylistHistory([]);
  }, []);

  return {
    currentTrack,
    availableTracks,
    playlistHistory,
    canGoBack,
    canGoForward,
    selectTrack,
    selectNextTrack,
    selectPreviousTrack,
    findNextTrack,
    resetForNewStation
  };
};