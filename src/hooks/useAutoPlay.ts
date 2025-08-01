'use client';

import { useEffect, useCallback, useState } from 'react';
// Import dynamique d'InterferenceAudioService pour éviter les erreurs SSR

interface UseAutoPlayProps {
  frequency: number;
  currentStation: any;
  playlistManager: any;
}

/**
 * Hook pour gérer l'autoplay automatique et les sons d'interférence
 */
export function useAutoPlay({ frequency, currentStation, playlistManager }: UseAutoPlayProps) {
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);
  const [autoPlayReady, setAutoPlayReady] = useState(false);
  const [interferenceAudioService, setInterferenceAudioService] = useState<any>(null);

  // Charger le service d'interférence dynamiquement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/services/InterferenceAudioService').then(({ interferenceAudioService }) => {
        setInterferenceAudioService(interferenceAudioService);
      }).catch(console.error);
    }
  }, []);

  // Fonction d'initialisation complète de l'audio
  const initializeAudio = useCallback(async () => {
    if (isAudioInitialized || !interferenceAudioService) return true;

    try {
      // Test si l'autoplay est possible
      const canAutoplay = await interferenceAudioService.testAutoplayCapability();
      
      if (canAutoplay) {
        // Initialiser le service d'interférence
        await interferenceAudioService.initialize();
        await interferenceAudioService.ensureAudioContext();
        
        // Activer l'autoplay du playlist manager
        if (playlistManager?.enableAutoPlay && !playlistManager.autoPlayEnabled) {
          playlistManager.enableAutoPlay();
        }
        
        setIsAudioInitialized(true);
        setAutoPlayReady(true);
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.warn('Erreur initialisation audio:', error);
      return false;
    }
  }, [isAudioInitialized, playlistManager, interferenceAudioService]);

  // Fonction pour gérer l'interaction utilisateur
  const handleUserInteraction = useCallback(async () => {
    if (!isAudioInitialized && interferenceAudioService) {
      const success = await initializeAudio();
      
      if (success) {
        // Démarrer immédiatement l'audio approprié
        if (currentStation) {
          // Station trouvée : démarrer la playlist
          if (playlistManager?.currentTrack && !playlistManager.isPlaying) {
            playlistManager.togglePlayPause();
          } else if (!playlistManager?.currentTrack && currentStation.playlist.length > 0) {
            playlistManager.togglePlayPause();
          }
        } else {
          // Pas de station : jouer l'interférence
          await interferenceAudioService.transitionToFrequency(frequency, false);
        }
      }
    }
  }, [isAudioInitialized, currentStation, frequency, playlistManager, initializeAudio, interferenceAudioService]);

  // Effet pour tenter l'autoplay au chargement
  useEffect(() => {
    const attemptAutoPlay = async () => {
      // Attendre un peu que le DOM soit prêt
      setTimeout(async () => {
        const success = await initializeAudio();
        
        if (success) {
          // Démarrer automatiquement selon le contexte
          if (currentStation) {
            if (playlistManager?.autoPlayEnabled && currentStation.playlist.length > 0) {
              playlistManager.togglePlayPause();
            }
          } else if (interferenceAudioService) {
            // Jouer l'interférence si pas de station
            await interferenceAudioService.transitionToFrequency(frequency, false);
          }
        }
      }, 1000);
    };

    attemptAutoPlay();
  }, [interferenceAudioService, currentStation, frequency, initializeAudio, playlistManager]); // Dépendre de interferenceAudioService

  // Effet pour gérer les changements de station/fréquence
  useEffect(() => {
    if (isAudioInitialized) {
      // Gérer la transition audio selon la station
      interferenceAudioService.transitionToFrequency(frequency, !!currentStation);
      
      // Auto-démarrer la playlist si une station est trouvée et l'autoplay est activé
      if (currentStation && playlistManager?.autoPlayEnabled && !playlistManager.isPlaying) {
        if (currentStation.playlist.length > 0) {
          setTimeout(() => {
            playlistManager.togglePlayPause();
          }, 500); // Petit délai pour la transition
        }
      }
    }
  }, [currentStation, frequency, isAudioInitialized, playlistManager, interferenceAudioService]);

  // Effet pour configurer les événements d'interaction si l'autoplay n'est pas prêt
  useEffect(() => {
    if (!autoPlayReady) {
      const events = ['click', 'touchstart', 'keydown'];
      events.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: true });
      });

      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
      };
    }
  }, [autoPlayReady, handleUserInteraction]);

  return {
    isAudioInitialized,
    autoPlayReady,
    handleUserInteraction,
    needsUserInteraction: !autoPlayReady
  };
}