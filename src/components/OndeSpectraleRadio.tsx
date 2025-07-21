
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { getStationForFrequency, getInterference, updateUserFrequency, getAudioForMessage } from '@/app/actions';
import type { Station, PlaylistItem, CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { OndeSpectraleLogo } from '@/components/icons';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SpectrumAnalyzer } from '@/components/SpectrumAnalyzer';
import { EnhancedPlaylist } from '@/components/EnhancedPlaylist';
import { EmergencyAlertSystem } from '@/components/EmergencyAlertSystem';

import { RadioTower, Settings, Rss, AlertTriangle, ChevronLeft, ChevronRight, Zap, Loader2 } from 'lucide-react';
import { StationManagementSheet } from './StationManagementSheet';

interface ParticleStyle {
    left: string;
    top: string;
    animationDelay: string;
    animationDuration: string;
}

export function OndeSpectraleRadio() {
  const [frequency, setFrequency] = useState(92.1);
  const [debouncedFrequency] = useDebounce(frequency, 500);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [interference, setInterference] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const router = useRouter();

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingMessage, setIsGeneratingMessage] = useState(false);


  const [signalStrength, setSignalStrength] = useState(0);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isClient, setIsClient] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
  const currentAudioUrlRef = useRef<string | null>(null);


  const playlist = useMemo(() => currentStation?.playlist || [], [currentStation]);
  const currentTrack = useMemo(() => playlist[currentTrackIndex], [playlist, currentTrackIndex]);

  const isRadioActive = useMemo(() => {
    return isClient && !isLoading && (currentStation !== null || !!interference);
  }, [isClient, isLoading, currentStation, interference]);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
   useEffect(() => {
    if (isClient) {
      setParticleStyles(
        Array.from({ length: 15 }, () => ({
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 5}s`,
          animationDuration: `${3 + Math.random() * 4}s`,
        }))
      );
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient) {
        if (currentStation) {
            setSignalStrength(Math.floor(Math.random() * 20) + 80);
        } else {
            setSignalStrength(Math.floor(Math.random() * 30) + 10);
        }
    }
  }, [currentStation, debouncedFrequency, isClient]);

  const handleScanUp = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    const newFreq = Math.min(108.0, frequency + 0.5);
    setFrequency(newFreq);
    setTimeout(() => setIsScanning(false), 1000);
  }, [frequency, isScanning]);

  const handleScanDown = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    const newFreq = Math.max(87.0, frequency - 0.5);
    setFrequency(newFreq);
    setTimeout(() => setIsScanning(false), 1000);
  }, [frequency, isScanning]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const dj = useMemo(() => {
    if (!currentStation) return null;
    const allDjs: (CustomDJCharacter | (typeof DJ_CHARACTERS[0]))[] = [...DJ_CHARACTERS];
    return allDjs.find(d => d.id === currentStation.djCharacterId) || null;
  }, [currentStation]);

  const handleFrequencyChange = (value: number[]) => {
    setFrequency(value[0]);
  };

  const handleFrequencyCommit = async (value: number[]) => {
      if (user) {
          await updateUserFrequency(user.uid, value[0]);
      }
  }
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const station = await getStationForFrequency(debouncedFrequency);
        setCurrentStation(station);
        
        if (station) {
          setCurrentTrackIndex(0);
          setInterference(null);
          if (audioRef.current) audioRef.current.loop = false;
        } else {
          const interferenceText = await getInterference(debouncedFrequency);
          setInterference(interferenceText);
          setAudioUrl('/audio/static.mp3');
          if (audioRef.current) audioRef.current.loop = true;
          setIsPlaying(true);
        }
      } catch (err: any) {
        setError(`Erreur de données: ${err.message}. Vérifiez les règles Firestore.`);
        setCurrentStation(null);
        setInterference('Erreur de communication avec la station.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedFrequency]);

  const onTrackSelect = useCallback((index: number) => {
    if (playlist.length === 0) return;
    
    const clampedIndex = Math.max(0, Math.min(index, playlist.length - 1));
    setCurrentTrackIndex(clampedIndex);
    setIsPlaying(true);
  }, [playlist.length]);
  
  const onEnded = useCallback(() => {
    if (playlist.length === 0 || (audioRef.current && audioRef.current.loop)) {
      setIsPlaying(true); // Keep playing if it's a loop (static)
      return;
    }
    
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIndex);
    if(playlist.length > 1) {
        setIsPlaying(true);
    } else {
        setIsPlaying(false);
    }
  }, [currentTrackIndex, playlist.length]);

  useEffect(() => {
    const handleAudio = async () => {
        if (!isPlaying || !currentTrack) {
          if (audioRef.current && !audioRef.current.loop) {
            audioRef.current.pause();
          }
          return;
        }

        if (currentTrack.type === 'music') {
            setAudioUrl(currentTrack.url);
            return;
        }

        if (currentTrack.type === 'message') {
            if (!currentStation || !user) {
                setError("Connexion requise pour les messages DJ.");
                setIsPlaying(false);
                return;
            }

            setIsGeneratingMessage(true);
            
            if (currentAudioUrlRef.current) {
                URL.revokeObjectURL(currentAudioUrlRef.current);
                currentAudioUrlRef.current = null;
            }

            const result = await getAudioForMessage(currentTrack.url, currentStation.djCharacterId, user.uid);
            
            if (result.audioBase64) {
                try {
                    const byteCharacters = atob(result.audioBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'audio/wav' });
                    const url = URL.createObjectURL(blob);
                    setAudioUrl(url);
                    currentAudioUrlRef.current = url;
                } catch (e) {
                    setError("Échec du traitement des données audio.");
                    setIsPlaying(false);
                }
            } else {
                setError(result.error || "Échec de la génération audio du message.");
                setIsPlaying(false);
            }
            setIsGeneratingMessage(false);
        }
    };

    if (currentStation) {
      handleAudio();
    }

    return () => {
        if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
        }
    };
}, [currentTrack, isPlaying, currentStation, user]);

useEffect(() => {
    if (audioRef.current && audioUrl) {
      if (audioRef.current.src !== audioUrl) {
        audioRef.current.src = audioUrl;
      }
      if (isPlaying) {
        audioRef.current.load();
        audioRef.current.play().catch(e => console.error("Error playing audio on src change:", e));
      }
    }
}, [audioUrl, isPlaying]);


  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    onTrackSelect(nextIndex);
  }, [currentTrackIndex, playlist.length, onTrackSelect]);

  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    onTrackSelect(prevIndex);
  }, [currentTrackIndex, playlist.length, onTrackSelect]);

  const handlePlayPause = useCallback(() => {
    if (isGeneratingMessage) return;

    if (currentStation && playlist.length === 0) return;
    
    setIsPlaying(prev => !prev);
  }, [playlist.length, isGeneratingMessage, currentStation]);

  useEffect(() => {
    if (currentStation && playlist.length > 0) {
      setCurrentTrackIndex(0);
    }
  }, [currentStation, playlist.length]);

  return (
    <>
      <audio 
        ref={audioRef} 
        onEnded={onEnded} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
        crossOrigin="anonymous"
      />
      <div className="relative w-full min-h-[90vh] overflow-hidden">
        {/* Arrière-plan post-apocalyptique animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
        
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-red-700/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `linear-gradient(90deg, transparent 49%, rgba(255, 165, 0, 0.3) 49%, rgba(255, 165, 0, 0.3) 51%, transparent 51%),
                              linear-gradient(0deg, transparent 49%, rgba(255, 165, 0, 0.2) 49%, rgba(255, 165, 0, 0.2) 51%, transparent 51%)`,
              backgroundSize: '50px 50px',
              animation: 'drift 20s linear infinite'
            }}
          />
        </div>
        
        {isClient && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {particleStyles.map((style, i) => (
                <div key={i} className="absolute w-1 h-1 bg-orange-400/50 rounded-full animate-float" style={style} />
              ))}
            </div>
        )}

        <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-4xl mx-auto">
            <Card className="w-full border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-scanline"></div>
              </div>
              <div className="absolute inset-1 border border-orange-400/20 rounded-lg pointer-events-none animate-pulse-subtle"></div>
              
              <CardHeader className="relative border-b-2 border-orange-500/30 pb-4 bg-gradient-to-r from-black/90 to-zinc-900/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <OndeSpectraleLogo className="h-8 w-8 text-orange-400 drop-shadow-lg" />
                      <div className="absolute inset-0 bg-orange-400/30 blur-sm animate-pulse"></div>
                    </div>
                    <CardTitle className="font-headline text-3xl text-orange-100 tracking-wider drop-shadow-lg">
                      <span className="inline-block animate-flicker">Onde Spectrale</span>
                    </CardTitle>
                  </div>
                   <div className="flex items-center gap-2">
                     {currentStation && user && currentStation.ownerId === user.uid && (
                      <StationManagementSheet station={currentStation} dj={dj}>
                        <Button variant="ghost" size="icon" className="border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-400/50">
                          <Settings className="h-5 w-5 text-orange-300" />
                        </Button>
                      </StationManagementSheet>
                    )}
                     {!user && (
                      <Button variant="default" className="bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20" onClick={() => router.push('/login')}>
                          <Rss className="mr-2 h-4 w-4" />
                          Créer ou Gérer
                      </Button>
                     )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-8 p-6 relative bg-gradient-to-br from-black/70 to-zinc-900/70">
                <div className="flex flex-col gap-6">
                  <div className="bg-black/80 border-2 border-orange-500/40 rounded-lg p-6 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className={`w-full h-full bg-gradient-to-r from-transparent via-orange-400/30 to-transparent ${isScanning ? 'animate-scan' : ''}`}></div>
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="frequency" className="text-sm font-medium text-orange-300/80 font-headline tracking-wider uppercase">
                          Syntoniseur
                        </label>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-orange-400" />
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                className={`w-1 h-4 rounded-full transition-all duration-300 ${
                                  i < Math.floor(signalStrength / 20) 
                                    ? 'bg-orange-400 shadow-lg shadow-orange-400/50' 
                                    : 'bg-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-orange-300/60 font-mono w-8">
                            {signalStrength}%
                          </span>
                        </div>
                      </div>

                      <div className="text-center">
                        <div className="text-6xl font-headline font-bold text-orange-400 tracking-widest drop-shadow-lg relative">
                          <span className={`${currentStation ? 'animate-flicker-subtle' : 'animate-flicker'}`}>
                            {frequency.toFixed(1)}
                          </span>
                          <span className="text-3xl text-orange-300 ml-2">MHz</span>
                          
                          {currentStation && (
                            <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                          )}
                        </div>
                        
                        {isScanning && (
                          <div className="text-orange-300/60 text-sm mt-2 animate-pulse">
                            SCAN EN COURS...
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-center gap-4">
                        <Button variant="ghost" size="sm" onClick={handleScanDown} disabled={frequency <= 87.0 || isScanning} className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 disabled:opacity-50">
                          <ChevronLeft className="h-4 w-4 mr-1" /> SCAN
                        </Button>
                        <div className="px-4 py-2 bg-black/60 border border-orange-500/20 rounded text-orange-300/80 text-xs font-mono">
                          87.0 - 108.0 MHz
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleScanUp} disabled={frequency >= 108.0 || isScanning} className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 disabled:opacity-50">
                          SCAN <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Slider
                          id="frequency"
                          min={87.0}
                          max={108.0}
                          step={0.1}
                          value={[frequency]}
                          onValueChange={handleFrequencyChange}
                          onValueCommit={handleFrequencyCommit}
                          className="w-full"
                          disabled={!!error || isScanning}
                        />
                        <div className="flex justify-between text-xs text-orange-400/60 font-mono">
                          <span>87.0</span><span>95.0</span><span>108.0</span>
                        </div>
                      </div>

                      <div className="text-center">
                        {currentStation ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-full text-green-300 text-sm">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            STATION VERROUILLÉE
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-500/30 rounded-full text-red-300 text-sm">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                            RECHERCHE DE SIGNAL
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <SpectrumAnalyzer isPlaying={isPlaying} audioRef={audioRef} className="h-24" />

                  <div className="h-40 bg-black/70 border border-orange-500/40 rounded-lg p-4 flex flex-col justify-center items-center text-center backdrop-blur-sm shadow-lg shadow-orange-500/10">
                    {isLoading || isGeneratingMessage ? (
                      <div className="flex flex-col items-center gap-2 text-orange-300">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="font-semibold">{isLoading ? 'Syntonisation...' : 'Génération du message...'}</p>
                      </div>
                    ) : error ? (
                       <div className="text-red-400 flex flex-col items-center gap-2">
                          <AlertTriangle className="h-8 w-8 text-red-500 animate-pulse" />
                          <p className="font-semibold">Erreur de connexion</p>
                          <p className="text-sm text-red-300/80">{error}</p>
                       </div>
                    ) : currentStation ? (
                      <>
                        <RadioTower className="h-6 w-6 text-orange-400 mb-2 animate-pulse" />
                        <h3 className="font-headline text-2xl text-orange-100 drop-shadow-lg">{currentStation.name}</h3>
                        <p className="text-orange-300/80">DJ: {dj?.name || 'Inconnu'}</p>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <p className="text-lg text-orange-300/70 animate-glitch break-words">{interference || 'Statique...'}</p>
                      </div>
                    )}
                  </div>
                   {(currentStation && playlist.length > 0) && (
                     <AudioPlayer 
                       track={currentTrack} 
                       isPlaying={isPlaying} 
                       onPlayPause={handlePlayPause} 
                       onNext={handleNext} 
                       onPrev={handlePrev} 
                       audioRef={audioRef} 
                     />
                   )}
                </div>
                
                <div className="flex flex-col">
                  <EnhancedPlaylist 
                    playlist={playlist}
                    currentTrackIndex={currentTrackIndex}
                    isPlaying={isPlaying}
                    isLoading={isLoading}
                    onTrackSelect={onTrackSelect}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <EmergencyAlertSystem isRadioActive={isRadioActive} currentFrequency={frequency} />
      </div>
    </>
  );
}
