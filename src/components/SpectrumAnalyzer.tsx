
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface SpectrumAnalyzerProps {
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  className?: string;
}

export function SpectrumAnalyzer({ isPlaying, audioRef, className = '' }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const bufferLengthRef = useRef<number>(0);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      bufferLengthRef.current = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) {
      console.error("Erreur lors de l'initialisation de l'AudioContext:", e);
    }
  }, [audioRef]);

  const draw = useCallback(() => {
    if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = bufferLengthRef.current;
    
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barWidth = (canvas.width / bufferLength) * 1.5;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * 1.2;
      
      const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
      gradient.addColorStop(0, '#ff4800');
      gradient.addColorStop(0.5, '#ff8c00');
      gradient.addColorStop(1, '#ffc100');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 2;
    }
    
    animationFrameId.current = requestAnimationFrame(draw);
  }, []);

  const stopDrawing = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = undefined;
    }
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if(ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
         ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);


  useEffect(() => {
    if (isPlaying) {
      if (!audioContextRef.current) {
        setupAudioContext();
      }
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      stopDrawing(); // clear previous animation
      draw();
    } else {
      stopDrawing();
    }
    
    return stopDrawing;
  }, [isPlaying, draw, stopDrawing, setupAudioContext]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(canvas);

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black/80 border border-red-900/50 rounded-lg ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'radial-gradient(circle, rgba(139,0,0,0.1) 0%, rgba(0,0,0,0.9) 100%)' }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2 left-2 text-xs text-red-400/70 font-mono uppercase">
          Analyseur de Spectre
        </div>
        <div className="absolute top-2 right-2 text-xs text-red-400/70 font-mono flex items-center gap-1">
          <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
          {isPlaying ? 'LIVE' : 'OFFLINE'}
        </div>
      </div>
    </div>
  );
}

