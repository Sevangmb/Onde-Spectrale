
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { getStationForFrequency, updateUserFrequency, getCustomCharactersForUser, createDefaultStation } from '@/app/actions';
import { testPlexConnectionAction, searchPlexMusicAction, getRandomPlexTracksAction } from '@/app/actions-plex';
import { searchMusicAdvanced, generateMusicSuggestions } from '@/app/actions-improved';
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
  ListMusic,
  Server,
  Search,
  Shuffle
} from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export function OndeSpectraleRadio() {
  // État de base
  const [frequency, setFrequency] = useState(100.7);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [allDjs, setAllDjs] = useState<(DJCharacter | CustomDJCharacter)[]>(DJ_CHARACTERS);
  
  // Fonctionnalités Plex
  const [plexConnected, setPlexConnected] = useState(false);
  const [plexLibraries, setPlexLibraries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interface
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [signalStrength, setSignalStrength] = useState(0);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isClient, setIsClient] = useState(false);
  
  const router = useRouter();

  // Hook de gestion de playlist
  const playlistManager = usePlaylistManager({
    station: currentStation,
    user,
    allDjs
  });

  // Initialisation
  useEffect(() => {
    setIsClient(true);
    
    // Génération des particules
    setParticleStyles(
      Array.from({ length: 15 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`,
      }))
    );

    // Authentification
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Charger les DJ personnalisés
        try {
          const customDjs = await getCustomCharactersForUser(currentUser.uid);
          setAllDjs([...DJ_CHARACTERS, ...customDjs]);
        } catch (error) {
          console.error('Erreur chargement DJ personnalisés:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  // Test de connexion Plex au démarrage
  useEffect(() => {
    const checkPlexConnection = async () => {
      try {
        const result = await testPlexConnectionAction();
        setPlexConnected(result.connected);
        setPlexLibraries(result.libraries);
        
        if (result.connected) {
          console.log('✅ Plex connecté avec', result.libraries.length, 'bibliothèques');
        }
      } catch (error) {
        console.warn('Plex non disponible:', error);
      }
    };
    
    checkPlexConnection();
  }, []);

  // Fonction de recherche améliorée
  const handleAdvancedSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    
    try {
      // Essayer d'abord Plex si connecté
      if (plexConnected) {
        const plexResults = await searchPlexMusicAction(term);
        if (plexResults.length > 0) {
          playlistManager.addToPlaylist(plexResults);
          return;
        }
      }
      
      // Fallback vers recherche avancée
      const advancedResults = await searchMusicAdvanced(term, 5);
      if (advancedResults.length > 0) {
        playlistManager.addToPlaylist(advancedResults);
      }
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
    }
  }, [plexConnected, playlistManager]);

  // Fonction pour ajouter des pistes aléatoires
  const handleAddRandomTracks = useCallback(async () => {
    try {
      if (plexConnected) {
        const randomTracks = await getRandomPlexTracksAction(10);
        if (randomTracks.length > 0) {
          playlistManager.addToPlaylist(randomTracks);
          return;
        }
      }
      
      // Fallback vers suggestions thématiques
      if (currentStation?.theme) {
        const suggestions = await generateMusicSuggestions(currentStation.theme, 5);
        playlistManager.addToPlaylist(suggestions);
      }
    } catch (error) {
      console.error('Erreur ajout pistes aléatoires:', error);
    }
  }, [plexConnected, currentStation, playlistManager]);

  const fetchStationData = useDebouncedCallback(async (freq: number) => {
      setIsLoading(true);
      setError(null);

      try {
        let station = await getStationForFrequency(freq);
        
        // Si pas de station, vérifier si on doit créer les stations par défaut
        if (!station && [100.7, 94.5, 102.1, 98.2].includes(freq)) {
          console.log('Création des stations par défaut...');
          station = await createDefaultStation();
        }
        
        // Calcul de la force du signal
        const newSignalStrength = station 
          ? Math.floor(Math.random() * 20) + 80 
          : Math.floor(Math.random() * 30) + 10;
        
        setSignalStrength(newSignalStrength);
        setCurrentStation(station);
        
      } catch (err: any) {
        setError(`Erreur de données: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
  }, 500);


  // Récupération des données de station
  useEffect(() => {
    fetchStationData(frequency)
  }, [frequency, fetchStationData]);

  // Gestion du scan des fréquences
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

  const handleFrequencyChange = (value: number[]) => {
    setFrequency(value[0]);
  };

  const handleFrequencyCommit = async (value: number[]) => {
    if (user) {
      await updateUserFrequency(user.uid, value[0]);
    }
  };

  // Gestion de l'activation audio automatique
  const [audioContextEnabled, setAudioContextEnabled] = useState(false);
  
  // Activer l'audio au premier clic utilisateur
  const handleUserInteraction = useCallback(() => {
    if (!audioContextEnabled) {
      console.log('🎵 Activation du contexte audio par interaction utilisateur');
      setAudioContextEnabled(true);
      
      // Essayer de relancer la lecture si elle était bloquée
      if (playlistManager.currentTrack && !playlistManager.isPlaying && !playlistManager.isLoadingTrack) {
        playlistManager.togglePlayPause();
      }
    }
  }, [audioContextEnabled, playlistManager]);
  
  // Ajouter l'écouteur d'événement global
  useEffect(() => {
    if (!audioContextEnabled) {
      const events = ['click', 'touchstart', 'keydown'];
      events.forEach(event => {
        document.addEventListener(event, handleUserInteraction, { once: true });
      });
      
      return () => {
        events.forEach(event => {
          document.removeEventListener(event, handleUserInteraction);
        });
      };
    }
  }, [audioContextEnabled, handleUserInteraction]);

  // État calculé
  const isRadioActive = useMemo(() => {
    return isClient && !isLoading && currentStation !== null;
  }, [isClient, isLoading, currentStation]);

  return (
    <>
      <audio ref={playlistManager.audioRef} crossOrigin="anonymous" preload="metadata" />
      
      <div className="relative w-full min-h-[90vh] overflow-hidden">
        {/* Arrière-plans et effets */}
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
        
        {/* Particules */}
        {isClient && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particleStyles.map((style, i) => (
              <div 
                key={i} 
                className="absolute w-1 h-1 bg-orange-400/50 rounded-full animate-float" 
                style={style} 
              />
            ))}
          </div>
        )}

        {/* Contenu principal */}
        <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Panneau de contrôle principal */}
              <div className="lg:col-span-2">
                <Card className="w-full vintage-radio-frame pip-boy-terminal shadow-2xl radioactive-pulse relative overflow-hidden static-noise">
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"></div>
                  </div>
                  <div className="absolute inset-1 border border-primary/20 rounded-lg pointer-events-none animate-pulse"></div>
                  
                  <CardHeader className="relative border-b-2 border-primary/40 pb-4 bg-gradient-to-r from-background to-card wasteland-texture">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative radioactive-pulse">
                          <OndeSpectraleLogo className="h-8 w-8 text-primary phosphor-glow drop-shadow-lg" />
                          <div className="absolute inset-0 bg-primary/30 blur-sm animate-pulse"></div>
                        </div>
                        <CardTitle className="font-headline text-3xl text-primary phosphor-glow tracking-wider drop-shadow-lg uppercase">
                          <span className="inline-block animate-flicker">Onde Spectrale</span>
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Bouton playlist */}
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
                        
                        {/* Contrôles Plex */}
                        {isRadioActive && (
                          <div className="flex items-center gap-2">
                            {/* Indicateur Plex */}
                            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
                              plexConnected 
                                ? 'bg-green-600/20 text-green-400 border border-green-600/30' 
                                : 'bg-red-600/20 text-red-400 border border-red-600/30'
                            }`}>
                              <Server className="h-3 w-3" />
                              {plexConnected ? `Plex (${plexLibraries.length})` : 'Plex Off'}
                            </div>
                            
                            {/* Recherche rapide */}
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch(searchTerm)}
                                className="px-2 py-1 text-xs bg-black/30 border border-primary/30 rounded text-primary placeholder-primary/50 w-32"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAdvancedSearch(searchTerm)}
                                className="retro-button px-2"
                              >
                                <Search className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Pistes aléatoires */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddRandomTracks}
                              className="retro-button"
                              title="Ajouter des pistes aléatoires"
                            >
                              <Shuffle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Boutons utilisateur */}
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
                      
                      {/* Syntoniseur */}
                      <div className="vintage-radio-frame pip-boy-terminal p-6 shadow-2xl radioactive-pulse relative overflow-hidden static-noise">
                        <div className="absolute inset-0 opacity-30 pointer-events-none">
                          <div className={`w-full h-full bg-gradient-to-r from-transparent via-primary/40 to-transparent ${isScanning ? 'animate-pulse' : ''}`}></div>
                        </div>
                        
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
                              <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-full text-green-300 text-sm">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                  {playlistManager.isLoadingTrack ? 'CHARGEMENT...' : 
                                   playlistManager.isPlaying ? 'TRANSMISSION EN COURS' : 'CONNEXION ÉTABLIE'}
                                </div>
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
                      
                      {/* Analyseur de spectre */}
                      <SpectrumAnalyzer isPlaying={playlistManager.isPlaying} className="h-24" />
                      
                      {/* Lecteur audio */}
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
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Panneau playlist (conditionnellement affiché) */}
              {(isRadioActive && currentStation && currentStation.playlist.length > 0) && (
                <div className={`lg:col-span-1 transition-opacity duration-500 ${showPlaylist ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                   {showPlaylist && (
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
              )}
            </div>
          </div>
        </div>
        
        {/* Système d'alerte d'urgence */}
        <EmergencyAlertSystem isRadioActive={isRadioActive} currentFrequency={frequency} />
      </div>
    </>
  );
}
