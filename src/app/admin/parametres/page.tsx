'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, RotateCcw, Volume2, Palette, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface UserPreferences {
  // Audio
  defaultVolume: number;
  autoPlay: boolean;
  crossfade: boolean;
  
  // Interface
  theme: 'classic' | 'modern' | 'minimal';
  showVisualizer: boolean;
  showLyrics: boolean;
  compactMode: boolean;
  
  // Radio
  favoriteGenres: string[];
  skipIntros: boolean;
  autoTune: boolean;
  emergencyAlerts: boolean;
  
  // Notifications
  newTrackNotifications: boolean;
  stationChangeNotifications: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultVolume: 75,
  autoPlay: true,
  crossfade: false,
  theme: 'classic',
  showVisualizer: true,
  showLyrics: false,
  compactMode: false,
  favoriteGenres: [],
  skipIntros: false,
  autoTune: true,
  emergencyAlerts: true,
  newTrackNotifications: false,
  stationChangeNotifications: true,
};

export default function ParametresPage() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('onde-spectrale-preferences');
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Erreur chargement préférences:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger vos préférences.',
      });
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setHasChanges(true);
  };

  const savePreferences = () => {
    try {
      localStorage.setItem('onde-spectrale-preferences', JSON.stringify(preferences));
      setHasChanges(false);
      toast({
        title: 'Préférences sauvegardées',
        description: 'Vos réglages ont été mis à jour.',
      });
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder vos préférences.',
      });
    }
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setHasChanges(true);
    toast({
      title: 'Préférences réinitialisées',
      description: 'Les réglages par défaut ont été restaurés.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
            <p className="text-muted-foreground">Gérez les paramètres de votre compte et de l'application.</p>
        </div>
        <div className="flex gap-2">
            <Button
              onClick={resetPreferences}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button
              onClick={savePreferences}
              size="sm"
              disabled={!hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Settings className="h-5 w-5" />
            Préférences Utilisateur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* Section Audio */}
            <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Audio</h3>
            </div>
            
            <div className="space-y-2">
                <Label>Volume par défaut: {preferences.defaultVolume}%</Label>
                <Slider
                value={[preferences.defaultVolume]}
                onValueChange={([value]) => updatePreference('defaultVolume', value)}
                max={100}
                step={5}
                className="w-full"
                />
            </div>

            <div className="flex items-center justify-between">
                <Label>Lecture automatique</Label>
                <Switch
                checked={preferences.autoPlay}
                onCheckedChange={(checked) => updatePreference('autoPlay', checked)}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label>Fondu enchaîné</Label>
                <Switch
                checked={preferences.crossfade}
                onCheckedChange={(checked) => updatePreference('crossfade', checked)}
                />
            </div>
            </div>

            {/* Section Interface */}
            <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Interface</h3>
            </div>

            <div className="space-y-2">
                <Label>Thème</Label>
                <Select
                value={preferences.theme}
                onValueChange={(value: 'classic' | 'modern' | 'minimal') => 
                    updatePreference('theme', value)
                }
                >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="classic">Classique Pip-Boy</SelectItem>
                    <SelectItem value="modern">Moderne</SelectItem>
                    <SelectItem value="minimal">Minimaliste</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between">
                <Label>Analyseur de spectre</Label>
                <Switch
                checked={preferences.showVisualizer}
                onCheckedChange={(checked) => updatePreference('showVisualizer', checked)}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label>Mode compact</Label>
                <Switch
                checked={preferences.compactMode}
                onCheckedChange={(checked) => updatePreference('compactMode', checked)}
                />
            </div>
            </div>

            {/* Section Radio */}
            <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Radio</h3>
            </div>

            <div className="flex items-center justify-between">
                <Label>Syntonisation automatique</Label>
                <Switch
                checked={preferences.autoTune}
                onCheckedChange={(checked) => updatePreference('autoTune', checked)}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label>Alertes d'urgence</Label>
                <Switch
                checked={preferences.emergencyAlerts}
                onCheckedChange={(checked) => updatePreference('emergencyAlerts', checked)}
                />
            </div>

            <div className="flex items-center justify-between">
                <Label>Notifications nouveaux morceaux</Label>
                <Switch
                checked={preferences.newTrackNotifications}
                onCheckedChange={(checked) => updatePreference('newTrackNotifications', checked)}
                />
            </div>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}