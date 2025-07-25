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

  // Fonction principale de lecture d'une piste
  const playTrackById = useCallback(async (trackId: string): Promise<void> => {
    if (!isMountedRef.current || !station) return;

    // Empêcher les opérations concurrentes
    if (currentOperationRef.current === trackId) return;
    currentOperationRef.current = trackId;

    try {
      // Arrêter la lecture précédente
      stopPlayback();

      const track = station.playlist.find(t => t.id === trackId);
      if (!track) {
        console.warn(`Piste ${trackId} non trouvée dans la playlist`);
        return;
      }

      // Vérifier si la piste est valide
      if (track.type === 'message' && !track.content?.trim()) {
        setFailedTracks(prev => new Set(prev).add(track.id));
        // Passer automatiquement à la suivante
        const nextTrack = findNextValidTrack(track.id);
        if (nextTrack) {
          setTimeout(() => playTrackById(nextTrack.id), 100);
        }
        return;
      }

      // Mettre à jour l'état
      setCurrentTrack(track);
      setPlaybackState('loading');
      setErrorMessage(null);
      setTtsMessage(null);

      console.log('🎵 Chargement de la piste:', track.title);

      // Obtenir l'audio pour la piste
      const result = await getAudioForTrack(track, station.djCharacterId, user?.uid || 'anonymous', station.theme);

      if (!isMountedRef.current) return;

      // Gérer les erreurs de récupération audio
      if (result.error || !result.audioUrl) {
        const errorMsg = result.error || 'URL audio manquante';
        
        // Mode démo spécial
        if (errorMsg.includes('Mode démo')) {
          console.log('🎨 Mode démo actif');
          setPlaybackState('playing');
          setErrorMessage('🎨 Mode démo - Interface fonctionnelle');
          
          // Simuler la fin de piste après 30 secondes
          autoPlayTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setPlaybackState('idle');
              nextTrack();
            }
          }, 30000);
          return;
        }
        
        // Erreur réelle
        console.error(`❌ Erreur pour "${track.title}": ${errorMsg}`);
        setErrorMessage(`Piste non disponible: ${track.title}`);
        setFailedTracks(prev => new Set(prev).add(track.id));
        setPlaybackState('error');
        
        // Passer à la suivante après 1.5s
        autoPlayTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            nextTrack();
          }
        }, 1500);
        return;
      }

      // Ajouter à l'historique
      setPlaylistHistory(prev => [...prev.slice(-9), track.id]);

      // Configurer l'élément audio
      if (!audioRef.current) {
        setErrorMessage("Lecteur audio non disponible");
        setPlaybackState('error');
        return;
      }

      const audio = audioRef.current;

      // Gérer les messages TTS (data:audio)
      if (result.audioUrl.startsWith('data:audio')) {
        setTtsMessage(`Message de ${track.artist}: ${track.content}`);
        
        const handleTTSLoad = () => {
          setPlaybackState('playing');
          console.log('✅ Message TTS démarré');
        };

        const handleTTSError = () => {
          console.error('❌ Erreur TTS');
          setErrorMessage("Erreur de synthèse vocale");
          setPlaybackState('error');
          nextTrack();
        };

        audio.addEventListener('canplay', handleTTSLoad, { once: true });
        audio.addEventListener('error', handleTTSError, { once: true });
        
        audio.src = result.audioUrl;
        
        try {
          await audio.play();
        } catch (e) {
          console.error('❌ Erreur de lecture TTS:', e);
          setErrorMessage("Cliquez pour activer l'audio");
          setPlaybackState('paused');
        }
      } else {
        // Gérer les pistes musicales normales
        const handleAudioLoad = async () => {
          try {
            await audio.play();
            setPlaybackState('playing');
            setErrorMessage(null);
            console.log('✅ Lecture démarrée:', track.title);
          } catch (e) {
            console.error('❌ Lecture automatique bloquée:', e);
            setErrorMessage("Cliquez pour activer la lecture");
            setPlaybackState('paused');
          }
        };

        const handleAudioError = () => {
          console.warn('⚠️ Échantillon non disponible:', track.title);
          setErrorMessage("Recherche d'un autre échantillon...");
          setFailedTracks(prev => new Set(prev).add(track.id));
          setPlaybackState('error');
          
          // Passer à la suivante
          autoPlayTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              nextTrack();
            }
          }, 800);
        };

        audio.addEventListener('canplay', handleAudioLoad, { once: true });
        audio.addEventListener('error', handleAudioError, { once: true });
        
        audio.src = result.audioUrl;
      }

    } catch (error) {
      console.error('❌ Erreur lors du chargement de la piste:', error);
      setErrorMessage("Erreur de chargement");
      setPlaybackState('error');
      
      autoPlayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          nextTrack();
        }
      }, 1000);
    } finally {
      currentOperationRef.current = null;
    }
  }, [station, user, stopPlayback, findNextValidTrack, clearAutoPlayTimeout]);

  // Fonction pour passer à la piste suivante
  const nextTrack = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const nextTrack = findNextValidTrack(currentTrack?.id);
    if (nextTrack) {
      playTrackById(nextTrack.id);
    } else {
      setErrorMessage("Aucune piste disponible dans la playlist");
      stopPlayback();
    }
  }, [currentTrack?.id, findNextValidTrack, playTrackById, stopPlayback]);

  // Fonction pour revenir à la piste précédente
  const previousTrack = useCallback(() => {
    if (playlistHistory.length < 2) return;
    
    const prevTrackId = playlistHistory[playlistHistory.length - 2];
    setPlaylistHistory(prev => prev.slice(0, -2));
    playTrackById(prevTrackId);
  }, [playlistHistory, playTrackById]);

  // Fonction pour basculer lecture/pause
  const togglePlayPause = useCallback(async () => {
    if (playbackState === 'loading') return;

    if (playbackState === 'playing') {
      // Mettre en pause
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis?.speaking) {
        window.speechSynthesis.pause();
      }
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      // Reprendre la lecture
      try {
        if (audioRef.current) {
          await audioRef.current.play();
        }
        if (window.speechSynthesis?.paused) {
          window.speechSynthesis.resume();
        }
        setPlaybackState('playing');
      } catch (e) {
        console.error('❌ Erreur de reprise:', e);
        setErrorMessage("Impossible de reprendre la lecture");
      }
    } else {
      // Démarrer la lecture si aucune piste n'est sélectionnée
      if (!currentTrack && station && station.playlist.length > 0) {
        const firstTrack = findNextValidTrack();
        if (firstTrack) {
          playTrackById(firstTrack.id);
        }
      }
    }
  }, [playbackState, currentTrack, station, findNextValidTrack, playTrackById]);

  // Fonction pour activer le TTS
  const enableTTS = useCallback(() => {
    if ('speechSynthesis' in window && !ttsEnabled) {
      try {
        const testUtterance = new SpeechSynthesisUtterance('');
        testUtterance.volume = 0;
        
        testUtterance.onstart = () => {
          setTtsEnabled(true);
          setErrorMessage(null);
          console.log('✅ TTS activé');
        };
        
        testUtterance.onerror = (e: any) => {
          console.warn('TTS non autorisé:', e.error);
          if (e.error === 'not-allowed') {
            setErrorMessage('Synthèse vocale bloquée');
          }
        };
        
        window.speechSynthesis.speak(testUtterance);
        window.speechSynthesis.cancel();
        
        // Fallback
        setTimeout(() => {
          if (!ttsEnabled) {
            setTtsEnabled(true);
            setErrorMessage(null);
          }
        }, 500);
        
      } catch (error) {
        console.warn('Impossible d\'activer TTS:', error);
        setErrorMessage('Erreur TTS');
      }
    }
  }, [ttsEnabled]);

  // Fonction pour ajouter des pistes à la playlist (fonction stub pour compatibilité)
  const addToPlaylist = useCallback((tracks: any[]) => {
    console.warn('addToPlaylist n\'est pas implémenté dans cette version simplifiée');
    console.log('Pistes à ajouter:', tracks);
    // Cette fonctionnalité nécessiterait de modifier la station côté serveur
    // Pour l'instant, on affiche juste un avertissement
  }, []);

  // Gestionnaire des événements audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      if (isMountedRef.current && playbackState === 'playing') {
        console.log('🎵 Piste terminée, passage à la suivante');
        autoPlayTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            nextTrack();
          }
        }, 1000);
      }
    };

    const handleError = () => {
      console.warn('❌ Erreur audio globale');
      setErrorMessage("Erreur de lecture - piste suivante...");
      setPlaybackState('error');
      
      autoPlayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          nextTrack();
        }
      }, 2000);
    };

    const handleCanPlay = () => {
      if (playbackState === 'loading') {
        setErrorMessage(null);
      }
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [playbackState, nextTrack]);

  // Effet de changement de station
  useEffect(() => {
    isMountedRef.current = true;
    
    // Nettoyer l'état précédent
    stopPlayback();
    setCurrentTrack(undefined);
    setPlaylistHistory([]);
    setFailedTracks(new Set());
    setTtsMessage(null);
    setErrorMessage(null);
    
    // Auto-démarrage pour les nouvelles stations
    if (station && station.playlist.length > 0) {
      console.log('🎵 Nouvelle station chargée:', station.name);
      
      autoPlayTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          const firstTrack = findNextValidTrack();
          if (firstTrack) {
            console.log('🚀 Auto-démarrage de la première piste');
            playTrackById(firstTrack.id);
          }
        }
      }, 500);
    }

    return () => {
      isMountedRef.current = false;
      stopPlayback();
    };
  }, [station?.id, stopPlayback, findNextValidTrack, playTrackById]);

  return {
    // État de la piste actuelle
    currentTrack,
    isPlaying,
    isLoadingTrack,
    failedTracks,
    
    // Contrôles de lecture
    audioRef,
    playTrackById,
    nextTrack,
    previousTrack,
    togglePlayPause,
    
    // État de navigation
    canGoBack: playlistHistory.length > 1,
    playlistLength: station?.playlist.length || 0,
    
    // Messages et erreurs
    ttsMessage,
    errorMessage,
    ttsEnabled,
    enableTTS,
    
    // Fonctionnalité d'ajout (stub)
    addToPlaylist,
  };
}