
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminLayout } from '../layout';
import { RadioStationManager } from '@/components/radio/RadioStationManager';
import { createDefaultStations } from '@/actions/stations/mutations';
import { getStationsForUser } from '@/actions/stations/queries';
import { simpleFixStation876 } from '@/app/actions-simple-fix';
import type { CustomDJCharacter, User } from '@/lib/types';
import { DJ_CHARACTERS } from '@/lib/data';
import { useStationSync } from '@/hooks/useStationSync';

import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { 
  RadioTower, 
  Loader2,
  RefreshCw,
  Bug,
  Wrench,
  Settings
} from 'lucide-react';


export default function StationsManagement() {
  const { user, customCharacters, isLoading } = useAdminLayout();
  const { stations, loadStations } = useAdminLayout();
  const { toast } = useToast();
  const { notifyStationsUpdated } = useStationSync();
  const [isResetting, setIsResetting] = useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  const allDjs = useMemo(() => [...DJ_CHARACTERS, ...customCharacters], [customCharacters]);

  // Convert admin user to standard user format for RadioStationManager
  const standardUser: User | null = useMemo(() => {
    if (!user) return null;
    return {
      id: user.uid,
      email: user.email || '',
      stationsCreated: stations.length,
      lastFrequency: 87.5,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
  }, [user, stations.length]);

  // Station update handler for sync
  const handleStationUpdate = (updatedStation: any) => {
    toast({
      title: 'Station mise à jour !',
      description: `${updatedStation.name} a été modifiée avec succès.`,
    });
    notifyStationsUpdated();
  };

  const handleResetDefaultStations = async () => {
    if (!confirm('Voulez-vous vraiment réinitialiser toutes les stations par défaut ? Cette action est irréversible.')) {
      return;
    }

    setIsResetting(true);
    try {
      await createDefaultStations();
      await loadStations();
      toast({
        title: 'Stations réinitialisées !',
        description: 'Les stations par défaut ont été recréées.',
      });
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyStations = async () => {
    try {
      const allStations = user ? await getStationsForUser(user.uid) : [];
      const defaultFrequencies = [87.6, 94.5, 98.2, 100.7, 102.1];
      const missingStations = defaultFrequencies.filter(freq => !allStations.some(s => s.frequency === freq));
      
      if (missingStations.length > 0) {
        toast({
          title: 'Stations manquantes détectées',
          description: `${missingStations.length} stations manquantes: ${missingStations.join(', ')} MHz`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Toutes les stations sont présentes',
          description: 'Vérification terminée avec succès'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur de vérification',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const handleFix876Station = async () => {
    if (!confirm('Corriger la station 87.6 MHz ? Cela va supprimer l\'ancienne station Marcus et créer Radio Liberty avec Sarah.')) {
      return;
    }

    try {
      const result = await simpleFixStation876();
      
      if (result.success) {
        toast({
          title: 'Station 87.6 MHz corrigée !',
          description: result.message,
        });
        await loadStations();
        console.log('✅ Correction réussie:', result.details);
      } else {
        toast({
          title: 'Erreur de correction',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur dans handleFix876Station:', error);
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive'
      });
    }
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
      {/* Header with Advanced Tools */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion des Stations Radio</h1>
          <p className="text-muted-foreground">Interface moderne de gestion complète des stations radio.</p>
        </div>
        <div className="flex gap-2">
          {process.env.NODE_ENV === 'development' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedTools(!showAdvancedTools)}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Outils Dev
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Advanced Development Tools */}
      {showAdvancedTools && process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Outils de Développement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyStations}
                className="gap-2"
              >
                <Bug className="h-4 w-4" />
                Vérifier Stations
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleFix876Station}
                className="gap-2"
                title="Corriger spécifiquement 87.6 MHz"
              >
                <Wrench className="h-4 w-4" />
                Fix 87.6 MHz
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaultStations}
                disabled={isResetting}
                className="gap-2"
              >
                {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reset Stations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modern Radio Station Manager */}
      <RadioStationManager 
        user={standardUser} 
        allDjs={allDjs}
      />
    </div>
  );
}
