// src/hooks/usePlaylistManager.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { PlaylistItem, Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { getAudioForTrack, searchMusicAdvanced, generateDjMessage } from '@/app/actions';

interface PlaylistManagerProps {
  station: Station | null;
  user: any;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

export function usePlaylistManager({ station, user, allDjs }: PlaylistManagerProps) {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  const [playlistHistory, setPlaylistHistory] = useState<number[]>([]);
  const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const retryCountRef = useRef<Map<string, number>>(new Map());
  const isMountedRef = useRef(true);

  // Réinitialiser quand la station change
  useEffect(() => {
    if (station) {
      setCurrentTrackIndex(0);
      setCurrentTrack(undefined);
      setIsPlaying(false);
      setIsLoadingTrack(false);
      setPlaylistHistory([]);
      setFailedTracks(new Set());
      retryCountRef.current.clear();
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    }
  }, [station?.id]);

  // Fonction pour obtenir l'URL audio d'une piste
  const getTrackAudioUrl = useCallback(async (track: PlaylistItem): Promise<string | null> => {
    if (!station || !user) return null;

    const dj = allDjs.find(d => d.id === station.djCharacterId);
    if (!dj) return null;

    try {
      const result = await getAudioForTrack(track, station.djCharacterId, user.uid);
      if (result.audioUrl) {
        return result.audioUrl;
      }
      throw new Error(result.error || 'URL audio introuvable');
    } catch (error) {
      console.error(`Erreur récupération audio pour "${track.title}":`, error);
      return null;
    }
  }, [station, user, allDjs]);

  // Fonction pour jouer une piste spécifique
  const playTrack = useCallback(async (trackIndex: number) => {
    if (!station || !station.playlist[trackIndex] || !isMountedRef.current) {
      return false;
    }

    setIsLoadingTrack(true);
    const track = station.playlist[trackIndex];
    const trackId = track.id;

    // Vérifier si cette piste a déjà échoué trop de fois
    const retryCount = retryCountRef.current.get(trackId) || 0;
    if (retryCount >= 3) {
      console.log(`Piste ${track.title} ignorée (trop d'échecs)`);
      setFailedTracks(prev => new Set(prev.add(trackId)));
      setIsLoadingTrack(false);
      return false;
    }

    setCurrentTrackIndex(trackIndex);
    setCurrentTrack(track);

    try {
      const audioUrl = await getTrackAudioUrl(track);
      
      if (!audioUrl || !isMountedRef.current || !audioRef.current) {
        throw new Error('URL audio introuvable');
      }

      // Configurer l'audio
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoadingTrack(false);

      // Réinitialiser le compteur d'échecs en cas de succès
      retryCountRef.current.delete(trackId);
      
      // Ajouter à l'historique
      setPlaylistHistory(prev => [...prev.slice(-9), trackIndex]);
      
      return true;
    } catch (error) {
      console.error(`Erreur lecture piste ${track.title}:`, error);
      
      // Incrémenter le compteur d'échecs
      retryCountRef.current.set(trackId, retryCount + 1);
      
      setIsLoadingTrack(false);
      return false;
    }
  }, [station, getTrackAudioUrl]);

  // Fonction pour passer à la piste suivante
  const nextTrack = useCallback(async () => {
    if (!station || !station.playlist.length) return;

    let nextIndex = (currentTrackIndex + 1) % station.playlist.length;
    let attempts = 0;
    const maxAttempts = station.playlist.length;

    // Essayer de trouver une piste qui fonctionne
    while (attempts < maxAttempts) {
      const trackId = station.playlist[nextIndex].id;
      
      if (!failedTracks.has(trackId)) {
        const success = await playTrack(nextIndex);
        if (success) return;
      }

      nextIndex = (nextIndex + 1) % station.playlist.length;
      attempts++;
    }

    console.warn('Aucune piste valide trouvée dans la playlist');
    setIsPlaying(false);
  }, [station, currentTrackIndex, failedTracks, playTrack]);

  // Fonction pour revenir à la piste précédente
  const previousTrack = useCallback(async () => {
    if (!station || playlistHistory.length === 0) return;

    const prevIndex = playlistHistory[playlistHistory.length - 1];
    setPlaylistHistory(prev => prev.slice(0, -1));
    await playTrack(prevIndex);
  }, [station, playlistHistory, playTrack]);

  // Fonction pour jouer/pause
  const togglePlayPause = useCallback(async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!currentTrack) {
        // Commencer la lecture avec la première piste
        await playTrack(0);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error('Erreur reprise lecture:', error);
          await nextTrack();
        }
      }
    }
  }, [isPlaying, currentTrack, playTrack, nextTrack]);

  // Gestionnaire de fin de piste
  const handleTrackEnd = useCallback(async () => {
    setIsPlaying(false);
    await nextTrack();
  }, [nextTrack]);

  // Configuration des événements audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', () => {
      console.error('Erreur audio détectée');
      setIsPlaying(false);
      nextTrack();
    });

    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
      audio.removeEventListener('error', nextTrack);
    };
  }, [handleTrackEnd, nextTrack]);

  // Auto-play quand une station est chargée
  useEffect(() => {
    if (station && station.playlist.length > 0 && !isPlaying && !isLoadingTrack && !currentTrack) {
      playTrack(0);
    }
  }, [station, isPlaying, isLoadingTrack, currentTrack, playTrack]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // État
    currentTrack,
    currentTrackIndex,
    isPlaying,
    isLoadingTrack,
    failedTracks,
    playlistHistory,
    audioRef,
    
    // Actions
    playTrack,
    nextTrack,
    previousTrack,
    togglePlayPause,
    
    // Utilitaires
    canGoBack: playlistHistory.length > 0,
    hasNextTrack: station ? currentTrackIndex < station.playlist.length - 1 : false,
    playlistLength: station?.playlist.length || 0,
  };
}