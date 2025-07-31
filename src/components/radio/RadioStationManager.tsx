'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Radio, 
  Plus, 
  Edit2, 
  Trash2, 
  Copy, 
  Search, 
  Filter,
  Settings,
  BarChart3,
  Users,
  Clock,
  Music,
  MessageSquare,
  Zap,
  Play,
  Pause,
  MoreHorizontal,
  RefreshCw,
  Download,
  Upload,
  Tag,
  Star,
  TrendingUp,
  Wrench
} from 'lucide-react';
import { radioStationManager, type CreateStationData, type UpdateStationData, type StationFilters } from '@/services/RadioStationManager';
import type { Station, DJCharacter, CustomDJCharacter, User } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface RadioStationManagerProps {
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
}

interface EditingStation {
  station: Station | null;
  isNew: boolean;
}

export function RadioStationManager({ user, allDjs }: RadioStationManagerProps) {
  const router = useRouter();
  
  // State management
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<StationFilters>({});
  const [editingStation, setEditingStation] = useState<EditingStation>({ station: null, isNew: false });
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  
  // Form data for creating/editing stations
  const [formData, setFormData] = useState<CreateStationData>({
    name: '',
    frequency: 87.0,
    djCharacterId: '',
    theme: '',
    ownerId: user?.id || '',
    isActive: true,
    tags: [],
    description: ''
  });

  // Load stations on mount
  useEffect(() => {
    loadStations();
    loadStats();
  }, [user?.id]);

  // Apply filters and search
  useEffect(() => {
    applyFiltersAndSearch();
  }, [stations, searchTerm, filters]);

  // Load stations from database
  const loadStations = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const userStations = await radioStationManager.getUserStations(user.id, true);
      setStations(userStations);
    } catch (error) {
      console.error('Error loading stations:', error);
      setError('Erreur lors du chargement des stations');
    } finally {
      setIsLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const statistics = await radioStationManager.getStationStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Apply filters and search
  const applyFiltersAndSearch = () => {
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
  };

  // Create new station
  const handleCreateStation = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.createStation({
        ...formData,
        ownerId: user.id
      });

      if (result.success) {
        await loadStations();
        setShowCreateDialog(false);
        resetForm();
      } else {
        setError(result.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('Error creating station:', error);
      setError('Erreur lors de la création de la station');
    } finally {
      setIsLoading(false);
    }
  };

  // Update existing station
  const handleUpdateStation = async (stationId: string, updates: UpdateStationData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.updateStation(stationId, updates);
      
      if (result.success) {
        await loadStations();
        setEditingStation({ station: null, isNew: false });
      } else {
        setError(result.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error updating station:', error);
      setError('Erreur lors de la mise à jour');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete station
  const handleDeleteStation = async (stationId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await radioStationManager.deleteStation(stationId);
      
      if (result.success) {
        await loadStations();
        setSelectedStations(prev => {
          const newSet = new Set(prev);
          newSet.delete(stationId);
          return newSet;
        });
      } else {
        setError(result.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting station:', error);
      setError('Erreur lors de la suppression');
    } finally {
      setIsLoading(false);
    }
  };

  // Duplicate station
  const handleDuplicateStation = async (station: Station) => {
    if (!user?.id) return;

    const newFrequency = findNextAvailableFrequency(station.frequency);
    
    setIsLoading(true);
    try {
      const result = await radioStationManager.duplicateStation(
        station.id,
        newFrequency,
        `${station.name} (Copie)`,
        true
      );

      if (result.success) {
        await loadStations();
      } else {
        setError(result.error || 'Erreur lors de la duplication');
      }
    } catch (error) {
      console.error('Error duplicating station:', error);
      setError('Erreur lors de la duplication');
    } finally {
      setIsLoading(false);
    }
  };

  // Batch delete selected stations
  const handleBatchDelete = async () => {
    if (selectedStations.size === 0) return;

    setIsLoading(true);
    try {
      const result = await radioStationManager.deleteMultipleStations(Array.from(selectedStations));
      
      if (result.success) {
        await loadStations();
        setSelectedStations(new Set());
        
        if (result.errors.length > 0) {
          setError(`${result.deletedCount} stations supprimées, ${result.errors.length} erreurs`);
        }
      } else {
        setError('Erreur lors de la suppression en lot');
      }
    } catch (error) {
      console.error('Error batch deleting:', error);
      setError('Erreur lors de la suppression en lot');
    } finally {
      setIsLoading(false);
    }
  };

  // Find next available frequency
  const findNextAvailableFrequency = (baseFrequency: number): number => {
    const step = 0.1;
    let frequency = baseFrequency + step;
    
    while (frequency <= 108.0) {
      const exists = stations.some(s => Math.abs(s.frequency - frequency) < 0.05);
      if (!exists) return Math.round(frequency * 10) / 10;
      frequency += step;
    }
    
    return Math.round((baseFrequency - step) * 10) / 10;
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      frequency: 87.0,
      djCharacterId: '',
      theme: '',
      ownerId: user?.id || '',
      isActive: true,
      tags: [],
      description: ''
    });
  };

  // Toggle station selection
  const toggleStationSelection = (stationId: string) => {
    setSelectedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationId)) {
        newSet.delete(stationId);
      } else {
        newSet.add(stationId);
      }
      return newSet;
    });
  };

  // Get DJ name by ID
  const getDjName = (djId: string): string => {
    const dj = allDjs.find(d => d.id === djId);
    return dj?.name || 'DJ Inconnu';
  };

  // Computed values
    const userOwnedStations = useMemo(() =>
    (filteredStations || []).filter(s => s.ownerId === user?.id),
    [filteredStations, user?.id]
  );

  const systemStations = useMemo(() =>
    (filteredStations || []).filter(s => s.ownerId === 'system'),
    [filteredStations]
  );

  // Render station card
  const renderStationCard = (station: Station, isUserOwned: boolean) => {
    const isSelected = selectedStations.has(station.id);
    const playlistStats = {
      total: station.playlist.length,
      music: station.playlist.filter(t => t.type === 'music').length,
      messages: station.playlist.filter(t => t.type === 'message').length,
      duration: Math.round(station.playlist.reduce((sum, t) => sum + t.duration, 0) / 60)
    };

    return (
      <Card 
        key={station.id} 
        className={`relative transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleStationSelection(station.id)}
                  className="rounded"
                />
                <CardTitle className="text-base truncate">{station.name}</CardTitle>
                {!station.isActive && (
                  <Badge variant="secondary" className="text-xs">Inactive</Badge>
                )}
                {station.ownerId === 'system' && (
                  <Badge variant="outline" className="text-xs">Système</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Radio className="h-3 w-3" />
                <span className="font-mono">{station.frequency} MHz</span>
                <span>•</span>
                <span>{getDjName(station.djCharacterId)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isUserOwned && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingStation({ station, isNew: false })}
                    title="Édition rapide"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => router.push(`/admin/stations/${station.id}/advanced`)}
                    title="Éditeur avancé - Changement DJ, réorganisation playlist, gestion complète"
                  >
                    <Wrench className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDuplicateStation(station)}
                    title="Dupliquer cette station"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supprimer la station</AlertDialogTitle>
                        <AlertDialogDescription>
                          Êtes-vous sûr de vouloir supprimer "{station.name}" ? Cette action est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteStation(station.id)}>
                          Supprimer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {station.theme || station.description}
          </p>

          {/* Playlist stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Music className="h-3 w-3" />
              <span>{playlistStats.total} pistes</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{playlistStats.duration} min</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              <span>{playlistStats.messages} msg</span>
            </div>
          </div>

          {/* Tags */}
          {station.tags && station.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {station.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {station.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{station.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Gestion des Stations Radio
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadStats}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistiques
              </Button>
              
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouvelle Station
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Créer une nouvelle station</DialogTitle>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nom de la station</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Radio FM..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="frequency">Fréquence (MHz)</Label>
                      <Input
                        id="frequency"
                        type="number"
                        min="87.0"
                        max="108.0"
                        step="0.1"
                        value={formData.frequency}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequency: parseFloat(e.target.value) }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="dj">DJ</Label>
                      <Select
                        value={formData.djCharacterId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, djCharacterId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir un DJ" />
                        </SelectTrigger>
                        <SelectContent>
                          {allDjs.map(dj => (
                            <SelectItem key={dj.id} value={dj.id}>
                              {dj.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="active">Statut</Label>
                      <div className="flex items-center space-x-2 h-10">
                        <Switch
                          id="active"
                          checked={formData.isActive}
                          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                        />
                        <Label htmlFor="active" className="text-sm">
                          {formData.isActive ? 'Active' : 'Inactive'}
                        </Label>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="theme">Thème</Label>
                      <Input
                        id="theme"
                        value={formData.theme}
                        onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                        placeholder="Musique des années 80, actualités, etc."
                      />
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="description">Description (optionnel)</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Description détaillée de la station..."
                        rows={3}
                      />
                    </div>
                  </div>
                  
                  {error && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {error}
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false);
                        resetForm();
                        setError(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleCreateStation}
                      disabled={!formData.name || !formData.djCharacterId || !formData.theme || isLoading}
                    >
                      {isLoading ? 'Création...' : 'Créer la Station'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, thème, description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select
                value={filters.ownerId || 'all'}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  ownerId: value === 'all' ? undefined : value 
                }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value={user?.id || ''}>Mes stations</SelectItem>
                  <SelectItem value="system">Système</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={filters.isActive === undefined ? 'all' : filters.isActive.toString()}
                onValueChange={(value) => setFilters(prev => ({ 
                  ...prev, 
                  isActive: value === 'all' ? undefined : value === 'true' 
                }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="true">Actives</SelectItem>
                  <SelectItem value="false">Inactives</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={loadStations}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {/* Batch actions */}
          {selectedStations.size > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">
                {selectedStations.size} station(s) sélectionnée(s)
              </span>
              
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedStations(new Set())}
                >
                  Désélectionner
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Supprimer ({selectedStations.size})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer les stations sélectionnées</AlertDialogTitle>
                      <AlertDialogDescription>
                        Êtes-vous sûr de vouloir supprimer {selectedStations.size} station(s) ? Cette action est irréversible.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBatchDelete}>
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stations Display */}
      <Tabs defaultValue="user" className="space-y-4">
        <TabsList>
          <TabsTrigger value="user">
            Mes Stations ({userOwnedStations.length})
          </TabsTrigger>
          <TabsTrigger value="system">
            Stations Système ({systemStations.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            Toutes ({filteredStations.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="user" className="space-y-4">
          {userOwnedStations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Aucune station personnelle</h3>
                <p className="text-muted-foreground mb-4">Créez votre première station radio personnalisée</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une station
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userOwnedStations && userOwnedStations.map(station => renderStationCard(station, true))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {systemStations && systemStations.map(station => renderStationCard(station, false))}
          </div>
        </TabsContent>
        
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStations && filteredStations.map(station => renderStationCard(station, station.ownerId === user?.id))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Statistics Dialog */}
      {stats && (
        <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Statistiques des Stations</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalStations}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.activeStations}</div>
                <div className="text-sm text-muted-foreground">Actives</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.userStations}</div>
                <div className="text-sm text-muted-foreground">Utilisateurs</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Math.round(stats.averagePlaylistLength)}</div>
                <div className="text-sm text-muted-foreground">Pistes/playlist</div>
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">DJs les plus utilisés</h4>
              <div className="space-y-2">
                {stats.mostUsedDJs && stats.mostUsedDJs.slice(0, 5).map((dj: any, index: number) => (
                  <div key={dj.djId} className="flex items-center justify-between text-sm">
                    <span>{getDjName(dj.djId)}</span>
                    <Badge variant="secondary">{dj.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Global loading state */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Chargement...</span>
          </div>
        </div>
      )}
    </div>
  );
}