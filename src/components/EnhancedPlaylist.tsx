// src/components/EnhancedPlaylist.tsx - Nouveau composant playlist

'use client';

import React from 'react';
import { PlaylistItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Music, 
  MessageSquare, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Volume2,
  Clock,
  AlertCircle,
  Loader2,
  Radio
} from 'lucide-react';

interface EnhancedPlaylistProps {
  playlist: PlaylistItem[];
  currentTrackIndex: number;
  currentTrack?: PlaylistItem;
  isPlaying: boolean;
  isLoadingTrack: boolean;
  failedTracks: Set<string>;
  onTrackSelect: (index: number) => Promise<void>;
  onPlayPause: () => Promise<void>;
  onNext: () => Promise<void>;
  onPrevious: () => Promise<void>;
  canGoBack: boolean;
  className?: string;
}

export function EnhancedPlaylist({
  playlist,
  currentTrackIndex,
  currentTrack,
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTrackIcon = (track: PlaylistItem, isActive: boolean) => {
    if (isActive && isLoadingTrack) {
      return <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />;
    }
    
    if (failedTracks.has(track.id)) {
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    }
    
    if (track.type === 'music') {
      return <Music className="h-4 w-4 text-blue-400" />;
    } else {
      return <MessageSquare className="h-4 w-4 text-green-400" />;
    }
  };

  const getTrackStatus = (track: PlaylistItem, index: number) => {
    if (index === currentTrackIndex && isLoadingTrack) {
      return 'Chargement...';
    }
    
    if (index === currentTrackIndex && isPlaying) {
      return 'En cours de lecture';
    }
    
    if (failedTracks.has(track.id)) {
      return 'Erreur de lecture';
    }
    
    return track.type === 'music' ? 'Musique' : 'Message DJ';
  };

  return (
    <Card className={`bg-black/80 border-2 border-orange-500/40 backdrop-blur-sm shadow-2xl shadow-orange-500/20 ${className}`}>
      <CardHeader className="border-b border-orange-500/30 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-orange-100 flex items-center gap-2">
            <Radio className="h-5 w-5 text-orange-400" />
            Playlist ({playlist.length} pistes)
          </CardTitle>
          
          {/* Contrôles de navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrevious}
              disabled={!canGoBack || isLoadingTrack}
              className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 disabled:opacity-50"
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onPlayPause}
              disabled={!currentTrack || isLoadingTrack}
              className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 disabled:opacity-50"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onNext}
              disabled={isLoadingTrack}
              className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 disabled:opacity-50"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          <div className="p-4 space-y-2">
            {playlist.length === 0 ? (
              <div className="text-center py-8 text-orange-300/60">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune piste dans la playlist</p>
              </div>
            ) : (
              playlist.map((track, index) => {
                const isActive = index === currentTrackIndex;
                const isFailed = failedTracks.has(track.id);
                
                return (
                  <div
                    key={track.id}
                    onClick={() => onTrackSelect(index)}
                    className={`
                      p-3 rounded-lg border cursor-pointer transition-all duration-200
                      ${isActive 
                        ? 'bg-orange-900/30 border-orange-500/50 shadow-lg shadow-orange-500/10' 
                        : 'bg-black/40 border-orange-500/20 hover:bg-orange-900/20 hover:border-orange-500/30'
                      }
                      ${isFailed ? 'opacity-50' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icône et numéro */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-orange-400/60 font-mono w-6">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {getTrackIcon(track, isActive)}
                      </div>
                      
                      {/* Informations de la piste */}
                      <div className="flex-grow min-w-0">
                        <p className={`
                          font-medium truncate text-sm
                          ${isActive ? 'text-orange-100' : 'text-orange-200/80'}
                          ${isFailed ? 'line-through' : ''}
                        `}>
                          {track.title}
                        </p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-orange-300/60 truncate">
                            {track.artist || 'Artiste inconnu'}
                          </p>
                          
                          <span className="text-orange-400/40">•</span>
                          
                          <div className="flex items-center gap-1 text-xs text-orange-400/60">
                            <Clock className="h-3 w-3" />
                            {formatDuration(track.duration)}
                          </div>
                        </div>
                      </div>
                      
                      {/* Indicateur de statut */}
                      <div className="flex items-center gap-2 text-right min-w-0">
                        {isActive && isPlaying && !isLoadingTrack && (
                          <div className="flex gap-0.5">
                            {[...Array(3)].map((_, i) => (
                              <div
                                key={i}
                                className="w-0.5 h-4 bg-orange-400 rounded-full animate-pulse"
                                style={{
                                  animationDelay: `${i * 0.2}s`,
                                  animationDuration: '1s'
                                }}
                              />
                            ))}
                          </div>
                        )}
                        
                        <div className="text-right">
                          <p className={`
                            text-xs
                            ${isActive ? 'text-orange-300' : 'text-orange-400/60'}
                          `}>
                            {getTrackStatus(track, index)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Barre de progression pour la piste active */}
                    {isActive && (isPlaying || isLoadingTrack) && (
                      <div className="mt-2 pt-2 border-t border-orange-500/20">
                        <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden">
                          <div 
                            className={`
                              h-full bg-gradient-to-r from-orange-600 to-red-500 transition-all duration-200
                              ${isLoadingTrack ? 'animate-pulse' : ''}
                            `}
                            style={{ width: isLoadingTrack ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                    )}
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