
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminLayout } from '../layout';
import { createStation } from '@/app/actions';
import type { CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  RadioTower, 
  Plus,
  ArrowRight,
  Users,
  Music,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';


export default function StationsManagement() {
  const { user, stations, customCharacters, isLoading } = useAdminLayout();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const allDjs = useMemo(() => [...DJ_CHARACTERS, ...customCharacters], [customCharacters]);

  const [formData, setFormData] = useState({
    name: '',
    frequency: 92.1,
    djCharacterId: '',
    theme: 'Histoires d\'espoir et de survie dans les terres désolées'
  });

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    setFormError(null);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('frequency', formData.frequency.toString());
      form.append('djCharacterId', formData.djCharacterId);
      form.append('theme', formData.theme);

      const result = await createStation(user.uid, form);

      if (result.error) {
        if (result.error.general) {
          setFormError(result.error.general);
        } else {
          setFormError('Erreur de validation. Vérifiez les champs.');
        }
      } else {
        toast({
          title: 'Station créée !',
          description: `La station ${formData.name} est maintenant en ligne sur ${formData.frequency} MHz.`,
        });
        setIsCreateModalOpen(false);
        setFormData({ name: '', frequency: 92.1, djCharacterId: '', theme: 'Histoires d\'espoir et de survie dans les terres désolées' });
        router.push(`/admin/stations/${result.stationId}`);
      }
    } catch (err: any) {
      console.error('Erreur de création:', err);
      setFormError('Une erreur inattendue est survenue.');
    } finally {
      setIsCreating(false);
    }
  };

  const getDjInfo = (djCharacterId: string) => {
    const dj = allDjs.find(d => d.id === djCharacterId);
    return {
      name: dj?.name || 'Inconnu',
      isCustom: (dj as CustomDJCharacter)?.isCustom || false
    }
  };

  const getRandomFrequency = () => {
    const freq = Math.random() * (108.0 - 87.0) + 87.0;
    return parseFloat(freq.toFixed(1));
  };
  
  if (isLoading) {
      return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mes Stations</h1>
            <p className="text-muted-foreground">Créez et gérez vos propres stations radio.</p>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Station
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une nouvelle station</DialogTitle>
              </DialogHeader>
              {formError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {formError}
                </div>
              )}
              <form onSubmit={handleCreateStation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="station-name">Nom de la station</Label>
                  <Input
                    id="station-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Radio Wasteland"
                    required
                  />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="station-theme">Thème de la station</Label>
                  <Input
                    id="station-theme"
                    value={formData.theme}
                    onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                    placeholder="Ex: Humour noir et jazz d'avant-guerre"
                    required
                  />
                  <p className="text-xs text-muted-foreground">L'IA utilisera ce thème pour générer les messages et choisir la musique.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="station-frequency">Fréquence (87.0 - 108.0 MHz)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="station-frequency"
                      type="number"
                      min="87.0"
                      max="108.0"
                      step="0.1"
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: parseFloat(e.target.value) })}
                      required
                    />
                     <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData({ ...formData, frequency: getRandomFrequency() })}
                      >
                        <Zap className="h-4 w-4" />
                      </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="station-dj">Personnage DJ</Label>
                  <Select
                    value={formData.djCharacterId}
                    onValueChange={(value) => setFormData({ ...formData, djCharacterId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisissez un DJ" />
                    </SelectTrigger>
                    <SelectContent>
                      {allDjs.map((dj) => (
                        <SelectItem key={dj.id} value={dj.id}>
                           {dj.name} {(dj as CustomDJCharacter).isCustom ? "(Perso)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isCreating ? 'Création...' : 'Créer Station'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
      </div>
      
      {stations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center p-12 border-dashed">
            <CardHeader>
                <div className="mx-auto bg-muted p-4 rounded-full">
                    <RadioTower className="h-12 w-12 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">Aucune station pour le moment</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground mb-4">
                    Commencez par créer votre première station pour diffuser dans les terres désolées.
                  </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer ma première station
                </Button>
            </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {stations.map((station) => {
              const djInfo = getDjInfo(station.djCharacterId);
              return (
                <Card key={station.id}>
                  <CardHeader>
                     <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>{station.name}</CardTitle>
                            <CardDescription>{station.frequency.toFixed(1)} MHz</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/stations/${station.id}`)}>
                            Gérer
                            <ArrowRight className="h-4 w-4 ml-2"/>
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Personnage DJ</p>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{djInfo.name}</p>
                            {djInfo.isCustom && <Badge variant="secondary">Perso</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Music className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Playlist</p>
                          <p className="font-medium">
                            {station.playlist.length} piste{station.playlist.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                       <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-muted-foreground">Statut</p>
                          <p className="font-medium text-green-600">Active</p>
                        </div>
                      </div>
                  </CardContent>
                </Card>
              )
            })}
        </div>
      )}
    </div>
  );
}
