'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Play, 
  Pause, 
  Volume2, 
  Wifi, 
  Clock, 
  MapPin, 
  UserX, 
  PauseCircle,
  RefreshCw
} from 'lucide-react';
import { 
  useAdminActivePlayers, 
  useAdminActions, 
  useAdminState 
} from '@/stores/extendedRadioStore';
import type { AdminPlayerState } from '@/lib/types';

export function PlayerMonitoringPanel() {
  const activePlayers = useAdminActivePlayers();
  const adminState = useAdminState();
  const { kickUser, pauseUserPlayback, logAdminError } = useAdminActions();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const playersArray = Array.from(activePlayers.values());

  const formatDuration = (connectionTime: Date) => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - connectionTime.getTime()) / 1000 / 60);
    
    if (diff < 1) return 'Maintenant';
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ${diff % 60}m`;
    return `${Math.floor(diff / 1440)}j ${Math.floor((diff % 1440) / 60)}h`;
  };

  const getStatusColor = (isPlaying: boolean, lastActivity: Date) => {
    const minutesAgo = Math.floor((Date.now() - lastActivity.getTime()) / 1000 / 60);
    
    if (minutesAgo > 5) return 'bg-red-900/20 text-red-300 border-red-500/30';
    if (!isPlaying) return 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30';
    return 'bg-green-900/20 text-green-300 border-green-500/30';
  };

  const getStatusText = (player: AdminPlayerState) => {
    const minutesAgo = Math.floor((Date.now() - player.lastActivity.getTime()) / 1000 / 60);
    
    if (minutesAgo > 5) return 'Inactif';
    if (!player.isPlaying) return 'En pause';
    return 'En lecture';
  };

  const handleKickUser = async (userId: string) => {
    if (actionLoading) return;
    
    setActionLoading(userId);
    try {
      await kickUser(userId);
      console.log(`User ${userId} kicked successfully`);
    } catch (error) {
      console.error('Failed to kick user:', error);
      await logAdminError({
        level: 'error',
        source: 'admin',
        message: `Failed to kick user ${userId}`,
        userId,
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseUser = async (userId: string) => {
    if (actionLoading) return;
    
    setActionLoading(userId);
    try {
      await pauseUserPlayback(userId);
      console.log(`User ${userId} playback paused successfully`);
    } catch (error) {
      console.error('Failed to pause user:', error);
      await logAdminError({
        level: 'error',
        source: 'admin',
        message: `Failed to pause user ${userId} playback`,
        userId,
        stack: error instanceof Error ? error.stack : undefined,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getBandwidthColor = (bandwidth?: number) => {
    if (!bandwidth) return 'text-gray-400';
    if (bandwidth < 128) return 'text-red-400';
    if (bandwidth < 320) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getQualityBadge = (quality?: string) => {
    const colors = {
      low: 'bg-red-900/20 text-red-300 border-red-500/30',
      medium: 'bg-yellow-900/20 text-yellow-300 border-yellow-500/30',
      high: 'bg-green-900/20 text-green-300 border-green-500/30',
    };
    
    return colors[quality as keyof typeof colors] || 'bg-gray-900/20 text-gray-300 border-gray-500/30';
  };

  return (
    <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-orange-400 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Monitoring des Joueurs ({adminState.totalActivePlayers})
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-orange-400/70">
            <RefreshCw className="h-4 w-4" />
            Temps réel
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {playersArray.length === 0 ? (
          <div className="text-center py-8 text-orange-400/60">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun joueur actif détecté</p>
            <p className="text-sm mt-2">
              {adminState.isMonitoringActive 
                ? 'Les joueurs apparaîtront ici une fois connectés' 
                : 'Monitoring désactivé'
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {playersArray.map((player) => (
                <div
                  key={player.userId}
                  className="p-4 rounded-lg bg-orange-900/10 border border-orange-500/20"
                >
                  {/* Player Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center text-white font-bold">
                        {player.userId.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-orange-200">
                          {player.userId.substring(0, 8)}...
                        </p>
                        <p className="text-sm text-orange-400/70">
                          Session: {player.sessionId.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(player.isPlaying, player.lastActivity)}>
                      {getStatusText(player)}
                    </Badge>
                  </div>

                  {/* Player Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-orange-400" />
                      <span className="text-orange-200">{player.stationFrequency} MHz</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-400" />
                      <span className="text-orange-200">{formatDuration(player.connectionTime)}</span>
                    </div>
                    
                    {player.bandwidth && (
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-orange-400" />
                        <span className={getBandwidthColor(player.bandwidth)}>
                          {player.bandwidth} kbps
                        </span>
                      </div>
                    )}
                    
                    {player.audioQuality && (
                      <div className="flex items-center gap-2">
                        <Badge className={getQualityBadge(player.audioQuality)} variant="outline">
                          {player.audioQuality}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Current Track */}
                  {player.currentTrack && (
                    <div className="mb-3 p-2 rounded bg-orange-900/5 border border-orange-500/10">
                      <div className="flex items-center gap-2 mb-1">
                        {player.isPlaying ? (
                          <Play className="h-3 w-3 text-green-400" />
                        ) : (
                          <Pause className="h-3 w-3 text-yellow-400" />
                        )}
                        <span className="text-orange-300 font-medium">
                          {player.currentTrack.title}
                        </span>
                      </div>
                      {player.currentTrack.artist && (
                        <p className="text-sm text-orange-400/70 ml-5">
                          {player.currentTrack.artist}
                        </p>
                      )}
                    </div>
                  )}

                  {/* TTS Message */}
                  {player.ttsMessage && (
                    <div className="mb-3 p-2 rounded bg-blue-900/20 border border-blue-500/30">
                      <p className="text-blue-300 text-sm">
                        🎤 TTS: {player.ttsMessage}
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {player.errorMessage && (
                    <div className="mb-3 p-2 rounded bg-red-900/20 border border-red-500/30">
                      <p className="text-red-300 text-sm">
                        ⚠️ Erreur: {player.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Connection Details */}
                  <div className="flex items-center justify-between text-xs text-orange-400/60 mb-3">
                    <div className="flex items-center gap-4">
                      {player.ipAddress && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {player.ipAddress}
                        </div>
                      )}
                      <div>
                        Dernière activité: {player.lastActivity.toLocaleTimeString('fr-FR')}
                      </div>
                    </div>
                  </div>

                  {/* Admin Actions */}
                  <div className="flex gap-2 pt-2 border-t border-orange-500/20">
                    <Button
                      onClick={() => handlePauseUser(player.userId)}
                      disabled={actionLoading === player.userId || !player.isPlaying}
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/50 hover:border-yellow-500 text-yellow-300 hover:text-yellow-200"
                    >
                      <PauseCircle className="h-3 w-3 mr-1" />
                      {actionLoading === player.userId ? 'En cours...' : 'Pause'}
                    </Button>
                    
                    <Button
                      onClick={() => handleKickUser(player.userId)}
                      disabled={actionLoading === player.userId}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 hover:border-red-500 text-red-300 hover:text-red-200"
                    >
                      <UserX className="h-3 w-3 mr-1" />
                      {actionLoading === player.userId ? 'En cours...' : 'Expulser'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}