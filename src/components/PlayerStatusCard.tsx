import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, MessageSquare, AlertTriangle, SkipForward, RotateCw } from "lucide-react";

export interface PlayerStatusCardProps {
  currentTrack?: {
    title: string;
    type: "music" | "message";
    artist?: string;
    duration?: number;
  };
  ttsMessage?: string | null;
  errorMessage?: string | null;
  isPlaying: boolean;
  isLoading: boolean;
  onNext?: () => void;
  onReplay?: () => void;
}

export const PlayerStatusCard: React.FC<PlayerStatusCardProps> = ({
  currentTrack,
  ttsMessage,
  errorMessage,
  isPlaying,
  isLoading,
  onNext,
  onReplay
}) => {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>État du lecteur</CardTitle>
      </CardHeader>
      <CardContent>
        {currentTrack ? (
          <div className="mb-2 flex items-center gap-2">
            {currentTrack.type === "music" ? <Music className="text-orange-400" /> : <MessageSquare className="text-blue-500" />}
            <span className="font-semibold truncate max-w-[180px]">{currentTrack.title}</span>
            {currentTrack.artist && <span className="text-xs text-gray-400 ml-2">{currentTrack.artist}</span>}
            {typeof currentTrack.duration === "number" && (
              <span className="text-xs text-gray-400 ml-2">{Math.floor(currentTrack.duration / 60)}:{String(currentTrack.duration % 60).padStart(2, "0")}</span>
            )}
            <span className={`ml-3 text-xs ${isPlaying ? "text-green-500" : "text-gray-400"}`}>{isPlaying ? "Lecture" : "Pause"}</span>
            {isLoading && <span className="ml-2 text-xs text-yellow-500">Chargement...</span>}
          </div>
        ) : (
          <div className="mb-2 text-gray-400">Aucune piste en cours</div>
        )}

        {ttsMessage && (
          <div className="mb-2 text-blue-600 bg-blue-50 rounded p-2 text-sm">{ttsMessage}</div>
        )}

        {errorMessage && (
          <div className="mb-2 flex items-center gap-2 text-red-600 bg-red-50 rounded p-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={onNext} disabled={isLoading}>
            <SkipForward className="w-4 h-4 mr-1" /> Passer à la suivante
          </Button>
          <Button size="sm" variant="outline" onClick={onReplay} disabled={isLoading}>
            <RotateCw className="w-4 h-4 mr-1" /> Rejouer la piste
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
