'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save, RotateCcw, Volume2, Palette, Radio } from 'lucide-react';

interface UserPreferencesProps {
  onPreferencesChange?: (preferences: UserPreferences) => void;
}

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

export function UserPreferences({ onPreferencesChange }: UserPreferencesProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);

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
    }
  };

  const updatePreference = <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setHasChanges(true);
    onPreferencesChange?.(newPreferences);
  };

  const savePreferences = () => {
    try {
      localStorage.setItem('onde-spectrale-preferences', JSON.stringify(preferences));
      setHasChanges(false);
    } catch (error) {
      console.error('Erreur sauvegarde préférences:', error);
    }
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setHasChanges(true);
    onPreferencesChange?.(DEFAULT_PREFERENCES);
  };

  return (
    <Card className="border-orange-500/30 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-orange-400 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Préférences Utilisateur
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={resetPreferences}
              size="sm"
              variant="outline"
              className="border-orange-500/50 hover:border-orange-500 hover:bg-orange-900/20"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={savePreferences}
              size="sm"
              disabled={!hasChanges}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section Audio */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="h-4 w-4 text-orange-400" />
            <h3 className="font-semibold text-orange-300">Audio</h3>
          </div>
          
          <div className="space-y-2">
            <Label className="text-orange-200">Volume par défaut: {preferences.defaultVolume}%</Label>
            <Slider
              value={[preferences.defaultVolume]}
              onValueChange={([value]) => updatePreference('defaultVolume', value)}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Lecture automatique</Label>
            <Switch
              checked={preferences.autoPlay}
              onCheckedChange={(checked) => updatePreference('autoPlay', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Fondu enchaîné</Label>
            <Switch
              checked={preferences.crossfade}
              onCheckedChange={(checked) => updatePreference('crossfade', checked)}
            />
          </div>
        </div>

        {/* Section Interface */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4 text-orange-400" />
            <h3 className="font-semibold text-orange-300">Interface</h3>
          </div>

          <div className="space-y-2">
            <Label className="text-orange-200">Thème</Label>
            <Select
              value={preferences.theme}
              onValueChange={(value: 'classic' | 'modern' | 'minimal') => 
                updatePreference('theme', value)
              }
            >
              <SelectTrigger className="border-orange-500/50">
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
            <Label className="text-orange-200">Analyseur de spectre</Label>
            <Switch
              checked={preferences.showVisualizer}
              onCheckedChange={(checked) => updatePreference('showVisualizer', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Mode compact</Label>
            <Switch
              checked={preferences.compactMode}
              onCheckedChange={(checked) => updatePreference('compactMode', checked)}
            />
          </div>
        </div>

        {/* Section Radio */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Radio className="h-4 w-4 text-orange-400" />
            <h3 className="font-semibold text-orange-300">Radio</h3>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Syntonisation automatique</Label>
            <Switch
              checked={preferences.autoTune}
              onCheckedChange={(checked) => updatePreference('autoTune', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Alertes d&apos;urgence</Label>
            <Switch
              checked={preferences.emergencyAlerts}
              onCheckedChange={(checked) => updatePreference('emergencyAlerts', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Notifications nouveaux morceaux</Label>
            <Switch
              checked={preferences.newTrackNotifications}
              onCheckedChange={(checked) => updatePreference('newTrackNotifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-orange-200">Notifications changement station</Label>
            <Switch
              checked={preferences.stationChangeNotifications}
              onCheckedChange={(checked) => updatePreference('stationChangeNotifications', checked)}
            />
          </div>
        </div>

        {hasChanges && (
          <div className="mt-6 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
            <p className="text-orange-300 text-sm">
              ⚠️ Vous avez des modifications non sauvegardées
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}