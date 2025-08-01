'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PlaylistItem } from '@/lib/types';

export interface PlayerState {
  isPlaying: boolean;
  currentTrack: PlaylistItem | null;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  error: string | null;
  lastUpdate: Date;
  listeners: number;
  stationId: string | null;
}

export interface PlayerLog {
  id: string;
  type: 'play' | 'pause' | 'error' | 'track_change' | 'volume_change';
  message: string;
  timestamp: Date;
  trackId?: string;
  error?: string;
}

export function usePlayerMonitoring(stationId?: string) {
  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    error: null,
    lastUpdate: new Date(),
    listeners: 0,
    stationId: stationId || null
  });

  const [logs, setLogs] = useState<PlayerLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Subscribe to real-time player state updates
  useEffect(() => {
    if (!stationId) return;

    const playerRef = doc(db, 'playerStates', stationId);
    
    const unsubscribe = onSnapshot(playerRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setPlayerState({
          isPlaying: data.isPlaying || false,
          currentTrack: data.currentTrack || null,
          currentTime: data.currentTime || 0,
          duration: data.duration || 0,
          volume: data.volume || 1,
          isMuted: data.isMuted || false,
          error: data.error || null,
          lastUpdate: data.lastUpdate?.toDate() || new Date(),
          listeners: data.listeners || 0,
          stationId: data.stationId || stationId
        });
        setIsConnected(true);
      }
    }, (error) => {
      console.error('Error monitoring player state:', error);
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, [stationId]);

  // Subscribe to player logs
  useEffect(() => {
    if (!stationId) return;

    const logsRef = doc(db, 'playerLogs', stationId);
    
    const unsubscribe = onSnapshot(logsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const logsData = data.logs || [];
        setLogs(logsData.map((log: any) => ({
          ...log,
          timestamp: log.timestamp?.toDate() || new Date()
        })));
      }
    });

    return () => unsubscribe();
  }, [stationId]);

  // Update player state
  const updatePlayerState = useCallback(async (updates: Partial<PlayerState>) => {
    if (!stationId) return;

    const playerRef = doc(db, 'playerStates', stationId);
    
    try {
      await updateDoc(playerRef, {
        ...updates,
        lastUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating player state:', error);
    }
  }, [stationId]);

  // Add log entry
  const addLog = useCallback(async (log: Omit<PlayerLog, 'id' | 'timestamp'>) => {
    if (!stationId) return;

    const logsRef = doc(db, 'playerLogs', stationId);
    const newLog: PlayerLog = {
      id: Date.now().toString(),
      ...log,
      timestamp: new Date()
    };

    try {
      await updateDoc(logsRef, {
        logs: [...logs, newLog].slice(-50) // Keep last 50 logs
      });
    } catch (error) {
      console.error('Error adding log:', error);
    }
  }, [stationId, logs]);

  // Player control methods
  const play = useCallback(async () => {
    await updatePlayerState({ isPlaying: true, error: null });
    await addLog({
      type: 'play',
      message: 'Playback started'
    });
  }, [updatePlayerState, addLog]);

  const pause = useCallback(async () => {
    await updatePlayerState({ isPlaying: false });
    await addLog({
      type: 'pause',
      message: 'Playback paused'
    });
  }, [updatePlayerState, addLog]);

  const setVolume = useCallback(async (volume: number) => {
    await updatePlayerState({ volume });
    await addLog({
      type: 'volume_change',
      message: `Volume set to ${Math.round(volume * 100)}%`
    });
  }, [updatePlayerState, addLog]);

  const setCurrentTrack = useCallback(async (track: PlaylistItem) => {
    await updatePlayerState({ 
      currentTrack: track, 
      currentTime: 0,
      duration: track.duration || 0,
      error: null 
    });
    await addLog({
      type: 'track_change',
      message: `Now playing: ${track.title}`,
      trackId: track.id
    });
  }, [updatePlayerState, addLog]);

  const setError = useCallback(async (error: string) => {
    await updatePlayerState({ error, isPlaying: false });
    await addLog({
      type: 'error',
      message: error,
      error
    });
  }, [updatePlayerState, addLog]);

  const updateProgress = useCallback(async (currentTime: number) => {
    await updatePlayerState({ currentTime });
  }, [updatePlayerState]);

  return {
    playerState,
    logs,
    isConnected,
    play,
    pause,
    setVolume,
    setCurrentTrack,
    setError,
    updateProgress,
    addLog
  };
} 