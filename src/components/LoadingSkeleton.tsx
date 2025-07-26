// src/components/LoadingSkeleton.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioTower, Music, Loader2 } from 'lucide-react';

interface LoadingSkeletonProps {
  variant?: 'player' | 'playlist' | 'station' | 'spectrum';
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'player', 
  className = '' 
}) => {
  const baseClasses = "animate-pulse";
  
  switch (variant) {
    case 'player':
      return (
        <div className={`pip-boy-terminal p-4 space-y-3 ${className}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <Music className="h-6 w-6 text-primary/50" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-primary/20 rounded w-3/4"></div>
              <div className="h-3 bg-primary/10 rounded w-1/2"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="h-2 bg-primary/20 rounded w-full"></div>
            <div className="flex justify-between text-xs">
              <div className="h-3 bg-primary/10 rounded w-12"></div>
              <div className="h-3 bg-primary/10 rounded w-12"></div>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-primary/70 font-mono">CHARGEMENT AUDIO...</span>
          </div>
        </div>
      );

    case 'playlist':
      return (
        <Card className={`pip-boy-terminal ${className}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary/20 rounded"></div>
              <div className="h-5 bg-primary/20 rounded w-32"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-background/50 rounded">
                <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center">
                  <Music className="h-4 w-4 text-primary/50" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-primary/20 rounded w-3/4"></div>
                  <div className="h-2 bg-primary/10 rounded w-1/2"></div>
                </div>
                <div className="w-8 h-3 bg-primary/10 rounded"></div>
              </div>
            ))}
          </CardContent>
        </Card>
      );

    case 'station':
      return (
        <Card className={`pip-boy-terminal ${className}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RadioTower className="h-6 w-6 text-primary/50" />
                <div className="space-y-2">
                  <div className="h-6 bg-primary/20 rounded w-48"></div>
                  <div className="h-4 bg-primary/10 rounded w-32"></div>
                </div>
              </div>
              <div className="w-16 h-8 bg-primary/20 rounded"></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="h-16 bg-primary/20 rounded-lg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
              <div className="h-6 bg-primary/10 rounded w-48 mx-auto"></div>
            </div>
            
            <div className="space-y-2">
              <div className="h-4 bg-primary/20 rounded w-full"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-primary/10 rounded w-12"></div>
                <div className="h-3 bg-primary/10 rounded w-12"></div>
                <div className="h-3 bg-primary/10 rounded w-12"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      );

    case 'spectrum':
      return (
        <div className={`pip-boy-terminal p-4 ${className}`}>
          <div className="flex items-end justify-center gap-1 h-24">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="bg-primary/30 rounded-t"
                style={{
                  width: '8px',
                  height: `${20 + (i % 3) * 20}px`,
                  animationDelay: `${i * 0.1}s`
                }}
              />
            ))}
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-primary/70 font-mono">ANALYSE SPECTRALE...</span>
          </div>
        </div>
      );

    default:
      return (
        <div className={`${baseClasses} ${className}`}>
          <div className="h-4 bg-primary/20 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-primary/10 rounded w-1/2"></div>
        </div>
      );
  }
};

// Specific skeleton components for different use cases
export const AudioPlayerSkeleton: React.FC<{className?: string}> = ({ className }) => (
  <LoadingSkeleton variant="player" className={className} />
);

export const PlaylistSkeleton: React.FC<{className?: string}> = ({ className }) => (
  <LoadingSkeleton variant="playlist" className={className} />
);

export const StationSkeleton: React.FC<{className?: string}> = ({ className }) => (
  <LoadingSkeleton variant="station" className={className} />
);

export const SpectrumSkeleton: React.FC<{className?: string}> = ({ className }) => (
  <LoadingSkeleton variant="spectrum" className={className} />
);

export default LoadingSkeleton;