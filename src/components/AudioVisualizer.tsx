'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Waves, Activity, Eye, EyeOff } from 'lucide-react';

interface AudioVisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  className?: string;
}

type VisualizerType = 'bars' | 'waveform' | 'circular';

export function AudioVisualizer({ audioRef, isPlaying, className = '' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const [isEnabled, setIsEnabled] = useState(true);
  const [visualizerType, setVisualizerType] = useState<VisualizerType>('bars');

  useEffect(() => {
    if (!audioRef.current || !isEnabled) return;

    const setupAudioContext = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          analyserRef.current.smoothingTimeConstant = 0.8;
          
          const source = audioContextRef.current.createMediaElementSource(audioRef.current!);
          source.connect(analyserRef.current);
          analyserRef.current.connect(audioContextRef.current.destination);
          
          dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
      } catch (error) {
        console.warn('Erreur initialisation AudioContext:', error);
      }
    };

    setupAudioContext();
  }, [audioRef, isEnabled]);

  const startVisualization = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      switch (visualizerType) {
        case 'bars':
          drawBars(ctx, canvas, dataArrayRef.current);
          break;
        case 'waveform':
          drawWaveform(ctx, canvas, dataArrayRef.current);
          break;
        case 'circular':
          drawCircular(ctx, canvas, dataArrayRef.current);
          break;
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  }, [visualizerType]);

  const stopVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const drawBars = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
    const barWidth = canvas.width / dataArray.length * 2;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
      
      const intensity = dataArray[i] / 255;
      const red = Math.floor(255 * intensity);
      const green = Math.floor(200 * (1 - intensity));
      const blue = Math.floor(100 * intensity);
      
      ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
      
      x += barWidth;
    }
  };

  const drawWaveform = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = v * canvas.height / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();
  };

  const drawCircular = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, dataArray: Uint8Array) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;

    for (let i = 0; i < dataArray.length; i++) {
      const angle = (i / dataArray.length) * Math.PI * 2;
      const amplitude = (dataArray[i] / 255) * radius * 0.5;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + amplitude);
      const y2 = centerY + Math.sin(angle) * (radius + amplitude);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

  const toggleVisualizer = () => {
    setIsEnabled(!isEnabled);
  };

  const cycleVisualizerType = () => {
    const types: VisualizerType[] = ['bars', 'waveform', 'circular'];
    const currentIndex = types.indexOf(visualizerType);
    const nextIndex = (currentIndex + 1) % types.length;
    setVisualizerType(types[nextIndex]);
  };

  const getVisualizerIcon = () => {
    switch (visualizerType) {
      case 'bars': return <BarChart3 className="h-4 w-4" />;
      case 'waveform': return <Waves className="h-4 w-4" />;
      case 'circular': return <Activity className="h-4 w-4" />;
    }
  };

  useEffect(() => {
    if (isPlaying && isEnabled && analyserRef.current && dataArrayRef.current) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => stopVisualization();
  }, [isPlaying, isEnabled, visualizerType, startVisualization]);

  return (
    <Card className={`border-orange-500/30 bg-black/40 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-orange-400 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analyseur de Spectre
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={cycleVisualizerType}
              size="sm"
              variant="outline"
              className="border-orange-500/50 hover:border-orange-500 hover:bg-orange-900/20"
            >
              {getVisualizerIcon()}
            </Button>
            <Button
              onClick={toggleVisualizer}
              size="sm"
              variant="outline"
              className="border-orange-500/50 hover:border-orange-500 hover:bg-orange-900/20"
            >
              {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-48 bg-black/60 rounded-lg border border-orange-500/20"
          />
          {!isEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
              <p className="text-orange-400/60">Visualiseur désactivé</p>
            </div>
          )}
          {!isPlaying && isEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
              <p className="text-orange-400/60">En attente de lecture audio...</p>
            </div>
          )}
        </div>
        <div className="mt-3 text-xs text-orange-400/60 text-center">
          Type: {visualizerType} • {isEnabled ? 'Activé' : 'Désactivé'}
        </div>
      </CardContent>
    </Card>
  );
}