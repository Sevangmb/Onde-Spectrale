
'use client';

import React from 'react';
import type { PlaylistItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlaylistSkeleton } from '@/components/LoadingSkeleton';
import { 
  Music, 
  MessageSquare, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  AlertCircle,
  Loader2,
  Radio,
  Clock
} from 'lucide-react';

interface EnhancedPlaylistProps {
  playlist: PlaylistItem[];
  currentTrackId?: string;
  isPlaying: boolean;
  isLoadingTrack: boolean;
  failedTracks: Set<string>;
  onTrackSelect: (trackId: string) => Promise<void>;
  onPlayPause: () => Promise<void>;
  onNext: () => void;
  onPrevious: () => void;
  canGoBack: boolean;
  className?: string;
}

export function EnhancedPlaylist({
  playlist,
  currentTrackId,
  isPlaying,
  isLoadingTrack,
  failedTracks,
  onTrackSelect,
  onPlayPause,
  onNext,
  onPrevious,
  canGoBack,
  className = ''
}: EnhancedPlaylistProps) {
  
  // Show skeleton when playlist is empty or loading
  if (!playlist || playlist.length === 0) {
    return <PlaylistSkeleton className={className} />;
  }

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTrackIcon = (track: PlaylistItem) => {
    if (track.id === currentTrackId && isLoadingTrack) {
      return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
    }
    
    if (failedTracks.has(track.id)) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    
    if (track.type === 'music') {
      return <Music className="h-4 w-4 text-primary/70" />;
    } else {
      return <MessageSquare className="h-4 w-4 text-accent/80" />;
    }
  };

  return (
    <Card className={`pip-boy-terminal flex flex-col h-full ${className}`}>
      <CardHeader className="border-b-2 border-primary/40 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-primary phosphor-glow flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Playlist ({playlist.length})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoBack || isLoadingTrack}
              className="retro-button disabled:opacity-50"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onPlayPause}
              disabled={isLoadingTrack}
              className="retro-button disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={isLoadingTrack}
              className="retro-button disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-grow">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-2">
            {playlist.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Playlist vide.</p>
              </div>
            ) : (
              playlist.map((track) => {
                const isActive = track.id === currentTrackId;
                const isFailed = failedTracks.has(track.id);
                
                return (
                  <div
                    key={track.id}
                    onClick={() => !isFailed && onTrackSelect(track.id)}
                    className={`
                      p-3 rounded-md border-2 transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/20 border-primary shadow-lg shadow-primary/20' 
                        : 'bg-black/40 border-primary/20 hover:bg-primary/10 hover:border-primary/40'
                      }
                      ${isFailed ? 'opacity-50 bg-destructive/10 border-destructive/30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {getTrackIcon(track)}
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <p className={`
                          font-semibold truncate text-sm
                          ${isActive ? 'text-primary phosphor-glow' : 'text-foreground'}
                          ${isFailed ? 'line-through' : ''}
                        `}>
                          {track.title}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground truncate">
                            {track.artist || (track.type === 'message' ? 'Message DJ' : 'Artiste inconnu')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {isActive && isPlaying && !isLoadingTrack ? (
                           <div className="flex gap-0.5 items-end h-4">
                            {[...Array(4)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-primary rounded-full animate-equalizer"
                                style={{ animationDelay: `${i * 0.15}s`, animationDuration: `${0.8 + Math.random()*0.4}s`}}
                              />
                            ))}
                          </div>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            {formatDuration(track.duration)}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
