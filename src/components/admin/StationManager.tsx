'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  RadioTower, 
  Play, 
  Pause, 
  Settings, 
  Users, 
  Volume2, 
  Music,
  Trash2,
  Edit,
  Plus,
  BarChart3
} from 'lucide-react';
import type { Station } from '@/lib/types';

interface StationManagerProps {
  stations: Station[];
  onStationUpdate?: (station: Station) => void;
  onStationDelete?: (stationId: string) => void;
  onStationCreate?: (station: Partial<Station>) => void;
}

interface StationStats {
  listeners: number;
  tracksPlayed: number;
  uptime: string;
  status: 'broadcasting' | 'paused' | 'offline';
}

export function StationManager({ 
  stations, 
  onStationUpdate,
  onStationDelete,
  onStationCreate 
}: StationManagerProps) {
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newStation, setNewStation] = useState({
    name: '',
    frequency: 108.0,
    theme: 'classic'
  });

  // Mock data for station stats
  const getStationStats = (stationId: string): StationStats => {
    const mockStats = {
      listeners: Math.floor(Math.random() * 50) + 1,
      tracksPlayed: Math.floor(Math.random() * 200) + 10,
      uptime: `${Math.floor(Math.random() * 24)}h ${Math.floor(Math.random() * 60)}m`,
      status: (['broadcasting', 'paused', 'offline'] as const)[Math.floor(Math.random() * 3)]
    };
    return mockStats;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'broadcasting':
        return 'bg-green-900/20 text-green-300 border-green-500/30';
      case 'paused':
        return 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30';
      case 'offline':
        return 'bg-red-900/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-900/20 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'broadcasting':
        return <Play className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'offline':
        return <RadioTower className="h-4 w-4" />;
      default:
        return <RadioTower className="h-4 w-4" />;
    }
  };

  const handleCreateStation = () => {
    if (onStationCreate && newStation.name && newStation.frequency) {
      onStationCreate({
        ...newStation,
        id: `station-${Date.now()}`,
        ownerId: 'current-user',
        djCharacterId: 'default-dj',
        playlist: [],
        createdAt: new Date().toISOString()
      });
      setNewStation({ name: '', frequency: 108.0, theme: 'classic' });
      setShowCreateForm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-orange-300">Gestion des Stations</h2>
          <p className="text-orange-400/70">Gérez vos stations radio et surveillez leurs performances</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle Station
        </Button>
      </div>

      {/* Create Station Form */}
      {showCreateForm && (
        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-orange-400">Créer une Nouvelle Station</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-orange-200">Nom de la station</Label>
                <Input
                  value={newStation.name}
                  onChange={(e) => setNewStation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Radio Onde Spectrale"
                  className="border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-orange-200">Fréquence (MHz)</Label>
                <Input
                  type="number"
                  value={newStation.frequency}
                  onChange={(e) => setNewStation(prev => ({ ...prev, frequency: parseFloat(e.target.value) }))}
                  step="0.1"
                  min="88.0"
                  max="108.0"
                  className="border-orange-500/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-orange-200">Thème</Label>
              <Select
                value={newStation.theme}
                onValueChange={(value) => setNewStation(prev => ({ ...prev, theme: value }))}
              >
                <SelectTrigger className="border-orange-500/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">Classique Post-Apocalyptique</SelectItem>
                  <SelectItem value="modern">Moderne</SelectItem>
                  <SelectItem value="retro">Rétro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreateStation} className="bg-orange-600 hover:bg-orange-700">
                Créer la Station
              </Button>
              <Button onClick={() => setShowCreateForm(false)} variant="outline">
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stations.map((station) => {
          const stats = getStationStats(station.id);
          return (
            <Card 
              key={station.id} 
              className={`border-orange-500/30 bg-black/40 backdrop-blur-sm transition-all cursor-pointer ${
                selectedStation === station.id ? 'ring-2 ring-orange-500' : ''
              }`}
              onClick={() => setSelectedStation(station.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-orange-300 text-lg">{station.name}</CardTitle>
                  <Badge className={getStatusColor(stats.status)}>
                    {getStatusIcon(stats.status)}
                    <span className="ml-1 capitalize">{stats.status}</span>
                  </Badge>
                </div>
                <p className="text-orange-400/70">{station.frequency} MHz</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Station Stats */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-200">{stats.listeners} auditeurs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-200">{stats.tracksPlayed} pistes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-200">Uptime: {stats.uptime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-orange-400" />
                    <span className="text-orange-200">{station.playlist.length} en queue</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 border-orange-500/50 hover:border-orange-500"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-orange-500/50 hover:border-orange-500"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500/50 hover:border-red-500 text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStationDelete?.(station.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Station Details Panel */}
      {selectedStation && (
        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-orange-400">
              Détails: {stations.find(s => s.id === selectedStation)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h4 className="font-semibold text-orange-300">Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-200">Fréquence:</span>
                    <span className="text-orange-400">
                      {stations.find(s => s.id === selectedStation)?.frequency} MHz
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-200">Créée le:</span>
                    <span className="text-orange-400">
                      {new Date(stations.find(s => s.id === selectedStation)?.createdAt || '').toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-200">Auto-diffusion:</span>
                    <Switch />
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-orange-300">Performances</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-orange-200">Auditeurs max:</span>
                    <span className="text-orange-400">127</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-200">Durée totale:</span>
                    <span className="text-orange-400">24h 36m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-200">Interruptions:</span>
                    <span className="text-orange-400">2</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-semibold text-orange-300">Actions</h4>
                <div className="space-y-2">
                  <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700">
                    Redémarrer Station
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-orange-500/50">
                    Exporter Logs
                  </Button>
                  <Button size="sm" variant="outline" className="w-full border-orange-500/50">
                    Sauvegarder Config
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stations.length === 0 && (
        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <RadioTower className="h-12 w-12 mx-auto text-orange-400/50 mb-4" />
            <h3 className="text-lg font-semibold text-orange-300 mb-2">Aucune Station</h3>
            <p className="text-orange-400/70 mb-4">Créez votre première station radio pour commencer la diffusion</p>
            <Button onClick={() => setShowCreateForm(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" />
              Créer une Station
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}