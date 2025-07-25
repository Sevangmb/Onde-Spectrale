
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { getStationForFrequency, updateUserFrequency, getCustomCharactersForUser, createDefaultStation } from '@/app/actions';
import { testPlexConnectionAction, searchPlexMusicAction, getRandomPlexTracksAction } from '@/app/actions-plex';
import type { Station, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

// Hooks personnalisés
import { usePlaylistManager } from '@/hooks/usePlaylistManager';
import { useRadioSoundEffects } from '@/hooks/useRadioSoundEffects';
import { useTheme } from '@/hooks/useTheme';

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
  Shuffle,
  Palette,
  Sun,
  Moon
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
  const [isMobile, setIsMobile] = useState(false);
  
  const router = useRouter();

  // Hook de gestion de playlist
  const playlistManager = usePlaylistManager({
    station: currentStation,
    user,
    allDjs
  });

  // Hook pour les effets sonores radio (temporairement désactivé)
  const radioSounds = useRadioSoundEffects({
    volume: 0.2,
    enableEffects: false, // Désactivé temporairement pour éviter les erreurs de chargement
    fadeInDuration: 300,
    fadeOutDuration: 200
  });

  // Hook pour le système de thème visuel
  const themeSystem = useTheme({
    autoAdapt: true,
    savePreference: true
  });

  // Initialisation
  useEffect(() => {
    setIsClient(true);
    
    // Détection mobile côté client uniquement
    let handleResize: (() => void) | null = null;
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 640);
      
      handleResize = () => {
        setIsMobile(window.innerWidth < 640);
      };
      
      window.addEventListener('resize', handleResize);
    }
    
    // Effet sonore de démarrage radio
    setTimeout(() => {
      radioSounds.playRadioStartup();
    }, 500);
    
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

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined' && handleResize) {
        window.removeEventListener('resize', handleResize);
      }
    };
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
      
      // Fallback vers recherche Plex
      const plexResults = await searchPlexMusicAction(term, 5);
      if (plexResults.length > 0) {
        const playlistItems = plexResults.map(track => ({
          id: `plex-${Date.now()}-${Math.random()}`,
          type: 'music' as const,
          title: track.title,
          content: term,
          artist: track.artist,
          duration: track.duration || 180,
          url: track.url,
          addedAt: new Date().toISOString()
        }));
        playlistManager.addToPlaylist(playlistItems);
      }
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
    }
  }, [plexConnected]); // Enlever playlistManager des dépendances

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
      
      // Fallback vers pistes aléatoires Plex
      const randomPlexTracks = await getRandomPlexTracksAction(undefined, 5);
      if (randomPlexTracks.length > 0) {
        const playlistItems = randomPlexTracks.map(track => ({
          id: `plex-random-${Date.now()}-${Math.random()}`,
          type: 'music' as const,
          title: track.title,
          content: 'random',
          artist: track.artist,
          duration: track.duration || 180,
          url: track.url,
          addedAt: new Date().toISOString()
        }));
        playlistManager.addToPlaylist(playlistItems);
      }
    } catch (error) {
      console.error('Erreur ajout pistes aléatoires:', error);
    }
  }, [plexConnected]); // Enlever currentStation et playlistManager

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
        
        // Effets sonores selon la qualité du signal
        if (!station) {
          // Pas de station trouvée - jouer du static
          radioSounds.playContextualEffect('signal_loss', true);
        } else if (newSignalStrength < 50) {
          // Signal faible - interférence
          radioSounds.playInterference(true);
        } else {
          // Signal fort - arrêter les effets parasites
          radioSounds.stopEffect();
        }
        
        setCurrentStation(station);
        
        // Adapter le thème selon la station
        if (station && station.theme) {
          themeSystem.adaptToStation(station.theme);
        }
        
      } catch (err: any) {
        setError(`Erreur de données: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
  }, 500);


  // Récupération des données de station
  useEffect(() => {
    fetchStationData(frequency)
  }, [frequency]); // Ne pas inclure fetchStationData dans les dépendances

  // Gestion du scan des fréquences
  const handleScanUp = useCallback(() => {
    setIsScanning(prev => {
      if (prev) return prev; // Déjà en cours
      
      // Jouer effet de tuning
      radioSounds.playTuning();
      
      setFrequency(currentFreq => Math.min(108.0, currentFreq + 0.5));
      setTimeout(() => setIsScanning(false), 1000);
      return true;
    });
  }, []); // Pas de dépendances, tout est géré par setState callbacks

  const handleScanDown = useCallback(() => {
    setIsScanning(prev => {
      if (prev) return prev; // Déjà en cours
      
      // Jouer effet de tuning
      radioSounds.playTuning();
      
      setFrequency(currentFreq => Math.max(87.0, currentFreq - 0.5));
      setTimeout(() => setIsScanning(false), 1000);
      return true;
    });
  }, []); // Pas de dépendances, tout est géré par setState callbacks

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
  }, [audioContextEnabled, playlistManager]); // Remettre les dépendances nécessaires
  
  // Démarrage automatique désactivé - mode démo interface uniquement
  useEffect(() => {
    if (audioContextEnabled && currentStation && playlistManager.currentTrack && !playlistManager.isPlaying && !playlistManager.isLoadingTrack) {
      // Mode démo - pas de lecture automatique
      console.log('🎨 Mode démo actif - Interface fonctionnelle pour tester les thèmes');
      // setTimeout(() => {
      //   playlistManager.togglePlayPause();
      // }, 500);
    }
  }, [audioContextEnabled, currentStation?.id, playlistManager.currentTrack?.id, playlistManager.isPlaying, playlistManager.isLoadingTrack]); // Utiliser des ID au lieu des objets complets
  
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
  }, [audioContextEnabled, handleUserInteraction]); // Remettre handleUserInteraction
  
  // Auto-activer le contexte audio dès le premier rendu côté client
  useEffect(() => {
    if (isClient && !audioContextEnabled) {
      // Essayer d'activer automatiquement (marchera uniquement si l'utilisateur a déjà interagi avec le domaine)
      const tryAutoEnable = async () => {
        try {
          // Test si on peut créer un contexte audio
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          if (audioContext.state === 'running' || audioContext.state === 'suspended') {
            console.log('🎵 Contexte audio auto-activé');
            setAudioContextEnabled(true);
          }
          audioContext.close();
        } catch (error) {
          // Pas d'auto-activation possible, attendre l'interaction utilisateur
          console.log('🎵 Auto-activation impossible, attente d’interaction utilisateur');
        }
      };
      
      tryAutoEnable();
    }
  }, [isClient, audioContextEnabled]);

  // État calculé
  const isRadioActive = useMemo(() => {
    return isClient && !isLoading && currentStation !== null;
  }, [isClient, isLoading, currentStation]);

  return (
    <>
      <audio 
        ref={playlistManager.audioRef} 
        crossOrigin="anonymous" 
        preload="metadata"
        onError={(e) => {
          // Désactiver temporairement les logs d'erreur audio pour éviter le spam
          console.log('⚠️ Audio non disponible, passage à la piste suivante');
        }}
        onLoadStart={() => {
          console.log('🔄 Chargement audio démarré');
        }}
        onCanPlay={() => {
          console.log('✅ Audio prêt à être lu');
        }}
        onLoadedData={() => {
          console.log('📊 Données audio chargées');
        }}
        onAbort={() => {
          console.log('⏹️ Chargement audio annulé');
        }}
      />
      
      <div className={`relative w-full min-h-[90vh] overflow-hidden theme-background ${
        themeSystem.currentTheme.effects.showParticles ? 'theme-particles' : ''
      } ${
        themeSystem.currentTheme.effects.showGlow ? 'theme-glow' : ''
      } ${
        themeSystem.currentTheme.effects.showPulse ? 'theme-pulse' : ''
      } ${
        themeSystem.currentTheme.effects.showScanlines ? 'theme-scanlines' : ''
      } ${themeSystem.isTransitioning ? 'theme-transitioning' : ''}`}>
        {/* Arrière-plans et effets thématiques - remplacés par les styles CSS du thème */}
        
        {/* Particules thématiques - gérées par le CSS du thème */}

        {/* Contenu principal */}
        <div className="relative z-10 flex min-h-[90vh] w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Panneau de contrôle principal */}
              <div className="lg:col-span-2">
                <Card className="w-full theme-card glass-morphism shadow-2xl relative overflow-hidden fade-in">
                  {/* Effet de bordure thématique inclus dans theme-card */}
                  
                  <CardHeader className="relative border-b border-[color:var(--theme-border)] pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <OndeSpectraleLogo className="h-8 w-8 theme-text-accent drop-shadow-lg" />
                        </div>
                        <CardTitle className="font-headline text-3xl theme-text-accent tracking-wider drop-shadow-lg uppercase">
                          <span className="inline-block">Onde Spectrale</span>
                        </CardTitle>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Bouton Admin TOUJOURS VISIBLE */}
                        <Button 
                          variant="default" 
                          size="sm"
                          className="theme-button bg-blue-600 hover:bg-blue-700" 
                          onClick={() => {
                            console.log('👨‍💻 Clic sur Admin - Redirection vers /admin');
                            router.push('/admin');
                          }}
                        >
                          <UserCog className="mr-1 h-4 w-4" /> Admin
                        </Button>
                        
                        {/* Sélecteur de thème */}
                        <div className="flex items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={themeSystem.toggleLightDark}
                            className="theme-button px-2"
                            title={`Basculer en mode ${themeSystem.isLightMode ? 'sombre' : 'clair'}`}
                          >
                            {themeSystem.isLightMode ? <Moon className="h-3 w-3 sm:h-4 sm:w-4" /> : <Sun className="h-3 w-3 sm:h-4 sm:w-4" />}
                          </Button>
                          
                          <select
                            value={themeSystem.currentTheme.id}
                            onChange={(e) => themeSystem.changeTheme(e.target.value)}
                            className="theme-input text-xs px-2 py-1 min-w-[80px] sm:min-w-[120px]"
                            title="Changer le thème visuel"
                          >
                            {Object.values(themeSystem.availableThemes).map(theme => (
                              <option key={theme.id} value={theme.id}>
                                {isClient && isMobile ? theme.name.split(' ')[0] : theme.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* Bouton playlist */}
                        {isRadioActive && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowPlaylist(!showPlaylist)}
                            className="theme-button"
                          >
                            <ListMusic className="mr-2 h-4 w-4" /> 
                            Playlist ({playlistManager.playlistLength})
                          </Button>
                        )}
                        
                        {/* Contrôles Plex */}
                        {isRadioActive && (
                          <div className="flex items-center gap-2">
                            {/* Indicateur Plex */}
                            <div className={`theme-badge flex items-center gap-1 text-xs font-mono ${
                              plexConnected 
                                ? 'border-green-500 text-green-400' 
                                : 'border-red-500 text-red-400'
                            }`}>
                              <Server className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                {plexConnected ? `Plex (${plexLibraries.length})` : 'Plex Off'}
                              </span>
                              <span className="sm:hidden">
                                {plexConnected ? `${plexLibraries.length}` : 'Off'}
                              </span>
                            </div>
                            
                            {/* Recherche rapide */}
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                placeholder={isMobile ? 'Chercher...' : 'Rechercher...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleAdvancedSearch(searchTerm)}
                                className="theme-input text-xs w-20 sm:w-32"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAdvancedSearch(searchTerm)}
                                className="theme-button px-2"
                              >
                                <Search className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {/* Pistes aléatoires */}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleAddRandomTracks}
                              className="theme-button"
                              title="Ajouter des pistes aléatoires"
                            >
                              <Shuffle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        
                        {/* Boutons utilisateur conditionnels */}
                        {user ? (
                          <>
                            {currentStation && currentStation.ownerId === user.uid && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="theme-button" 
                                onClick={() => router.push(`/admin/stations/${currentStation.id}`)}
                              >
                                <Settings className="mr-2 h-4 w-4" /> Gérer Station
                              </Button>
                            )}
                          </>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="theme-button" 
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
                      
                      {/* Syntoniseur */}
                      <div className="theme-card glass-morphism p-6 shadow-2xl relative overflow-hidden slide-up">
                        {/* Effet de scan intégré dans le thème */}
                        
                        <div className="relative z-10 space-y-4">
                          <div className="flex items-center justify-between">
                            <label htmlFor="frequency" className="text-sm font-mono font-bold theme-text-accent tracking-wider uppercase">
                              {'>>>'} Syntoniseur {'<<<'}
                            </label>
                            <div className="flex items-center gap-2">
                              <Zap className="h-4 w-4 theme-text-accent" />
                              <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <div
                                    key={i}
                                    className={`w-2 h-5 rounded-sm transition-all duration-300 ${
                                      i < Math.floor(signalStrength / 20) 
                                        ? 'bg-[color:var(--theme-primary)] shadow-lg' 
                                        : 'bg-[color:var(--theme-text-muted)]'
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs theme-text-muted font-mono w-12">
                                SIG:{signalStrength}%
                              </span>
                            </div>
                          </div>

                          <div className="text-center">
                            <div className="text-6xl font-mono font-bold tracking-widest relative mb-2 theme-text-primary">
                              <span className={`${currentStation ? 'animate-pulse' : 'animate-pulse'}`}>
                                {frequency.toFixed(1)}
                              </span>
                              <span className="text-2xl ml-3 theme-text-secondary">MHz</span>
                              
                              {currentStation && (
                                <div className="absolute -top-2 -right-2 w-4 h-4 bg-[color:var(--theme-primary)] rounded-full animate-pulse shadow-lg"></div>
                              )}
                            </div>
                            
                            {isScanning && (
                              <div className="theme-text-accent text-sm mt-2 animate-pulse font-mono uppercase tracking-wider">
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
                              className="theme-button disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" /> SCAN-
                            </Button>
                            <div className="theme-text-muted px-4 py-2 text-xs font-mono">
                              87.0 - 108.0 MHz
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleScanUp} 
                              disabled={frequency >= 108.0 || isScanning} 
                              className="theme-button disabled:opacity-50"
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
                            <div className="flex justify-between text-xs theme-text-muted font-mono">
                              <span>87.0</span><span>95.0</span><span>108.0</span>
                            </div>
                          </div>

                          <div className="text-center space-y-2">
                            {currentStation ? (
                              <div className="space-y-2">
                                <div className="theme-badge border-green-500 text-green-400 text-sm">
                                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                                  {playlistManager.isLoadingTrack ? 'CHARGEMENT...' : 
                                   playlistManager.isPlaying ? 'TRANSMISSION EN COURS' : 'CONNEXION ÉTABLIE'}
                                </div>
                                
                                {/* Bouton d'activation audio si nécessaire */}
                                {!audioContextEnabled && playlistManager.currentTrack && (
                                  <button
                                    onClick={handleUserInteraction}
                                    className="theme-button text-xs px-4 py-2 animate-pulse"
                                  >
                                    🎵 ACTIVER L'AUDIO
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="theme-badge border-red-500 text-red-400 text-sm">
                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse mr-2"></div>
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
