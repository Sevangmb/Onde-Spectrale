import { useState, useCallback, useRef, useEffect } from 'react';

export const useAutoPlay = () => {
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearAutoPlayTimeout = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
      autoPlayTimeoutRef.current = null;
    }
  }, []);

  const enableAutoPlay = useCallback(() => {
    setAutoPlayEnabled(true);
    setUserHasInteracted(true);
    console.log('✅ AutoPlay enabled');
  }, []);

  const disableAutoPlay = useCallback(() => {
    setAutoPlayEnabled(false);
    clearAutoPlayTimeout();
    console.log('❌ AutoPlay disabled');
  }, [clearAutoPlayTimeout]);

  const scheduleAutoPlay = useCallback((action: () => void, delay = 100) => {
    if (!autoPlayEnabled) return;
    
    clearAutoPlayTimeout();
    autoPlayTimeoutRef.current = setTimeout(action, delay);
  }, [autoPlayEnabled, clearAutoPlayTimeout]);

  // Clean up on unmount
  useEffect(() => {
    return () => clearAutoPlayTimeout();
  }, [clearAutoPlayTimeout]);

  return {
    autoPlayEnabled,
    userHasInteracted,
    enableAutoPlay,
    disableAutoPlay,
    scheduleAutoPlay,
    clearAutoPlayTimeout
  };
};