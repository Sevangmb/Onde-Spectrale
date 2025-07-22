
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

  const nextTrack = useCallback(async () => {
    if (!station || !station.playlist.length) return;

    let nextIndex = (currentTrackIndex + 1) % station.playlist.length;
    let attempts = 0;
    const maxAttempts = station.playlist.length;

    // Boucle pour trouver et jouer la prochaine piste valide
    while (attempts < maxAttempts) {
      const track = station.playlist[nextIndex];
      const trackId = track.id;

      if (!failedTracks.has(trackId)) {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        const success = await playTrack(nextIndex);
        if (success) return; // Si la piste a été jouée avec succès, on arrête
      }
      
      // Passer à l'index suivant si la piste a échoué ou a été ignorée
      nextIndex = (nextIndex + 1) % station.playlist.length;
      attempts++;
    }

    // Si toutes les pistes ont échoué
    console.warn('Aucune piste valide trouvée dans la playlist. La lecture s\'arrête.');
    setIsPlaying(false);
    setCurrentTrack(undefined);
  }, [station, currentTrackIndex, failedTracks]);


  // Fonction pour jouer une piste spécifique
  const playTrack = useCallback(async (trackIndex: number): Promise<boolean> => {
    if (!station || !station.playlist[trackIndex] || !isMountedRef.current) {
      return false;
    }

    const track = station.playlist[trackIndex];
    const trackId = track.id;

    // Ignorer les pistes sans contenu
    if (!track.content || track.content.trim() === '') {
        console.warn(`Piste "${track.title}" ignorée car son contenu est vide.`);
        // Ne pas marquer comme échec, juste passer à la suivante
        return false;
    }

    setIsLoadingTrack(true);

    // Vérifier si cette piste a déjà échoué trop de fois
    const retryCount = retryCountRef.current.get(trackId) || 0;
    if (retryCount >= 2) {
      console.log(`Piste ${track.title} ignorée (trop d'échecs)`);
      setFailedTracks(prev => new Set(prev).add(trackId));
      setIsLoadingTrack(false);
      return false;
    }

    setCurrentTrackIndex(trackIndex);
    setCurrentTrack(track);

    try {
      const audioUrl = await getTrackAudioUrl(track);
      
      if (!audioUrl || !isMountedRef.current || !audioRef.current) {
        throw new Error('URL audio introuvable ou composant démonté');
      }

      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      await audioRef.current.play();
      setIsPlaying(true);
      setIsLoadingTrack(false);
      retryCountRef.current.delete(trackId);
      
      setPlaylistHistory(prev => [...prev.slice(-9), trackIndex]);
      
      return true;
    } catch (error) {
      console.error(`Erreur lecture piste ${track.title}:`, error);
      retryCountRef.current.set(trackId, retryCount + 1);
      
      setIsLoadingTrack(false);
      return false;
    }
  }, [station, getTrackAudioUrl]);

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
    
    const onError = async () => {
      console.error(`Erreur de l'élément audio pour la piste : ${currentTrack?.title}`);
      setIsPlaying(false);
      if (currentTrack) {
        const retryCount = retryCountRef.current.get(currentTrack.id) || 0;
        retryCountRef.current.set(currentTrack.id, retryCount + 1);
      }
      await nextTrack();
    };

    audio.addEventListener('ended', handleTrackEnd);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('ended', handleTrackEnd);
      audio.removeEventListener('error', onError);
    };
  }, [handleTrackEnd, nextTrack, currentTrack]);

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
