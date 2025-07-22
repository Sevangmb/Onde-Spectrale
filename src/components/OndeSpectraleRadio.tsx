
'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { getStationForFrequency, updateUserFrequency, getAudioForMessage } from '@/app/actions';
import type { Station, PlaylistItem } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { MUSIC_CATALOG } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { OndeSpectraleLogo } from '@/components/icons';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SpectrumAnalyzer } from '@/components/SpectrumAnalyzer';
import { EmergencyAlertSystem } from '@/components/EmergencyAlertSystem';

import { RadioTower, Rss, ChevronLeft, ChevronRight, Zap, UserCog, Settings } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const router = useRouter();

  const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>(undefined);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);

  const [signalStrength, setSignalStrength] = useState(0);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isClient, setIsClient] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentBlobUrl = useRef<string | null>(null);
  const isMounted = useRef(true);


  useEffect(() => {
    isMounted.current = true;
    setIsClient(true);
    setParticleStyles(
      Array.from({ length: 15 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }))
    );
    return () => { isMounted.current = false; };
  }, []);

  const cleanupAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    if (currentBlobUrl.current) {
      URL.revokeObjectURL(currentBlobUrl.current);
      currentBlobUrl.current = null;
    }
  }, []);

  const loadAndPlay = useCallback((url: string) => {
    if (!audioRef.current || !isMounted.current) return;
    const audio = audioRef.current;

    const handleCanPlay = async () => {
      try {
        if (isMounted.current) {
          await audio.play();
          setIsPlaying(true);
        }
      } catch (e) {
        console.error("Error playing audio:", e);
        if (isMounted.current) {
            setIsPlaying(false);
        }
      } finally {
         if (isMounted.current) {
            setIsLoadingTrack(false);
         }
      }
      audio.removeEventListener('canplaythrough', handleCanPlay);
    };
    
    setIsLoadingTrack(true);
    // Pause previous track before loading new one
    audio.pause();
    
    // Use a fresh event listener
    audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
    
    // Set the new source. This triggers the browser to load it.
    audio.src = url;
  }, []);


 const playNextTrack = useCallback(async () => {
    if (!isMounted.current || !currentStation) return;

    cleanupAudio();
    
    let nextTrack: PlaylistItem;
    const nextType = currentTrack?.type === 'music' ? 'message' : 'music';
    const stationMessages = currentStation.playlist.filter(p => p.type === 'message');

    if (nextType === 'message' && stationMessages.length > 0) {
      // Play a message
      nextTrack = stationMessages[Math.floor(Math.random() * stationMessages.length)];
      setCurrentTrack(nextTrack);
      setIsLoadingTrack(true);
      
      const result = await getAudioForMessage(nextTrack.url, currentStation.djCharacterId, user!.uid);
      
      if (result.audioBase64 && isMounted.current) {
          try {
              const byteCharacters = atob(result.audioBase64);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'audio/wav' });
              const blobUrl = URL.createObjectURL(blob);
              currentBlobUrl.current = blobUrl;
              loadAndPlay(blobUrl);
          } catch (e: any) {
              console.error("Audio playback error:", e);
              if(isMounted.current) setIsLoadingTrack(false);
          }
      } else {
          console.error(result.error || "Failed to generate audio.");
          if(isMounted.current) setIsLoadingTrack(false);
      }
    } else {
      // Play music (either as fallback or as the next track)
      nextTrack = MUSIC_CATALOG[Math.floor(Math.random() * MUSIC_CATALOG.length)];
      setCurrentTrack(nextTrack);
      setIsLoadingTrack(true);
      try {
          const response = await fetch(nextTrack.url);
          if (!response.ok) throw new Error(`Failed to fetch music: ${response.statusText}`);
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          currentBlobUrl.current = blobUrl;
          if (isMounted.current) loadAndPlay(blobUrl);
      } catch(e) {
          console.error("Error fetching music:", e);
          if(isMounted.current) setIsLoadingTrack(false);
      }
    }
  }, [currentStation, user, loadAndPlay, cleanupAudio, currentTrack?.type]);


  const onEnded = useCallback(() => {
    if (!isMounted.current) return;
    setIsPlaying(false);
    playNextTrack();
  }, [playNextTrack]);


  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', onEnded);
      return () => {
        if(audio) {
          audio.removeEventListener('ended', onEnded);
        }
      };
    }
  }, [onEnded]);


  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      cleanupAudio();
      setCurrentStation(null);
      setCurrentTrack(undefined);
      setIsPlaying(false);
      setIsLoadingTrack(false);

      try {
        const station = await getStationForFrequency(debouncedFrequency);
        setSignalStrength(station ? Math.floor(Math.random() * 20) + 80 : Math.floor(Math.random() * 30) + 10);
        
        if (isMounted.current) {
          setCurrentStation(station);
        }
      } catch (err: any) {
        if (isMounted.current) setError(`Erreur de données: ${err.message}.`);
      } finally {
        if (isMounted.current) setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedFrequency, cleanupAudio]);

  useEffect(() => {
    if (currentStation) {
      playNextTrack();
    } else {
      cleanupAudio();
    }
  }, [currentStation, playNextTrack, cleanupAudio]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (isMounted.current) setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleScanUp = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    const newFreq = Math.min(108.0, frequency + 0.5);
    setFrequency(newFreq);
    setTimeout(() => { if (isMounted.current) setIsScanning(false); }, 1000);
  }, [frequency, isScanning]);

  const handleScanDown = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    const newFreq = Math.max(87.0, frequency - 0.5);
    setFrequency(newFreq);
    setTimeout(() => { if (isMounted.current) setIsScanning(false); }, 1000);
  }, [frequency, isScanning]);

  const handleFrequencyChange = (value: number[]) => {
    setFrequency(value[0]);
  };

  const handleFrequencyCommit = async (value: number[]) => {
      if (user) {
          await updateUserFrequency(user.uid, value[0]);
      }
  }

  const isRadioActive = useMemo(() => {
    return isClient && !isLoading && (currentStation !== null);
  }, [isClient, isLoading, currentStation]);


  return (
    <>
      <audio ref={audioRef} crossOrigin="anonymous"/>
      <div className="relative w-full min-h-[90vh] overflow-hidden">
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
          <div className="w-full max-w-xl mx-auto">
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
                        {user ? (
                           <>
                             {currentStation && currentStation.ownerId === user.uid && (
                                <Button variant="outline" size="sm" className="border-orange-500/30 hover:bg-orange-500/20 text-orange-300" onClick={() => router.push(`/admin/stations/${currentStation.id}`)}>
                                    <Settings className="mr-2 h-4 w-4" /> Gérer
                                </Button>
                             )}
                             <Button variant="default" className="bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20" onClick={() => router.push('/admin')}>
                                <UserCog className="mr-2 h-4 w-4" /> Admin
                             </Button>
                           </>
                        ) : (
                             <Button variant="default" className="bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20" onClick={() => router.push('/login')}>
                                <Rss className="mr-2 h-4 w-4" /> Créer ou Gérer
                            </Button>
                        )}
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 relative bg-gradient-to-br from-black/70 to-zinc-900/70">
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
                            {isLoadingTrack ? 'CHARGEMENT...' : ( isPlaying ? 'TRANSMISSION EN COURS' : 'CONNEXION ÉTABLIE' ) }
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-500/30 rounded-full text-red-300 text-sm">
                            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                             {isLoading ? 'ANALYSE DU SPECTRE...' : 'STATIQUE'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <SpectrumAnalyzer isPlaying={isPlaying} className="h-24" />
                  
                  <AudioPlayer 
                    track={currentTrack} 
                    isPlaying={isPlaying} 
                    isLoading={isLoadingTrack}
                    audioRef={audioRef} 
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
