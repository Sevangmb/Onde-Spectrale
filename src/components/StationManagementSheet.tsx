'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { addMessageToStation, addMusicToStation, searchMusic } from '@/app/actions';
import type { Station, CustomDJCharacter, PlaylistItem } from '@/lib/types';
import { MessageSquare, Music, Search, Plus, Loader2 } from 'lucide-react';

interface StationManagementSheetProps {
  station: Station;
  dj: CustomDJCharacter | null;
  children: React.ReactNode;
}

export function StationManagementSheet({ station, dj, children }: StationManagementSheetProps) {
  const [message, setMessage] = useState('');
  const [musicQuery, setMusicQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaylistItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  const handleGenerateMessage = async () => {
    if (message.trim().length < 5) {
      toast({ variant: 'destructive', description: "Le message est trop court." });
      return;
    }
    setIsGenerating(true);
    const result = await addMessageToStation(station.id, message);
    if (result.error) {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    } else {
      toast({ title: "Message ajouté", description: "Votre message est dans la playlist." });
      setMessage('');
    }
    setIsGenerating(false);
  };
  
  const handleSearchMusic = async () => {
      if (!musicQuery.trim()) return;
      setIsSearching(true);
      const results = await searchMusic(musicQuery);
      setSearchResults(results);
      setIsSearching(false);
  };

  const handleAddMusic = async (track: PlaylistItem) => {
    const result = await addMusicToStation(station.id, track);
     if (result.error) {
      toast({ variant: 'destructive', title: "Erreur", description: result.error });
    } else {
      toast({ title: "Musique ajoutée", description: "La musique est dans la playlist." });
    }
  }


  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="w-full sm:max-w-md bg-background border-primary/50 flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-headline text-2xl text-primary">Gérer la station</SheetTitle>
          <SheetDescription>"{station.name}"</SheetDescription>
        </SheetHeader>
        <Tabs defaultValue="message" className="flex-grow flex flex-col mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="message"><MessageSquare className="mr-2 h-4 w-4"/> Message DJ</TabsTrigger>
            <TabsTrigger value="music"><Music className="mr-2 h-4 w-4"/> Musique</TabsTrigger>
          </TabsList>
          <TabsContent value="message" className="flex-grow mt-4 flex flex-col">
            <div className="flex flex-col h-full">
              <Label htmlFor="message">Nouveau message pour {dj?.name}:</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Écrivez votre message ici... Il sera lu avec la voix de votre DJ."
                className="flex-grow mt-2"
                rows={5}
              />
              <Button onClick={handleGenerateMessage} disabled={isGenerating || !message} className="mt-4">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
                Générer et diffuser
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="music" className="flex-grow mt-4 flex flex-col">
            <div className="flex w-full items-center space-x-2">
              <Input 
                type="text" 
                placeholder="Chercher une musique vintage..." 
                value={musicQuery}
                onChange={(e) => setMusicQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchMusic()}
              />
              <Button type="button" size="icon" onClick={handleSearchMusic} disabled={isSearching || !musicQuery}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recherche sur Archive.org</p>
            <ScrollArea className="flex-grow mt-4 border rounded-md">
                {searchResults.length > 0 ? (
                    <div className="p-2 space-y-2">
                        {searchResults.map(track => (
                            <Card key={track.id} className="p-2 flex items-center justify-between">
                                <CardContent className="p-0 overflow-hidden">
                                    <p className="font-semibold text-sm truncate">{track.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                                </CardContent>
                                <Button size="sm" variant="outline" onClick={() => handleAddMusic(track)}>
                                    <Plus className="h-4 w-4"/>
                                </Button>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        {isSearching ? "Recherche en cours..." : "Entrez un terme pour lancer une recherche."}
                    </div>
                )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
