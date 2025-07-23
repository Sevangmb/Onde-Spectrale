
'use client';

import type React from 'react';
import { Music, MessageSquare, Volume2, VolumeX, Volume1, Radio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import type { PlaylistItem } from '@/lib/types';
import { useEffect, useState, useCallback, useRef } from 'react';

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
  const ttsEndTimer = useRef<NodeJS.Timeout | null>(null);

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

  // Gère la mise à jour de la barre de progression pour les pistes audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || ttsMessage) return;
    
    const updateProgress = () => {
      if (audio.duration && isFinite(audio.currentTime) && isFinite(audio.duration) && audio.duration > 0) {
        setCurrentTime(audio.currentTime);
        setDuration(audio.duration);
        setProgress((audio.currentTime / audio.duration) * 100);
      } else {
        setCurrentTime(0);
        setProgress(0);
      }
    };

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration)) setDuration(audio.duration);
      updateProgress();
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleLoadedMetadata);
    
    audio.volume = volume / 100;
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleLoadedMetadata);
    };
  }, [audioRef, ttsMessage, volume]);
  
  // Gère la barre de progression pour les messages TTS
  useEffect(() => {
    if (ttsMessage && isPlaying) {
      const estimatedDuration = (ttsMessage.length / 15) * 1000; // Estimer la durée
      setDuration(estimatedDuration / 1000);
      let startTime = Date.now();
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        setCurrentTime(elapsed / 1000);
        setProgress(Math.min(100, (elapsed / estimatedDuration) * 100));
      }, 100);

      // S'assurer que la barre va à 100% à la fin
      if(ttsEndTimer.current) clearTimeout(ttsEndTimer.current);
      ttsEndTimer.current = setTimeout(() => {
        setProgress(100);
      }, estimatedDuration - 100);

      return () => {
        clearInterval(interval);
        if(ttsEndTimer.current) clearTimeout(ttsEndTimer.current);
      };
    } else if (!isPlaying) {
      // Ne rien faire si en pause
    } else {
      // Reset pour les pistes audio normales
      setProgress(0);
      setCurrentTime(0);
    }
  }, [ttsMessage, isPlaying]);


  // Reset l'état quand il n'y a plus de piste
  useEffect(() => {
    if (!track) {
      setDuration(0);
      setCurrentTime(0);
      setProgress(0);
    }
  }, [track]);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;
  const displayTitle = isLoading ? 'Chargement...' : (track ? track.title : "Silence radio");

  return (
    <div className="vintage-radio-frame p-6 shadow-2xl relative overflow-hidden static-noise">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>

      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-card border-2 border-primary/40 rounded-lg p-3 shadow-inner">
            { isLoading ? <Loader2 className="h-8 w-8 text-primary phosphor-glow animate-spin"/> :
              !track ? <Radio className="h-8 w-8 text-primary/50" /> :
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
            {errorMessage && (
              <p className="text-sm text-destructive phosphor-glow truncate font-mono">
                ⚠️ {errorMessage}
              </p>
            )}
             <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              { !track || isLoading ? '>>> SIGNAL PERDU <<<' :
                isPlaying && ttsMessage ? '>>> TRANSMISSION VOCALE <<<' :
                track.type === 'music' ? '>>> PISTE MUSICALE <<<' : '>>> MESSAGE PRÉ-ENREGISTRÉ <<<'
              }
            </p>
          </div>
          
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
            </div>
          </div>
          
          <div className="flex justify-between text-xs text-muted-foreground font-mono uppercase tracking-wider">
            <span className="phosphor-glow">{formatTime(currentTime)}</span>
            <span className="phosphor-glow">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="vintage-knob">
              <VolumeIcon className="h-5 w-5 text-primary phosphor-glow" />
            </Button>
          
          <div className="flex items-center gap-3 w-48">
            <Slider
              value={[isMuted ? 0 : volume]}
              onValueChange={handleVolumeChange}
              max={100}
              step={1}
              className="cursor-pointer flex-grow"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
