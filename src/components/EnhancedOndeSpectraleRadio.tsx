// src/components/EnhancedOndeSpectraleRadio.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  useRadioState, 
  usePlaybackState, 
  useDataState, 
  useUIState, 
  useUserState,
  useRadioActions 
} from '@/stores/enhancedRadioStore';
import { createDefaultStations, getCustomCharactersForUser, updateUserFrequency } from '@/app/actions-enhanced';
import type { DJCharacter, CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { convertFirebaseUser, getAppUserId } from '@/lib/userConverter';

// Enhanced hooks
import { useEnhancedPlaylistManager } from '@/hooks/useEnhancedPlaylistManager';
import { useEnhancedStationSync, useStationForFrequency } from '@/hooks/useEnhancedStationSync';
import { useRadioSoundEffects } from '@/hooks/useRadioSoundEffects';
import { radioDebug } from '@/lib/debug';

// Services
import { stationService } from '@/services/StationService';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { OndeSpectraleLogo } from '@/components/icons';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SpectrumAnalyzer } from '@/components/SpectrumAnalyzer';
import { StationSkeleton, SpectrumSkeleton } from '@/components/LoadingSkeleton';
import { EnhancedPlaylist } from '@/components/EnhancedPlaylist';
import { EmergencyAlertSystem } from '@/components/EmergencyAlertSystem';

// Icons
import {
  RadioTower,
  Rss,
  ChevronLeft,
  ChevronRight,
  Zap,
  UserCog,
  Settings,
  ListMusic,
  RefreshCw
} from 'lucide-react';

// Memoized components for performance
const MemoizedAudioPlayer = React.memo(AudioPlayer);
const MemoizedSpectrumAnalyzer = React.memo(SpectrumAnalyzer);
const MemoizedEnhancedPlaylist = React.memo(EnhancedPlaylist);
const MemoizedEmergencyAlertSystem = React.memo(EmergencyAlertSystem);

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export function EnhancedOndeSpectraleRadio() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  
  // Store state selectors
  const radio = useRadioState();
  const playback = usePlaybackState();
  const data = useDataState();
  const ui = useUIState();
  const user = useUserState();
  const actions = useRadioActions();
  
  // Enhanced hooks
  const { notifyStationsUpdated } = useEnhancedStationSync();
  const { 
    station: currentStation, 
    isLoading: isLoadingStation, 
    error: stationError,
    refresh: refreshStation 
  } = useStationForFrequency(radio.frequency);
  
  const playlistManager = useEnhancedPlaylistManager({
    station: currentStation,
    user: user.user,
    allDjs: [...DJ_CHARACTERS, ...user.customDJs]
  });
  
  const radioSounds = useRadioSoundEffects({
    volume: 0.2,
    enableEffects: false,
    fadeInDuration: 300,
    fadeOutDuration: 200
  });
  
  // Optimized particle generation with useMemo
  const particleStyles = useMemo<ParticleStyle[]>(() => 
    Array.from({ length: 15 }, (_, i) => ({
      left: `${(i * 7 + Math.sin(i) * 20) % 100}%`,
      top: `${(i * 13 + Math.cos(i) * 20) % 100}%`,
      animationDelay: `${(i * 0.3) % 5}s`,
      animationDuration: `${3 + (i % 4)}s`,
    })), []
  );
  
  // Initialize app
  useEffect(() => {
    setIsClient(true);
    
    const init = async () => {
      try {
        await stationService.createDefaultStations();
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ App initialization failed:', error);
      }
    };
    
    init();
    
    // Auth state listener
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Convert Firebase User to App User
      const appUser = firebaseUser ? convertFirebaseUser(firebaseUser) : null;
      actions.setUser(appUser);
      
      if (firebaseUser) {
        try {
          const customDjs = await getCustomCharactersForUser(firebaseUser.uid);
          actions.setCustomDJs(customDjs);
        } catch (error) {
          console.error('Error loading custom DJs:', error);
        }
      } else {
        actions.setCustomDJs([]);
      }
    });
    
    return () => unsubscribe();
  }, [actions]);
  
  // Sync current station to store when it changes
  useEffect(() => {
    if (currentStation !== data.currentStation) {
      actions.setCurrentStation(currentStation);
    }
  }, [currentStation, data.currentStation, actions]);
  
  // Handle user interaction to enable audio context
  const handleUserInteraction = useCallback(() => {
    if (!ui.audioContextEnabled) {
      actions.enableAudioContext();
    }
    
    // Auto-enable autoplay on first interaction
    if (!ui.autoPlayEnabled) {
      actions.enableAutoPlay();
      console.log('🎵 Autoplay enabled by user interaction');
    }
    
    // Start playback if there's a track ready
    if (playback.currentTrack && !playback.isPlaying && !playback.isLoading) {
      playlistManager.togglePlayPause();
    } else if (!playback.currentTrack && currentStation && currentStation.playlist.length > 0) {
      // Start with first track
      playlistManager.togglePlayPause();
    }
  }, [ui.audioContextEnabled, ui.autoPlayEnabled, playback.currentTrack, playback.isPlaying, playback.isLoading, currentStation, actions, playlistManager]);
  
  // Auto-enable audio context on user interaction
  useEffect(() => {
    if (!ui.audioContextEnabled) {
      const events = ['click', 'touchstart', 'keydown'];
      const handler = () => handleUserInteraction();
      
      events.forEach(event => document.addEventListener(event, handler, { once: true }));
      
      return () => {
        events.forEach(event => document.removeEventListener(event, handler));
      };
    }
  }, [ui.audioContextEnabled, handleUserInteraction]);
  
  // Enhanced scan function with optimistic updates
  const handleScan = useCallback((direction: 'up' | 'down') => {
    if (radio.isScanning) return;
    
    actions.setIsScanning(true);
    radioSounds.playTuning();
    
    let newFrequency = radio.sliderValue;
    const intervalId = setInterval(() => {
      newFrequency += direction === 'up' ? 0.1 : -0.1;
      actions.setSliderValue(Math.max(87.0, Math.min(108.0, newFrequency)));
    }, 50);
    
    setTimeout(() => {
      clearInterval(intervalId);
      const finalFrequency = Math.round(newFrequency * 2) / 2;
      const clampedFrequency = Math.max(87.0, Math.min(108.0, finalFrequency));
      
      // Update frequency with optimistic update
      actions.setFrequency(clampedFrequency);
      actions.setSliderValue(clampedFrequency);
      actions.setIsScanning(false);
    }, 1000);
  }, [radio.isScanning, radio.sliderValue, radioSounds, actions]);
  
  // Frequency change handlers
  const handleFrequencyChange = useCallback((value: number[]) => {
    actions.setSliderValue(value[0]);
  }, [actions]);
  
  const handleFrequencyCommit = useCallback(async (value: number[]) => {
    const newFreq = value[0];
    await actions.setFrequency(newFreq);
    
    // Update user frequency if logged in
    if (user.user) {
      try {
        const userId = getAppUserId(user.user);
        if (userId) {
          await updateUserFrequency(userId, newFreq);
        }
      } catch (error) {
        console.warn('Failed to update user frequency:', error);
      }
    }
  }, [actions, user.user]);
  
  // Computed values
  const isRadioActive = useMemo(() => 
    isClient && !isLoadingStation && currentStation !== null, 
    [isClient, isLoadingStation, currentStation]
  );
  
  const signalDisplay = useMemo(() => {
    const strength = radio.signalStrength;
    const bars = Math.floor(strength / 20);
    return { strength, bars };
  }, [radio.signalStrength]);
  
  return (
    <>
      <audio
        ref={playlistManager.audioRef}
        crossOrigin="anonymous"
        preload="metadata"
      />
      
      <div className="relative w-full min-h-[90vh] overflow-hidden bg-background">
        {/* Animated particles */}
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
              
              {/* Main radio control */}
              <div className="lg:col-span-2">
                <Card className="w-full pip-boy-terminal shadow-2xl relative overflow-hidden fade-in">
                  <CardHeader className="relative border-b-2 border-primary/40 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <OndeSpectraleLogo className="h-8 w-8 text-primary phosphor-glow drop-shadow-lg" />
                        </div>
                        <CardTitle className="font-headline text-3xl text-primary tracking-wider drop-shadow-lg uppercase">
                          <span className="inline-block">Onde Spectrale</span>
                        </CardTitle>
                      </div>
                      
                      {/* Control buttons */}
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
                            onClick={() => actions.togglePlaylist()}
                            className="retro-button"
                          >
                            <ListMusic className="mr-2 h-4 w-4" /> 
                            Playlist ({playlistManager.playlistLength})
                          </Button>
                        )}
                        
                        {user.user ? (
                          <>
                            {currentStation && currentStation.ownerId === user.user.id && (
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
                      {/* Radio tuner */}
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
                                      i < signalDisplay.bars
                                        ? 'bg-primary shadow-lg'
                                        : 'bg-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-muted-foreground font-mono w-12">
                                SIG:{signalDisplay.strength}%
                              </span>
                              {process.env.NODE_ENV === 'development' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={refreshStation}
                                    className="h-6 w-6 p-0 ml-2"
                                    title="Rafraîchir la station"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => radioDebug.testFrequency(radio.frequency)}
                                    className="h-6 w-6 p-0 ml-2"
                                    title="Debug fréquence"
                                  >
                                    🐛
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Frequency display */}
                          <div className="text-center">
                            <div className="text-6xl font-mono font-bold tracking-widest relative mb-2 text-primary frequency-display">
                              <span>
                                {radio.sliderValue.toFixed(1)}
                              </span>
                              <span className="text-2xl ml-3 text-primary/70">MHz</span>
                              
                              {currentStation && (
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full animate-pulse shadow-lg"></div>
                              )}
                            </div>
                            
                            {radio.isScanning && (
                              <div className="text-primary text-sm mt-2 animate-pulse font-mono uppercase tracking-wider">
                                {'>>>'} SCAN EN COURS {'<<<'}
                              </div>
                            )}
                          </div>
                          
                          {/* Scan buttons */}
                          <div className="flex items-center justify-center gap-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleScan('down')}
                              disabled={radio.frequency <= 87.0 || radio.isScanning}
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
                              disabled={radio.frequency >= 108.0 || radio.isScanning}
                              className="retro-button disabled:opacity-50"
                            >
                              SCAN+ <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                          
                          {/* Frequency slider */}
                          <div className="space-y-2">
                            <Slider
                              id="frequency"
                              min={87.0}
                              max={108.0}
                              step={0.1}
                              value={[radio.sliderValue]}
                              onValueChange={handleFrequencyChange}
                              onValueCommit={handleFrequencyCommit}
                              className="w-full"
                              disabled={radio.isScanning}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground font-mono">
                              <span>87.0</span><span>95.0</span><span>108.0</span>
                            </div>
                          </div>
                          
                          {/* Status display */}
                          <div className="text-center space-y-2">
                            {currentStation ? (
                              <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full text-primary text-sm">
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse mr-1"></div>
                                  {playback.isLoading ? 'CHARGEMENT...' : 
                                   playback.isPlaying ? (ui.autoPlayEnabled ? 'PLAYLIST AUTO ♪' : 'TRANSMISSION EN COURS') : 
                                   (ui.autoPlayEnabled ? 'PLAYLIST ACTIVÉE' : 'CONNEXION ÉTABLIE')}
                                </div>
                                
                                {(!ui.audioContextEnabled || playback.errorMessage?.includes('Cliquez')) && playback.currentTrack && (
                                  <button
                                    onClick={handleUserInteraction}
                                    className="retro-button text-xs px-4 py-2 animate-pulse bg-primary/20 hover:bg-primary/30 border-primary/40"
                                  >
                                    🎵 {!ui.audioContextEnabled ? 'ACTIVER L\'AUDIO' : 'DÉMARRER LA LECTURE'}
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
                      
                      {/* Spectrum analyzer */}
                      {isLoadingStation ? (
                        <SpectrumSkeleton className="h-24" />
                      ) : (
                        <MemoizedSpectrumAnalyzer isPlaying={playback.isPlaying} className="h-24" />
                      )}
                      
                      {/* Audio player */}
                      <MemoizedAudioPlayer
                        track={playback.currentTrack || undefined}
                        isPlaying={playback.isPlaying}
                        isLoading={playback.isLoading}
                        audioRef={playlistManager.audioRef}
                        ttsMessage={ui.ttsMessage}
                        errorMessage={playback.errorMessage}
                        ttsEnabled={ui.ttsEnabled}
                        onEnableTTS={actions.enableTTS}
                        onPlayPause={playlistManager.togglePlayPause}
                        onEnded={playlistManager.nextTrack}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Playlist panel */}
              {(isRadioActive && currentStation && ui.showPlaylist) && (
                <div className="lg:col-span-1 transition-opacity duration-500">
                  <MemoizedEnhancedPlaylist
                    playlist={currentStation.playlist}
                    currentTrackId={playback.currentTrack?.id}
                    isPlaying={playback.isPlaying}
                    isLoadingTrack={playback.isLoading}
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
        
        {/* Emergency alert system */}
        <MemoizedEmergencyAlertSystem isRadioActive={isRadioActive} currentFrequency={radio.frequency} />
      </div>
    </>
  );
}