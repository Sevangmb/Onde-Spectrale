// src/hooks/useStationSync.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { getStationForFrequency } from '@/app/actions';
import { clientCache, CACHE_KEYS, invalidateStationsCache } from '@/lib/cache';
import type { Station } from '@/lib/types';

export function useStationSync() {
  const [lastSync, setLastSync] = useState(0);
  
  // Invalidation manuelle du cache
  const forceRefresh = useCallback(() => {
    invalidateStationsCache();
    setLastSync(Date.now());
  }, []);
  
  // Écouter les changements de storage pour synchroniser entre onglets
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'stations-updated') {
        forceRefresh();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [forceRefresh]);
  
  // Notification cross-tab quand des stations sont modifiées
  const notifyStationsUpdated = useCallback(() => {
    localStorage.setItem('stations-updated', Date.now().toString());
    forceRefresh();
  }, [forceRefresh]);
  
  return {
    forceRefresh,
    notifyStationsUpdated,
    lastSync
  };
}

export function useStationForFrequency(frequency: number) {
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { lastSync } = useStationSync();
  
  const fetchStation = useCallback(async (freq: number, bypassCache = false) => {
    const cacheKey = CACHE_KEYS.STATION_BY_FREQUENCY(freq);
    
    // Vérifier le cache sauf si bypass demandé
    if (!bypassCache) {
      const cachedStation = clientCache.get<Station | null>(cacheKey);
      if (cachedStation !== null) {
        setStation(cachedStation);
        setError(null);
        return cachedStation;
      }
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await getStationForFrequency(freq);
      
      // Mettre en cache avec TTL plus court pour les stations null
      const ttl = result ? 5 * 60 * 1000 : 30 * 1000; // 5min si station, 30s si null
      clientCache.set(cacheKey, result, ttl);
      
      setStation(result);
      return result;
    } catch (err: any) {
      const errorMsg = `Erreur de recherche station: ${err.message}`;
      setError(errorMsg);
      console.error(errorMsg, err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Re-fetch quand la fréquence change ou lors d'une sync
  useEffect(() => {
    if (frequency >= 87.0 && frequency <= 108.0) {
      fetchStation(frequency);
    }
  }, [frequency, fetchStation, lastSync]);
  
  // Fonction pour forcer le refresh de cette fréquence
  const refresh = useCallback(() => {
    if (frequency >= 87.0 && frequency <= 108.0) {
      fetchStation(frequency, true);
    }
  }, [frequency, fetchStation]);
  
  return {
    station,
    isLoading,
    error,
    refresh
  };
}