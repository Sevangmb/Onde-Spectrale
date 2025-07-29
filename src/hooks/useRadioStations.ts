'use client';

import { useState, useEffect, useCallback } from 'react';
import { radioStationManager, type CreateStationData, type UpdateStationData, type StationFilters } from '@/services/RadioStationManager';
import type { Station, User } from '@/lib/types';

interface UseRadioStationsProps {
  user: User | null;
  autoLoad?: boolean;
}

interface UseRadioStationsReturn {
  // Data
  stations: Station[];
  filteredStations: Station[];
  selectedStations: Set<string>;
  stats: any;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Filters
  searchTerm: string;
  filters: StationFilters;
  
  // Actions
  loadStations: () => Promise<void>;
  createStation: (data: CreateStationData) => Promise<{ success: boolean; stationId?: string; error?: string }>;
  updateStation: (stationId: string, updates: UpdateStationData) => Promise<{ success: boolean; error?: string }>;
  deleteStation: (stationId: string) => Promise<{ success: boolean; error?: string }>;
  duplicateStation: (stationId: string, newFrequency: number, newName?: string) => Promise<{ success: boolean; error?: string }>;
  batchDelete: (stationIds: string[]) => Promise<{ success: boolean; deletedCount: number; errors: any[] }>;
  
  // Selection
  toggleSelection: (stationId: string) => void;
  selectAll: () => void;
  selectNone: () => void;
  
  // Filtering
  setSearchTerm: (term: string) => void;
  setFilters: (filters: StationFilters) => void;
  applyFilters: () => void;
  
  // Utils
  getStationById: (stationId: string) => Station | undefined;
  getUserStations: () => Station[];
  getSystemStations: () => Station[];
  findNextAvailableFrequency: (baseFrequency: number) => number;
  loadStats: () => Promise<void>;
}

/**
 * Hook complet pour la gestion des stations radio
 * Fournit toutes les fonctionnalités CRUD + filtrage + sélection
 */
export function useRadioStations({ user, autoLoad = true }: UseRadioStationsProps): UseRadioStationsReturn {
  // Core state
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<any>(null);
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<StationFilters>({});

  // Auto-load stations when user changes
  useEffect(() => {
    if (autoLoad && user?.id) {
      loadStations();
      loadStats();
    }
  }, [user?.id, autoLoad]);

  // Apply filters when stations or filters change
  useEffect(() => {
    applyFilters();
  }, [stations, searchTerm, filters]);

  // Load stations from database
  const loadStations = useCallback(async () => {
    if (!user?.id) {
      setStations([]);
      setFilteredStations([]);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userStations = await radioStationManager.getUserStations(user.id, true);
      setStations(userStations);
    } catch (err) {
      console.error('Error loading stations:', err);
      setError('Erreur lors du chargement des stations');
      setStations([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load statistics
  const loadStats = useCallback(async () => {
    try {
      const statistics = await radioStationManager.getStationStats();
      setStats(statistics);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

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

    // Frequency range filter
    if (filters.frequency) {
      filtered = filtered.filter(station => 
        station.frequency >= filters.frequency!.min && 
        station.frequency <= filters.frequency!.max
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(station => 
        station.tags && filters.tags!.some(tag => station.tags!.includes(tag))
      );
    }

    setFilteredStations(filtered);
  }, [stations, searchTerm, filters]);

  // Create new station
  const createStation = useCallback(async (data: CreateStationData) => {
    if (!user?.id) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.createStation({
        ...data,
        ownerId: user.id
      });

      if (result.success) {
        // Reload stations to get the new one
        await loadStations();
        await loadStats();
      } else {
        setError(result.error || 'Erreur lors de la création');
      }

      return {
        success: result.success,
        stationId: result.stationId,
        error: result.error
      };

    } catch (err) {
      const errorMsg = 'Erreur lors de la création de la station';
      console.error(errorMsg, err);
      setError(errorMsg);
      
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadStations, loadStats]);

  // Update existing station
  const updateStation = useCallback(async (stationId: string, updates: UpdateStationData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.updateStation(stationId, updates);
      
      if (result.success) {
        await loadStations();
      } else {
        setError(result.error || 'Erreur lors de la mise à jour');
      }

      return {
        success: result.success,
        error: result.error
      };

    } catch (err) {
      const errorMsg = 'Erreur lors de la mise à jour';
      console.error(errorMsg, err);
      setError(errorMsg);
      
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [loadStations]);

  // Delete station
  const deleteStation = useCallback(async (stationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.deleteStation(stationId);
      
      if (result.success) {
        await loadStations();
        await loadStats();
        
        // Remove from selection if it was selected
        setSelectedStations(prev => {
          const newSet = new Set(prev);
          newSet.delete(stationId);
          return newSet;
        });
      } else {
        setError(result.error || 'Erreur lors de la suppression');
      }

      return {
        success: result.success,
        error: result.error
      };

    } catch (err) {
      const errorMsg = 'Erreur lors de la suppression';
      console.error(errorMsg, err);
      setError(errorMsg);
      
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [loadStations, loadStats]);

  // Duplicate station
  const duplicateStation = useCallback(async (stationId: string, newFrequency: number, newName?: string) => {
    if (!user?.id) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.duplicateStation(
        stationId,
        newFrequency,
        newName,
        true // Copy playlist
      );

      if (result.success) {
        await loadStations();
        await loadStats();
      } else {
        setError(result.error || 'Erreur lors de la duplication');
      }

      return {
        success: result.success,
        error: result.error
      };

    } catch (err) {
      const errorMsg = 'Erreur lors de la duplication';
      console.error(errorMsg, err);
      setError(errorMsg);
      
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadStations, loadStats]);

  // Batch delete stations
  const batchDelete = useCallback(async (stationIds: string[]) => {
    if (stationIds.length === 0) {
      return { success: true, deletedCount: 0, errors: [] };
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.deleteMultipleStations(stationIds);
      
      if (result.success) {
        await loadStations();
        await loadStats();
        
        // Clear selection
        setSelectedStations(new Set());
        
        if (result.errors.length > 0) {
          setError(`${result.deletedCount} stations supprimées, ${result.errors.length} erreurs`);
        }
      } else {
        setError('Erreur lors de la suppression en lot');
      }

      return result;

    } catch (err) {
      const errorMsg = 'Erreur lors de la suppression en lot';
      console.error(errorMsg, err);
      setError(errorMsg);
      
      return { success: false, deletedCount: 0, errors: [] };
    } finally {
      setIsLoading(false);
    }
  }, [loadStations, loadStats]);

  // Selection management
  const toggleSelection = useCallback((stationId: string) => {
    setSelectedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationId)) {
        newSet.delete(stationId);
      } else {
        newSet.add(stationId);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    const allIds = filteredStations.map(s => s.id);
    setSelectedStations(new Set(allIds));
  }, [filteredStations]);

  const selectNone = useCallback(() => {
    setSelectedStations(new Set());
  }, []);

  // Utility functions
  const getStationById = useCallback((stationId: string): Station | undefined => {
    return stations.find(s => s.id === stationId);
  }, [stations]);

  const getUserStations = useCallback((): Station[] => {
    return stations.filter(s => s.ownerId === user?.id);
  }, [stations, user?.id]);

  const getSystemStations = useCallback((): Station[] => {
    return stations.filter(s => s.ownerId === 'system');
  }, [stations]);

  const findNextAvailableFrequency = useCallback((baseFrequency: number): number => {
    const step = 0.1;
    let frequency = baseFrequency + step;
    
    while (frequency <= 108.0) {
      const exists = stations.some(s => Math.abs(s.frequency - frequency) < 0.05);
      if (!exists) return Math.round(frequency * 10) / 10;
      frequency += step;
    }
    
    // If no frequency found after base, try before
    frequency = baseFrequency - step;
    while (frequency >= 87.0) {
      const exists = stations.some(s => Math.abs(s.frequency - frequency) < 0.05);
      if (!exists) return Math.round(frequency * 10) / 10;
      frequency -= step;
    }
    
    return Math.round((baseFrequency + step) * 10) / 10; // Fallback
  }, [stations]);

  return {
    // Data
    stations,
    filteredStations,
    selectedStations,
    stats,
    
    // State
    isLoading,
    error,
    
    // Filters
    searchTerm,
    filters,
    
    // Actions
    loadStations,
    createStation,
    updateStation,
    deleteStation,
    duplicateStation,
    batchDelete,
    
    // Selection
    toggleSelection,
    selectAll,
    selectNone,
    
    // Filtering
    setSearchTerm,
    setFilters,
    applyFilters,
    
    // Utils
    getStationById,
    getUserStations,
    getSystemStations,
    findNextAvailableFrequency,
    loadStats
  };
}