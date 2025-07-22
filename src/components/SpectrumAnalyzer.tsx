
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface SpectrumAnalyzerProps {
  isPlaying: boolean;
  className?: string;
}

export function SpectrumAnalyzer({ isPlaying, className = '' }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
  
    const bufferLength = 64; 
    const dataArray = new Uint8Array(bufferLength);
  
    // Faking the data for visual effect
    for (let i = 0; i < bufferLength; i++) {
      dataArray[i] = Math.random() * 255;
    }
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  
    const barWidth = (canvas.width / bufferLength) * 1.5;
    let x = 0;
  
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * canvas.height * (0.5 + Math.random() * 0.5);
      
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
         ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
         ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);


  useEffect(() => {
    if (isPlaying) {
      draw();
    } else {
      stopDrawing();
    }
    
    return stopDrawing;
  }, [isPlaying, draw, stopDrawing]);
  
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
