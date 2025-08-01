'use client';

import { useState, useMemo } from 'react';
import { useAdminLayout } from '../layout';
import { useUnifiedStationManager } from '@/hooks/useUnifiedStationManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioStationManager } from '@/components/radio/RadioStationManager';
import { EnhancedPlaylistInterface } from '@/components/playlist/EnhancedPlaylistInterface';
import { RealTimePlayerMonitor } from '@/components/admin/RealTimePlayerMonitor';
import { SystemLogsViewer } from '@/components/admin/SystemLogsViewer';
import type { User, Station } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';

import { 
  RadioTower, 
  Music,
  Users,
  BarChart3,
  TrendingUp,
  Activity,
  Clock,
  Star
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, customCharacters, isLoading: adminLoading } = useAdminLayout();
  const [activeTab, setActiveTab] = useState('overview');

  const allDjs = useMemo(() => [...DJ_CHARACTERS, ...customCharacters], [customCharacters]);

  // Convert admin user to standard user format
  const standardUser: User | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.uid,
      email: user.email || '',
      stationsCreated: 0, // Will be updated by unified manager
      lastFrequency: 87.5,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
  }, [user]);

  // Use unified station manager
  const {
    stations,
    selectedStation,
    setSelectedStation,
    stats,
    isLoading: stationLoading,
    getDjName
  } = useUnifiedStationManager({
    user: standardUser,
    allDjs,
    autoLoad: true
  });

  const isLoading = adminLoading || stationLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tableau de Bord Admin</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble et gestion complète de vos stations radio et playlists.
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stations</CardTitle>
              <RadioTower className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStations}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeStations} actives
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pistes</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTracks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.avgPlaylistLength} par station en moyenne
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Durée Totale</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDuration}m</div>
              <p className="text-xs text-muted-foreground">
                {Math.round(stats.totalDuration / 60)}h de contenu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DJs Actifs</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allDjs.length}</div>
              <p className="text-xs text-muted-foreground">
                {customCharacters.length} personnalisés
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="stations">
            <RadioTower className="h-4 w-4 mr-2" />
            Stations Radio
          </TabsTrigger>
          <TabsTrigger value="playlists">
            <Music className="h-4 w-4 mr-2" />
            Playlists
          </TabsTrigger>
          <TabsTrigger value="monitoring">
            <Activity className="h-4 w-4 mr-2" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Stations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Stations Récentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stations && stations.slice(0, 5).map(station => (
                    <div key={station.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{station.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {station.frequency.toFixed(1)} MHz • {getDjName(station.djCharacterId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={station.isActive !== false ? "default" : "secondary"}>
                          {station.isActive !== false ? "Active" : "Inactive"}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setSelectedStation(station);
                            setActiveTab('playlists');
                          }}
                        >
                          <Music className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!stations || stations.length === 0) && (
                    <p className="text-muted-foreground text-center py-4">
                      Aucune station créée pour le moment
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top DJs */}
            {stats && stats.mostUsedDJs && stats.mostUsedDJs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    DJs les plus utilisés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats.mostUsedDJs.map(({ djId, count }, index) => (
                      <div key={djId} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{getDjName(djId)}</span>
                        </div>
                        <Badge variant="secondary">{count} station{count > 1 ? 's' : ''}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Stations Tab */}
        <TabsContent value="stations">
          <RadioStationManager 
            user={standardUser} 
            allDjs={allDjs}
          />
        </TabsContent>

        {/* Playlists Tab */}
        <TabsContent value="playlists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Playlists</CardTitle>
              <p className="text-sm text-muted-foreground">
                Sélectionnez une station pour gérer sa playlist
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {stations && stations.map(station => (
                  <Card 
                    key={station.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedStation?.id === station.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedStation(station)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{station.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {station.frequency.toFixed(1)} MHz • {station.playlist?.length || 0} pistes
                      </p>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {selectedStation ? (
                <EnhancedPlaylistInterface
                  station={selectedStation}
                  user={standardUser}
                  allDjs={allDjs}
                  onUpdate={(updatedStation) => {
                    // TODO: Add playlistControls to updatedStation
                    setSelectedStation(updatedStation as any);
                  }}
                />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4" />
                  <p>Sélectionnez une station pour gérer sa playlist</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Monitoring Temps Réel</h2>
              <p className="text-muted-foreground">
                Surveillez l&apos;état de vos stations radio en temps réel
              </p>
            </div>
            
            {stations && stations.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stations.slice(0, 4).map(station => (
                  <RealTimePlayerMonitor 
                    key={station.id}
                    stationId={station.id} 
                    stationName={station.name}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4" />
                  <p>Aucune station à surveiller</p>
                  <p className="text-sm mt-2">
                    Créez des stations pour commencer le monitoring
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Analytics et Logs Système</h2>
              <p className="text-muted-foreground">
                Surveillez les performances et les logs système de votre radio
              </p>
            </div>
            
            <SystemLogsViewer />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}