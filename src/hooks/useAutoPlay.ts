// src/hooks/useAutoPlay.ts
'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { interferenceAudioService } from '@/services/InterferenceAudioService';

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
  const initAttempted = useRef(false);

  // Fonction d'initialisation complète de l'audio, déclenchée par la première interaction utilisateur
  const initializeAudio = useCallback(async () => {
    if (isAudioInitialized || initAttempted.current) return;
    initAttempted.current = true;
    
    console.log('🎬 User interaction detected, attempting to initialize audio...');

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
        
        console.log('🎵 Audio initialized successfully');
        
        // Démarrer immédiatement l'audio approprié après l'initialisation
        if (currentStation) {
          if (playlistManager?.currentTrack && !playlistManager.isPlaying) {
            playlistManager.togglePlayPause();
          } else if (!playlistManager?.currentTrack && currentStation.playlist.length > 0) {
            playlistManager.togglePlayPause();
          }
        } else {
          await interferenceAudioService.transitionToFrequency(frequency, false);
        }

      } else {
        console.log('⚠️ Autoplay blocked by browser.');
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize audio:', error);
    }
  }, [isAudioInitialized, playlistManager, currentStation, frequency]);

  // Effet pour ajouter un écouteur d'événement pour la première interaction
  useEffect(() => {
    // S'assurer que le code ne s'exécute que côté client
    if (typeof window === 'undefined') return;

    const controller = new AbortController();
    const signal = controller.signal;

    // Événements qui comptent comme une interaction utilisateur
    const interactionEvents: (keyof DocumentEventMap)[] = ['click', 'touchstart', 'keydown'];

    // Attacher les écouteurs d'événements
    interactionEvents.forEach(event => {
      document.addEventListener(event, initializeAudio, { once: true, signal });
    });

    // Nettoyer les écouteurs lorsque le composant est démonté
    return () => {
      controller.abort();
    };
  }, [initializeAudio]);


  // Effet pour gérer les changements de station/fréquence
  useEffect(() => {
    if (isAudioInitialized) {
      // Gérer la transition audio selon la station
      interferenceAudioService.transitionToFrequency(frequency, !!currentStation);
      
      // Auto-démarrer la playlist si une station est trouvée et l'autoplay est activé
      if (currentStation && playlistManager?.autoPlayEnabled && !playlistManager.isPlaying) {
        if (currentStation.playlist.length > 0) {
          setTimeout(() => {
            if (playlistManager.togglePlayPause) playlistManager.togglePlayPause();
          }, 500); // Petit délai pour la transition
        }
      }
    }
  }, [currentStation, frequency, isAudioInitialized, playlistManager]);

  return {
    isAudioInitialized,
    autoPlayReady,
  };
}
