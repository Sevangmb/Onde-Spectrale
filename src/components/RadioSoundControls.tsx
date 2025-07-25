// src/components/RadioSoundControls.tsx
'use client';

import { useState, useCallback } from 'react';
import { useRadioSoundEffects } from '@/hooks/useRadioSoundEffects';
import { RADIO_SOUND_EFFECTS, type RadioSoundEffect } from '@/lib/freesound';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Radio,
  Zap,
  Search,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface RadioSoundControlsProps {
  className?: string;
}

export function RadioSoundControls({ className }: RadioSoundControlsProps) {
  const [volume, setVolume] = useState(20);
  const [enableEffects, setEnableEffects] = useState(true);
  
  const radioSounds = useRadioSoundEffects({
    volume: volume / 100,
    enableEffects,
    fadeInDuration: 300,
    fadeOutDuration: 200
  });

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
  }, []);

  const toggleEffects = useCallback(() => {
    if (enableEffects && radioSounds.isPlaying) {
      radioSounds.stopEffect();
    }
    setEnableEffects(!enableEffects);
  }, [enableEffects, radioSounds]);

  const playPreviewEffect = useCallback((effect: RadioSoundEffect) => {
    radioSounds.playEffect(effect, false);
  }, [radioSounds]);

  const effectCategories = [
    {
      name: 'Statique',
      type: 'static' as const,
      icon: Radio,
      description: 'Bruits de fond radio',
      effects: RADIO_SOUND_EFFECTS.static
    },
    {
      name: 'Interférence', 
      type: 'interference' as const,
      icon: Zap,
      description: 'Parasites électromagnétiques',
      effects: RADIO_SOUND_EFFECTS.interference
    },
    {
      name: 'Recherche',
      type: 'tuning' as const,
      icon: Search,
      description: 'Sons de recherche de station',
      effects: RADIO_SOUND_EFFECTS.tuning
    },
    {
      name: 'Signaux',
      type: 'beep' as const,
      icon: AlertTriangle,
      description: 'Bips et signaux radio',
      effects: RADIO_SOUND_EFFECTS.beep
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Effets Sonores Radio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contrôles généraux */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Effets sonores</span>
            <Button
              variant={enableEffects ? "default" : "outline"}
              size="sm"
              onClick={toggleEffects}
            >
              {enableEffects ? (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Activé
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 mr-2" />
                  Désactivé
                </>
              )}
            </Button>
          </div>

          {enableEffects && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Volume</span>
                <span className="text-sm text-muted-foreground">{volume}%</span>
              </div>
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Contrôles rapides */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Actions rapides</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => radioSounds.playRadioStartup()}
              disabled={!enableEffects}
            >
              <Play className="h-4 w-4 mr-2" />
              Démarrage
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => radioSounds.playStationScanning(3000)}
              disabled={!enableEffects}
            >
              <Search className="h-4 w-4 mr-2" />
              Scan Stations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => radioSounds.playStatic(true)}
              disabled={!enableEffects}
            >
              <Radio className="h-4 w-4 mr-2" />
              Statique Continue
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => radioSounds.stopEffect()}
              disabled={!enableEffects || !radioSounds.isPlaying}
            >
              <Square className="h-4 w-4 mr-2" />
              Arrêter
            </Button>
          </div>
        </div>

        <Separator />

        {/* Bibliothèque d'effets */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Bibliothèque d'effets</h4>
          
          {effectCategories.map((category) => (
            <div key={category.type} className="space-y-2">
              <div className="flex items-center gap-2">
                <category.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{category.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {category.effects.length}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {category.description}
              </p>
              
              <div className="grid grid-cols-1 gap-1">
                {category.effects.map((effect) => (
                  <Button
                    key={effect.id}
                    variant="ghost"
                    size="sm"
                    className="justify-start h-auto p-2"
                    onClick={() => playPreviewEffect(effect)}
                    disabled={!enableEffects}
                  >
                    <div className="flex-1 text-left">
                      <div className="text-xs font-medium">{effect.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {effect.duration.toFixed(1)}s
                      </div>
                    </div>
                    <Play className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* État actuel */}
        {radioSounds.isPlaying && radioSounds.currentEffect && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">En cours de lecture</h4>
              <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                <div>
                  <div className="text-sm font-medium">
                    {radioSounds.currentEffect.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {radioSounds.currentEffect.description}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => radioSounds.stopEffect()}
                >
                  <Square className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}