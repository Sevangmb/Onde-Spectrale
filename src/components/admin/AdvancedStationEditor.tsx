'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdvancedStationManager } from '@/hooks/useAdvancedStationManager';
import { SortablePlaylist } from './SortablePlaylist';
import type { Station, PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  User,
  Music,
  Trash2,
  GripVertical,
  Search,
  Filter,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Plus,
  Move,
  Copy,
  X,
  Save,
  PlayCircle,
  MessageSquare
} from 'lucide-react';

interface AdvancedStationEditorProps {
  station: Station;
  onStationUpdate: (station: Station) => void;
  onClose?: () => void;
}


export function AdvancedStationEditor({ 
  station, 
  onStationUpdate, 
  onClose 
}: AdvancedStationEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'music' | 'message'>('all');
  const [activeTab, setActiveTab] = useState('playlist');

  const stationManager = useAdvancedStationManager({
    station,
    onStationUpdate,
    onError: (error) => console.error('Station Manager Error:', error)
  });

  // Charger les DJs disponibles au montage
  useEffect(() => {
    stationManager.loadAvailableDJs();
  }, []);

  // Filtrer et rechercher dans la playlist
  const filteredPlaylist = stationManager.searchPlaylist(searchQuery)
    .filter(track => filterType === 'all' || track.type === filterType);

  // Statistiques de la playlist
  const playlistStats = stationManager.getPlaylistStats();
  const playlistValidation = stationManager.validatePlaylist();


  // ================================
  // EVENT HANDLERS
  // ================================

  const handleDJChange = async (newDJId: string) => {
    await stationManager.changeDJ(newDJId);
  };

  const handleTrackRemove = async (trackId: string) => {
    await stationManager.removeTrack(trackId);
  };

  const handleBulkDelete = async () => {
    if (stationManager.hasSelection) {
      await stationManager.removeSelectedTracks();
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  // ================================
  // RENDER COMPONENTS
  // ================================

  const renderDJSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personnage DJ
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Select 
            value={station.djCharacterId} 
            onValueChange={handleDJChange}
            disabled={stationManager.isChangingDJ}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un DJ" />
            </SelectTrigger>
            <SelectContent>
              {stationManager.availableDJs.map((dj) => (
                <SelectItem key={dj.id} value={dj.id}>
                  <div className="flex items-center gap-2">
                    <span>{dj.name}</span>
                    {'isCustom' in dj && dj.isCustom && (
                      <Badge variant="secondary" className="text-xs">Personnalisé</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {stationManager.isChangingDJ && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Changement de DJ en cours...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderPlaylistStats = () => {
    if (!playlistStats) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Statistiques de la Playlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{playlistStats.totalTracks}</div>
              <div className="text-sm text-muted-foreground">Pistes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{formatTime(playlistStats.totalDuration)}</div>
              <div className="text-sm text-muted-foreground">Durée</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{playlistStats.typeDistribution.music}</div>
              <div className="text-sm text-muted-foreground">Musiques</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{playlistStats.typeDistribution.message}</div>
              <div className="text-sm text-muted-foreground">Messages</div>
            </div>
          </div>
          
          {Object.keys(playlistStats.genreDistribution).length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Genres populaires</h4>
              <div className="flex flex-wrap gap-1">
                {Object.entries(playlistStats.genreDistribution)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([genre, count]) => (
                    <Badge key={genre} variant="outline" className="text-xs">
                      {genre} ({count})
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPlaylistValidation = () => {
    if (!playlistValidation) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {playlistValidation.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            )}
            Validation de la Playlist
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {playlistValidation.issues.map((issue, index) => (
            <Alert key={index} className={
              issue.type === 'error' ? 'border-red-200 bg-red-50' :
              issue.type === 'warning' ? 'border-yellow-200 bg-yellow-50' :
              'border-blue-200 bg-blue-50'
            }>
              <div className="flex items-center gap-2">
                {issue.type === 'error' && <X className="h-4 w-4 text-red-500" />}
                {issue.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                {issue.type === 'info' && <Info className="h-4 w-4 text-blue-500" />}
                <AlertDescription>{issue.message}</AlertDescription>
              </div>
            </Alert>
          ))}
          
          {playlistValidation.recommendations.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">Recommandations</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {playlistValidation.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPlaylistManager = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Gestion de la Playlist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Contrôles de recherche et filtrage */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans la playlist..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout afficher</SelectItem>
                <SelectItem value="music">Musiques</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions en lot */}
          {stationManager.hasSelection && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {stationManager.selectedCount} piste(s) sélectionnée(s)
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={stationManager.isDeletingTracks}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Supprimer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stationManager.clearSelection}
              >
                <X className="h-4 w-4 mr-1" />
                Annuler
              </Button>
            </div>
          )}

          {/* Liste des pistes avec drag & drop */}
          <SortablePlaylist
            playlist={filteredPlaylist}
            selectedTrackIds={stationManager.selectedTracks}
            onReorder={stationManager.reorderPlaylist}
            onTrackSelect={stationManager.toggleTrackSelection}
            onTrackRemove={handleTrackRemove}
            isReordering={stationManager.isReorderingPlaylist}
            isDeletingTracks={stationManager.isDeletingTracks}
          />
          
          {filteredPlaylist.length === 0 && searchQuery && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucune piste trouvée avec ces critères</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-2"
              >
                Effacer la recherche
              </Button>
            </div>
          )}

          {/* Actions de sélection */}
          <div className="flex justify-between items-center pt-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={stationManager.selectAllTracks}
              >
                Tout sélectionner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={stationManager.clearSelection}
                disabled={!stationManager.hasSelection}
              >
                Tout désélectionner
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredPlaylist.length} / {station.playlist.length} pistes affichées
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // ================================
  // MAIN RENDER
  // ================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gestion Avancée - {station.name}</h2>
          <p className="text-muted-foreground">{station.frequency} MHz</p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Fermer
          </Button>
        )}
      </div>

      {/* Error Display */}
      {stationManager.error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>{stationManager.error}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            onClick={stationManager.clearError}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="playlist">Playlist</TabsTrigger>
          <TabsTrigger value="dj">DJ</TabsTrigger>
          <TabsTrigger value="stats">Statistiques</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="playlist" className="space-y-4">
          {renderPlaylistManager()}
        </TabsContent>

        <TabsContent value="dj" className="space-y-4">
          {renderDJSelector()}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {renderPlaylistStats()}
        </TabsContent>

        <TabsContent value="validation" className="space-y-4">
          {renderPlaylistValidation()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
