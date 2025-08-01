import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, AlertTriangle, Music, Loader2 } from "lucide-react";
import { usePlayerState } from '@/hooks/usePlayerState';

interface PlayerStatusCardProps {
  stationId: string;
}

export const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({ stationId }) => {
  const { playerState, loading, error } = usePlayerState(stationId);

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>État du lecteur en temps réel</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="flex items-center gap-2"><Loader2 className="animate-spin" />Chargement de l&apos;état...</div>}
        {error && <div className="flex items-center gap-2 text-destructive"><AlertTriangle />Erreur de connexion au lecteur.</div>}
        
        {playerState ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {playerState.isPlaying ? 
                <Badge variant="default" className="bg-green-600"><Play className="h-4 w-4 mr-1" /> Lecture</Badge> : 
                <Badge variant="secondary"><Pause className="h-4 w-4 mr-1" /> En pause</Badge>
              }
            </div>

            {playerState.currentTrack ? (
              <div className="flex items-center gap-2 text-sm">
                <Music className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold truncate max-w-[200px]">{playerState.currentTrack.title}</span>
                {playerState.currentTrack.artist && <span className="text-xs text-muted-foreground truncate">{playerState.currentTrack.artist}</span>}
              </div>
            ) : (
               <div className="text-sm text-muted-foreground">Aucune piste en cours de lecture.</div>
            )}
            
            {playerState.ttsMessage && (
              <div className="text-sm p-2 bg-blue-900/50 border border-blue-500/30 rounded-md">
                🎤 <span className="italic">&quot;{playerState.ttsMessage}&quot;</span>
              </div>
            )}

            {playerState.errorMessage && (
              <div className="flex items-center gap-2 text-sm p-2 bg-destructive/20 border border-destructive/50 rounded-md">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                {playerState.errorMessage}
              </div>
            )}
          </div>
        ) : (
          !loading && <div className="text-sm text-muted-foreground">Aucun état de lecteur disponible.</div>
        )}
      </CardContent>
    </Card>
  );
};
