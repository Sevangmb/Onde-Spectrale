// src/hooks/useRadioSoundEffects.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  RadioSoundEffect, 
  getStaticEffect, 
  getInterferenceEffect, 
  getTuningEffect,
  createContextualRadioEffect 
} from '@/lib/freesound';

interface UseRadioSoundEffectsOptions {
  volume?: number;
  enableEffects?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export function useRadioSoundEffects(options: UseRadioSoundEffectsOptions = {}) {
  const {
    volume = 0.3,
    enableEffects = true,
    fadeInDuration = 500,
    fadeOutDuration = 300
  } = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<RadioSoundEffect | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Nettoyage de l'audio et des timers
  const cleanup = useCallback(() => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    setIsPlaying(false);
    setCurrentEffect(null);
  }, []);

  // Fonction de fade out
  const fadeOut = useCallback((audio: HTMLAudioElement, callback?: () => void) => {
    const startVolume = audio.volume;
    const fadeStep = startVolume / (fadeOutDuration / 50);
    
    const fade = () => {
      if (audio.volume > fadeStep) {
        audio.volume = Math.max(0, audio.volume - fadeStep);
        setTimeout(fade, 50);
      } else {
        audio.volume = 0;
        audio.pause();
        callback?.();
      }
    };
    
    fade();
  }, [fadeOutDuration]);

  // Fonction de fade in
  const fadeIn = useCallback((audio: HTMLAudioElement, targetVolume: number) => {
    audio.volume = 0;
    const fadeStep = targetVolume / (fadeInDuration / 50);
    
    const fade = () => {
      if (audio.volume < targetVolume - fadeStep) {
        audio.volume = Math.min(targetVolume, audio.volume + fadeStep);
        setTimeout(fade, 50);
      } else {
        audio.volume = targetVolume;
      }
    };
    
    audio.play();
    fade();
  }, [fadeInDuration]);

  // Jouer un effet sonore
  const playEffect = useCallback(async (effect: RadioSoundEffect, loop: boolean = false) => {
    if (!enableEffects) return;

    try {
      // Arrêter l'effet précédent s'il y en a un
      if (audioRef.current) {
        fadeOut(audioRef.current, () => {
          cleanup();
        });
        await new Promise(resolve => setTimeout(resolve, fadeOutDuration));
      }

      // Créer le nouvel audio
      const audio = new Audio(effect.url);
      audio.preload = 'auto';
      audio.loop = loop;
      
      // Attendre que l'audio soit prêt
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Audio loading timeout'));
        }, 5000);

        audio.addEventListener('canplaythrough', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });

        audio.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Audio loading failed'));
        }, { once: true });
      });

      audioRef.current = audio;
      setCurrentEffect(effect);
      setIsPlaying(true);

      // Démarrer avec fade in
      fadeIn(audio, volume);

      // Gérer la fin de l'audio (si pas en loop)
      if (!loop) {
        audio.addEventListener('ended', () => {
          cleanup();
        }, { once: true });
      }

    } catch (error) {
      console.error('Erreur lors de la lecture de l\'effet sonore:', error);
      cleanup();
    }
  }, [enableEffects, volume, fadeIn, fadeOut, fadeOutDuration, cleanup]);

  // Arrêter l'effet en cours
  const stopEffect = useCallback(() => {
    if (audioRef.current && isPlaying) {
      fadeOut(audioRef.current, cleanup);
    }
  }, [isPlaying, fadeOut, cleanup]);

  // Effets sonores spécifiques
  const playStatic = useCallback((loop: boolean = false) => {
    const effect = getStaticEffect();
    return playEffect(effect, loop);
  }, [playEffect]);

  const playInterference = useCallback((loop: boolean = false) => {
    const effect = getInterferenceEffect();
    return playEffect(effect, loop);
  }, [playEffect]);

  const playTuning = useCallback(() => {
    const effect = getTuningEffect();
    return playEffect(effect, false);
  }, [playEffect]);

  const playContextualEffect = useCallback((
    context: 'station_change' | 'frequency_drift' | 'signal_loss' | 'startup' | 'shutdown',
    loop: boolean = false
  ) => {
    const effect = createContextualRadioEffect(context);
    return playEffect(effect, loop);
  }, [playEffect]);

  // Effet de démarrage radio
  const playRadioStartup = useCallback(async () => {
    await playContextualEffect('startup');
    // Après le beep de démarrage, jouer un peu de static
    setTimeout(() => {
      playStatic();
      setTimeout(() => {
        stopEffect();
      }, 1500);
    }, 1000);
  }, [playContextualEffect, playStatic, stopEffect]);

  // Simulation de recherche de station
  const playStationScanning = useCallback(async (duration: number = 3000) => {
    const scanEffect = getTuningEffect();
    await playEffect(scanEffect, true);
    
    // Arrêter après la durée spécifiée
    setTimeout(() => {
      stopEffect();
    }, duration);
  }, [playEffect, stopEffect]);

  // Nettoyage à la désactivation du composant
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // État
    isPlaying,
    currentEffect,
    
    // Contrôles généraux
    playEffect,
    stopEffect,
    
    // Effets spécifiques
    playStatic,
    playInterference,
    playTuning,
    playContextualEffect,
    
    // Séquences complexes
    playRadioStartup,
    playStationScanning,
    
    // Utilitaires
    cleanup
  };
}