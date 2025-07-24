
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
  ttsEnabled?: boolean;
  onEnableTTS?: () => void;
  onPlayPause?: () => void;
  onEnded?: () => void;
}

export function AudioPlayer({
  track,
  isPlaying,
  isLoading,
  audioRef,
  ttsMessage,
  errorMessage,
  ttsEnabled,
  onEnableTTS,
  onPlayPause,
  onEnded
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

    const handleEnded = () => {
      if (onEnded) onEnded();
    };
    
    if (!track) {
        setDuration(0);
        setCurrentTime(0);
        setProgress(0);
    }

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    
    audio.volume = volume / 100;
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioRef, track, volume, onEnded]);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  
  const displayTitle = isLoading ? 'Chargement...' : (track ? track.title : "Silence radio");

  return (
    <div className="vintage-radio-frame pip-boy-terminal p-6 shadow-2xl radioactive-pulse relative overflow-hidden static-noise">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
      
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 border-2 border-primary/40 rounded-lg p-3 shadow-lg radioactive-pulse">
            { isLoading ? <Loader2 className="h-8 w-8 text-primary phosphor-glow animate-spin"/> :
              !track ? <Radio className="h-8 w-8 text-primary phosphor-glow animate-pulse" /> :
              track.type === 'music' ? 
              <Music className="h-8 w-8 text-primary phosphor-glow" /> : 
              <MessageSquare className="h-8 w-8 text-accent phosphor-glow" />
            }
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-lg font-retro font-bold text-primary phosphor-glow truncate drop-shadow-lg uppercase tracking-wider">
              {displayTitle}
            </p>
            {track?.artist && !isLoading && (
              <p className="text-sm text-muted-foreground font-mono truncate uppercase tracking-wide">
                {track.artist}
              </p>
            )}
            {ttsMessage && (
              <p className="text-sm text-accent phosphor-glow truncate italic font-mono">
                "🎤 {ttsMessage.substring(0, 80)}{ttsMessage.length > 80 ? '...' : ''}"
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-destructive phosphor-glow truncate font-mono">
                ⚠️ {errorMessage}
              </p>
            )}
             <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              { !track || isLoading ? '>>> SIGNAL PERDU <<<' :
                ttsMessage ? '>>> TRANSMISSION <<<' :
                track.type === 'music' ? '>>> MUSIQUE <<<' : '>>> MESSAGE <<<'
              }
            </p>
          </div>
          
          {isPlaying && (
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-primary phosphor-glow rounded-full animate-pulse"
                  style={{
                    height: `${12 + Math.random() * 8}px`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: '0.8s'
                  }}
                />
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <div 
            className="relative w-full h-3 bg-black/80 border-2 border-primary/40 rounded-sm overflow-hidden group"
          >
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-200 relative"
              style={{ width: `${isNaN(progress) ? 0 : progress}%` }}
            >
              <div className="absolute inset-0 bg-primary/30 animate-pulse"></div>
              <div className="absolute inset-0 phosphor-glow"></div>
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground font-mono uppercase tracking-wider">
            <span className="phosphor-glow">{formatTime(currentTime)}</span>
            <span className="phosphor-glow">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Message d'erreur et activation TTS */}
        {errorMessage && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-md">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-red-400 font-mono">
                {errorMessage}
              </p>
              {!ttsEnabled && errorMessage && errorMessage.includes('synthèse') && onEnableTTS && onPlayPause && (
                <Button
                  onClick={() => {
                    onEnableTTS();
                    onPlayPause();
                  }}
                  size="sm"
                  className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                >
                  <Volume2 className="h-4 w-4 mr-2" />
                  Activer TTS
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Message TTS en cours */}
        {ttsMessage && (
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-blue-400 font-mono uppercase tracking-wide">
                Synthèse vocale
              </span>
            </div>
            <p className="text-sm text-blue-100 font-mono leading-relaxed">
              {ttsMessage}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
              Vol:
            </span>
            <div className="vintage-knob" onClick={toggleMute}>
              <VolumeIcon className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-4 w-4 text-primary phosphor-glow" />
            </div>
          </div>
          
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="cursor-pointer"
              />
            </div>
            
            <div className="frequency-display min-w-[50px] text-sm">
              {Math.round(isMuted ? 0 : volume)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
