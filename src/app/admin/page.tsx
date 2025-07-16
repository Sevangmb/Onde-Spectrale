'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData, getStationsForUser } from '@/app/actions';
import type { Station } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OndeSpectraleLogo } from '@/components/icons';

import { 
  RadioTower, 
  Settings, 
  Users, 
  BarChart3, 
  Plus,
  Zap,
  Calendar,
  Headphones,
  ArrowRight,
  AlertTriangle
} from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

interface UserData {
  email: string;
  stationsCreated: number;
  lastFrequency: number;
  createdAt?: string;
  lastLogin?: string;
}

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userStations, setUserStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
    // Generate particles
    setParticleStyles(
      Array.from({ length: 12 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 6}s`,
        animationDuration: `${3 + Math.random() * 5}s`,
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
      setIsLoading(true);
      setError(null);

      try {
        // Fetch user data and stations in parallel
        const [userData, stations] = await Promise.all([
          getUserData(currentUser.uid),
          getStationsForUser(currentUser.uid)
        ]);

        setUserData(userData);
        setUserStations(stations);
      } catch (err: any) {
        console.error('Erreur de chargement des données admin:', err);
        setError('Erreur de chargement des données. Réessayez.');
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDjName = (djCharacterId: string) => {
    const dj = DJ_CHARACTERS.find(d => d.id === djCharacterId);
    return dj?.name || 'DJ Personnalisé';
  };

  if (isLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
        
        <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4">
          <div className="w-full max-w-6xl mx-auto space-y-6">
            <Skeleton className="w-full h-32 bg-orange-400/20 animate-flicker" />
            <div className="grid md:grid-cols-3 gap-6">
              <Skeleton className="h-48 bg-orange-400/20 animate-flicker" />
              <Skeleton className="h-48 bg-orange-400/20 animate-flicker" />
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
            <h2 className="text-xl font-bold text-red-300 mb-2">Erreur de connexion</h2>
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
                  <div className="relative">
                    <OndeSpectraleLogo className="h-10 w-10 text-orange-400 drop-shadow-lg" />
                    <div className="absolute inset-0 bg-orange-400/30 blur-sm animate-pulse"></div>
                  </div>
                  <div>
                    <CardTitle className="font-headline text-3xl text-orange-100 tracking-wider drop-shadow-lg">
                      <span className="inline-block animate-flicker-subtle">Centre de Contrôle</span>
                    </CardTitle>
                    <p className="text-orange-300/80">Gestion des transmissions - {user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button 
                    variant="ghost" 
                    onClick={() => router.push('/')}
                    className="border border-orange-500/30 hover:bg-orange-500/20 text-orange-300"
                  >
                    <RadioTower className="h-4 w-4 mr-2" />
                    Retour Radio
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Statistiques principales */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300/80 text-sm font-medium">Stations Actives</p>
                    <p className="text-3xl font-bold text-orange-100 animate-flicker-subtle">
                      {userStations.length}
                    </p>
                  </div>
                  <RadioTower className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300/80 text-sm font-medium">Dernière Fréquence</p>
                    <p className="text-3xl font-bold text-orange-100 animate-flicker-subtle">
                      {userData?.lastFrequency?.toFixed(1) || '92.1'}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300/80 text-sm font-medium">Stations Créées</p>
                    <p className="text-3xl font-bold text-orange-100 animate-flicker-subtle">
                      {userData?.stationsCreated || 0}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-300/80 text-sm font-medium">Membre depuis</p>
                    <p className="text-lg font-bold text-orange-100 animate-flicker-subtle">
                      {formatDate(userData?.createdAt)}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden group cursor-pointer transition-all hover:shadow-orange-500/30"
              onClick={() => router.push('/admin/stations')}>
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none group-hover:border-orange-400/30 transition-colors"></div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-orange-100">
                  <span className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-400" />
                    Gestion des Stations
                  </span>
                  <ArrowRight className="h-4 w-4 text-orange-400/60 group-hover:text-orange-400 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-300/80 mb-4">
                  Créez, modifiez et gérez vos stations radio personnalisées.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                    {userStations.length} station{userStations.length !== 1 ? 's' : ''}
                  </Badge>
                  <Button size="sm" className="bg-orange-600/80 hover:bg-orange-500/90">
                    <Plus className="h-4 w-4 mr-1" />
                    Nouvelle
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden group cursor-pointer transition-all hover:shadow-orange-500/30"
              onClick={() => router.push('/admin/personnages')}>
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none group-hover:border-orange-400/30 transition-colors"></div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-orange-100">
                  <span className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-400" />
                    DJ Personnalisés
                  </span>
                  <ArrowRight className="h-4 w-4 text-orange-400/60 group-hover:text-orange-400 transition-colors" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-300/80 mb-4">
                  Créez des personnages DJ uniques avec leurs propres voix IA.
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                    Voix personnalisées
                  </Badge>
                  <Button size="sm" className="bg-orange-600/80 hover:bg-orange-500/90">
                    <Plus className="h-4 w-4 mr-1" />
                    Créer
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-orange-100">
                  <BarChart3 className="h-5 w-5 text-orange-400" />
                  Statistiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-300/80 mb-4">
                  Analysez les performances de vos transmissions.
                </p>
                <Badge variant="outline" className="border-orange-500/30 text-orange-300">
                  Bientôt disponible
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Stations récentes */}
          {userStations.length > 0 && (
            <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
              <CardHeader className="border-b border-orange-500/20">
                <CardTitle className="flex items-center gap-2 text-orange-100">
                  <Headphones className="h-5 w-5 text-orange-400" />
                  Vos Stations Actives
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid gap-4">
                  {userStations.slice(0, 3).map((station) => (
                    <div 
                      key={station.id}
                      className="flex items-center justify-between p-4 bg-black/40 border border-orange-500/20 rounded-lg hover:border-orange-500/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/stations/${station.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-2xl font-mono text-orange-100 font-bold">
                            {station.frequency.toFixed(1)} MHz
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-orange-100">{station.name}</h3>
                          <p className="text-sm text-orange-300/80">
                            DJ: {getDjName(station.djCharacterId)} • {station.playlist.length} piste{station.playlist.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-orange-400/60" />
                    </div>
                  ))}
                  
                  {userStations.length > 3 && (
                    <Button 
                      variant="ghost" 
                      onClick={() => router.push('/admin/stations')}
                      className="mt-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                    >
                      Voir toutes les stations ({userStations.length})
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}