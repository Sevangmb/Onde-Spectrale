import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, AlertTriangle, Music } from 'lucide-react';
import { usePlayerState } from '@/hooks/usePlayerState';

interface StationStatusCardProps {
  stationId: string;
  name: string;
  frequency: number;
}

export function StationStatusCard({ stationId, name, frequency }: StationStatusCardProps) {
  const { playerState, loading, error } = usePlayerState(stationId);

  return (
    <div className="p-3 rounded-md border bg-card flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-semibold">{name}</span>
        <Badge variant="secondary">{frequency.toFixed(1)} MHz</Badge>
      </div>
      {loading ? (
        <Skeleton className="h-4 w-32 my-1" />
      ) : error ? (
        <div className="flex items-center text-red-600 gap-1 text-xs"><AlertTriangle className="h-4 w-4" />Erreur monitoring</div>
      ) : playerState ? (
        <div className="flex flex-col gap-1 text-xs">
          <div className="flex items-center gap-2">
            {playerState.isPlaying ? (
              <Play className="h-4 w-4 text-green-600" />
            ) : (
              <Pause className="h-4 w-4 text-yellow-600" />
            )}
            <span>{playerState.isPlaying ? 'Lecture' : 'En pause'}</span>
            {playerState.currentTrack && (
              <>
                <Music className="h-3 w-3 ml-2 text-muted-foreground" />
                <span className="truncate max-w-[120px]">{playerState.currentTrack.title}</span>
              </>
            )}
          </div>
          {playerState.errorMessage && (
            <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-3 w-3" />{playerState.errorMessage}</div>
          )}
          {playerState.logs && playerState.logs.length > 0 && !playerState.errorMessage && (
            <div className="text-muted-foreground truncate max-w-[180px]">{playerState.logs[playerState.logs.length-1].message}</div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Aucun état de player</div>
      )}
    </div>
  );
}
