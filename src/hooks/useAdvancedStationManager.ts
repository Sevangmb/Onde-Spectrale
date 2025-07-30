'use client';

import { useState, useCallback, useRef } from 'react';
import { advancedStationService } from '@/services/AdvancedStationService';
import type { Station, PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';

export interface UseAdvancedStationManagerProps {
  station: Station | null;
  onStationUpdate?: (station: Station) => void;
  onError?: (error: string) => void;
}

export interface AdvancedStationManagerState {
  // Loading states
  isChangingDJ: boolean;
  isReorderingPlaylist: boolean;
  isDeletingTracks: boolean;
  isAddingTracks: boolean;
  
  // Data
  availableDJs: (DJCharacter | CustomDJCharacter)[];
  djsLoading: boolean;
  
  // Error handling
  error: string | null;
  
  // Selection
  selectedTracks: Set<string>;
}

export function useAdvancedStationManager({
  station,
  onStationUpdate,
  onError
}: UseAdvancedStationManagerProps) {
  const [state, setState] = useState<AdvancedStationManagerState>({
    isChangingDJ: false,
    isReorderingPlaylist: false,
    isDeletingTracks: false,
    isAddingTracks: false,
    availableDJs: [],
    djsLoading: false,
    error: null,
    selectedTracks: new Set()
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Helper pour mettre à jour l'état
  const updateState = useCallback((updates: Partial<AdvancedStationManagerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Gestion d'erreur centralisée
  const handleError = useCallback((error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    const fullMessage = `${context}: ${message}`;
    
    console.error(fullMessage, error);
    updateState({ error: fullMessage });
    onError?.(fullMessage);
  }, [updateState, onError]);

  // Nettoyer l'erreur
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // ================================
  // DJ MANAGEMENT
  // ================================

  /**
   * Charge la liste des DJs disponibles
   */
  const loadAvailableDJs = useCallback(async () => {
    if (state.djsLoading) return;

    updateState({ djsLoading: true, error: null });
    
    try {
      const djs = await advancedStationService.getAvailableDJs();
      updateState({ availableDJs: djs, djsLoading: false });
    } catch (error) {
      handleError(error, 'Erreur lors du chargement des DJs');
      updateState({ djsLoading: false });
    }
  }, [state.djsLoading, updateState, handleError]);

  /**
   * Change le DJ de la station
   */
  const changeDJ = useCallback(async (newDJId: string) => {
    if (!station || state.isChangingDJ) return false;

    updateState({ isChangingDJ: true, error: null });
    
    try {
      const updatedStation = await advancedStationService.changeDJ(station.id, newDJId);
      updateState({ isChangingDJ: false });
      onStationUpdate?.(updatedStation);
      return true;
    } catch (error) {
      handleError(error, 'Erreur lors du changement de DJ');
      updateState({ isChangingDJ: false });
      return false;
    }
  }, [station, state.isChangingDJ, updateState, handleError, onStationUpdate]);

  // ================================
  // PLAYLIST MANAGEMENT
  // ================================

  /**
   * Supprime une piste de la playlist
   */
  const removeTrack = useCallback(async (trackId: string) => {
    if (!station || state.isDeletingTracks) return false;

    updateState({ isDeletingTracks: true, error: null });
    
    try {
      const updatedStation = await advancedStationService.removeTrackFromPlaylist(station.id, trackId);
      updateState({ isDeletingTracks: false });
      onStationUpdate?.(updatedStation);
      return true;
    } catch (error) {
      handleError(error, 'Erreur lors de la suppression de la piste');
      updateState({ isDeletingTracks: false });
      return false;
    }
  }, [station, state.isDeletingTracks, updateState, handleError, onStationUpdate]);

  /**
   * Supprime plusieurs pistes sélectionnées
   */
  const removeSelectedTracks = useCallback(async () => {
    if (!station || state.selectedTracks.size === 0 || state.isDeletingTracks) return false;

    updateState({ isDeletingTracks: true, error: null });
    
    try {
      const trackIds = Array.from(state.selectedTracks);
      const updatedStation = await advancedStationService.removeMultipleTracks(station.id, trackIds);
      updateState({ 
        isDeletingTracks: false,
        selectedTracks: new Set() // Clear selection
      });
      onStationUpdate?.(updatedStation);
      return true;
    } catch (error) {
      handleError(error, 'Erreur lors de la suppression des pistes');
      updateState({ isDeletingTracks: false });
      return false;
    }
  }, [station, state.selectedTracks, state.isDeletingTracks, updateState, handleError, onStationUpdate]);

  /**
   * Réorganise la playlist
   */
  const reorderPlaylist = useCallback(async (newOrder: string[]) => {
    if (!station || state.isReorderingPlaylist) return false;

    updateState({ isReorderingPlaylist: true, error: null });
    
    try {
      const updatedStation = await advancedStationService.reorderPlaylist(station.id, newOrder);
      updateState({ isReorderingPlaylist: false });
      onStationUpdate?.(updatedStation);
      return true;
    } catch (error) {
      handleError(error, 'Erreur lors de la réorganisation de la playlist');
      updateState({ isReorderingPlaylist: false });
      return false;
    }
  }, [station, state.isReorderingPlaylist, updateState, handleError, onStationUpdate]);

  /**
   * Déplace une piste d'une position à une autre
   */
  const moveTrack = useCallback(async (fromIndex: number, toIndex: number) => {
    if (!station || state.isReorderingPlaylist) return false;

    updateState({ isReorderingPlaylist: true, error: null });
    
    try {
      const updatedStation = await advancedStationService.moveTrack(station.id, fromIndex, toIndex);
      updateState({ isReorderingPlaylist: false });
      onStationUpdate?.(updatedStation);
      return true;
    } catch (error) {
      handleError(error, 'Erreur lors du déplacement de la piste');
      updateState({ isReorderingPlaylist: false });
      return false;
    }
  }, [station, state.isReorderingPlaylist, updateState, handleError, onStationUpdate]);

  /**
   * Ajoute des pistes à la playlist
   */
  const addTracks = useCallback(async (tracks: Omit<PlaylistItem, 'id'>[]) => {
    if (!station || state.isAddingTracks) return false;

    updateState({ isAddingTracks: true, error: null });
    
    try {
      const updatedStation = await advancedStationService.addTracksToPlaylist(station.id, tracks);
      updateState({ isAddingTracks: false });
      onStationUpdate?.(updatedStation);
      return true;
    } catch (error) {
      handleError(error, 'Erreur lors de l\'ajout des pistes');
      updateState({ isAddingTracks: false });
      return false;
    }
  }, [station, state.isAddingTracks, updateState, handleError, onStationUpdate]);

  // ================================
  // TRACK SELECTION
  // ================================

  /**
   * Sélectionne/désélectionne une piste
   */
  const toggleTrackSelection = useCallback((trackId: string) => {
    const newSelection = new Set(state.selectedTracks);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    updateState({ selectedTracks: newSelection });
  }, [state.selectedTracks, updateState]);

  /**
   * Sélectionne toutes les pistes
   */
  const selectAllTracks = useCallback(() => {
    if (!station) return;
    const allTrackIds = new Set(station.playlist.map(track => track.id));
    updateState({ selectedTracks: allTrackIds });
  }, [station, updateState]);

  /**
   * Désélectionne toutes les pistes
   */
  const clearSelection = useCallback(() => {
    updateState({ selectedTracks: new Set() });
  }, [updateState]);

  // ================================
  // ANALYTICS & UTILITIES
  // ================================

  /**
   * Obtient les statistiques de la playlist
   */
  const getPlaylistStats = useCallback(() => {
    if (!station) return null;
    return advancedStationService.getPlaylistStats(station);
  }, [station]);

  /**
   * Valide la playlist
   */
  const validatePlaylist = useCallback(() => {
    if (!station) return null;
    return advancedStationService.validatePlaylist(station);
  }, [station]);

  /**
   * Recherche dans la playlist
   */
  const searchPlaylist = useCallback((query: string) => {
    if (!station) return [];
    return advancedStationService.searchPlaylist(station, query);
  }, [station]);

  /**
   * Filtre la playlist par type
   */
  const filterPlaylistByType = useCallback((type: 'music' | 'message' | 'all') => {
    if (!station) return [];
    return advancedStationService.filterPlaylistByType(station, type);
  }, [station]);

  /**
   * Trouve les duplicata potentiels
   */
  const findDuplicates = useCallback(() => {
    if (!station) return [];
    return advancedStationService.findDuplicateTracks(station);
  }, [station]);

  // ================================
  // CLEANUP
  // ================================

  /**
   * Nettoie les ressources
   */
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    // State
    ...state,
    
    // DJ Management
    loadAvailableDJs,
    changeDJ,
    
    // Playlist Management
    removeTrack,
    removeSelectedTracks,
    reorderPlaylist,
    moveTrack,
    addTracks,
    
    // Selection
    toggleTrackSelection,
    selectAllTracks,
    clearSelection,
    selectedCount: state.selectedTracks.size,
    isTrackSelected: (trackId: string) => state.selectedTracks.has(trackId),
    
    // Analytics
    getPlaylistStats,
    validatePlaylist,
    searchPlaylist,
    filterPlaylistByType,
    findDuplicates,
    
    // Utilities
    clearError,
    cleanup,
    
    // Computed
    hasSelection: state.selectedTracks.size > 0,
    isLoading: state.isChangingDJ || state.isReorderingPlaylist || state.isDeletingTracks || state.isAddingTracks
  };
}
