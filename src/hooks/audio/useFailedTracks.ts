import { useState, useCallback } from 'react';

export const useFailedTracks = () => {
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());

  const addFailedTrack = useCallback((trackId: string) => {
    setFailedTracks(prev => new Set(prev).add(trackId));
    console.log(`❌ Track ${trackId} marked as failed`);
  }, []);

  const removeFailedTrack = useCallback((trackId: string) => {
    setFailedTracks(prev => {
      const newSet = new Set(prev);
      newSet.delete(trackId);
      return newSet;
    });
    console.log(`✅ Track ${trackId} removed from failed list`);
  }, []);

  const clearFailedTracks = useCallback(() => {
    setFailedTracks(new Set());
    console.log('🧹 Failed tracks list cleared');
  }, []);

  const isTrackFailed = useCallback((trackId: string) => {
    return failedTracks.has(trackId);
  }, [failedTracks]);

  return {
    failedTracks,
    addFailedTrack,
    removeFailedTrack,
    clearFailedTracks,
    isTrackFailed
  };
};