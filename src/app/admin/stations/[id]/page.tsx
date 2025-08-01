
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdminLayout } from '../../layout';
import { getStationById, addMessageToStation, addMusicToStation, searchMusic, regenerateStationPlaylist } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { safeGetTime } from '@/lib/dateUtils';
import type { Station, PlaylistItem, CustomDJCharacter, DJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlayerStatusCard } from '@/components/PlayerStatusCard';
import { RealTimePlayerMonitor } from '@/components/admin/RealTimePlayerMonitor';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

import { 
  ArrowLeft,
  RadioTower, 
  Users,
  Music,
  MessageSquare,
  Search,
  Plus,
  Loader2,
  ListMusic,
  Clock,
  ExternalLink,
  Sparkles,
  RefreshCcw
} from 'lucide-react';

export default function StationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { customCharacters } = useAdminLayout();
  const router = useRouter();
  const { toast } = useToast();
  
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [musicQuery, setMusicQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaylistItem[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const [addingTrackId, setAddingTrackId] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);


  const allDjs = useMemo(() => [...DJ_CHARACTERS, ...customCharacters], [customCharacters]);
  const dj = useMemo(() => allDjs.find(d => d.id === station?.djCharacterId), [allDjs, station]);

  const fetchStation = useCallback(async (stationId: string) => {
    setIsLoading(true);
    const fetchedStation = await getStationById(stationId);
    setStation(fetchedStation);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (id) {
      fetchStation(id);
    }
  }, [id, fetchStation]);

  const handleGenerateMessage = async () => {
    if (!station || message.trim().length < 5) {
      toast({ variant: 'destructive', description: "Le message est trop court." });
      return;
    }
    setIsGenerating(true);
    const result = await addMessageToStation(station.id, message);
    if ('error' in result) {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    } else {
      toast({ title: "Message ajouté", description: "Votre message est dans la playlist." });
      setMessage('');
      setStation(prev => prev ? { ...prev, playlist: [...prev.playlist, result.playlistItem] } : null);
    }
    setIsGenerating(false);
  };
  
  const handleSearchMusic = async () => {
    if (!musicQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    const { data, error } = await searchMusic(musicQuery);
    if (error) {
      setSearchError(error);
    }
    if (data) {
      setSearchResults(data);
    }
    setIsSearching(false);
  };

  const handleAddMusic = async (track: PlaylistItem) => {
    if (!station) return;
    setAddingTrackId(track.id);
    const result = await addMusicToStation(station.id, track);
    if (result.error) {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    } else {
      toast({ title: "Musique ajoutée", description: "La piste a été ajoutée à la playlist." });
      setStation(prev => prev ? { ...prev, playlist: [...prev.playlist, result.playlistItem!] } : null);
    }
    setAddingTrackId(null);
  }

  const handleRegeneratePlaylist = async () => {
    if (!station) return;
    setIsRegenerating(true);
    const result = await regenerateStationPlaylist(station.id);
    if ('error' in result) {
      toast({ variant: 'destructive', title: "Erreur IA", description: result.error });
    } else {
      toast({ title: "Playlist régénérée !", description: `La playlist de ${station.name} a été mise à jour.` });
      setStation(prev => prev ? { ...prev, playlist: result.newPlaylist } : null);
    }
    setIsRegenerating(false);
  };

  const sortedPlaylist = useMemo(() => {
    if (!station?.playlist) return [];
    return [...station.playlist].sort((a, b) => safeGetTime(b.addedAt || 0) - safeGetTime(a.addedAt || 0));
  }, [station?.playlist]);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Station non trouvée</h1>
        <p className="text-muted-foreground">Cette station n&apos;existe pas ou vous n&apos;y avez pas accès.</p>
        <Button onClick={() => router.push('/admin/stations')} className="mt-4">Retour aux stations</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" onClick={() => router.push('/admin/stations')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4"/>
          Retour à toutes les stations
        </Button>
                 <h1 className="text-3xl font-bold tracking-tight">{station.name}</h1>
         <p className="text-muted-foreground">{station.frequency.toFixed(1)} MHz</p>
         
         {/* Real-time Player Monitoring */}
         <RealTimePlayerMonitor stationId={station.id} stationName={station.name} />

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Infos Station</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                 <div className="flex items-center gap-3">
                    <RadioTower className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Fréquence</p>
                        <p className="font-medium">{station.frequency.toFixed(1)} MHz</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">DJ</p>
                        <div className="flex items-center gap-2">
                            <p className="font-medium">{dj?.name || 'Inconnu'}</p>
                            {(dj as CustomDJCharacter)?.isCustom && <Badge variant="secondary">Perso</Badge>}
                        </div>
                    </div>
                 </div>
                  <div className="flex items-center gap-3">
                    <ListMusic className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-muted-foreground">Playlist</p>
                        <p className="font-medium">{station.playlist.length} piste(s)</p>
                    </div>
                 </div>
            </CardContent>
         </Card>

         <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Gestion de la Playlist</CardTitle>
                 <CardDescription>La playlist de cette station est un mix de pistes générées par IA et d&apos;ajouts manuels. Vous pouvez la régénérer à tout moment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="message-theme">Thème de la station pour l&apos;IA</Label>
                    <Input
                        id="message-theme"
                        value={station.theme}
                        disabled
                        className="font-mono"
                    />
                     <p className="text-xs text-muted-foreground">
                        Ce thème est utilisé par l&apos;IA lors de la régénération de la playlist.
                     </p>
                </div>
                <Button onClick={handleRegeneratePlaylist} disabled={isRegenerating} className="w-full">
                    {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    {isRegenerating ? 'Régénération en cours...' : 'Regénérer la playlist avec l\'IA'}
                </Button>
            </CardContent>
         </Card>
      </div>
       <Card>
            <CardHeader>
                <CardTitle>Ajout Manuel de Contenu</CardTitle>
                 <CardDescription>Ajoutez des messages ou des musiques spécifiques à la suite de la playlist actuelle.</CardDescription>
            </CardHeader>
            <CardContent>
               <Tabs defaultValue="message">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="message"><MessageSquare className="mr-2 h-4 w-4"/> Message DJ</TabsTrigger>
                    <TabsTrigger value="music"><Music className="mr-2 h-4 w-4"/> Musique</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="message" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">Nouveau message pour {dj?.name}:</Label>
                      <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Écrivez votre message ici... Il sera lu avec la voix de votre DJ."
                        className="min-h-[120px]"
                      />
                      <Button onClick={handleGenerateMessage} disabled={isGenerating || !message} className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Ajouter à la playlist
                      </Button>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="music" className="mt-4">
                     <div className="space-y-4">
                        <div className="flex w-full items-center space-x-2">
                          <Input 
                            type="text" 
                            placeholder="Chercher dans votre bibliothèque Plex..." 
                            value={musicQuery}
                            onChange={(e) => setMusicQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchMusic()}
                          />
                          <Button type="button" size="icon" onClick={handleSearchMusic} disabled={isSearching || !musicQuery}>
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Recherche dans votre bibliothèque Plex. Assurez-vous que Plex est configuré et accessible.</p>
                        
                        <ScrollArea className="h-64 border rounded-md">
                            {searchError && (
                                <div className="p-4 text-center text-sm text-destructive">
                                    <AlertTriangle className="mx-auto h-6 w-6 mb-2"/>
                                    {searchError}
                                </div>
                            )}
                            {searchResults.length > 0 ? (
                                <div className="p-2 space-y-2">
                                    {searchResults && searchResults.map(track => (
                                        <Card key={track.id} className="p-2 flex items-center justify-between gap-2">
                                            <CardContent className="p-0 flex-grow overflow-hidden">
                                                <p className="font-semibold text-sm truncate">{track.title}</p>
                                                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                            </CardContent>
                                            <Button size="sm" variant="outline" onClick={() => handleAddMusic(track)} disabled={addingTrackId === track.id}>
                                                {addingTrackId === track.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                                            </Button>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                !searchError && (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        {isSearching ? "Recherche en cours..." : "Aucun résultat. Entrez un terme pour chercher."}
                                    </div>
                                )
                            )}
                        </ScrollArea>
                     </div>
                  </TabsContent>
               </Tabs>
            </CardContent>
         </Card>
      
       <Card>
          <CardHeader>
            <CardTitle>Playlist Actuelle</CardTitle>
            <CardDescription>Les pistes sont jouées dans l&apos;ordre de la radio (aléatoire pour l&apos;instant).</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedPlaylist.length > 0 ? (
                <ScrollArea className="h-96">
                    <div className="space-y-4">
                        {sortedPlaylist && sortedPlaylist.map((item) => (
                            <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                <div className="p-2 bg-muted rounded-md">
                                    {item.type === 'music' ? <Music className="h-5 w-5 text-muted-foreground"/> : <MessageSquare className="h-5 w-5 text-muted-foreground"/>}
                                </div>
                                <div className="flex-grow overflow-hidden">
                                    <p className="font-semibold truncate">{item.title}</p>
                                    <p className="text-sm text-muted-foreground truncate">{item.artist || 'Message DJ'}</p>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4"/>
                                    <span>{formatDuration(item.duration)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <ListMusic className="mx-auto h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">La playlist est vide</h3>
                    <p>Utilisez le générateur IA pour commencer ou ajoutez des pistes manuellement.</p>
                </div>
            )}
          </CardContent>
       </Card>
    </div>
  );
}

    