'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music, Calendar, Disc, User } from 'lucide-react';
import type { PlaylistItem } from '@/lib/types';

interface EnhancedMusicDisplayProps {
  track: PlaylistItem | null;
  className?: string;
}

export function EnhancedMusicDisplay({ track, className = '' }: EnhancedMusicDisplayProps) {
  if (!track || track.type !== 'music') {
    return (
      <Card className={`border-orange-500/30 bg-black/40 backdrop-blur-sm ${className}`}>
        <CardContent className="p-6 text-center">
          <Music className="h-12 w-12 mx-auto text-orange-500/50 mb-4" />
          <p className="text-orange-400">Aucune piste en cours de lecture</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-orange-500/30 bg-black/40 backdrop-blur-sm ${className}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-6">
          {/* Artwork */}
          <div className="flex-shrink-0">
            {track.artwork ? (
              <Image
                src={track.artwork}
                alt={`${track.album || track.title} artwork`}
                width={96}
                height={96}
                className="w-24 h-24 rounded-lg object-cover border-2 border-orange-500/30 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-orange-900/50 to-red-900/50 border-2 border-orange-500/30 flex items-center justify-center">
                <Music className="h-8 w-8 text-orange-400" />
              </div>
            )}
          </div>

          {/* Métadonnées */}
          <div className="flex-1 min-w-0">
            {/* Titre et artiste */}
            <div className="mb-3">
              <h3 className="text-xl font-bold text-orange-300 truncate">
                {track.title}
              </h3>
              {track.artist && (
                <p className="text-orange-400/80 flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  {track.artist}
                </p>
              )}
            </div>

            {/* Album et année */}
            {track.album && (
              <div className="flex items-center gap-2 mb-2 text-orange-400/70">
                <Disc className="h-4 w-4" />
                <span className="truncate">{track.album}</span>
                {track.year && (
                  <>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{track.year}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Genres */}
            {track.genre && (
              <div className="flex flex-wrap gap-2 mb-3">
                {track.genre.split(',').map((genre, index) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="bg-orange-900/30 text-orange-300 border-orange-500/30 text-xs"
                  >
                    {genre.trim()}
                  </Badge>
                ))}
              </div>
            )}

            {/* Durée */}
            <div className="text-sm text-orange-400/60">
              Durée: {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
            </div>

            {/* Source */}
            <div className="text-xs text-orange-400/40 mt-2">
              {track.plexKey ? '📀 Plex Media Server' : '🌐 Source externe'}
            </div>
          </div>
        </div>

        {/* Barre de progression stylisée (placeholder) */}
        <div className="mt-4 h-1 bg-orange-900/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-300"
            style={{ width: '0%' }} // À connecter avec le vrai progress
          />
        </div>
      </CardContent>
    </Card>
  );
}