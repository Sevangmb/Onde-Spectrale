'use client';

import { useEffect, useRef, useState } from 'react';

interface SpectrumAnalyzerProps {
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  className?: string;
}

export function SpectrumAnalyzer({ isPlaying, audioRef, className = '' }: SpectrumAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!audioRef.current || isInitialized) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const analyzer = audioContext.createAnalyser();
      
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;
      
      source.connect(analyzer);
      analyzer.connect(audioContext.destination);
      
      analyzerRef.current = analyzer;
      dataArrayRef.current = new Uint8Array(analyzer.frequencyBinCount);
      setIsInitialized(true);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'analyseur:', error);
    }
  }, [audioRef, isInitialized]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyzerRef.current || !dataArrayRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!analyzerRef.current || !dataArrayRef.current) return;

      const width = canvas.width;
      const height = canvas.height;
      
      analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
      
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);
      
      const barWidth = width / dataArrayRef.current.length;
      
      for (let i = 0; i < dataArrayRef.current.length; i++) {
        const barHeight = (dataArrayRef.current[i] / 255) * height;
        
        // Gradient post-apocalyptique
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.5, '#feca57');
        gradient.addColorStop(1, '#ff9ff3');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        
        // Effet de lueur
        ctx.shadowColor = '#ff6b6b';
        ctx.shadowBlur = 10;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, 2);
        ctx.shadowBlur = 0;
      }
      
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    if (isPlaying) {
      draw();
    } else {
      // Animation statique quand pas en lecture
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, width, height);
      
      // Lignes statiques pour l'effet radio
      for (let i = 0; i < 20; i++) {
        const x = (i / 20) * width;
        const opacity = Math.random() * 0.3 + 0.1;
        ctx.strokeStyle = `rgba(255, 107, 107, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  return (
    <div className={`relative overflow-hidden bg-black/80 border border-red-900/50 rounded-lg ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: 'radial-gradient(circle, rgba(139,0,0,0.1) 0%, rgba(0,0,0,0.9) 100%)' }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-2 left-2 text-xs text-red-400/70 font-mono">
          SPECTRUM
        </div>
        <div className="absolute top-2 right-2 text-xs text-red-400/70 font-mono">
          {isPlaying ? '●' : '○'} {isPlaying ? 'LIVE' : 'STATIC'}
        </div>
      </div>
    </div>
  );
}