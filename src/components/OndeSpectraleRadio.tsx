
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { getStationForFrequency, updateUserFrequency, getCustomCharactersForUser } from '@/app/actions';
import type { Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// Hooks personnalisés
import { usePlaylistManager } from '@/hooks/usePlaylistManager';

// Composants UI
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { OndeSpectraleLogo } from '@/components/icons';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SpectrumAnalyzer } from '@/components/SpectrumAnalyzer';
import { EnhancedPlaylist } from '@/components/EnhancedPlaylist';
import { EmergencyAlertSystem } from '@/components/EmergencyAlertSystem';

import { 
  RadioTower, 
  Rss, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  UserCog, 
  Settings,
  ListMusic
} from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export function OndeSpectraleRadio() {
  const [frequency, setFrequency] = useState(92.1);
  const [sliderValue, setSliderValue] = useState(frequency);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isLoadingStation, setIsLoadingStation] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [allDjs, setAllDjs] = useState<(DJCharacter | CustomDJCharacter)[]>(DJ_CHARACTERS);
  
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  const router = useRouter();

  const playlistManager = usePlaylistManager({
    station: currentStation,
    user,
    allDjs
  });
  
  const fetchStationData = useDebouncedCallback(async (freq: number) => {
      setIsLoadingStation(true);
      setError(null);

      try {
        const station = await getStationForFrequency(freq);
        
        const newSignalStrength = station 
          ? Math.floor(Math.random() * 20) + 80 
          : Math.floor(Math.random() * 30) + 10;
        
        setSignalStrength(newSignalStrength);
        setCurrentStation(station);
        
      } catch (err: any) {
        setError(`Erreur de données: ${err.message}`);
      } finally {
        setIsLoadingStation(false);
      }
  }, 500);

  useEffect(() => {
    setIsClient(true);
    
    fetchStationData(92.1);

    setParticleStyles(
      Array.from({ length: 15 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }))
    );

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const customDjs = await getCustomCharactersForUser(currentUser.uid);
          setAllDjs([...DJ_CHARACTERS, ...customDjs]);
        } catch (error) {
          console.error('Erreur chargement DJ personnalisés:', error);
        }
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanUp = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    const newFreq = Math.min(108.0, frequency + 0.5);
    setFrequency(newFreq);
    setSliderValue(newFreq); // Sync slider
    if (user) updateUserFrequency(user.uid, newFreq);
    fetchStationData(newFreq);
    setTimeout(() => setIsScanning(false), 300);
  }, [isScanning, user, frequency, fetchStationData]);

  const handleScanDown = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    const newFreq = Math.max(87.0, frequency - 0.5);
    setFrequency(newFreq);
    setSliderValue(newFreq); // Sync slider
    if (user) updateUserFrequency(user.uid, newFreq);
    fetchStationData(newFreq);
    setTimeout(() => setIsScanning(false), 300);
  }, [isScanning, user, frequency, fetchStationData]);

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value[0]);
  };

  const handleSliderCommit = async (value: number[]) => {
    const newFreq = value[0];
    setFrequency(newFreq);
    if (user) {
      await updateUserFrequency(user.uid, newFreq);
    }
    fetchStationData(newFreq);
  };

  const isRadioActive = useMemo(() => {
    return isClient && !isLoadingStation && currentStation !== null;
  }, [isClient, isLoadingStation, currentStation]);

  useEffect(() => {
    if(isRadioActive && currentStation && currentStation.playlist.length > 0) {
      setShowPlaylist(true);
    } else {
      setShowPlaylist(false);
    }
  }, [isRadioActive, currentStation]);

  return (
    <>
      <audio ref={playlistManager.audioRef} crossOrigin="anonymous" preload="metadata" />
      
      <div className="relative w-full min-h-[90vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background to-black"></div>
        
        {isClient && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particleStyles.map((style, i) => (
              <div 
                key={i} 
                className="absolute w-px h-px bg-primary/50 rounded-full animate-float" 
                style={style} 
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              <div className="lg:col-span-3">
                <Card className="w-full pip-boy-terminal">
                  
                  <CardHeader className="relative border-b-2 border-primary/40 pb-4 bg-gradient-to-r from-background to-card wasteland-texture">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="relative radioactive-pulse">
                          <OndeSpectraleLogo className="h-8 w-8 text-primary phosphor-glow drop-shadow-lg" />
                        </div>
                        <CardTitle className="font-headline text-3xl text-primary phosphor-glow tracking-wider uppercase">
                          <span className="inline-block animate-flicker">Onde Spectrale</span>
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {user ? (
                          <>
                            {currentStation && currentStation.ownerId === user.uid && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="retro-button" 
                                onClick={() => router.push(`/admin/stations/${currentStation.id}`)}
                              >
                                <Settings className="mr-2 h-4 w-4" /> Gérer
                              </Button>
                            )}
                            <Button 
                              variant="default" 
                              className="retro-button bg-primary/20 hover:bg-primary/30" 
                              onClick={() => router.push('/admin')}
                            >
                              <UserCog className="mr-2 h-4 w-4" /> Admin
                            </Button>
                          </>
                        ) : (
                          <Button 
                            variant="default" 
                            className="retro-button bg-accent/20 hover:bg-accent/30" 
                            onClick={() => router.push('/login')}
                          >
                            <Rss className="mr-2 h-4 w-4" /> Créer ou Gérer
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 relative bg-gradient-to-br from-black/70 to-zinc-900/70">
                    <div className="flex flex-col gap-6">
                      
                      <div className="vintage-radio-frame p-6 shadow-inner">
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <label htmlFor="frequency" className="text-sm font-mono font-bold text-primary phosphor-glow tracking-wider uppercase">
                              {'>>>'} Syntoniseur {'<<<'}
                            </label>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary phosphor-glow" />
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-2 h-5 rounded-sm transition-all duration-300 ${
                                      i < Math.floor(signalStrength / 20) 
                                        ? 'bg-primary phosphor-glow shadow-lg' 
                                        : 'bg-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono w-12 phosphor-glow">
                                SIG:{signalStrength}%
                              </span>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="frequency-display text-6xl font-mono font-bold tracking-widest relative mb-2">
                              <span className={`${currentStation ? 'animate-flicker' : 'animate-pulse'}`}>
                                {frequency.toFixed(1)}
                              </span>
                              <span className="text-2xl ml-3">MHz</span>
                              
                              {currentStation && (
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full radioactive-pulse shadow-lg"></div>
                              )}
                            </div>
                            
                            {isScanning && (
                              <div className="text-accent phosphor-glow text-sm mt-2 animate-pulse font-mono uppercase tracking-wider">
                                {'>>>'} SCAN EN COURS {'<<<'}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-4">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleScanDown} 
                              disabled={frequency <= 87.0 || isScanning} 
                              className="retro-button disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" /> SCAN-
                            </Button>
                            <div className="frequency-display px-4 py-2 text-xs">
                              87.0 - 108.0 MHz
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleScanUp} 
                              disabled={frequency >= 108.0 || isScanning} 
                              className="retro-button disabled:opacity-50"
                            >
                              SCAN+ <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <Slider
                              id="frequency"
                              min={87.0}
                              max={108.0}
                              step={0.1}
                              value={[sliderValue]}
                              onValueChange={handleSliderChange}
                              onValueCommit={handleSliderCommit}
                              className="w-full"
                              disabled={!!error || isScanning}
                            />
                            <div className="flex justify-between text-xs text-orange-400/60 font-mono">
                              <span>87.0</span><span>95.0</span><span>108.0</span>
                            </div>
                          </div>

                          <div className="text-center">
                            {currentStation ? (
                              <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-full text-green-300 text-sm">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  {playlistManager.isLoadingTrack ? 'CHARGEMENT...' : 
                                   playlistManager.isPlaying ? 'TRANSMISSION EN COURS' : 'CONNEXION ÉTABLIE'}
                                </div>
                                {!playlistManager.isPlaying && !playlistManager.isLoadingTrack && playlistManager.currentTrack && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={playlistManager.togglePlayPause}
                                    className="border-green-500/30 hover:bg-green-500/20 text-green-300 text-xs"
                                  >
                                    ▶ Lancer la lecture
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-900/30 border border-red-500/30 rounded-full text-red-300 text-sm">
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                {isLoadingStation ? 'ANALYSE DU SPECTRE...' : 'STATIQUE'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <SpectrumAnalyzer isPlaying={playlistManager.isPlaying} className="h-24" />
                      
                      <AudioPlayer 
                        track={playlistManager.currentTrack} 
                        isPlaying={playlistManager.isPlaying} 
                        isLoading={playlistManager.isLoadingTrack}
                        audioRef={playlistManager.audioRef}
                        ttsMessage={playlistManager.ttsMessage}
                        errorMessage={playlistManager.errorMessage}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className={`lg:col-span-2 transition-opacity duration-500 ${showPlaylist ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 {showPlaylist && currentStation && (
                   <EnhancedPlaylist
                      playlist={currentStation.playlist}
                      currentTrackId={playlistManager.currentTrack?.id}
                      isPlaying={playlistManager.isPlaying}
                      isLoadingTrack={playlistManager.isLoadingTrack}
                      failedTracks={playlistManager.failedTracks}
                      onTrackSelect={playlistManager.playTrackById}
                      onPlayPause={playlistManager.togglePlayPause}
                      onNext={playlistManager.nextTrack}
                      onPrevious={playlistManager.previousTrack}
                      canGoBack={playlistManager.canGoBack}
                      className="h-full"
                    />
                 )}
              </div>
            </div>
          </div>
        </div>
        
        <EmergencyAlertSystem isRadioActive={isRadioActive} currentFrequency={frequency} />
      </div>
    </>
  );
}
