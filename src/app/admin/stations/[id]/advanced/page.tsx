'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAdminLayout } from '../../../layout';
import { AdvancedStationEditor } from '@/components/admin/AdvancedStationEditor';
import { getStationById } from '@/actions/stations/queries';
import type { Station } from '@/lib/types';

// UI Components
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function AdvancedStationEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: adminLoading } = useAdminLayout();
  
  const [station, setStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stationId = params.id as string;

  // Charger la station
  useEffect(() => {
    async function loadStation() {
      if (!stationId) {
        setError('ID de station manquant');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const stationData = await getStationById(stationId);
        
        if (!stationData) {
          setError('Station non trouvée');
          return;
        }

        setStation(stationData);
      } catch (err) {
        console.error('Erreur lors du chargement de la station:', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
      } finally {
        setIsLoading(false);
      }
    }

    if (!adminLoading) {
      loadStation();
    }
  }, [stationId, adminLoading]);

  // Vérifier les permissions
  const canEdit = station && user && (
    station.ownerId === user.uid || 
    user.uid === 'system' // Admin system
  );

  // Handler pour les mises à jour de station
  const handleStationUpdate = (updatedStation: Station) => {
    setStation(updatedStation);
  };

  // Handler pour retourner à la liste
  const handleGoBack = () => {
    router.push('/admin/stations');
  };

  // Loading state
  if (adminLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-64" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-96 w-full" />
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Erreur</h1>
        </div>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>
            Réessayer
          </Button>
          <Button variant="outline" onClick={handleGoBack}>
            Retour à la liste
          </Button>
        </div>
      </div>
    );
  }

  // Station not found
  if (!station) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Station non trouvée</h1>
        </div>

        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription>
            La station demandée n&apos;existe pas ou a été supprimée.
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={handleGoBack}>
          Retour à la liste des stations
        </Button>
      </div>
    );
  }

  // Permission denied
  if (!canEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="text-2xl font-bold">Accès refusé</h1>
        </div>

        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription>
            Vous n&apos;avez pas les permissions nécessaires pour modifier cette station.
          </AlertDescription>
        </Alert>

        <Button variant="outline" onClick={handleGoBack}>
          Retour à la liste des stations
        </Button>
      </div>
    );
  }

  // Success state - render editor
  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Éditeur Avancé</h1>
          <p className="text-muted-foreground">
            Gestion complète de {station.name} ({station.frequency} MHz)
          </p>
        </div>
      </div>

      {/* Editor Component */}
      <AdvancedStationEditor
        station={station}
        onStationUpdate={handleStationUpdate}
        onClose={handleGoBack}
      />
    </div>
  );
}