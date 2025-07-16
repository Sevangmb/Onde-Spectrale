'use client';

import Link from 'next/link';
import { useAdminLayout } from '@/app/admin/layout';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, Users, PlusCircle, RadioTower, Zap, Clock, Volume2, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { stations, customCharacters, isLoading } = useAdminLayout();

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Loading Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3 bg-orange-400/20" />
          <Skeleton className="h-4 w-2/3 bg-orange-400/10" />
        </div>
        
        {/* Loading Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-20 bg-orange-400/20" />
                <Skeleton className="h-4 w-4 bg-orange-400/20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 bg-orange-400/30" />
                <Skeleton className="h-3 w-3/4 mt-2 bg-orange-400/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header avec style post-apocalyptique */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent rounded-lg blur-xl"></div>
        <div className="relative p-6 bg-black/60 border-2 border-orange-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Zap className="h-6 w-6 text-orange-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-orange-100 font-headline">
              <span className="animate-flicker-subtle">Terminal de Contrôle</span>
            </h1>
          </div>
          <p className="text-orange-300/80 text-lg">
            Console de gestion des transmissions Onde Spectrale
          </p>
          
          {/* Effet de scanline */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-scanline"></div>
        </div>
      </div>
      
      {/* Statistiques avec thème post-apocalyptique */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
          <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-300/80 font-headline uppercase tracking-wider">
              Stations Actives
            </CardTitle>
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <RadioTower className="h-4 w-4 text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-100 mb-1">{stations.length}</div>
            <p className="text-xs text-orange-300/60">
              {stations.length === 0 ? 'Aucune transmission' : 'Transmissions opérationnelles'}
            </p>
            {stations.length > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-green-400">En ligne</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-purple-500/10 relative overflow-hidden">
          <div className="absolute inset-1 border border-purple-400/10 rounded-lg pointer-events-none"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-300/80 font-headline uppercase tracking-wider">
              DJ Personnalisés
            </CardTitle>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="h-4 w-4 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-100 mb-1">{customCharacters.length}</div>
            <p className="text-xs text-purple-300/60">
              {customCharacters.length === 0 ? 'Voix standards seulement' : 'Personnalités uniques'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-blue-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute inset-1 border border-blue-400/10 rounded-lg pointer-events-none"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-300/80 font-headline uppercase tracking-wider">
              Pistes Totales
            </CardTitle>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Volume2 className="h-4 w-4 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-100 mb-1">
              {stations.reduce((total, station) => total + station.playlist.length, 0)}
            </div>
            <p className="text-xs text-blue-300/60">
              Contenu audio disponible
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 border-green-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-green-500/10 relative overflow-hidden">
          <div className="absolute inset-1 border border-green-400/10 rounded-lg pointer-events-none"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-300/80 font-headline uppercase tracking-wider">
              Statut Système
            </CardTitle>
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Clock className="h-4 w-4 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-400 mb-1">OPÉRATIONNEL</div>
            <p className="text-xs text-green-300/60">
              Tous systèmes fonctionnels
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Stations avec design amélioré */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <RadioTower className="h-5 w-5 text-orange-400" />
            </div>
            <h2 className="text-2xl font-semibold text-orange-100 font-headline">
              Stations de Transmission
            </h2>
          </div>
          <Button 
            asChild 
            className="bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20"
          >
            <Link href="/admin/stations/new">
              <PlusCircle className="mr-2 h-4 w-4" /> 
              Nouvelle Station
            </Link>
          </Button>
        </div>

        <Card className="border-2 border-orange-500/30 bg-black/80 backdrop-blur-sm shadow-lg shadow-orange-500/10 relative overflow-hidden">
          <div className="absolute inset-1 border border-orange-400/10 rounded-lg pointer-events-none"></div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {stations.length > 0 ? (
                <table className="min-w-full divide-y divide-orange-500/20">
                  <thead className="bg-orange-900/20">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-orange-300/80 uppercase tracking-wider font-headline">
                        Nom de Code
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-orange-300/80 uppercase tracking-wider font-headline">
                        Fréquence
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-orange-300/80 uppercase tracking-wider font-headline">
                        Contenu
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-medium text-orange-300/80 uppercase tracking-wider font-headline">
                        Statut
                      </th>
                      <th scope="col" className="relative px-6 py-4">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-orange-500/10">
                    {stations.map((station) => (
                      <tr key={station.id} className="hover:bg-orange-500/5 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-100">
                          {station.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-300/80 font-mono">
                          {station.frequency.toFixed(1)} MHz
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-300/80">
                          {station.playlist.length} pistes
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-400 font-mono">ACTIF</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button 
                            asChild 
                            variant="ghost" 
                            size="sm"
                            className="text-orange-400 hover:text-orange-100 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-400/40"
                          >
                            <Link href={`/admin/stations/${station.id}`}>
                              Contrôler
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center">
                  <div className="relative inline-block mb-6">
                    <AlertTriangle className="h-16 w-16 text-orange-400/40 mx-auto" />
                    <div className="absolute inset-0 bg-orange-400/20 blur-lg animate-pulse"></div>
                  </div>
                  <h3 className="text-xl font-semibold text-orange-100 mb-2 font-headline">
                    Aucune Station Détectée
                  </h3>
                  <p className="text-orange-300/60 mb-6 max-w-md mx-auto">
                    Les ondes sont silencieuses. Créez votre première station de transmission 
                    pour commencer à diffuser dans les terres désolées.
                  </p>
                  <Button 
                    asChild 
                    className="bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20"
                  >
                    <Link href="/admin/stations/new">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Établir Première Transmission
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}