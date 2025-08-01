'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { radioStationManager } from '@/services/RadioStationManager';
import { playlistManagerService } from '@/services/PlaylistManagerService';
import type { Station, User, PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';

interface UseUnifiedStationManagerProps {
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
  autoLoad?: boolean;
}

interface StationWithPlaylistControls extends Station {
  // Add playlist control methods to station objects
  playlistControls: {
    addTrack: (track: PlaylistItem) => Promise<boolean>;
    removeTrack: (trackId: string) => Promise<boolean>;
    reorderTracks: (trackIds: string[]) => Promise<boolean>;
    generatePlaylist: (theme?: string) => Promise<boolean>;
    optimizePlaylist: () => Promise<boolean>;
  };
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
  const [stations, setStations] = useState<StationWithPlaylistControls[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationWithPlaylistControls | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<any>({});
  const [filteredStations, setFilteredStations] = useState<StationWithPlaylistControls[]>([]);

  // Create playlist controls for a station
  const createPlaylistControls = useCallback((stationId: string) => ({
    addTrack: async (track: PlaylistItem): Promise<boolean> => {
      try {
        const station = stations.find(s => s.id === stationId);
        if (!station) return false;

        const updatedPlaylist = [...station.playlist, track];
        const result = await radioStationManager.updateStationPlaylist(stationId, updatedPlaylist);
        
        if (result.success) {
          await loadStations(); // Refresh data
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    removeTrack: async (trackId: string): Promise<boolean> => {
      try {
        const station = stations.find(s => s.id === stationId);
        if (!station) return false;

        const updatedPlaylist = station.playlist.filter(t => t.id !== trackId);
        const result = await radioStationManager.updateStationPlaylist(stationId, updatedPlaylist);
        
        if (result.success) {
          await loadStations(); // Refresh data
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    reorderTracks: async (trackIds: string[]): Promise<boolean> => {
      try {
        const station = stations.find(s => s.id === stationId);
        if (!station) return false;

        // Reorder playlist based on trackIds order
        const reorderedPlaylist = trackIds
          .map(id => station.playlist.find(t => t.id === id))
          .filter(Boolean) as PlaylistItem[];

        const result = await radioStationManager.updateStationPlaylist(stationId, reorderedPlaylist);
        
        if (result.success) {
          await loadStations(); // Refresh data
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    generatePlaylist: async (theme?: string): Promise<boolean> => {
      try {
        const station = stations.find(s => s.id === stationId);
        if (!station) return false;

        const djCharacter = allDjs.find(dj => dj.id === station.djCharacterId);
        if (!djCharacter) return false;

        const result = await playlistManagerService.generatePlaylistForStation(
          stationId,
          djCharacter,
          theme || station.theme
        );
        
        if (result.success) {
          await loadStations(); // Refresh data
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },

    optimizePlaylist: async (): Promise<boolean> => {
      try {
        const result = await playlistManagerService.optimizePlaylist(stationId);
        
        if (result.success) {
          await loadStations(); // Refresh data
          return true;
        }
        return false;
      } catch {
        return false;
      }
    }
  }), [stations, allDjs, loadStations]);

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
      
      // Enhance each station with playlist controls
      const enhancedStations: StationWithPlaylistControls[] = rawStations.map(station => ({
        ...station,
        playlistControls: createPlaylistControls(station.id)
      }));

      setStations(enhancedStations);
    } catch (err) {
      console.error('Error loading stations:', err);
      setError('Erreur lors du chargement des stations');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, createPlaylistControls]);

  // Apply filters and search
  const applyFilters = useCallback(() => {
    let filtered = [...stations];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.theme.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply other filters
    if (filters.genre) {
      filtered = filtered.filter(station => station.genre === filters.genre);
    }

    if (filters.djCharacter) {
      filtered = filtered.filter(station => station.djCharacterId === filters.djCharacter);
    }

    setFilteredStations(filtered);
  }, [stations, searchTerm, filters]);

  // Station CRUD operations
  const createStation = useCallback(async (data: any) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    setIsLoading(true);
    try {
      const result = await radioStationManager.createStation({
        ...data,
        ownerId: user.id
      });

      if (result.success) {
        await loadStations();
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Station creation failed' };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadStations]);

  const updateStation = useCallback(async (stationId: string, updates: any) => {
    setIsLoading(true);
    try {
      const result = await radioStationManager.updateStation(stationId, updates);
      if (result.success) {
        await loadStations();
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Station update failed' };
    } finally {
      setIsLoading(false);
    }
  }, [loadStations]);

  const deleteStation = useCallback(async (stationId: string) => {
    setIsLoading(true);
    try {
      const result = await radioStationManager.deleteStation(stationId);
      if (result.success) {
        await loadStations();
        // Clear selection if deleted station was selected
        if (selectedStation?.id === stationId) {
          setSelectedStation(null);
        }
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Station deletion failed' };
    } finally {
      setIsLoading(false);
    }
  }, [loadStations, selectedStation]);

  const duplicateStation = useCallback(async (stationId: string, newFrequency: number, newName?: string) => {
    setIsLoading(true);
    try {
      const result = await radioStationManager.duplicateStation(stationId, newFrequency, newName, true);
      if (result.success) {
        await loadStations();
      }
      return result;
    } catch (error) {
      return { success: false, error: 'Station duplication failed' };
    } finally {
      setIsLoading(false);
    }
  }, [loadStations]);

  // Statistics and analytics
  const stats = useMemo(() => {
    if (!stations.length) return null;

    const activeStations = stations.filter(s => s.isActive !== false).length;
    const totalTracks = stations.reduce((sum, s) => sum + (s.playlist?.length || 0), 0);
    const totalDuration = stations.reduce((sum, s) => 
      sum + (s.playlist?.reduce((trackSum, track) => trackSum + (track.duration || 0), 0) || 0), 0
    );

    // Calculate most used DJs
    const djUsage = stations.reduce((acc, station) => {
      const djId = station.djCharacterId;
      acc[djId] = (acc[djId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedDJs = Object.entries(djUsage)
      .map(([djId, count]) => ({ djId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalStations: stations.length,
      activeStations,
      totalTracks,
      totalDuration: Math.round(totalDuration / 60),
      avgPlaylistLength: Math.round(totalTracks / stations.length),
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

  // Auto-load stations
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadStations();
    }
  }, [user?.id, autoLoad, loadStations]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [stations, searchTerm, filters, applyFilters]);

  return {
    // Data
    stations: filteredStations,
    allStations: stations,
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
    createStation,
    updateStation,
    deleteStation,
    duplicateStation,
    
    // Selection
    selectedStation,
    setSelectedStation,
    
    // Utilities
    getStationById,
    getDjName,
    
    // Actions
    clearError: () => setError(null),
    refresh: loadStations
  };
}