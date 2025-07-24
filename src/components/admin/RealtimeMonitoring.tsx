'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Wifi, Server, Users, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface SystemStatus {
  server: 'online' | 'offline' | 'degraded';
  database: 'online' | 'offline' | 'degraded';
  plex: 'online' | 'offline' | 'degraded';
  ai: 'online' | 'offline' | 'degraded';
}

interface RealtimeStats {
  activeUsers: number;
  activeStations: number;
  totalTracks: number;
  serverUptime: string;
  lastUpdate: Date;
}

export function RealtimeMonitoring() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    server: 'online',
    database: 'online',
    plex: 'degraded',
    ai: 'online'
  });

  const [stats, setStats] = useState<RealtimeStats>({
    activeUsers: 3,
    activeStations: 2,
    totalTracks: 1247,
    serverUptime: '2d 14h 32m',
    lastUpdate: new Date()
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const refreshData = async () => {
    setIsRefreshing(true);
    
    // Simulate API calls
    setTimeout(() => {
      setStats(prev => ({
        ...prev,
        activeUsers: Math.floor(Math.random() * 10) + 1,
        lastUpdate: new Date()
      }));
      setIsRefreshing(false);
    }, 1000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-900/20 text-green-300 border-green-500/30';
      case 'degraded':
        return 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30';
      case 'offline':
        return 'bg-red-900/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-900/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              État du Système
            </CardTitle>
            <Button
              onClick={refreshData}
              disabled={isRefreshing}
              size="sm"
              variant="outline"
              className="border-orange-500/50 hover:border-orange-500"
            >
              {isRefreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.server)}
              <div>
                <p className="font-medium text-orange-200">Serveur Web</p>
                <Badge className={getStatusColor(systemStatus.server)}>
                  {systemStatus.server}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.database)}
              <div>
                <p className="font-medium text-orange-200">Base de Données</p>
                <Badge className={getStatusColor(systemStatus.database)}>
                  {systemStatus.database}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.plex)}
              <div>
                <p className="font-medium text-orange-200">Serveur Plex</p>
                <Badge className={getStatusColor(systemStatus.plex)}>
                  {systemStatus.plex}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusIcon(systemStatus.ai)}
              <div>
                <p className="font-medium text-orange-200">IA Générative</p>
                <Badge className={getStatusColor(systemStatus.ai)}>
                  {systemStatus.ai}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Utilisateurs Actifs</CardTitle>
            <Users className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-300">{stats.activeUsers}</div>
            <p className="text-xs text-orange-400/70">
              Connectés maintenant
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Stations Actives</CardTitle>
            <Wifi className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-300">{stats.activeStations}</div>
            <p className="text-xs text-orange-400/70">
              En diffusion
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Pistes Total</CardTitle>
            <Server className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-300">{stats.totalTracks.toLocaleString()}</div>
            <p className="text-xs text-orange-400/70">
              Dans la bibliothèque
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-200">Uptime Serveur</CardTitle>
            <Clock className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-300">{stats.serverUptime}</div>
            <p className="text-xs text-orange-400/70">
              Sans interruption
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Update */}
      <div className="text-xs text-orange-400/60 text-center">
        Dernière mise à jour: {stats.lastUpdate.toLocaleTimeString('fr-FR')}
      </div>
    </div>
  );
}