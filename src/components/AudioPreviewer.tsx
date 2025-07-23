
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { previewCustomDjAudio } from '@/app/actions';
import type { CustomDJCharacter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, AlertTriangle, AudioLines, CheckCircle, Mic, RotateCw } from 'lucide-react';

interface AudioPreviewerProps {
  character: CustomDJCharacter;
}

export function AudioPreviewer({ character }: AudioPreviewerProps) {
  const [message, setMessage] = useState('Bonjour les terres désolées, ici votre DJ. Préparez-vous pour une transmission spéciale.');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'playing' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generatedBuffer, setGeneratedBuffer] = useState<AudioBuffer | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Cleanup
    return () => {
      sourceRef.current?.stop();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }
    };
  }, []);
  
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
       try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        } catch (e) {
            console.error("AudioContext is not supported by this browser.", e);
            setStatus('error');
            setError('Votre navigateur ne supporte pas l\'audio en temps réel.');
            return null;
        }
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);


  const handleGenerateAudio = async () => {
    if (!message.trim()) return;

    setStatus('loading');
    setError(null);
    setGeneratedBuffer(null);
    if (sourceRef.current) {
      sourceRef.current.stop();
    }

    try {
      const result = await previewCustomDjAudio({ message, voice: character.voice });
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.audioBase64) {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;

        const audioData = Buffer.from(result.audioBase64, 'base64');
        const decodedAudio = await audioCtx.decodeAudioData(audioData.buffer);

        setGeneratedBuffer(decodedAudio);
        setStatus('ready');
      } else {
        throw new Error("Aucune donnée audio n'a été reçue.");
      }

    } catch (e: any) {
      console.error('Audio generation failed:', e);
      setError(e.message || 'Une erreur est survenue lors de la génération audio.');
      setStatus('error');
    }
  };

  const playAudio = () => {
    if (!generatedBuffer) return;
    
    const audioCtx = getAudioContext();
    if (!audioCtx) return;
    
    if (sourceRef.current) {
      sourceRef.current.stop();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = generatedBuffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
      setStatus('ready');
    };
    source.start(0);

    sourceRef.current = source;
    setStatus('playing');
  };

  const getStatusIndicator = () => {
    switch(status) {
        case 'loading':
            return <div className="flex items-center gap-2 text-yellow-400"><Loader2 className="h-4 w-4 animate-spin" /><span>Génération...</span></div>;
        case 'playing':
            return <div className="flex items-center gap-2 text-green-400"><AudioLines className="h-4 w-4 animate-pulse" /><span>Lecture en cours...</span></div>;
        case 'ready':
            return <div className="flex items-center gap-2 text-green-400"><CheckCircle className="h-4 w-4" /><span>Prêt à écouter</span></div>;
        case 'error':
            return <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="h-4 w-4" /><span>Erreur</span></div>;
        case 'idle':
             return <div className="flex items-center gap-2 text-gray-400"><Mic className="h-4 w-4" /><span>En attente</span></div>;
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
        <div className="flex gap-2 w-full sm:w-auto">
          {status !== 'ready' && status !== 'playing' && status !== 'error' && (
            <Button
              onClick={handleGenerateAudio}
              disabled={!message.trim() || status === 'loading'}
              className="w-full"
            >
              <Mic className="mr-2 h-4 w-4" />
              {status === 'loading' ? 'Génération...' : 'Générer la voix'}
            </Button>
          )}

          {(status === 'ready' || status === 'playing') && (
            <>
              <Button onClick={playAudio} disabled={status !== 'ready'} className="w-full bg-green-600 hover:bg-green-700">
                <Play className="mr-2 h-4 w-4" />
                Écouter
              </Button>
              <Button onClick={handleGenerateAudio} variant="outline" size="icon" title="Générer une nouvelle version">
                <RotateCw className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
        
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
