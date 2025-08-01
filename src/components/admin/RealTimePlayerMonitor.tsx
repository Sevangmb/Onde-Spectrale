'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlayerMonitoring, type PlayerState, type PlayerLog } from '@/hooks/usePlayerMonitoring';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  Radio, 
  Users, 
  Clock,
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';

interface RealTimePlayerMonitorProps {
  stationId: string;
  stationName: string;
}

export function RealTimePlayerMonitor({ stationId, stationName }: RealTimePlayerMonitorProps) {
  const { 
    playerState, 
    logs, 
    isConnected, 
    play, 
    pause, 
    setVolume, 
    setError 
  } = usePlayerMonitoring(stationId);

  const [showLogs, setShowLogs] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!playerState.duration) return 0;
    return (playerState.currentTime / playerState.duration) * 100;
  };

  const getLogIcon = (type: PlayerLog['type']) => {
    switch (type) {
      case 'play': return <Play className="h-3 w-3" />;
      case 'pause': return <Pause className="h-3 w-3" />;
      case 'error': return <AlertTriangle className="h-3 w-3 text-destructive" />;
      case 'track_change': return <Radio className="h-3 w-3" />;
      case 'volume_change': return <Volume2 className="h-3 w-3" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  const getLogColor = (type: PlayerLog['type']) => {
    switch (type) {
      case 'error': return 'text-destructive';
      case 'play': return 'text-green-500';
      case 'pause': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Connecté en temps réel' : 'Déconnecté'}
        </span>
      </div>

      {/* Player Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            {stationName} - Monitoring Temps Réel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {playerState.isPlaying ? (
                  <Play className="h-6 w-6 text-green-500 mx-auto" />
                ) : (
                  <Pause className="h-6 w-6 text-yellow-500 mx-auto" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {playerState.isPlaying ? 'En lecture' : 'En pause'}
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {playerState.listeners}
              </div>
              <p className="text-sm text-muted-foreground">
                Auditeurs actifs
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-500">
                {Math.round(playerState.volume * 100)}%
              </div>
              <p className="text-sm text-muted-foreground">
                Volume
              </p>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">
                {formatTime(playerState.currentTime)}
              </div>
              <p className="text-sm text-muted-foreground">
                Temps écoulé
              </p>
            </div>
          </div>

          {/* Current Track */}
          {playerState.currentTrack && (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Piste actuelle</h4>
                <Badge variant={playerState.currentTrack.type === 'music' ? 'default' : 'secondary'}>
                  {playerState.currentTrack.type === 'music' ? 'Musique' : 'Message DJ'}
                </Badge>
              </div>
              <p className="font-semibold">{playerState.currentTrack.title}</p>
              {playerState.currentTrack.artist && (
                <p className="text-sm text-muted-foreground">{playerState.currentTrack.artist}</p>
              )}
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}</span>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Progression</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
          </div>

          {/* Error Display */}
          {playerState.error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Erreur</span>
              </div>
              <p className="text-sm text-destructive mt-1">{playerState.error}</p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={playerState.isPlaying ? pause : play}
              variant="outline"
              size="sm"
            >
              {playerState.isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Lecture
                </>
              )}
            </Button>

            <Button 
              onClick={() => setVolume(playerState.volume === 0 ? 0.5 : 0)}
              variant="outline"
              size="sm"
            >
              {playerState.volume === 0 ? (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Activer
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Mute
                </>
              )}
            </Button>

            <Button 
              onClick={() => setShowLogs(!showLogs)}
              variant="outline"
              size="sm"
            >
              <Activity className="h-4 w-4 mr-2" />
              Logs ({logs.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Section */}
      {showLogs && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Historique des événements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {logs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun événement enregistré
                  </p>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="flex-shrink-0 mt-0.5">
                        {getLogIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${getLogColor(log.type)}`}>
                          {log.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 