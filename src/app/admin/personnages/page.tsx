'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCustomCharactersForUser, createCustomDj } from '@/app/actions';
import type { CustomDJCharacter } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';

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
  Edit3,
  Trash2,
  ArrowLeft,
  Mic,
  Volume2,
  User,
  Sparkles,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export default function PersonnagesManagement() {
  const [user, setUser] = useState<User | null>(null);
  const [customCharacters, setCustomCharacters] = useState<CustomDJCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();

  // Form state for creating DJ characters
  const [formData, setFormData] = useState({
    name: '',
    background: '',
    gender: 'male',
    tone: 'neutral',
    style: 'conversational',
    speakingRate: 1.0
  });

  useEffect(() => {
    setIsClient(true);
    // Generate particles
    setParticleStyles(
      Array.from({ length: 15 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 8}s`,
        animationDuration: `${4 + Math.random() * 6}s`,
      }))
    );
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);
      await loadCustomCharacters(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadCustomCharacters = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const characters = await getCustomCharactersForUser(userId);
      setCustomCharacters(characters);
    } catch (err: any) {
      console.error('Erreur de chargement des personnages:', err);
      setError('Erreur de chargement des personnages. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('background', formData.background);
      form.append('gender', formData.gender);
      form.append('tone', formData.tone);
      form.append('style', formData.style);
      form.append('speakingRate', formData.speakingRate.toString());

      const result = await createCustomDj(user.uid, form);

      if (result.error) {
        if (result.error.general) {
          setCreateError(result.error.general);
        } else {
          setCreateError('Erreur de création du personnage.');
        }
      } else {
        // Success
        setIsCreateModalOpen(false);
        setFormData({
          name: '',
          background: '',
          gender: 'male',
          tone: 'neutral',
          style: 'conversational',
          speakingRate: 1.0
        });
        await loadCustomCharacters(user.uid);
      }
    } catch (err: any) {
      console.error('Erreur de création:', err);
      setCreateError('Erreur de création du personnage.');
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
      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
        
        <div className="relative z-10 min-h-screen w-full p-4 sm:p-6 md:p-8">
          <div className="w-full max-w-6xl mx-auto space-y-6">
            <Skeleton className="w-full h-32 bg-orange-400/20 animate-flicker" />
            <div className="grid gap-6">
              <Skeleton className="h-64 bg-orange-400/20 animate-flicker" />
              <Skeleton className="h-48 bg-orange-400/20 animate-flicker" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
        <Card className="border-2 border-red-500/30 bg-black/90 backdrop-blur-sm max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-300 mb-2">Erreur</h2>
            <p className="text-red-300/80 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="bg-red-600/80 hover:bg-red-500/90">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background post-apocalyptique */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
      
      {/* Effets de radiation */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-red-700/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

      {/* Grille déformée */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(90deg, transparent 49%, rgba(255, 165, 0, 0.3) 49%, rgba(255, 165, 0, 0.3) 51%, transparent 51%),
              linear-gradient(0deg, transparent 49%, rgba(255, 165, 0, 0.2) 49%, rgba(255, 165, 0, 0.2) 51%, transparent 51%)
            `,
            backgroundSize: '50px 50px',
            animation: 'drift 25s linear infinite'
          }}
        />
      </div>

      {/* Particules */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particleStyles.map((style, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-400/40 rounded-full animate-float"
              style={style}
            />
          ))}
        </div>
      )}

      {/* Interface principale */}
      <div className="relative z-10 min-h-screen w-full p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          
          {/* En-tête */}
          <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-scanline"></div>
            </div>
            <div className="absolute inset-1 border border-orange-400/20 rounded-lg pointer-events-none animate-pulse-subtle"></div>
            
            <CardHeader className="border-b-2 border-orange-500/30 pb-4 bg-gradient-to-r from-black/90 to-zinc-900/90">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={() => router.push('/admin')}
                    className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300 mr-2"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                  <div className="relative">
                    <Users className="h-10 w-10 text-orange-400 drop-shadow-lg" />
                    <div className="absolute inset-0 bg-orange-400/30 blur-sm animate-pulse"></div>
                  </div>
                  <div>
                    <CardTitle className="font-headline text-3xl text-orange-100 tracking-wider drop-shadow-lg">
                      <span className="inline-block animate-flicker-subtle">DJ Personnalisés</span>
                    </CardTitle>
                    <p className="text-orange-300/80">
                      {customCharacters.length} personnage{customCharacters.length !== 1 ? 's' : ''} personnalisé{customCharacters.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-600/80 hover:bg-orange-500/90 border border-orange-400/50">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau DJ
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-2 border-orange-500/30 bg-black/90 backdrop-blur-sm text-orange-100 max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-orange-100 flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-orange-400" />
                          Créer un DJ Personnalisé
                        </DialogTitle>
                      </DialogHeader>
                      
                      {createError && (
                        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {createError}
                        </div>
                      )}

                      <form onSubmit={handleCreateCharacter} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="dj-name" className="text-orange-300">Nom du DJ</Label>
                            <Input
                              id="dj-name"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="DJ Wasteland"
                              className="bg-black/60 border-orange-500/30 text-orange-100"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dj-gender" className="text-orange-300">Genre vocal</Label>
                            <Select 
                              value={formData.gender} 
                              onValueChange={(value) => setFormData({ ...formData, gender: value })}
                            >
                              <SelectTrigger className="bg-black/60 border-orange-500/30 text-orange-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-orange-500/30">
                                <SelectItem value="male" className="text-orange-100 focus:bg-orange-500/20">Masculin</SelectItem>
                                <SelectItem value="female" className="text-orange-100 focus:bg-orange-500/20">Féminin</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dj-background" className="text-orange-300">Histoire & Personnalité</Label>
                          <Textarea
                            id="dj-background"
                            value={formData.background}
                            onChange={(e) => setFormData({ ...formData, background: e.target.value })}
                            placeholder="Un ancien ingénieur radio qui diffuse depuis son bunker dans les terres désolées..."
                            className="bg-black/60 border-orange-500/30 text-orange-100 min-h-[100px]"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="dj-tone" className="text-orange-300">Ton de voix</Label>
                            <Select 
                              value={formData.tone} 
                              onValueChange={(value) => setFormData({ ...formData, tone: value })}
                            >
                              <SelectTrigger className="bg-black/60 border-orange-500/30 text-orange-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-orange-500/30">
                                <SelectItem value="neutral" className="text-orange-100 focus:bg-orange-500/20">Neutre</SelectItem>
                                <SelectItem value="warm" className="text-orange-100 focus:bg-orange-500/20">Chaleureux</SelectItem>
                                <SelectItem value="cool" className="text-orange-100 focus:bg-orange-500/20">Froid</SelectItem>
                                <SelectItem value="friendly" className="text-orange-100 focus:bg-orange-500/20">Amical</SelectItem>
                                <SelectItem value="serious" className="text-orange-100 focus:bg-orange-500/20">Sérieux</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="dj-style" className="text-orange-300">Style de communication</Label>
                            <Select 
                              value={formData.style} 
                              onValueChange={(value) => setFormData({ ...formData, style: value })}
                            >
                              <SelectTrigger className="bg-black/60 border-orange-500/30 text-orange-100">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-black/90 border-orange-500/30">
                                <SelectItem value="conversational" className="text-orange-100 focus:bg-orange-500/20">Conversationnel</SelectItem>
                                <SelectItem value="formal" className="text-orange-100 focus:bg-orange-500/20">Formel</SelectItem>
                                <SelectItem value="dramatic" className="text-orange-100 focus:bg-orange-500/20">Dramatique</SelectItem>
                                <SelectItem value="energetic" className="text-orange-100 focus:bg-orange-500/20">Énergique</SelectItem>
                                <SelectItem value="calm" className="text-orange-100 focus:bg-orange-500/20">Calme</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-orange-300">
                            Vitesse d'élocution: {formData.speakingRate.toFixed(1)}x
                          </Label>
                          <Slider
                            value={[formData.speakingRate]}
                            onValueChange={(value) => setFormData({ ...formData, speakingRate: value[0] })}
                            min={0.5}
                            max={2.0}
                            step={0.1}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-orange-400/60">
                            <span>Lent</span>
                            <span>Normal</span>
                            <span>Rapide</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                            disabled={isCreating}
                          >
                            Annuler
                          </Button>
                          <Button
                            type="submit"
                            className="bg-orange-600/80 hover:bg-orange-500/90"
                            disabled={isCreating}
                          >
                            {isCreating ? 'Création...' : 'Créer DJ'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* DJ Prédéfinis */}
          <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
            <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
            <CardHeader className="border-b border-orange-500/20">
              <CardTitle className="flex items-center gap-2 text-orange-100">
                <Mic className="h-5 w-5 text-orange-400" />
                DJ Prédéfinis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {DJ_CHARACTERS.map((dj) => (
                  <div 
                    key={dj.id}
                    className="p-4 bg-black/40 border border-orange-500/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-orange-400" />
                      <h3 className="font-semibold text-orange-100">{dj.name}</h3>
                    </div>
                    <p className="text-sm text-orange-300/80 mb-3">{dj.description}</p>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-300">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Prédéfini
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* DJ Personnalisés */}
          {customCharacters.length === 0 ? (
            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardContent className="p-12 text-center">
                <Sparkles className="h-16 w-16 text-orange-400/60 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-orange-100 mb-2">Aucun DJ Personnalisé</h3>
                <p className="text-orange-300/80 mb-6">
                  Créez votre premier DJ personnalisé avec une voix IA unique adaptée à votre style !
                </p>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-orange-600/80 hover:bg-orange-500/90 border border-orange-400/50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer mon premier DJ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardHeader className="border-b border-orange-500/20">
                <CardTitle className="flex items-center gap-2 text-orange-100">
                  <Sparkles className="h-5 w-5 text-orange-400" />
                  Vos DJ Personnalisés
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {customCharacters.map((character) => (
                    <div 
                      key={character.id}
                      className="p-6 bg-black/40 border border-orange-500/20 rounded-lg hover:border-orange-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-orange-500/20 rounded-lg">
                            <User className="h-6 w-6 text-orange-400" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-orange-100">{character.name}</h3>
                            <p className="text-sm text-orange-300/80">
                              Créé le {formatDate(character.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Personnalisé
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="border border-orange-500/30 hover:bg-orange-500/20"
                          >
                            <Edit3 className="h-4 w-4 text-orange-300" />
                          </Button>
                        </div>
                      </div>

                      <p className="text-orange-300/80 mb-4">{character.description}</p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-orange-400/80">Genre</p>
                          <p className="font-medium text-orange-100">
                            {character.voice.gender === 'male' ? 'Masculin' : 'Féminin'}
                          </p>
                        </div>
                        <div>
                          <p className="text-orange-400/80">Ton</p>
                          <p className="font-medium text-orange-100 capitalize">{character.voice.tone}</p>
                        </div>
                        <div>
                          <p className="text-orange-400/80">Style</p>
                          <p className="font-medium text-orange-100 capitalize">{character.voice.style}</p>
                        </div>
                        <div>
                          <p className="text-orange-400/80">Vitesse</p>
                          <p className="font-medium text-orange-100">{character.voice.speakingRate}x</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}