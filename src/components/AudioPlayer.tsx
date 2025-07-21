
'use client';

import type React from 'react';
import { Play, Pause, Rewind, FastForward, Music, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PlaylistItem } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';

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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = (x / rect.width) * duration;
    
    audio.currentTime = clickedTime;
    setCurrentTime(clickedTime);
    setProgress((clickedTime / duration) * 100);
  }, [audioRef, duration]);


  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [audioRef, isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume / 100;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  }, [audioRef, volume, isMuted]);

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
      if (audio.duration && audio.duration > 0 && isFinite(audio.currentTime) && isFinite(audio.duration)) {
        const current = audio.currentTime;
        const total = audio.duration;
        setCurrentTime(current);
        setDuration(total);
        setProgress((current / total) * 100);
      } else {
        setProgress(0);
        setCurrentTime(0);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      updateProgress();
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    
    // Set initial volume
    audio.volume = volume / 100;
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, [audioRef, track, volume]);

  if (!track) {
    return null;
  }

  return (
    <div className="bg-black/80 border-2 border-orange-500/40 rounded-lg p-6 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
      {/* Effet de lueur d'arrière-plan */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 via-transparent to-red-900/10 pointer-events-none"></div>
      
      {/* Scanlines subtiles */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/30 to-transparent animate-scanline-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        {/* Info de la piste */}
        <div className="flex items-center gap-4">
          <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 shadow-lg shadow-orange-500/10">
            {track.type === 'music' ? 
              <Music className="h-8 w-8 text-orange-400 animate-pulse" /> : 
              <MessageSquare className="h-8 w-8 text-orange-400 animate-pulse" />
            }
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-lg font-medium text-orange-100 truncate drop-shadow-lg animate-flicker-subtle">
              {track.title}
            </p>
            {track.artist && (
              <p className="text-sm text-orange-300/80 truncate">
                {track.artist}
              </p>
            )}
            <p className="text-xs text-orange-400/60 uppercase tracking-wider">
              {track.type === 'music' ? 'MUSIQUE' : 'MESSAGE'}
            </p>
          </div>
          
          {/* Indicateur de lecture */}
          {isPlaying && (
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-orange-400 rounded-full animate-equalizer"
                  style={{
                    height: '16px',
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s'
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Barre de progression interactive */}
        <div className="space-y-2">
          <div 
            className="relative w-full h-2 bg-black/60 border border-orange-500/30 rounded-full overflow-hidden cursor-pointer group"
            onClick={handleProgressClick}
          >
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-red-500 transition-all duration-200 relative"
              style={{ width: `${isNaN(progress) ? 0 : progress}%` }}
            >
              <div className="absolute inset-0 bg-orange-400/30 animate-pulse"></div>
            </div>
            
            {/* Point de progression */}
            <div 
              className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-orange-400 border-2 border-orange-200 rounded-full shadow-lg shadow-orange-400/50 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `${isNaN(progress) ? 0 : progress}%`, marginLeft: '-8px' }}
            />
          </div>
          
          {/* Temps de lecture */}
          <div className="flex justify-between text-xs text-orange-300/80 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Contrôles */}
        <div className="flex items-center justify-between">
          {/* Contrôles de lecture */}
          <div className="flex justify-center items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onPrev}
              className="border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-400/50 text-orange-300 hover:text-orange-100 transition-all"
            >
              <Rewind className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onPlayPause}
              className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border border-orange-400/50 text-white rounded-full w-12 h-12 shadow-lg shadow-orange-500/30 transition-all duration-200 transform hover:scale-105"
            >
              {isPlaying ? 
                <Pause className="h-6 w-6" /> : 
                <Play className="h-6 w-6 ml-0.5" />
              }
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNext}
              className="border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-400/50 text-orange-300 hover:text-orange-100 transition-all"
            >
              <FastForward className="h-5 w-5" />
            </Button>
          </div>

          {/* Contrôles de volume */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMute}
              className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 hover:text-orange-100 transition-all h-8 w-8"
            >
              {isMuted || volume === 0 ? 
                <VolumeX className="h-4 w-4" /> : 
                <Volume2 className="h-4 w-4" />
              }
            </Button>
            
            <div className="w-20">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="cursor-pointer"
              />
            </div>
            
            <span className="text-xs text-orange-300/60 font-mono w-8 text-right">
              {Math.round(isMuted ? 0 : volume)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
