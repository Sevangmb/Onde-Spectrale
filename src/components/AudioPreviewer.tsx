
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { streamCustomDjAudio } from '@/app/actions';
import type { CustomDJCharacter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, AlertTriangle, AudioLines, CheckCircle } from 'lucide-react';

interface AudioPreviewerProps {
  character: CustomDJCharacter;
}

export function AudioPreviewer({ character }: AudioPreviewerProps) {
  const [message, setMessage] = useState('Bonjour les terres désolées, ici votre DJ. Préparez-vous pour une transmission spéciale.');
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);
  const pcmBufferRef = useRef<Float32Array>(new Float32Array(0));

  useEffect(() => {
    // Initialiser AudioContext au premier montage
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } catch (e) {
            console.error("AudioContext is not supported by this browser.", e);
            setStatus('error');
            setError('Votre navigateur ne supporte pas l\'audio en temps réel.');
        }
    }
    
    // Cleanup
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);

  const processQueue = useCallback(() => {
    if (!isPlayingRef.current || audioQueueRef.current.length === 0 || !audioContextRef.current) {
      return;
    }

    const audioCtx = audioContextRef.current;
    while (audioQueueRef.current.length > 0) {
      const buffer = audioQueueRef.current.shift()!;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      const playTime = Math.max(audioCtx.currentTime, nextPlayTimeRef.current);
      source.start(playTime);

      nextPlayTimeRef.current = playTime + buffer.duration;
    }
  }, []);

  const handleStream = async () => {
    if (!message.trim() || !audioContextRef.current) return;

    setStatus('loading');
    setError(null);
    isPlayingRef.current = false;
    audioQueueRef.current = [];
    pcmBufferRef.current = new Float32Array(0);

    const audioCtx = audioContextRef.current;
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }
    
    nextPlayTimeRef.current = audioCtx.currentTime;

    try {
      const stream = await streamCustomDjAudio({ message, voice: character.voice });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      setStatus('playing');
      isPlayingRef.current = true;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        const base64Chunk = decoder.decode(value);
        const binaryString = atob(base64Chunk);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Convert 16-bit PCM to Float32Array
        const pcm16 = new Int16Array(bytes.buffer);
        const pcm32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
            pcm32[i] = pcm16[i] / 32768.0; // Normalize to [-1.0, 1.0]
        }
        
        const newBuffer = new Float32Array(pcmBufferRef.current.length + pcm32.length);
        newBuffer.set(pcmBufferRef.current);
        newBuffer.set(pcm32, pcmBufferRef.current.length);
        pcmBufferRef.current = newBuffer;

        const CHUNK_SIZE = 4096; // Process in chunks
        while (pcmBufferRef.current.length >= CHUNK_SIZE) {
            const chunkToProcess = pcmBufferRef.current.slice(0, CHUNK_SIZE);
            pcmBufferRef.current = pcmBufferRef.current.slice(CHUNK_SIZE);
            
            const audioBuffer = audioCtx.createBuffer(1, chunkToProcess.length, audioCtx.sampleRate);
            audioBuffer.copyToChannel(chunkToProcess, 0);
            
            audioQueueRef.current.push(audioBuffer);
            processQueue();
        }
      }

      // Process any remaining data in the buffer
      if (pcmBufferRef.current.length > 0) {
        const audioBuffer = audioCtx.createBuffer(1, pcmBufferRef.current.length, audioCtx.sampleRate);
        audioBuffer.copyToChannel(pcmBufferRef.current, 0);
        audioQueueRef.current.push(audioBuffer);
        processQueue();
      }

      // Check when playing finishes
      const checkEndInterval = setInterval(() => {
          if (audioCtx.currentTime >= nextPlayTimeRef.current - 0.1) {
              setStatus('idle');
              isPlayingRef.current = false;
              clearInterval(checkEndInterval);
          }
      }, 100);

    } catch (e: any) {
      console.error('Streaming failed:', e);
      setError(e.message || 'Une erreur est survenue lors du streaming audio.');
      setStatus('error');
      isPlayingRef.current = false;
    }
  };

  const getStatusIndicator = () => {
    switch(status) {
        case 'loading':
            return <div className="flex items-center gap-2 text-yellow-400"><Loader2 className="h-4 w-4 animate-spin" /><span>Connexion...</span></div>;
        case 'playing':
            return <div className="flex items-center gap-2 text-green-400"><AudioLines className="h-4 w-4 animate-pulse" /><span>Diffusion en cours...</span></div>;
        case 'error':
            return <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="h-4 w-4" /><span>Erreur de diffusion</span></div>;
        case 'idle':
             return <div className="flex items-center gap-2 text-gray-400"><CheckCircle className="h-4 w-4" /><span>Prêt à diffuser</span></div>;
    }
  };


  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="preview-message">Message à lire</Label>
        <Textarea
          id="preview-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écrivez le message à prévisualiser ici..."
          rows={4}
          disabled={status === 'loading' || status === 'playing'}
        />
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button
          onClick={handleStream}
          disabled={!message.trim() || status === 'loading' || status === 'playing'}
          className="w-full sm:w-auto"
        >
          {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === 'playing' && <AudioLines className="mr-2 h-4 w-4 animate-pulse" />}
          {status !== 'loading' && status !== 'playing' && <Play className="mr-2 h-4 w-4" />}
          Lancer la prévisualisation
        </Button>
        <div className="text-sm font-mono p-2 bg-muted rounded-md w-full sm:w-auto text-center">
            {getStatusIndicator()}
        </div>
      </div>


      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
