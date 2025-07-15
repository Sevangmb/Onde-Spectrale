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

import { RadioTower, Music, MessageSquare, ListMusic, Settings, Rss } from 'lucide-react';

export function OndeSpectraleRadio() {
  const [frequency, setFrequency] = useState(92.1);
  const [debouncedFrequency] = useDebounce(frequency, 500);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [interference, setInterference] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const playlist = useMemo(() => currentStation?.playlist || [], [currentStation]);
  const currentTrack = useMemo(() => playlist[currentTrackIndex], [playlist, currentTrackIndex]);

  useEffect(() => {
    const signIn = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Erreur de connexion anonyme", error);
        }
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        await updateUserOnLogin(currentUser.uid);
        const userData = await getUserData(currentUser.uid);
        if (userData && userData.lastFrequency) {
          setFrequency(userData.lastFrequency);
        }
      } else {
        signIn();
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
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
    const fetchData = async () => {
      setIsLoading(true);
      setIsPlaying(false);
      const station = await getStation(debouncedFrequency);
      setCurrentStation(station);
      
      if (station) {
        setCurrentTrackIndex(0);
        setInterference(null);
      } else {
        const interferenceText = await getInterference(debouncedFrequency);
        setInterference(interferenceText);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [debouncedFrequency]);

  const onTrackSelect = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
  };
  
  const onEnded = useCallback(() => {
     if (currentTrackIndex < playlist.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrackIndex, playlist.length]);
  

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
      <Card className="w-full border-2 border-primary/20 bg-black/50 shadow-lg shadow-primary/10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20800%20800%22%3E%3Cg%20fill%3D%27none%27%20stroke%3D%27%238B0000%27%20stroke-width%3D%271%27%3E%3Cpath%20d%3D%27M769%20229L1037%20260.9M927%20880L731%20737%27%2F%3E%3Cpath%20d%3D%27M731%20737L769%20229%27%2F%3E%3Cpath%20d%3D%27M1037%20260.9L927%20880%27%2F%3E%3Cpath%20d%3D%27M769%20229L927%20880%27%2F%3E%3Cpath%20d%3D%27M1037%20260.9L731%20737%27%2F%3E%3Cpath%20d%3D%27M-231%20880L-427%20737%27%2F%3E%3Cpath%20d%3D%27M-427%20737L-231%20229%27%2F%3E%3Cpath%20d%3D%27M-231%20229L-427%20737%27%2F%3E%3Cpath%20d%3D%27M-427%20737L-231%20880%27%2F%3E%3Cpath%20d%3D%27M-231%20229L-231%20880%27%2F%3E%3Cg%20fill%3D%27%231A1A1A%27%3E%3Ccircle%20cx%3D%27769%27%20cy%3D%27229%27%20r%3D%272%27%2F%3E%3Ccircle%20cx%3D%271037%27%20cy%3D%27260.9%27%20r%3D%272%27%2F%3E%3Ccircle%20cx%3D%27927%27%20cy%3D%27880%27%20r%3D%272%27%2F%3E%3Ccircle%20cx%3D%27731%27%20cy%3D%27737%27%20r%3D%272%27%2F%3E%3Ccircle%20cx%3D%27-231%27%20cy%3D%27880%27%20r%3D%272%27%2F%3E%3Ccircle%20cx%3D%27-427%27%20cy%3D%27737%27%20r%3D%272%27%2F%3E%3Ccircle%20cx%3D%27-231%27%20cy%3D%27229%27%20r%3D%272%27%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-5"></div>
        <CardHeader className="relative border-b-2 border-primary/20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OndeSpectraleLogo className="h-8 w-8 text-primary" />
              <CardTitle className="font-headline text-3xl text-primary-foreground tracking-wider">
                Onde Spectrale
              </CardTitle>
            </div>
             <div className="flex items-center gap-4">
               {currentStation && isOwner && (
                <StationManagementSheet station={currentStation} dj={dj}>
                  <Button variant="ghost" size="icon">
                    <Settings className="h-5 w-5" />
                  </Button>
                </StationManagementSheet>
              )}
               {!currentStation && !isLoading && user && (
                <CreateStationDialog frequency={frequency} >
                    <Button variant="default" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Rss className="mr-2 h-4 w-4" />
                        Créer une station
                    </Button>
                </CreateStationDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8 p-6 relative">
          <div className="flex flex-col gap-6">
            <div className="bg-black/50 border border-border rounded-lg p-4 flex flex-col items-center gap-2">
              <label htmlFor="frequency" className="text-sm font-medium text-muted-foreground font-headline">FRÉQUENCE</label>
              <div className="text-5xl font-headline font-bold text-accent tracking-widest animate-flicker">
                {frequency.toFixed(1)} <span className="text-2xl">MHz</span>
              </div>
              <Slider
                id="frequency"
                min={87.0}
                max={108.0}
                step={0.1}
                value={[frequency]}
                onValueChange={handleFrequencyChange}
                onValueCommit={handleFrequencyCommit}
                className="w-full my-2"
              />
            </div>
            <div className="h-40 bg-black/50 border border-border rounded-lg p-4 flex flex-col justify-center items-center text-center">
              {isLoading ? (
                <Skeleton className="w-4/5 h-12 animate-flicker" />
              ) : currentStation ? (
                <>
                  <RadioTower className="h-6 w-6 text-primary mb-2" />
                  <h3 className="font-headline text-2xl text-primary-foreground">{currentStation.name}</h3>
                  <p className="text-muted-foreground">DJ: {dj?.name || 'Inconnu'}</p>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground animate-glitch">{interference || 'Statique...'}</p>
                  <p className="text-sm text-muted-foreground/50 mt-2">
                    Aucun signal détecté. Créez une station ici.
                  </p>
                </>
              )}
            </div>
             {currentStation && <AudioPlayer track={playlist[currentTrackIndex]} isPlaying={isPlaying} onPlayPause={() => setIsPlaying(p => !p)} onNext={() => onTrackSelect((currentTrackIndex + 1) % playlist.length)} onPrev={() => onTrackSelect((currentTrackIndex - 1 + playlist.length) % playlist.length)} audioRef={audioRef} />}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <ListMusic className="h-5 w-5 text-primary" />
                <h3 className="font-headline text-xl text-primary-foreground">Playlist</h3>
            </div>
            <ScrollArea className="h-80 bg-black/50 border border-border rounded-lg p-2">
              {isLoading ? (
                <div className="p-2 space-y-3">
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                    <Skeleton className="w-full h-10" />
                </div>
              ) : playlist.length > 0 ? (
                <ul className="space-y-1">
                  {playlist.map((item, index) => (
                    <li key={item.id}>
                      <button
                        onClick={() => onTrackSelect(index)}
                        className={`w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors ${index === currentTrackIndex ? 'bg-primary/50' : 'hover:bg-primary/20'}`}
                      >
                        {item.type === 'music' ? <Music className="h-4 w-4 text-accent shrink-0" /> : <MessageSquare className="h-4 w-4 text-accent shrink-0" />}
                        <div className="flex-grow overflow-hidden">
                            <p className="truncate text-sm text-primary-foreground">{item.title}</p>
                            {item.artist && <p className="text-xs text-muted-foreground truncate">{item.artist}</p>}
                        </div>
                        {index === currentTrackIndex && isPlaying && <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                    <p>{currentStation ? "Playlist vide." : "Silence radio."}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
