'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  MessageSquare, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Shuffle, 
  BarChart3,
  Settings,
  Zap,

  Save,
  RefreshCw,
  FileText,
  Plus
} from 'lucide-react';
import { playlistManagerService } from '@/services/PlaylistManagerService';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter } from '@/lib/types';

interface PlaylistManagerProps {
  station: Station;
  dj: DJCharacter | CustomDJCharacter;
  onPlaylistUpdate: (newPlaylist: PlaylistItem[]) => void;
}

export function PlaylistManager({ station, dj, onPlaylistUpdate }: PlaylistManagerProps) {
  const [playlist, setPlaylist] = useState<PlaylistItem[]>(station.playlist || []);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateReplace, setTemplateReplace] = useState(false);
  
  // Import/Export state
  const [importData, setImportData] = useState<string>('');
  const [exportData, setExportData] = useState<any>(null);

  const templates = playlistManagerService.getAvailableTemplates();

  // Load analytics on mount
  useEffect(() => {
    loadAnalytics();
  }, [station.id]);

  const loadAnalytics = async () => {
    try {
      const result = await playlistManagerService.analyzePlaylistPerformance(station.id);
      if (result.success) {
        setAnalytics(result.analytics);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Handle drag and drop
  const handleDragStart = (trackId: string) => {
    setDraggedTrack(trackId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedTrack) return;
    
    const draggedIndex = playlist.findIndex(track => track.id === draggedTrack);
    if (draggedIndex === -1) return;
    
    const newPlaylist = [...playlist];
    const [draggedItem] = newPlaylist.splice(draggedIndex, 1);
    newPlaylist.splice(targetIndex, 0, draggedItem);
    
    await updatePlaylistOrder(newPlaylist);
    setDraggedTrack(null);
  };

  const updatePlaylistOrder = async (newPlaylist: PlaylistItem[]) => {
    setIsLoading(true);
    try {
      const result = await playlistManagerService.reorderPlaylist(station.id, newPlaylist);
      if (result.success) {
        setPlaylist(newPlaylist);
        onPlaylistUpdate(newPlaylist);
        await loadAnalytics(); // Refresh analytics
      } else {
        console.error('Failed to reorder playlist:', result.error);
      }
    } catch (error) {
      console.error('Error reordering playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveTrack = async (trackId: string, direction: 'up' | 'down') => {
    const currentIndex = playlist.findIndex(track => track.id === trackId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= playlist.length) return;
    
    const newPlaylist = [...playlist];
    const [movedTrack] = newPlaylist.splice(currentIndex, 1);
    newPlaylist.splice(newIndex, 0, movedTrack);
    
    await updatePlaylistOrder(newPlaylist);
  };

  const handleSelectTrack = (trackId: string) => {
    const newSelected = new Set(selectedTracks);
    if (newSelected.has(trackId)) {
      newSelected.delete(trackId);
    } else {
      newSelected.add(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedTracks.size === 0) return;
    
    setIsLoading(true);
    try {
      const result = await playlistManagerService.removeMultipleTracks(
        station.id,
        Array.from(selectedTracks)
      );
      
      if (result.success) {
        const newPlaylist = playlist.filter(track => !selectedTracks.has(track.id));
        setPlaylist(newPlaylist);
        onPlaylistUpdate(newPlaylist);
        setSelectedTracks(new Set());
        await loadAnalytics();
      } else {
        console.error('Failed to delete tracks:', result.error);
      }
    } catch (error) {
      console.error('Error deleting tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicateTrack = async (trackId: string) => {
    setIsLoading(true);
    try {
      const result = await playlistManagerService.duplicateTrack(station.id, trackId);
      if (result.success && result.newTrack) {
        const newPlaylist = [...playlist, result.newTrack];
        setPlaylist(newPlaylist);
        onPlaylistUpdate(newPlaylist);
        await loadAnalytics();
      } else {
        console.error('Failed to duplicate track:', result.error);
      }
    } catch (error) {
      console.error('Error duplicating track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    try {
      const result = await playlistManagerService.applyTemplateToStation(
        station.id,
        selectedTemplate,
        dj,
        station.theme,
        templateReplace
      );
      
      if (result.success) {
        // Refresh playlist data
        window.location.reload(); // Simple reload for now
      } else {
        console.error('Failed to apply template:', result.error);
      }
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPlaylist = async () => {
    setIsLoading(true);
    try {
      const result = await playlistManagerService.exportPlaylist(station.id, true);
      if (result.success) {
        setExportData(result.data);
        
        // Auto-download
        const dataStr = JSON.stringify(result.data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `playlist-${station.name}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
      } else {
        console.error('Failed to export playlist:', result.error);
      }
    } catch (error) {
      console.error('Error exporting playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportPlaylist = async () => {
    if (!importData.trim()) return;
    
    setIsLoading(true);
    try {
      const parsedData = JSON.parse(importData);
      const result = await playlistManagerService.importPlaylist(
        station.id,
        parsedData,
        false // Don't replace existing
      );
      
      if (result.success) {
        // Refresh playlist
        window.location.reload();
      } else {
        console.error('Failed to import playlist:', result.error);
      }
    } catch (error) {
      console.error('Error importing playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimizePlaylist = async () => {
    setIsLoading(true);
    try {
      const result = await playlistManagerService.optimizePlaylist(station.id, {
        removeDuplicates: true,
        targetMessageRatio: 0.2, // 20% messages
        maxDuration: 7200 // 2 hours max
      });
      
      if (result.success) {
        console.log('Optimizations applied:', result.optimizations);
        window.location.reload();
      } else {
        console.error('Failed to optimize playlist:', result.error);
      }
    } catch (error) {
      console.error('Error optimizing playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTrackIcon = (type: string) => {
    return type === 'music' ? <Music className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />;
  };

  const getTrackTypeColor = (type: string) => {
    return type === 'music' 
      ? 'bg-blue-900/20 text-blue-300 border-blue-500/30'
      : 'bg-purple-900/20 text-purple-300 border-purple-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orange-300">Gestion de Playlist</h2>
          <p className="text-orange-400/70">
            {playlist.length} pistes • {analytics ? Math.round(analytics.overview?.totalHours || 0) : 0}h de contenu
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleOptimizePlaylist}
            disabled={isLoading}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Zap className="h-4 w-4 mr-2" />
            Optimiser
          </Button>
          
          <Button
            onClick={loadAnalytics}
            disabled={isLoading}
            size="sm"
            variant="outline"
            className="border-orange-500/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      <Tabs defaultValue="playlist" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="playlist">Playlist</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Playlist Management Tab */}
        <TabsContent value="playlist" className="space-y-4">
          {/* Selection Actions */}
          {selectedTracks.size > 0 && (
            <Card className="border-orange-500/30 bg-orange-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-orange-300">
                    {selectedTracks.size} piste{selectedTracks.size > 1 ? 's' : ''} sélectionnée{selectedTracks.size > 1 ? 's' : ''}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleDeleteSelected}
                      disabled={isLoading}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-300 hover:border-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                    <Button
                      onClick={() => setSelectedTracks(new Set())}
                      size="sm"
                      variant="outline"
                      className="border-orange-500/50"
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Playlist Items */}
          <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-orange-400 flex items-center gap-2">
                <Music className="h-5 w-5" />
                Pistes ({playlist.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {playlist.map((track, index) => (
                    <div
                      key={track.id}
                      draggable
                      onDragStart={() => handleDragStart(track.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`p-3 rounded-lg border border-orange-500/20 hover:border-orange-500/40 cursor-move transition-colors ${
                        selectedTracks.has(track.id) ? 'bg-orange-900/20' : 'bg-orange-900/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Selection Checkbox */}
                        <input
                          type="checkbox"
                          checked={selectedTracks.has(track.id)}
                          onChange={() => handleSelectTrack(track.id)}
                          className="w-4 h-4 rounded border-orange-500/50"
                        />

                        {/* Track Index */}
                        <div className="w-8 text-center text-sm text-orange-400/70">
                          {index + 1}
                        </div>

                        {/* Track Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getTrackIcon(track.type)}
                            <span className="font-medium text-orange-200">{track.title}</span>
                            <Badge className={getTrackTypeColor(track.type)} variant="outline">
                              {track.type}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-orange-400/70">
                            {track.artist} • {formatDuration(track.duration)}
                          </div>
                          
                          {track.content && track.content !== track.title && (
                            <div className="text-xs text-orange-400/50 mt-1 truncate">
                              {track.content.substring(0, 100)}...
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => handleMoveTrack(track.id, 'up')}
                            disabled={index === 0 || isLoading}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            onClick={() => handleMoveTrack(track.id, 'down')}
                            disabled={index === playlist.length - 1 || isLoading}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            onClick={() => handleDuplicateTrack(track.id)}
                            disabled={isLoading}
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-orange-400 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Templates de Playlist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-orange-500 bg-orange-900/20'
                        : 'border-orange-500/20 hover:border-orange-500/40'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <h3 className="font-bold text-orange-300 mb-2">{template.name}</h3>
                    <p className="text-sm text-orange-400/70 mb-3">{template.description}</p>
                    
                    <div className="space-y-1 text-xs text-orange-400/60">
                      <div>📊 {template.totalTracks} pistes</div>
                      <div>🎵 {Math.round(template.structure[1].ratio * 100)}% musique</div>
                      <div>💬 {Math.round(template.structure[0].ratio * 100)}% messages</div>
                      <div>⏱️ ~{Math.round(template.avgDuration)}s par piste</div>
                    </div>
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <div className="border-t border-orange-500/20 pt-4">
                  <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 text-orange-300">
                      <input
                        type="checkbox"
                        checked={templateReplace}
                        onChange={(e) => setTemplateReplace(e.target.checked)}
                        className="w-4 h-4"
                      />
                      Remplacer la playlist existante
                    </label>
                  </div>

                  <Button
                    onClick={handleApplyTemplate}
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Appliquer le Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import/Export Tab */}
        <TabsContent value="import-export" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Export */}
            <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Playlist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-orange-400/70">
                  Exporte la playlist actuelle au format JSON avec métadonnées complètes.
                </p>
                
                <Button
                  onClick={handleExportPlaylist}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exporter la Playlist
                </Button>

                {exportData && (
                  <div className="mt-4 p-3 bg-green-900/20 rounded border border-green-500/30">
                    <p className="text-sm text-green-300 mb-2">✅ Export réussi !</p>
                    <p className="text-xs text-green-400/70">
                      {exportData.playlist?.length} pistes exportées
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import */}
            <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-orange-400 flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Import Playlist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-orange-400/70">
                  Importe une playlist depuis un fichier JSON exporté.
                </p>
                
                <Textarea
                  placeholder="Coller les données JSON de la playlist ici..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  rows={8}
                  className="border-orange-500/50 bg-black/20"
                />
                
                <Button
                  onClick={handleImportPlaylist}
                  disabled={isLoading || !importData.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importer la Playlist
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overview */}
              <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-orange-400 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Vue d'ensemble
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-300">Total pistes:</span>
                      <span className="text-orange-200">{analytics.overview.totalTracks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-300">Durée totale:</span>
                      <span className="text-orange-200">{analytics.overview.totalHours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-300">Durée moyenne:</span>
                      <span className="text-orange-200">{formatDuration(analytics.overview.avgTrackDuration)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Composition */}
              <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-orange-400">Composition</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-orange-300">Musique:</span>
                      <span className="text-blue-300">
                        {analytics.composition.tracksByType.music || 0} ({Math.round(analytics.composition.ratios.music * 100)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-orange-300">Messages:</span>
                      <span className="text-purple-300">
                        {analytics.composition.tracksByType.message || 0} ({Math.round(analytics.composition.ratios.message * 100)}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-orange-400">Recommandations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {analytics.insights.recommendedImprovements.map((rec: string, index: number) => (
                      <div key={index} className="text-sm text-orange-300 flex items-start gap-2">
                        <span className="text-orange-400 mt-1">•</span>
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
