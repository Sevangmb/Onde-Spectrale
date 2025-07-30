'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { radioStationManager } from '@/services/RadioStationManager';
import { playlistManagerService } from '@/services/PlaylistManagerService';
import type { Station, User, PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface UseUnifiedStationManagerProps {
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
  autoLoad?: boolean;
}

/**
 * Unified hook that combines radio station management with enhanced playlist controls
 * Provides a complete radio station + playlist management solution
 */
export function useUnifiedStationManager({ 
  user, 
  allDjs, 
  autoLoad = true 
}: UseUnifiedStationManagerProps) {
  // Core state
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);

  // Auto-load stations
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadStations();
    }
  }, [user?.id, autoLoad]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [stations, searchTerm, filters]);

  // Enhanced station loader with playlist controls
  const loadStations = useCallback(async () => {
    if (!user?.id) {
      setStations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rawStations = await radioStationManager.getUserStations(user.id, true);
      setStations(rawStations);
    } catch (err) {
      const errorMessage = 'Erreur lors du chargement des stations';
      console.error(errorMessage, err);
      setError(errorMessage);
      toast({ variant: 'destructive', title: 'Erreur', description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  // Apply filters and search
  const applyFilters = useCallback(() => {
    let filtered = [...stations];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(station => 
        station.name.toLowerCase().includes(searchLower) ||
        station.theme?.toLowerCase().includes(searchLower) ||
        station.description?.toLowerCase().includes(searchLower)
      );
    }

    // Owner filter
    if (filters.ownerId) {
      filtered = filtered.filter(station => station.ownerId === filters.ownerId);
    }

    // Active filter
    if (filters.isActive !== undefined) {
      filtered = filtered.filter(station => station.isActive === filters.isActive);
    }

    setFilteredStations(filtered);
  }, [stations, searchTerm, filters]);

  // Statistics and analytics
  const stats = useMemo(() => {
    if (!stations.length) return null;

    const activeStations = stations.filter(s => s.isActive !== false).length;
    const totalTracks = stations.reduce((sum, s) => sum + (s.playlist?.length || 0), 0);
    const totalDuration = stations.reduce((sum, s) => 
      sum + (s.playlist?.reduce((trackSum, track) => trackSum + (track.duration || 0), 0) || 0), 0
    );
     const djCounts: Record<string, number> = {};
      stations.forEach(station => {
        djCounts[station.djCharacterId] = (djCounts[station.djCharacterId] || 0) + 1;
      });

    const mostUsedDJs = Object.entries(djCounts)
        .map(([djId, count]) => ({ djId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);


    return {
      totalStations: stations.length,
      activeStations,
      totalTracks,
      totalDuration: Math.round(totalDuration / 60),
      avgPlaylistLength: stations.length > 0 ? Math.round(totalTracks / stations.length) : 0,
      mostUsedDJs
    };
  }, [stations]);

  // Utility functions
  const getStationById = useCallback((stationId: string) => {
    return stations.find(s => s.id === stationId);
  }, [stations]);

  const getDjName = useCallback((djId: string) => {
    const dj = allDjs.find(d => d.id === djId);
    return dj?.name || 'DJ Inconnu';
  }, [allDjs]);
  
   const selectStation = useCallback((station: Station | null) => {
    const fullStation = station ? stations.find(s => s.id === station.id) || station : null;
    setSelectedStation(fullStation);
  }, [stations]);


  return {
    // Data
    stations: filteredStations,
    allStations: stations,
    selectedStation,
    stats,
    
    // State
    isLoading,
    error,
    
    // Search and filters
    searchTerm,
    setSearchTerm,
    filters,
    setFilters,
    
    // Station operations
    loadStations,
    
    // Selection
    setSelectedStation: selectStation,
    
    // Utilities
    getStationById,
    getDjName,
    
    // Actions
    clearError: () => setError(null),
    refresh: loadStations
  };
}
