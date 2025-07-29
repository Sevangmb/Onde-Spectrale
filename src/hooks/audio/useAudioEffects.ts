import { useState, useCallback } from 'react';

export const useAudioEffects = () => {
  const [ttsMessage, setTtsMessage] = useState<string | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);

  const enableTTS = useCallback(() => {
    setTtsEnabled(true);
    console.log('🔊 TTS enabled');
  }, []);

  const disableTTS = useCallback(() => {
    setTtsEnabled(false);
    setTtsMessage(null);
    console.log('🔇 TTS disabled');
  }, []);

  const playTTSMessage = useCallback((message: string) => {
    if (ttsEnabled) {
      setTtsMessage(message);
      console.log('📢 TTS message:', message);
    }
  }, [ttsEnabled]);

  const clearTTSMessage = useCallback(() => {
    setTtsMessage(null);
  }, []);

  const stopAllAudio = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis?.speaking) {
      window.speechSynthesis.cancel();
    }
    clearTTSMessage();
  }, [clearTTSMessage]);

  return {
    ttsMessage,
    ttsEnabled,
    enableTTS,
    disableTTS,
    playTTSMessage,
    clearTTSMessage,
    stopAllAudio
  };
};