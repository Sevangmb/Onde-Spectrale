import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, Pause, AlertTriangle, Music, Loader2 } from 'lucide-react';
import { usePlayerState } from '@/hooks/usePlayerState';

interface StationStatusCardProps {
  stationId: string;
  name: string;
  frequency: number;
}

export function StationStatusCard({ stationId, name, frequency }: StationStatusCardProps) {
  const { playerState, loading, error } = usePlayerState(stationId);

  return (
    <div className="p-3 rounded-md border bg-card flex flex-col gap-1 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{name}</span>
          <Badge variant="secondary">{frequency.toFixed(1)} MHz</Badge>
        </div>
         <div className="flex items-center gap-1 text-xs">
            {loading ? <Loader2 className="h-3 w-3 animate-spin"/> :
             playerState?.isPlaying ? <Play className="h-3 w-3 text-green-500"/> :
             <Pause className="h-3 w-3 text-yellow-500"/>
            }
            {loading ? "Sync..." : playerState?.isPlaying ? 'Actif' : 'Inactif'}
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-4 w-3/4 mt-1" />
      ) : error ? (
        <div className="flex items-center text-destructive-foreground gap-1 text-xs"><AlertTriangle className="h-3 w-3" />Erreur monitoring</div>
      ) : playerState ? (
        <div className="text-xs text-muted-foreground truncate max-w-full">
            {playerState.currentTrack ? (
              <>
                <Music className="h-3 w-3 inline mr-1" />
                <span>{playerState.currentTrack.title}</span>
              </>
            ) : (
                <span>Aucune piste.</span>
            )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">Aucun état de lecteur</div>
      )}
    </div>
  );
}
