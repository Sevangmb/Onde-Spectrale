// src/components/OndeSpectraleRadio.tsx
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRadioStore } from '@/shared/stores/useRadioStore';
import { getStationForFrequency, createDefaultStations, getCustomCharactersForUser, updateUserFrequency } from '@/app/actions';
import type { Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// Hooks personnalisés
import { usePlaylistManager } from '@/hooks/usePlaylistManager';
import { useRadioSoundEffects } from '@/hooks/useRadioSoundEffects';

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
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [allDjs, setAllDjs] = useState<(DJCharacter | CustomDJCharacter)[]>(DJ_CHARACTERS);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [audioContextEnabled, setAudioContextEnabled] = useState(false);

  const {
    frequency,
    sliderValue,
    currentStation,
    isLoadingStation,
    isScanning,
    signalStrength,
    setFrequency,
    setSliderValue,
    setCurrentStation,
    setIsLoadingStation,
    setIsScanning,
    setSignalStrength,
    setError
  } = useRadioStore();

  const fetchStationData = useCallback(async (freq: number) => {
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
  }, [setIsLoadingStation, setError, setSignalStrength, setCurrentStation]);
  
  const playlistManager = usePlaylistManager({
    station: currentStation,
    user,
    allDjs
  });

  const radioSounds = useRadioSoundEffects({
    volume: 0.2,
    enableEffects: false,
    fadeInDuration: 300,
    fadeOutDuration: 200
  });
  
  // Initial setup effect, runs only once
  useEffect(() => {
    setIsClient(true);
    
    setParticleStyles(
      Array.from({ length: 15 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }))
    );
    
    const init = async () => {
      await createDefaultStations();
      const initialFrequency = useRadioStore.getState().frequency;
      fetchStationData(initialFrequency);
    };
    init();

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

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserInteraction = useCallback(() => {
    if (!audioContextEnabled) {
      setAudioContextEnabled(true);
    }
    
    // Relancer la lecture si elle était bloquée ou si il y a une piste en attente
    if (playlistManager.currentTrack && !playlistManager.isPlaying && !playlistManager.isLoadingTrack) {
      playlistManager.togglePlayPause();
    }
  }, [audioContextEnabled, playlistManager]);

  useEffect(() => {
    if (!audioContextEnabled) {
      const events = ['click', 'touchstart', 'keydown'];
      events.forEach(event => document.addEventListener(event, handleUserInteraction, { once: true }));
      return () => {
        events.forEach(event => document.removeEventListener(event, handleUserInteraction));
      };
    }
  }, [audioContextEnabled, handleUserInteraction]);

  const handleScan = useCallback((direction: 'up' | 'down') => {
    if (isScanning) return;
    
    setIsScanning(true);
    radioSounds.playTuning();
    
    let newFrequency = sliderValue;
    const intervalId = setInterval(() => {
      newFrequency += direction === 'up' ? 0.1 : -0.1;
      setSliderValue(Math.max(87.0, Math.min(108.0, newFrequency)));
    }, 50);

    setTimeout(() => {
      clearInterval(intervalId);
      const finalFrequency = Math.round(newFrequency * 2)/2;
      const clampedFrequency = Math.max(87.0, Math.min(108.0, finalFrequency));
      setFrequency(clampedFrequency);
      setSliderValue(clampedFrequency);
      fetchStationData(clampedFrequency);
      setIsScanning(false);
    }, 1000);
  }, [isScanning, sliderValue, radioSounds, setIsScanning, setSliderValue, setFrequency, fetchStationData]);

  const handleFrequencyChange = (value: number[]) => {
    setSliderValue(value[0]);
  };

  const handleFrequencyCommit = useCallback(async (value: number[]) => {
    const newFreq = value[0];
    setFrequency(newFreq);
    fetchStationData(newFreq);
    if (user) {
      await updateUserFrequency(user.uid, newFreq);
    }
  }, [fetchStationData, setFrequency, user]);

  const isRadioActive = useMemo(() => isClient && !isLoadingStation && currentStation !== null, [isClient, isLoadingStation, currentStation]);

  return (
    <>
      <audio
        ref={playlistManager.audioRef}
        crossOrigin="anonymous"
        preload="metadata"
      />
      
      <div className="relative w-full min-h-[90vh] overflow-hidden bg-background">
        {isClient && particleStyles.map((style, i) => (
          <div
            key={i}
            className="absolute w-px h-px bg-primary/30 rounded-full animate-float"
            style={style}
          />
        ))}

        <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2">
                <Card className="w-full pip-boy-terminal shadow-2xl relative overflow-hidden fade-in">
                  <CardHeader className="relative border-b-2 border-primary/40 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <OndeSpectraleLogo className="h-8 w-8 text-primary phosphor-glow drop-shadow-lg" />
                        </div>
                        <CardTitle className="font-headline text-3xl text-primary tracking-wider drop-shadow-lg uppercase">
                          <span className="inline-block animate-flicker">Onde Spectrale</span>
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="retro-button"
                          onClick={() => router.push('/admin')}
                        >
                          <UserCog className="mr-1 h-4 w-4" /> Admin
                        </Button>
                        
                        {isRadioActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className="retro-button"
                          >
                            <ListMusic className="mr-2 h-4 w-4" /> 
                            Playlist ({playlistManager.playlistLength})
                          </Button>
                        )}
                        
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
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="retro-button"
                            onClick={() => router.push('/login')}
                          >
                            <Rss className="mr-2 h-4 w-4" /> Connexion
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 relative">
                    <div className="flex flex-col gap-6">
                      <div className="vintage-radio-frame pip-boy-terminal p-6 shadow-2xl relative overflow-hidden slide-up">
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <label htmlFor="frequency" className="text-sm font-mono font-bold text-primary/80 tracking-wider uppercase">
                              {'>>>'} Syntoniseur {'<<<'}
                            </label>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-2 h-5 rounded-sm transition-all duration-300 ${
                                      i < Math.floor(signalStrength / 20)
                                        ? 'bg-primary shadow-lg'
                                        : 'bg-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono w-12">
                                SIG:{signalStrength}%
                              </span>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-6xl font-mono font-bold tracking-widest relative mb-2 text-primary frequency-display">
                              <span className={`${currentStation ? 'animate-flicker-subtle' : ''}`}>
                                {sliderValue.toFixed(1)}
                              </span>
                              <span className="text-2xl ml-3 text-primary/70">MHz</span>
                              
                              {currentStation && (
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full animate-pulse shadow-lg"></div>
                              )}
                            </div>
                            
                            {isScanning && (
                              <div className="text-primary text-sm mt-2 animate-pulse font-mono uppercase tracking-wider">
                                {'>>>'} SCAN EN COURS {'<<<'}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleScan('down')}
                              disabled={frequency <= 87.0 || isScanning}
                              className="retro-button disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" /> SCAN-
                            </Button>
                            <div className="text-muted-foreground px-4 py-2 text-xs font-mono">
                              87.0 - 108.0 MHz
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleScan('up')}
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
                              onValueChange={handleFrequencyChange}
                              onValueCommit={handleFrequencyCommit}
                              className="w-full"
                              disabled={isScanning}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                              <span>87.0</span><span>95.0</span><span>108.0</span>
                            </div>
                          </div>

                          <div className="text-center space-y-2">
                            {currentStation ? (
                              <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-1"></div>
                                  {playlistManager.isLoadingTrack ? 'CHARGEMENT...' : 
                                   playlistManager.isPlaying ? 'TRANSMISSION EN COURS' : 'CONNEXION ÉTABLIE'}
                                </div>
                                
                                {(!audioContextEnabled || playlistManager.errorMessage?.includes('Cliquez')) && playlistManager.currentTrack && (
                                  <button
                                    onClick={handleUserInteraction}
                                    className="retro-button text-xs px-4 py-2 animate-pulse bg-primary/20 hover:bg-primary/30 border-primary/40"
                                  >
                                    🎵 {!audioContextEnabled ? 'ACTIVER L\'AUDIO' : 'DÉMARRER LA LECTURE'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 px-3 py-1 bg-destructive/10 border border-destructive/30 rounded-full text-destructive text-sm">
                                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse mr-1"></div>
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
                        ttsEnabled={playlistManager.ttsEnabled}
                        onEnableTTS={playlistManager.enableTTS}
                        onPlayPause={playlistManager.togglePlayPause}
                        onEnded={playlistManager.nextTrack}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(isRadioActive && currentStation && showPlaylist) && (
                <div className="lg:col-span-1 transition-opacity duration-500">
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
                </div>
              )}
            </div>
          </div>
        </div>
        
        <EmergencyAlertSystem isRadioActive={isRadioActive} currentFrequency={frequency} />
      </div>
    </>
  );
}
