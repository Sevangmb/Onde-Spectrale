
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import type { Station } from '@/lib/types';

import { useAdminLayout } from './layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { OndeSpectraleLogo } from '@/components/icons';
import { StationStatusCard } from '@/components/StationStatusCard';

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
  AlertTriangle,
  LayoutDashboard
} from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export default function AdminDashboard() {
  const { user, userData, stations, isLoading, customCharacters } = useAdminLayout();
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Inconnue';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getDjName = (djCharacterId: string) => {
    // Combine official and custom characters
    const allDjs = [...customCharacters];
    const dj = allDjs.find(d => d.id === djCharacterId);
    return dj?.name || 'DJ Personnalisé';
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-muted-foreground">Bienvenue, {user?.email}. Voici un aperçu de vos activités.</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stations Actives</CardTitle>
            <RadioTower className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stations.length}</div>
            <p className="text-xs text-muted-foreground">
              {stations.length > 0 ? `Diffusion sur ${stations.length} fréquence(s)` : 'Aucune station active'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DJ Personnalisés</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customCharacters.length}</div>
            <p className="text-xs text-muted-foreground">
              {customCharacters.length > 0 ? `${customCharacters.length} voix unique(s) créée(s)` : 'Créez votre premier DJ'}
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dernière Fréquence</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userData?.lastFrequency?.toFixed(1) || 'N/A'} MHz</div>
             <p className="text-xs text-muted-foreground">
              Dernière fréquence syntonisée
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membre Depuis</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(userData?.createdAt)}</div>
             <p className="text-xs text-muted-foreground">
              Date de première connexion
            </p>
          </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Actions Rapides</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Button onClick={() => router.push('/admin/stations')} variant="outline" className="justify-start p-4 h-auto">
                <div className="flex items-center gap-3">
                  <RadioTower className="h-5 w-5 text-primary"/>
                  <div>
                    <p className="font-semibold">Gérer les Stations</p>
                    <p className="text-xs text-muted-foreground text-left">Créer ou modifier vos stations</p>
                  </div>
                </div>
            </Button>
             <Button onClick={() => router.push('/admin/personnages')} variant="outline" className="justify-start p-4 h-auto">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary"/>
                  <div>
                    <p className="font-semibold">Gérer les DJs</p>
                    <p className="text-xs text-muted-foreground text-left">Créer des voix IA personnalisées</p>
                  </div>
                </div>
            </Button>
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>Vos Stations</CardTitle>
            </CardHeader>
            <CardContent>
                {stations.length > 0 ? (
                    <div className="space-y-2">
                        {stations.slice(0, 3).map(station => (
                            <div key={station.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                                <StationStatusCard stationId={station.id} name={station.name} frequency={station.frequency} />
                                <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/stations/${station.id}`)}>
                                    Gérer <ArrowRight className="h-4 w-4 ml-2"/>
                                </Button>
                            </div>
                        ))}
                         {stations.length > 3 && (
                             <Button variant="link" size="sm" onClick={() => router.push('/admin/stations')}>
                                Voir les {stations.length - 3} autres...
                             </Button>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-4">
                        <p>Aucune station créée.</p>
                        <Button variant="link" onClick={() => router.push('/admin/stations')}>
                            Créer votre première station
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
       </div>
    </div>
  );
}
