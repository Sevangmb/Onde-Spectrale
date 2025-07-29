'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRadioActions, useRadioState, useDataState } from '@/stores/enhancedRadioStore';
import { stationService } from '@/services/StationService';
import { multiLevelCache } from '@/services/CacheService';
import type { Station } from '@/lib/types';

// Enhanced station sync hook with caching and optimizations
export function useEnhancedStationSync() {
  const loadingPromises = useRef<Map<number, Promise<Station | null>>>(new Map());
  const actions = useRadioActions();

  const notifyStationsUpdated = useCallback(() => {
    // Invalidate station cache when stations are updated
    stationService.invalidateStationCache();
    multiLevelCache.clear();
    console.log('🔄 Station cache invalidated due to updates');
  }, []);

  const preloadNearbyStations = useCallback(async (currentFrequency: number) => {
    try {
      await stationService.preloadNearbyStations(currentFrequency, 2.0);
    } catch (error) {
      console.warn('Failed to preload nearby stations:', error);
    }
  }, []);

  return {
    notifyStationsUpdated,
    preloadNearbyStations,
  };
}

// Enhanced station loading hook with integrated caching
export function useStationForFrequency(frequency: number) {
  const actions = useRadioActions();
  const radioState = useRadioState();
  const dataState = useDataState();
  
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const loadStation = useCallback(async (freq: number) => {
    try {
      // Set loading state immediately
      actions.setCurrentStation(null);
      
      console.log(`🔍 Loading station for ${freq} MHz...`);
      
      // Use service layer for loading with caching
      const station = await stationService.loadStationForFrequency(freq);
      
      if (!isMountedRef.current) return;
      
      if (station) {
        console.log(`📻 Station loaded: ${station.name} at ${freq} MHz`);
        
        // Update store with new station
        actions.setCurrentStation(station);
        
        // Calculate signal strength based on station
        const signalStrength = Math.floor(Math.random() * 20) + 80;
        actions.setSignalStrength(signalStrength);
        
        // Clear any errors
        actions.setError(null);
      } else {
        console.log(`📭 No station found at ${freq} MHz`);
        actions.setCurrentStation(null);
        
        // Lower signal strength for empty frequencies
        const signalStrength = Math.floor(Math.random() * 30) + 10;
        actions.setSignalStrength(signalStrength);
      }
      
    } catch (error) {
      console.error(`❌ Error loading station at ${freq} MHz:`, error);
      
      if (!isMountedRef.current) return;
      
      actions.setCurrentStation(null);
      actions.setError(`Failed to load station: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Set minimal signal strength on error
      actions.setSignalStrength(5);
    }
  }, [actions]);

  const refresh = useCallback(() => {
    console.log(`🔄 Refreshing station at ${frequency} MHz`);
    
    // Invalidate cache for this frequency
    stationService.invalidateStationCache(frequency);
    
    // Reload station
    loadStation(frequency);
  }, [frequency, loadStation]);

  // Load station when frequency changes
  useEffect(() => {
    isMountedRef.current = true;
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Debounce station loading to avoid rapid requests during scanning
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        loadStation(frequency);
      }
    }, radioState.isScanning ? 100 : 0); // Shorter delay during scanning
    
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [frequency, radioState.isScanning, loadStation]);

  // Preload nearby stations for better UX
  useEffect(() => {
    if (dataState.currentStation && !radioState.isScanning) {
      // Preload nearby stations after a delay
      const preloadTimeout = setTimeout(() => {
        stationService.preloadNearbyStations(frequency, 1.5);
      }, 2000);
      
      return () => clearTimeout(preloadTimeout);
    }
  }, [dataState.currentStation?.id, frequency, radioState.isScanning]);

  return {
    station: dataState.currentStation,
    isLoading: dataState.isLoadingStation,
    error: radioState.error,
    refresh,
  };
}