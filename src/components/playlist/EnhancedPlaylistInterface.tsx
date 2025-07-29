'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Template,
  Save,
  RefreshCw,
  FileText,
  Plus,
  Clock,
  Target,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { useUnifiedPlaylistManager } from '@/hooks/useUnifiedPlaylistManager';
import type { PlaylistItem, Station, DJCharacter, CustomDJCharacter, User } from '@/lib/types';

interface EnhancedPlaylistInterfaceProps {
  station: Station;
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
  onUpdate?: (updatedStation: Station) => void;
}

export function EnhancedPlaylistInterface({ 
  station, 
  user, 
  allDjs, 
  onUpdate 
}: EnhancedPlaylistInterfaceProps) {
  const playlist = useUnifiedPlaylistManager({ station, user, allDjs });
  
  // Local state
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [draggedTrack, setDraggedTrack] = useState<string | null>(null);
  
  // Smart playlist options
  const [smartOptions, setSmartOptions] = useState({
    targetDuration: 60, // minutes
    messageRatio: 0.25,
    djStyle: 'professional' as const,
    timeOfDay: 'afternoon' as const,
    autoOptimize: true
  });
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const availableTemplates = playlist.getAvailableTemplates();
  
  // Load analytics and recommendations on mount
  useEffect(() => {
    loadAnalytics();
    loadRecommendations();
  }, [station.id]);
  
  const loadAnalytics = async () => {
    const result = await playlist.analyzePlaylist();
    if (result.success && result.analytics) {
      setAnalytics(result.analytics);
    }
  };
  
  const loadRecommendations = async () => {
    const result = await playlist.getRecommendations();
    if (result.success && result.recommendations) {
      setRecommendations(result.recommendations);
    }
  };
  
  // Computed playlist statistics
  const playlistStats = useMemo(() => {
    if (!station.playlist) return null;
    
    const total = station.playlist.length;
    const totalDuration = station.playlist.reduce((sum, track) => sum + track.duration, 0);
    const music = station.playlist.filter(t => t.type === 'music').length;
    const messages = station.playlist.filter(t => t.type === 'message').length;
    
    return {
      total,
      totalDuration: Math.round(totalDuration / 60), // minutes
      music,
      messages,
      musicRatio: music / total,
      messageRatio: messages / total
    };
  }, [station.playlist]);
  
  // Handle smart playlist generation
  const handleGenerateSmartPlaylist = async () => {
    setIsLoading(true);
    try {
      const result = await playlist.generateSmartPlaylist({
        targetDuration: smartOptions.targetDuration * 60, // convert to seconds
        messageRatio: smartOptions.messageRatio,
        djStyle: smartOptions.djStyle,
        timeOfDay: smartOptions.timeOfDay,
        theme: station.theme
      });
      
      if (result.success && result.playlist) {
        // Apply to station if successful
        await playlist.reorderPlaylist(result.playlist, smartOptions.autoOptimize);
        onUpdate?.({ ...station, playlist: result.playlist });
        
        // Show insights
        if (result.insights) {
          console.log('Smart playlist insights:', result.insights);
        }
        
        // Reload analytics
        await loadAnalytics();
        await loadRecommendations();
      }
    } catch (error) {
      console.error('Error generating smart playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle template application
  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    try {
      const result = await playlist.applyTemplate(selectedTemplate, false);
      if (result.success) {
        onUpdate?.(station); // Trigger refresh
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle playlist optimization
  const handleOptimizePlaylist = async () => {
    setIsLoading(true);
    try {
      const result = await playlist.optimizePlaylist({
        removeDuplicates: true,
        targetMessageRatio: smartOptions.messageRatio
      });
      
      if (result.success && result.optimizations) {
        console.log('Optimizations applied:', result.optimizations);
        onUpdate?.(station); // Trigger refresh
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error optimizing playlist:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle track selection
  const toggleTrackSelection = (trackId: string) => {
    const newSelection = new Set(selectedTracks);
    if (newSelection.has(trackId)) {
      newSelection.delete(trackId);
    } else {
      newSelection.add(trackId);
    }
    setSelectedTracks(newSelection);
  };
  
  // Handle batch operations
  const handleRemoveSelected = async () => {
    if (selectedTracks.size === 0) return;
    
    setIsLoading(true);
    try {
      const result = await playlist.removeMultipleTracks(Array.from(selectedTracks));
      if (result.success) {
        setSelectedTracks(new Set());
        onUpdate?.(station); // Trigger refresh
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error removing tracks:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle export
  const handleExport = async () => {
    const result = await playlist.exportPlaylist(true);
    if (result.success && result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `playlist-${station.name}-${new Date().getTime()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  // Handle import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      
      const result = await playlist.importPlaylist(importData, false);
      if (result.success) {
        onUpdate?.(station); // Trigger refresh
        await loadAnalytics();
      }
    } catch (error) {
      console.error('Error importing playlist:', error);
    } finally {
      setIsLoading(false);
      // Reset file input
      event.target.value = '';
    }
  };
  
  // Render track item
  const renderTrackItem = (track: PlaylistItem, index: number) => {
    const isSelected = selectedTracks.has(track.id);
    const isFailed = playlist.failedTracks.has(track.id);
    
    return (
      <div
        key={track.id}
        className={`
          flex items-center gap-3 p-3 border rounded-lg transition-all
          ${isSelected ? 'bg-primary/10 border-primary' : 'bg-background'}
          ${isFailed ? 'opacity-60 border-destructive/50' : ''}
          ${draggedTrack === track.id ? 'opacity-50' : ''}
        `}
        draggable
        onDragStart={() => setDraggedTrack(track.id)}
        onDragEnd={() => setDraggedTrack(null)}
      >
        <input
          type=\"checkbox\"
          checked={isSelected}
          onChange={() => toggleTrackSelection(track.id)}
          className=\"rounded\"
        />
        
        <div className=\"flex-shrink-0\">
          {track.type === 'music' ? (
            <Music className=\"h-4 w-4 text-blue-500\" />
          ) : (
            <MessageSquare className=\"h-4 w-4 text-green-500\" />
          )}
        </div>
        
        <div className=\"flex-1 min-w-0\">
          <h4 className=\"font-medium truncate\">{track.title}</h4>
          <p className=\"text-sm text-muted-foreground truncate\">{track.artist}</p>
        </div>
        
        <div className=\"flex items-center gap-2 text-sm text-muted-foreground\">
          <Clock className=\"h-3 w-3\" />
          {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
        </div>
        
        <div className=\"flex items-center gap-1\">
          <Button
            size=\"sm\"
            variant=\"ghost\"
            onClick={() => playlist.duplicateTrack(track.id)}
          >
            <Copy className=\"h-3 w-3\" />
          </Button>
          <Button
            size=\"sm\"
            variant=\"ghost\"
            onClick={() => playlist.removeMultipleTracks([track.id])}
          >
            <Trash2 className=\"h-3 w-3\" />
          </Button>
        </div>
        
        {isFailed && (
          <Badge variant=\"destructive\" className=\"text-xs\">
            Failed
          </Badge>
        )}
      </div>
    );
  };
  
  return (
    <div className=\"space-y-6\">
      {/* Header with stats */}
      <Card>
        <CardHeader>
          <div className=\"flex items-center justify-between\">
            <CardTitle className=\"flex items-center gap-2\">
              <Music className=\"h-5 w-5\" />
              Playlist Manager
            </CardTitle>
            {playlistStats && (
              <div className=\"flex items-center gap-4 text-sm text-muted-foreground\">
                <span>{playlistStats.total} pistes</span>
                <span>{playlistStats.totalDuration} min</span>
                <Badge variant=\"outline\">{Math.round(playlistStats.musicRatio * 100)}% musique</Badge>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>
      
      {/* Main interface */}
      <Tabs defaultValue=\"playlist\" className=\"space-y-4\">
        <TabsList className=\"grid w-full grid-cols-4\">
          <TabsTrigger value=\"playlist\">Playlist</TabsTrigger>
          <TabsTrigger value=\"smart\">IA Génération</TabsTrigger>
          <TabsTrigger value=\"analytics\">Analytics</TabsTrigger>
          <TabsTrigger value=\"tools\">Outils</TabsTrigger>
        </TabsList>
        
        {/* Playlist Tab */}
        <TabsContent value=\"playlist\" className=\"space-y-4\">
          {/* Toolbar */}
          <Card>
            <CardContent className=\"pt-6\">
              <div className=\"flex items-center gap-2 flex-wrap\">
                <Button
                  size=\"sm\"
                  onClick={() => setSelectedTracks(new Set(station.playlist.map(t => t.id)))}
                >
                  Tout sélectionner
                </Button>
                <Button
                  size=\"sm\"
                  variant=\"outline\"
                  onClick={() => setSelectedTracks(new Set())}
                >
                  Désélectionner
                </Button>
                <Button
                  size=\"sm\"
                  variant=\"destructive\"
                  onClick={handleRemoveSelected}
                  disabled={selectedTracks.size === 0 || isLoading}
                >
                  <Trash2 className=\"h-3 w-3 mr-1\" />
                  Supprimer ({selectedTracks.size})
                </Button>
                <Button
                  size=\"sm\"
                  variant=\"outline\"
                  onClick={handleOptimizePlaylist}
                  disabled={isLoading}
                >
                  <Zap className=\"h-3 w-3 mr-1\" />
                  Optimiser
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Playlist items */}
          <Card>
            <CardContent className=\"pt-6\">
              <ScrollArea className=\"h-[400px] pr-4\">
                <div className=\"space-y-2\">
                  {station.playlist.map((track, index) => renderTrackItem(track, index))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Smart Generation Tab */}
        <TabsContent value=\"smart\" className=\"space-y-4\">
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Sparkles className=\"h-5 w-5\" />
                Génération Intelligente
              </CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-4\">
              <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
                <div className=\"space-y-2\">
                  <Label>Durée cible (minutes)</Label>
                  <Input
                    type=\"number\"
                    value={smartOptions.targetDuration}
                    onChange={(e) => setSmartOptions(prev => ({ 
                      ...prev, 
                      targetDuration: parseInt(e.target.value) || 60 
                    }))}
                    min={10}
                    max={300}
                  />
                </div>
                
                <div className=\"space-y-2\">
                  <Label>Ratio de messages (%)</Label>
                  <Input
                    type=\"number\"
                    value={Math.round(smartOptions.messageRatio * 100)}
                    onChange={(e) => setSmartOptions(prev => ({ 
                      ...prev, 
                      messageRatio: (parseInt(e.target.value) || 25) / 100 
                    }))}
                    min={0}
                    max={70}
                  />
                </div>
                
                <div className=\"space-y-2\">
                  <Label>Style DJ</Label>
                  <Select
                    value={smartOptions.djStyle}
                    onValueChange={(value: any) => setSmartOptions(prev => ({ ...prev, djStyle: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"energetic\">Énergique</SelectItem>
                      <SelectItem value=\"calm\">Calme</SelectItem>
                      <SelectItem value=\"mysterious\">Mystérieux</SelectItem>
                      <SelectItem value=\"professional\">Professionnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className=\"space-y-2\">
                  <Label>Moment de la journée</Label>
                  <Select
                    value={smartOptions.timeOfDay}
                    onValueChange={(value: any) => setSmartOptions(prev => ({ ...prev, timeOfDay: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value=\"morning\">Matin</SelectItem>
                      <SelectItem value=\"afternoon\">Après-midi</SelectItem>
                      <SelectItem value=\"evening\">Soir</SelectItem>
                      <SelectItem value=\"night\">Nuit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className=\"flex items-center space-x-2\">
                <Switch
                  id=\"auto-optimize\"
                  checked={smartOptions.autoOptimize}
                  onCheckedChange={(checked) => setSmartOptions(prev => ({ ...prev, autoOptimize: checked }))}
                />
                <Label htmlFor=\"auto-optimize\">Optimisation automatique</Label>
              </div>
              
              <Button
                onClick={handleGenerateSmartPlaylist}
                disabled={isLoading}
                className=\"w-full\"
              >
                <Sparkles className=\"h-4 w-4 mr-2\" />
                {isLoading ? 'Génération...' : 'Générer Playlist Intelligente'}
              </Button>
            </CardContent>
          </Card>
          
          {/* Templates */}
          <Card>
            <CardHeader>
              <CardTitle className=\"flex items-center gap-2\">
                <Template className=\"h-5 w-5\" />
                Templates Prédéfinis
              </CardTitle>
            </CardHeader>
            <CardContent className=\"space-y-4\">
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder=\"Choisir un template\" />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate || isLoading}
                variant=\"outline\"
                className=\"w-full\"
              >
                <Template className=\"h-4 w-4 mr-2\" />
                Appliquer Template
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Analytics Tab */}
        <TabsContent value=\"analytics\" className=\"space-y-4\">
          {analytics && (
            <>
              <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">
                <Card>
                  <CardHeader className=\"pb-2\">
                    <CardTitle className=\"text-sm\">Aperçu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-2 text-sm\">
                      <div className=\"flex justify-between\">
                        <span>Total pistes:</span>
                        <span className=\"font-medium\">{analytics.overview.totalTracks}</span>
                      </div>
                      <div className=\"flex justify-between\">
                        <span>Durée totale:</span>
                        <span className=\"font-medium\">{analytics.overview.totalHours}h</span>
                      </div>
                      <div className=\"flex justify-between\">
                        <span>Durée moyenne:</span>
                        <span className=\"font-medium\">{Math.round(analytics.overview.avgTrackDuration / 60)}min</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className=\"pb-2\">
                    <CardTitle className=\"text-sm\">Composition</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-2 text-sm\">
                      <div className=\"flex justify-between\">
                        <span>Musique:</span>
                        <span className=\"font-medium\">{Math.round(analytics.composition.ratios.music * 100)}%</span>
                      </div>
                      <div className=\"flex justify-between\">
                        <span>Messages:</span>
                        <span className=\"font-medium\">{Math.round(analytics.composition.ratios.message * 100)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className=\"pb-2\">
                    <CardTitle className=\"text-sm\">Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-2 text-sm\">
                      <div className=\"flex justify-between\">
                        <span>Courtes (&lt;1min):</span>
                        <span className=\"font-medium\">{analytics.distribution.shortTracks.percentage}%</span>
                      </div>
                      <div className=\"flex justify-between\">
                        <span>Moyennes (1-5min):</span>
                        <span className=\"font-medium\">{analytics.distribution.mediumTracks.percentage}%</span>
                      </div>
                      <div className=\"flex justify-between\">
                        <span>Longues (&gt;5min):</span>
                        <span className=\"font-medium\">{analytics.distribution.longTracks.percentage}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Recommendations */}
              {recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className=\"flex items-center gap-2\">
                      <TrendingUp className=\"h-5 w-5\" />
                      Recommandations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className=\"space-y-2\">
                      {recommendations.map((rec, index) => (
                        <div key={index} className=\"flex items-start gap-2 p-2 bg-muted/50 rounded\">
                          <Target className=\"h-4 w-4 mt-0.5 text-primary flex-shrink-0\" />
                          <span className=\"text-sm\">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          
          <Button
            onClick={loadAnalytics}
            variant=\"outline\"
            disabled={isLoading}
          >
            <RefreshCw className=\"h-4 w-4 mr-2\" />
            Actualiser Analytics
          </Button>
        </TabsContent>
        
        {/* Tools Tab */}
        <TabsContent value=\"tools\" className=\"space-y-4\">
          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4\">
            {/* Export/Import */}
            <Card>
              <CardHeader>
                <CardTitle className=\"text-sm\">Export/Import</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-2\">
                <Button
                  onClick={handleExport}
                  variant=\"outline\"
                  size=\"sm\"
                  className=\"w-full\"
                >
                  <Download className=\"h-3 w-3 mr-2\" />
                  Exporter Playlist
                </Button>
                
                <div className=\"relative\">
                  <input
                    type=\"file\"
                    accept=\".json\"
                    onChange={handleImport}
                    className=\"absolute inset-0 w-full h-full opacity-0 cursor-pointer\"
                  />
                  <Button
                    variant=\"outline\"
                    size=\"sm\"
                    className=\"w-full\"
                  >
                    <Upload className=\"h-3 w-3 mr-2\" />
                    Importer Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className=\"text-sm\">Actions Rapides</CardTitle>
              </CardHeader>
              <CardContent className=\"space-y-2\">
                <Button
                  onClick={() => playlist.optimizePlaylist({ removeDuplicates: true })}
                  variant=\"outline\"
                  size=\"sm\"
                  className=\"w-full\"
                  disabled={isLoading}
                >
                  <Zap className=\"h-3 w-3 mr-2\" />
                  Supprimer Doublons
                </Button>
                
                <Button
                  onClick={() => playlist.optimizePlaylist({ sortByDuration: true })}
                  variant=\"outline\"
                  size=\"sm\"
                  className=\"w-full\"
                  disabled={isLoading}
                >
                  <BarChart3 className=\"h-3 w-3 mr-2\" />
                  Trier par Durée
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}