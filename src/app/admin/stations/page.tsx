'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getStationsForUser, createStation } from '@/app/actions';
import type { Station } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OndeSpectraleLogo } from '@/components/icons';

import { 
  RadioTower, 
  Settings, 
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
  Users,
  Music,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export default function StationsManagement() {
  const [user, setUser] = useState<User | null>(null);
  const [userStations, setUserStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const router = useRouter();

  // Form state for creating stations
  const [formData, setFormData] = useState({
    name: '',
    frequency: 92.1,
    djCharacterId: ''
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
      await loadStations(currentUser.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const loadStations = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const stations = await getStationsForUser(userId);
      setUserStations(stations);
    } catch (err: any) {
      console.error('Erreur de chargement des stations:', err);
      setError('Erreur de chargement des stations. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const form = new FormData();
      form.append('name', formData.name);
      form.append('frequency', formData.frequency.toString());
      form.append('djCharacterId', formData.djCharacterId);

      const result = await createStation(user.uid, form);

      if (result.error) {
        if (result.error.general) {
          setCreateError(result.error.general);
        } else {
          setCreateError('Erreur de création de la station.');
        }
      } else {
        // Success
        setIsCreateModalOpen(false);
        setFormData({ name: '', frequency: 92.1, djCharacterId: '' });
        await loadStations(user.uid);
      }
    } catch (err: any) {
      console.error('Erreur de création:', err);
      setCreateError('Erreur de création de la station.');
    } finally {
      setIsCreating(false);
    }
  };

  const getDjName = (djCharacterId: string) => {
    const dj = DJ_CHARACTERS.find(d => d.id === djCharacterId);
    return dj?.name || 'DJ Personnalisé';
  };

  const getRandomFrequency = () => {
    // Generate a random frequency between 87.5 and 107.5
    const freq = Math.random() * (107.5 - 87.5) + 87.5;
    return Math.round(freq * 10) / 10; // Round to 1 decimal place
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
                    <Settings className="h-10 w-10 text-orange-400 drop-shadow-lg" />
                    <div className="absolute inset-0 bg-orange-400/30 blur-sm animate-pulse"></div>
                  </div>
                  <div>
                    <CardTitle className="font-headline text-3xl text-orange-100 tracking-wider drop-shadow-lg">
                      <span className="inline-block animate-flicker-subtle">Gestion des Stations</span>
                    </CardTitle>
                    <p className="text-orange-300/80">{userStations.length} station{userStations.length !== 1 ? 's' : ''} active{userStations.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-600/80 hover:bg-orange-500/90 border border-orange-400/50">
                        <Plus className="h-4 w-4 mr-2" />
                        Nouvelle Station
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border-2 border-orange-500/30 bg-black/90 backdrop-blur-sm text-orange-100">
                      <DialogHeader>
                        <DialogTitle className="text-orange-100 flex items-center gap-2">
                          <RadioTower className="h-5 w-5 text-orange-400" />
                          Créer une Nouvelle Station
                        </DialogTitle>
                      </DialogHeader>
                      
                      {createError && (
                        <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {createError}
                        </div>
                      )}

                      <form onSubmit={handleCreateStation} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="station-name" className="text-orange-300">Nom de la station</Label>
                          <Input
                            id="station-name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Radio Wasteland"
                            className="bg-black/60 border-orange-500/30 text-orange-100"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="station-frequency" className="text-orange-300">
                            Fréquence (87.0 - 108.0 MHz)
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="station-frequency"
                              type="number"
                              min="87.0"
                              max="108.0"
                              step="0.1"
                              value={formData.frequency}
                              onChange={(e) => setFormData({ ...formData, frequency: parseFloat(e.target.value) })}
                              className="bg-black/60 border-orange-500/30 text-orange-100"
                              required
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setFormData({ ...formData, frequency: getRandomFrequency() })}
                              className="border-orange-500/30 text-orange-300 hover:bg-orange-500/10"
                            >
                              <Zap className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="station-dj" className="text-orange-300">Personnage DJ</Label>
                          <Select 
                            value={formData.djCharacterId} 
                            onValueChange={(value) => setFormData({ ...formData, djCharacterId: value })}
                            required
                          >
                            <SelectTrigger className="bg-black/60 border-orange-500/30 text-orange-100">
                              <SelectValue placeholder="Choisissez un DJ" />
                            </SelectTrigger>
                            <SelectContent className="bg-black/90 border-orange-500/30">
                              {DJ_CHARACTERS.map((dj) => (
                                <SelectItem key={dj.id} value={dj.id} className="text-orange-100 focus:bg-orange-500/20">
                                  {dj.name} - {dj.description}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                            {isCreating ? 'Création...' : 'Créer Station'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Liste des stations */}
          {userStations.length === 0 ? (
            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardContent className="p-12 text-center">
                <RadioTower className="h-16 w-16 text-orange-400/60 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-orange-100 mb-2">Aucune Station</h3>
                <p className="text-orange-300/80 mb-6">
                  Vous n'avez pas encore créé de station radio. Commencez par créer votre première transmission !
                </p>
                <Button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-orange-600/80 hover:bg-orange-500/90 border border-orange-400/50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Créer ma première station
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {userStations.map((station) => (
                <Card 
                  key={station.id} 
                  className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden group cursor-pointer transition-all hover:shadow-orange-500/30"
                  onClick={() => router.push(`/admin/stations/${station.id}`)}
                >
                  <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none group-hover:border-orange-400/30 transition-colors"></div>
                  
                  <CardHeader className="border-b border-orange-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-3xl font-mono text-orange-100 font-bold">
                              {station.frequency.toFixed(1)} MHz
                            </span>
                          </div>
                        </div>
                        <div>
                          <CardTitle className="text-xl text-orange-100">{station.name}</CardTitle>
                          <p className="text-orange-300/80">
                            DJ: {getDjName(station.djCharacterId)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-green-500/30 text-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="border border-orange-500/30 hover:bg-orange-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/admin/stations/${station.id}/edit`);
                          }}
                        >
                          <Edit3 className="h-4 w-4 text-orange-300" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-orange-400" />
                        <div>
                          <p className="text-sm text-orange-300/80">Personnage DJ</p>
                          <p className="font-medium text-orange-100">{getDjName(station.djCharacterId)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Music className="h-5 w-5 text-orange-400" />
                        <div>
                          <p className="text-sm text-orange-300/80">Playlist</p>
                          <p className="font-medium text-orange-100">
                            {station.playlist.length} piste{station.playlist.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-orange-400" />
                        <div>
                          <p className="text-sm text-orange-300/80">Créée le</p>
                          <p className="font-medium text-orange-100">
                            {new Date(station.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}