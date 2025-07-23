'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseSpeechSynthesisProps {
  voice?: SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechSynthesis({
  voice = null,
  rate = 1,
  pitch = 1,
  volume = 1
}: UseSpeechSynthesisProps = {}) {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };

      loadVoices();
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  const speak = useCallback((text: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!isSupported) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Stop any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      // Configure voice settings
      if (voice) {
        utterance.voice = voice;
      } else if (voices.length > 0) {
        // Try to find a French voice first
        const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
        utterance.voice = frenchVoice || voices[0];
      }

      utterance.rate = rate;
      utterance.pitch = pitch;
      utterance.volume = volume;

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
        resolve();
      };

      utterance.onerror = (event) => {
        setIsPlaying(false);
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        setIsPlaying(false);
        reject(error);
      }
    });
  }, [isSupported, voice, voices, rate, pitch, volume]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.pause();
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.resume();
    }
  }, [isSupported]);

  return {
    isSupported,
    isPlaying,
    voices,
    speak,
    stop,
    pause,
    resume
  };
}