
'use client';

import type React from 'react';
import { Music, MessageSquare, Volume2, VolumeX, Volume1, Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { PlaylistItem } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';

interface AudioPlayerProps {
  track: PlaylistItem | undefined;
  isPlaying: boolean;
  isLoading: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  ttsMessage?: string | null;
  errorMessage?: string | null;
}

export function AudioPlayer({
  track,
  isPlaying,
  isLoading,
  audioRef,
  ttsMessage,
  errorMessage
}: AudioPlayerProps) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(75);

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [audioRef, isMuted]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
        setIsMuted(prev => {
            const newMuted = !prev;
            if (newMuted) {
                setLastVolume(volume);
                setVolume(0);
                audioRef.current!.volume = 0;
            } else {
                const resumeVolume = lastVolume > 0 ? lastVolume : 75;
                setVolume(resumeVolume);
                audioRef.current!.volume = resumeVolume / 100;
            }
            return newMuted;
        });
    }
  }, [audioRef, volume, lastVolume]);


  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const updateProgress = () => {
      if (audio.duration && isFinite(audio.currentTime) && isFinite(audio.duration) && audio.duration > 0) {
        setCurrentTime(audio.currentTime);
        setProgress((audio.currentTime / audio.duration) * 100);
      } else {
        setCurrentTime(0);
        setProgress(0);
      }
    };

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      } else {
        setDuration(0);
      }
      updateProgress();
    };
    
    if (!track) {
        setDuration(0);
        setCurrentTime(0);
        setProgress(0);
    }

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    
    audio.volume = volume / 100;
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, [audioRef, track, volume]);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  
  const displayTitle = isLoading ? 'Chargement...' : (track ? track.title : "Silence radio");

  return (
    <div className="bg-black/80 border-2 border-orange-500/40 rounded-lg p-6 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 via-transparent to-red-900/10 pointer-events-none"></div>
      
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/30 to-transparent animate-scanline-slow"></div>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3 shadow-lg shadow-orange-500/10">
            { isLoading ? <Loader2 className="h-8 w-8 text-orange-400 animate-spin"/> :
              !track ? <Radio className="h-8 w-8 text-orange-400" /> :
              track.type === 'music' ? 
              <Music className="h-8 w-8 text-orange-400" /> : 
              <MessageSquare className="h-8 w-8 text-orange-400" />
            }
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-lg font-medium text-orange-100 truncate drop-shadow-lg animate-flicker-subtle">
              {displayTitle}
            </p>
            {track?.artist && !isLoading && (
              <p className="text-sm text-orange-300/80 truncate">
                {track.artist}
              </p>
            )}
            {ttsMessage && (
              <p className="text-sm text-blue-300 truncate italic">
                "🎤 {ttsMessage.substring(0, 80)}{ttsMessage.length > 80 ? '...' : ''}"
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-red-300 truncate">
                ⚠️ {errorMessage}
              </p>
            )}
             <p className="text-xs text-orange-400/60 uppercase tracking-wider">
              { !track || isLoading ? 'HORS LIGNE' :
                ttsMessage ? 'SYNTHÈSE VOCALE' :
                track.type === 'music' ? 'MUSIQUE' : 'MESSAGE'
              }
            </p>
          </div>
          
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
        
        <div className="space-y-2">
          <div 
            className="relative w-full h-2 bg-black/60 border border-orange-500/30 rounded-full overflow-hidden group"
          >
            <div 
              className="h-full bg-gradient-to-r from-orange-600 to-red-500 transition-all duration-200 relative"
              style={{ width: `${isNaN(progress) ? 0 : progress}%` }}
            >
              <div className="absolute inset-0 bg-orange-400/30 animate-pulse"></div>
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-orange-300/80 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleMute}
              className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 hover:text-orange-100 transition-all h-8 w-8"
            >
              <VolumeIcon className="h-4 w-4" />
            </Button>
            
            <div className="w-20">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
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
