'use client';

import type React from 'react';
import { Play, Pause, Rewind, FastForward, Music, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PlaylistItem } from '@/lib/types';
import { useEffect, useState } from 'react';

interface AudioPlayerProps {
  track: PlaylistItem | undefined;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

export function AudioPlayer({
  track,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  audioRef
}: AudioPlayerProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(e => console.error("Error playing audio:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying, track, audioRef]);
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      // Fix: Check if duration exists and is not 0 to avoid NaN
      if (audio.duration && audio.duration > 0) {
        setProgress((audio.currentTime / audio.duration) * 100);
      } else {
        setProgress(0);
      }
    };

    const timer = setInterval(updateProgress, 500);
    
    // Fix: Add event listeners for more accurate progress tracking
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', updateProgress);
    
    return () => {
      clearInterval(timer);
      // Fix: Clean up event listeners to prevent memory leaks
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', updateProgress);
    };
  }, [audioRef, track]); // Fix: Add track as dependency to reset progress when track changes


  return (
    <div className="bg-black/50 border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="bg-border rounded p-3">
          {track?.type === 'music' ? <Music className="h-6 w-6 text-accent" /> : <MessageSquare className="h-6 w-6 text-accent" />}
        </div>
        <div className="flex-grow overflow-hidden">
            <p className="text-base font-medium text-primary-foreground truncate">{track?.title || 'Silence Radio'}</p>
            <p className="text-sm text-muted-foreground truncate">{track?.artist || '...'}</p>
        </div>
      </div>
      
      <div className="w-full">
        <Progress value={isNaN(progress) ? 0 : progress} className="h-1 bg-primary/20" />
      </div>

      <div className="flex justify-center items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onPrev} disabled={!track}>
          <Rewind className="h-6 w-6" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onPlayPause} disabled={!track} className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full w-14 h-14">
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={onNext} disabled={!track}>
          <FastForward className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
