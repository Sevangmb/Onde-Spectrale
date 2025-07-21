'use client';

import { useState, useMemo } from 'react';
import { useAdminLayout } from '../layout';
import { createCustomDj } from '@/app/actions';
import { DJ_CHARACTERS } from '@/lib/data';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  Users, 
  Plus,
  Mic,
  User,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from 'lucide-react';


export default function PersonnagesManagement() {
  const { user, customCharacters, isLoading, stations } = useAdminLayout();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { toast } = useToast();

  const allDjs = useMemo(() => [...DJ_CHARACTERS, ...customCharacters], [customCharacters]);

  const [formData, setFormData] = useState({
    name: '',
    background: '',
    gender: 'male',
    tone: 'medium',
    style: 'calm',
    speakingRate: 1.0
  });

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    setFormError(null);

    try {
      const form = new FormData();
      // We are not using speakingRate anymore, so we set it to 1.0
      const dataToSubmit = { ...formData, speakingRate: 1.0 };

      Object.entries(dataToSubmit).forEach(([key, value]) => {
        form.append(key, String(value));
      });

      const result = await createCustomDj(user.uid, form);

      if (result.error) {
        if (result.error.general) {
          setFormError(result.error.general);
        } else {
          setFormError('Erreur de validation. Vérifiez les champs.');
        }
      } else {
        toast({
          title: 'DJ Créé !',
          description: `Le personnage ${formData.name} est prêt à prendre l'antenne.`,
          variant: 'default',
        });
        setIsCreateModalOpen(false);
        setFormData({ name: '', background: '', gender: 'male', tone: 'medium', style: 'calm', speakingRate: 1.0 });
      }
    } catch (err: any) {
      console.error('Erreur de création:', err);
      setFormError('Une erreur inattendue est survenue.');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
       <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-32" />
            </div>
             <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48"/>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24"/>
                    <Skeleton className="h-24"/>
                    <Skeleton className="h-24"/>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48"/>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-32"/>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Mes Personnages DJ</h1>
            <p className="text-muted-foreground">Gérez vos DJ prédéfinis et créez vos propres voix IA.</p>
          </div>
           <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau DJ
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Créer un DJ Personnalisé</DialogTitle>
                  </DialogHeader>
                  
                  {formError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleCreateCharacter} className="space-y-6 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dj-name">Nom du DJ</Label>
                        <Input
                          id="dj-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="DJ Wasteland"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dj-gender">Genre vocal</Label>
                        <Select 
                          value={formData.gender} 
                          onValueChange={(value) => setFormData({ ...formData, gender: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Masculin</SelectItem>
                            <SelectItem value="female">Féminin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dj-background">Histoire & Personnalité</Label>
                      <Textarea
                        id="dj-background"
                        value={formData.background}
                        onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                        placeholder="Un ancien ingénieur radio qui diffuse depuis son bunker..."
                        className="min-h-[100px]"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                        <Label htmlFor="dj-tone">Ton de voix</Label>
                        <Select 
                          value={formData.tone} 
                          onValueChange={(value) => setFormData({ ...formData, tone: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deep">Grave</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">Aigu</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dj-style">Style de communication</Label>
                        <Select 
                          value={formData.style} 
                          onValueChange={(value) => setFormData({ ...formData, style: value })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="calm">Calme</SelectItem>
                            <SelectItem value="energetic">Énergique</SelectItem>
                            <SelectItem value="joker">Blagueur</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>Annuler</Button>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        {isCreating ? 'Création...' : 'Créer DJ'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
            </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mic className="h-5 w-5 text-primary"/> DJ Prédéfinis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DJ_CHARACTERS.map((dj) => (
              <div key={dj.id} className="p-4 bg-muted/50 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5" />
                  <h3 className="font-semibold">{dj.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{dj.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/> Vos DJ Personnalisés</CardTitle>
          </CardHeader>
          <CardContent>
             {customCharacters.length === 0 ? (
                 <div className="text-center text-muted-foreground py-8">
                    <p>Vous n'avez pas encore créé de DJ personnalisé.</p>
                 </div>
             ) : (
                <div className="grid gap-4">
                  {customCharacters.map((character) => (
                    <div key={character.id} className="p-4 border rounded-lg flex items-start justify-between">
                       <div>
                         <h3 className="font-semibold text-lg">{character.name}</h3>
                         <p className="text-muted-foreground text-sm mb-2">{character.description}</p>
                         <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="secondary">Genre: {character.voice.gender}</Badge>
                            <Badge variant="secondary">Ton: {character.voice.tone}</Badge>
                            <Badge variant="secondary">Style: {character.voice.style}</Badge>
                            <Badge variant="secondary">Vitesse: {character.voice.speakingRate}x</Badge>
                         </div>
                       </div>
                       <div>
                            <Badge variant="outline" className="border-green-600 text-green-600">
                                <CheckCircle className="mr-1 h-3 w-3"/>
                                Utilisé par {stations.filter(s => s.djCharacterId === character.id).length} station(s)
                            </Badge>
                       </div>
                    </div>
                  ))}
                </div>
             )}
          </CardContent>
      </Card>
    </div>
  );
}
