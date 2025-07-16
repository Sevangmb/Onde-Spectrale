'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { getStation, getInterference, updateUserOnLogin, getUserData, updateUserFrequency } from '@/app/actions';
import type { Station, PlaylistItem, DJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { OndeSpectraleLogo } from '@/components/icons';
import { CreateStationDialog } from '@/components/CreateStationDialog';
import { StationManagementSheet } from '@/components/StationManagementSheet';
import { AudioPlayer } from '@/components/AudioPlayer';
import { SpectrumAnalyzer } from '@/components/SpectrumAnalyzer';

import { RadioTower, Music, MessageSquare, ListMusic, Settings, Rss, AlertTriangle, ChevronLeft, ChevronRight, Zap } from 'lucide-react';

export function OndeSpectraleRadio() {
  const [frequency, setFrequency] = useState(92.1);
  const [debouncedFrequency] = useDebounce(frequency, 500);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [interference, setInterference] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const playlist = useMemo(() => currentStation?.playlist || [], [currentStation]);
  const currentTrack = useMemo(() => playlist[currentTrackIndex], [playlist, currentTrackIndex]);

  // Simulated signal strength based on frequency and station presence
  const signalStrength = useMemo(() => {
    if (currentStation) {
      // Strong signal when station is found
      return Math.floor(Math.random() * 20) + 80; // 80-100%
    } else {
      // Weak random signal when no station
      return Math.floor(Math.random() * 30) + 10; // 10-40%
    }
  }, [currentStation, debouncedFrequency]);

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
    const initializeAuth = async () => {
      try {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (currentUser) {
            setUser(currentUser);
            await updateUserOnLogin(currentUser.uid);
            const userData = await getUserData(currentUser.uid);
            if (userData && userData.lastFrequency) {
              setFrequency(userData.lastFrequency);
            }
          } else {
            await signInAnonymously(auth);
          }
        });
        return () => unsubscribe();
      } catch (err: any) {
        console.error("Erreur d'authentification Firebase:", err);
        setError(`Erreur d'authentification: ${err.message}. Vérifiez la configuration Firebase.`);
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const dj = useMemo(() => {
    if (!currentStation) return null;
    return DJ_CHARACTERS.find(d => d.id === currentStation.djCharacterId) || null;
  }, [currentStation]);

  const isOwner = useMemo(() => {
    if (!user || !currentStation) return false;
    return currentStation?.ownerId === user.uid;
  }, [currentStation, user]);

  const handleFrequencyChange = (value: number[]) => {
    setFrequency(value[0]);
  };

  const handleFrequencyCommit = async (value: number[]) => {
      if (user) {
          await updateUserFrequency(user.uid, value[0]);
      }
  }
  
  useEffect(() => {
    if (!user) return; // Ne rien faire si l'utilisateur n'est pas encore authentifié

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      try {
        const station = await getStation(debouncedFrequency);
        setCurrentStation(station);
        
        if (station) {
          setCurrentTrackIndex(0);
          setInterference(null);
        } else {
          const interferenceText = await getInterference(debouncedFrequency);
          setInterference(interferenceText);
        }
      } catch (err: any) {
        console.error("Erreur de récupération des données:", err);
        setError(`Erreur de données: ${err.message}. Vérifiez les règles Firestore.`);
        setCurrentStation(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedFrequency, user]);

  // Fix: Improved track selection with better bounds checking
  const onTrackSelect = useCallback((index: number) => {
    if (playlist.length === 0) return;
    
    const clampedIndex = Math.max(0, Math.min(index, playlist.length - 1));
    setCurrentTrackIndex(clampedIndex);
    setIsPlaying(true);
  }, [playlist.length]);
  
  const onEnded = useCallback(() => {
    if (playlist.length === 0) {
      setIsPlaying(false);
      return;
    }
    
    if (currentTrackIndex < playlist.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, playlist.length]);

  // Fix: Safer navigation functions with bounds checking
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
    if (playlist.length === 0) return;
    setIsPlaying(prev => !prev);
  }, [playlist.length]);

  // Fix: Reset track index when station changes to prevent out-of-bounds errors
  useEffect(() => {
    if (currentStation && playlist.length > 0) {
      setCurrentTrackIndex(0);
    }
  }, [currentStation, playlist.length]);

  return (
    <>
      <audio 
        key={currentTrack?.id}
        ref={audioRef} 
        src={currentTrack?.url || undefined} 
        onEnded={onEnded} 
        onPlay={() => setIsPlaying(true)} 
        onPause={() => setIsPlaying(false)} 
      />
      <div className="relative w-full min-h-screen overflow-hidden">
        {/* Arrière-plan post-apocalyptique animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
        
        {/* Effet de radiation/interference */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-red-700/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-yellow-500/30 rounded-full blur-xl animate-pulse delay-500"></div>
        </div>
        
        {/* Grille futuriste déformée */}
        <div className="absolute inset-0 opacity-10">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 50%, rgba(255, 165, 0, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 69, 0, 0.2) 0%, transparent 50%),
                linear-gradient(90deg, transparent 49%, rgba(255, 165, 0, 0.3) 49%, rgba(255, 165, 0, 0.3) 51%, transparent 51%),
                linear-gradient(0deg, transparent 49%, rgba(255, 165, 0, 0.2) 49%, rgba(255, 165, 0, 0.2) 51%, transparent 51%)
              `,
              backgroundSize: '100px 100px, 150px 150px, 50px 50px, 50px 50px',
              animation: 'drift 20s linear infinite'
            }}
          />
        </div>
        
        {/* Particules flottantes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-400/50 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>

        {/* Interface principale */}
        <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-4xl mx-auto">
            <Card className="w-full border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
              {/* Effet de scanline */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-scanline"></div>
              </div>
              
              {/* Bordure intérieure avec effet électrique */}
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
                   <div className="flex items-center gap-4">
                     {currentStation && isOwner && (
                      <StationManagementSheet station={currentStation} dj={dj}>
                        <Button variant="ghost" size="icon" className="border border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-400/50">
                          <Settings className="h-5 w-5 text-orange-300" />
                        </Button>
                      </StationManagementSheet>
                    )}
                     {!currentStation && !isLoading && user && !error &&(
                      <CreateStationDialog frequency={frequency} >
                          <Button variant="default" className="bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20">
                              <Rss className="mr-2 h-4 w-4" />
                              Créer une station
                          </Button>
                      </CreateStationDialog>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-8 p-6 relative bg-gradient-to-br from-black/70 to-zinc-900/70">
                <div className="flex flex-col gap-6">
                  {/* Sélecteur de fréquence amélioré */}
                  <div className="bg-black/80 border-2 border-orange-500/40 rounded-lg p-6 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
                    {/* Effet de tuning */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                      <div className={`w-full h-full bg-gradient-to-r from-transparent via-orange-400/30 to-transparent ${isScanning ? 'animate-scan' : ''}`}></div>
                    </div>
                    
                    <div className="relative z-10 space-y-4">
                      {/* En-tête avec indicateur de signal */}
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

                      {/* Affichage principal de la fréquence */}
                      <div className="text-center">
                        <div className="text-6xl font-headline font-bold text-orange-400 tracking-widest drop-shadow-lg relative">
                          <span className={`${currentStation ? 'animate-flicker-subtle' : 'animate-flicker'}`}>
                            {frequency.toFixed(1)}
                          </span>
                          <span className="text-3xl text-orange-300 ml-2">MHz</span>
                          
                          {/* Indicateur de station trouvée */}
                          {currentStation && (
                            <div className="absolute -top-2 -right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                          )}
                        </div>
                        
                        {/* Indicateur de scan */}
                        {isScanning && (
                          <div className="text-orange-300/60 text-sm mt-2 animate-pulse">
                            SCAN EN COURS...
                          </div>
                        )}
                      </div>

                      {/* Contrôles de scan rapide */}
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleScanDown}
                          disabled={frequency <= 87.0 || isScanning}
                          className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 hover:text-orange-100 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          SCAN
                        </Button>
                        
                        <div className="px-4 py-2 bg-black/60 border border-orange-500/20 rounded text-orange-300/80 text-xs font-mono">
                          87.0 - 108.0 MHz
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleScanUp}
                          disabled={frequency >= 108.0 || isScanning}
                          className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 hover:text-orange-100 disabled:opacity-50"
                        >
                          SCAN
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>

                      {/* Slider principal */}
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
                          disabled={!user || !!error || isScanning}
                        />
                        
                        {/* Marqueurs de fréquence */}
                        <div className="flex justify-between text-xs text-orange-400/60 font-mono">
                          <span>87.0</span>
                          <span>90.0</span>
                          <span>95.0</span>
                          <span>100.0</span>
                          <span>105.0</span>
                          <span>108.0</span>
                        </div>
                      </div>

                      {/* Statut de la connexion */}
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
                  
                  {/* Analyseur de spectre */}
                  <SpectrumAnalyzer 
                    isPlaying={isPlaying && currentStation !== null} 
                    audioRef={audioRef} 
                    className="h-24 border border-orange-500/30 rounded-lg bg-black/50 backdrop-blur-sm"
                  />

                  <div className="h-40 bg-black/70 border border-orange-500/40 rounded-lg p-4 flex flex-col justify-center items-center text-center backdrop-blur-sm shadow-lg shadow-orange-500/10">
                    {isLoading ? (
                      <Skeleton className="w-4/5 h-12 animate-flicker bg-orange-400/20" />
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
                      <>
                        <p className="text-lg text-orange-300/70 animate-glitch">{interference || 'Statique...'}</p>
                        <p className="text-sm text-orange-200/50 mt-2">
                          Aucun signal détecté. Créez une station ici.
                        </p>
                      </>
                    )}
                  </div>
                   {currentStation && playlist.length > 0 && (
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
                  <div className="flex items-center gap-2 mb-4">
                      <ListMusic className="h-5 w-5 text-orange-400" />
                      <h3 className="font-headline text-xl text-orange-100 tracking-wider">Playlist</h3>
                  </div>
                  <ScrollArea className="h-80 bg-black/70 border border-orange-500/40 rounded-lg p-2 backdrop-blur-sm shadow-lg shadow-orange-500/10">
                    {isLoading ? (
                      <div className="p-2 space-y-3">
                          <Skeleton className="w-full h-10 bg-orange-400/20" />
                          <Skeleton className="w-full h-10 bg-orange-400/20" />
                          <Skeleton className="w-full h-10 bg-orange-400/20" />
                          <Skeleton className="w-full h-10 bg-orange-400/20" />
                      </div>
                    ) : playlist.length > 0 ? (
                      <ul className="space-y-1">
                        {playlist.map((item, index) => (
                          <li key={item.id}>
                            <button
                              onClick={() => onTrackSelect(index)}
                              className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-all duration-200 ${
                                index === currentTrackIndex 
                                  ? 'bg-orange-500/50 border border-orange-400/50 shadow-md shadow-orange-500/20' 
                                  : 'hover:bg-orange-500/20 hover:border hover:border-orange-500/30'
                              }`}
                            >
                              {item.type === 'music' ? 
                                <Music className="h-4 w-4 text-orange-400 shrink-0" /> : 
                                <MessageSquare className="h-4 w-4 text-orange-400 shrink-0" />
                              }
                              <div className="flex-grow overflow-hidden">
                                  <p className="truncate text-sm text-orange-100">{item.title}</p>
                                  {item.artist && <p className="text-xs text-orange-300/70 truncate">{item.artist}</p>}
                              </div>
                              {index === currentTrackIndex && isPlaying && 
                                <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse shadow-lg shadow-orange-400/50"></div>
                              }
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-orange-300/60 p-4">
                          <p>{currentStation ? "Playlist vide." : error ? "" : "Silence radio."}</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}