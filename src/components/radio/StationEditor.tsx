'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Save, 
  X, 
  Radio, 
  User, 
  Settings, 
  Music, 
  Tag,
  Clock,
  AlertCircle,
  CheckCircle,
  Zap,
  Palette
} from 'lucide-react';
import { radioStationManager, type CreateStationData, type UpdateStationData } from '@/services/RadioStationManager';
import { EnhancedPlaylistInterface } from '@/components/playlist/EnhancedPlaylistInterface';
import type { Station, DJCharacter, CustomDJCharacter, User } from '@/lib/types';

interface StationEditorProps {
  station?: Station | null;
  user: User | null;
  allDjs: (DJCharacter | CustomDJCharacter)[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (station: Station) => void;
}

interface FormErrors {
  name?: string;
  frequency?: string;
  djCharacterId?: string;
  theme?: string;
  general?: string;
}

export function StationEditor({ 
  station, 
  user, 
  allDjs, 
  isOpen, 
  onClose, 
  onSave 
}: StationEditorProps) {
  const isEditing = !!station;
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  
  // Form data
  const [formData, setFormData] = useState<CreateStationData>({
    name: '',
    frequency: 87.0,
    djCharacterId: '',
    theme: '',
    ownerId: user?.id || '',
    isActive: true,
    tags: [],
    description: ''
  });

  // Tag input
  const [tagInput, setTagInput] = useState('');

  // Initialize form data when station changes
  useEffect(() => {
    if (station) {
      setFormData({
        name: station.name,
        frequency: station.frequency,
        djCharacterId: station.djCharacterId,
        theme: station.theme || '',
        ownerId: station.ownerId,
        isActive: station.isActive ?? true,
        tags: station.tags || [],
        description: station.description || ''
      });
    } else {
      setFormData({
        name: '',
        frequency: findNextAvailableFrequency(),
        djCharacterId: '',
        theme: '',
        ownerId: user?.id || '',
        isActive: true,
        tags: [],
        description: ''
      });
    }
    setIsDirty(false);
    setErrors({});
  }, [station, user?.id]);

  // Find next available frequency
  const findNextAvailableFrequency = (): number => {
    // This would typically use the radio station manager to find available frequencies
    // For now, return a default
    return 87.5;
  };

  // Update form data and mark as dirty
  const updateFormData = (updates: Partial<CreateStationData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
    
    // Clear related errors
    const newErrors = { ...errors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key as keyof FormErrors];
    });
    setErrors(newErrors);
  };

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est requis';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Le nom doit contenir au moins 3 caractères';
    }

    if (formData.frequency < 87.0 || formData.frequency > 108.0) {
      newErrors.frequency = 'La fréquence doit être entre 87.0 et 108.0 MHz';
    }

    if (!formData.djCharacterId) {
      newErrors.djCharacterId = 'Veuillez sélectionner un DJ';
    }

    if (!formData.theme.trim()) {
      newErrors.theme = 'Le thème est requis';
    } else if (formData.theme.trim().length < 3) {
      newErrors.theme = 'Le thème doit contenir au moins 3 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isEditing && station) {
        // Update existing station
        const result = await radioStationManager.updateStation(station.id, formData);
        
        if (result.success && result.station) {
          onSave(result.station);
          setIsDirty(false);
        } else {
          setErrors({ general: result.error || 'Erreur lors de la mise à jour' });
        }
      } else {
        // Create new station
        const result = await radioStationManager.createStation(formData);
        
        if (result.success && result.station) {
          onSave(result.station);
          setIsDirty(false);
        } else {
          setErrors({ general: result.error || 'Erreur lors de la création' });
        }
      }
    } catch (error) {
      console.error('Error saving station:', error);
      setErrors({ general: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle add tag
  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      updateFormData({
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  // Handle remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    updateFormData({
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  // Handle close with dirty check
  const handleClose = () => {
    if (isDirty) {
      const confirm = window.confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?');
      if (!confirm) return;
    }
    onClose();
  };

  // Get DJ by ID
  const getDjById = (djId: string) => {
    return allDjs.find(dj => dj.id === djId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              {isEditing ? `Modifier ${station?.name}` : 'Nouvelle Station'}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Badge variant="secondary" className="text-xs">
                  Non sauvegardé
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">
                <Settings className="h-4 w-4 mr-2" />
                Général
              </TabsTrigger>
              <TabsTrigger value="playlist">
                <Music className="h-4 w-4 mr-2" />
                Playlist
              </TabsTrigger>
              <TabsTrigger value="advanced">
                <Zap className="h-4 w-4 mr-2" />
                Avancé
              </TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Informations de base</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de la station</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => updateFormData({ name: e.target.value })}
                      placeholder="Radio FM..."
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Fréquence (MHz)</Label>
                    <Input
                      id="frequency"
                      type="number"
                      min="87.0"
                      max="108.0"
                      step="0.1"
                      value={formData.frequency}
                      onChange={(e) => updateFormData({ frequency: parseFloat(e.target.value) || 87.0 })}
                      className={errors.frequency ? 'border-destructive' : ''}
                    />
                    {errors.frequency && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.frequency}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dj">DJ</Label>
                    <Select
                      value={formData.djCharacterId}
                      onValueChange={(value) => updateFormData({ djCharacterId: value })}
                    >
                      <SelectTrigger className={errors.djCharacterId ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Choisir un DJ" />
                      </SelectTrigger>
                      <SelectContent>
                        {allDjs.map(dj => (
                          <SelectItem key={dj.id} value={dj.id}>
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              {dj.name}
                              {'isCustom' in dj && dj.isCustom && (
                                <Badge variant="secondary" className="text-xs">Custom</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.djCharacterId && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.djCharacterId}
                      </p>
                    )}
                    
                    {/* DJ Preview */}
                    {formData.djCharacterId && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <h4 className="font-medium text-sm mb-1">
                          {getDjById(formData.djCharacterId)?.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {getDjById(formData.djCharacterId)?.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Contenu</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="theme">Thème</Label>
                    <Input
                      id="theme"
                      value={formData.theme}
                      onChange={(e) => updateFormData({ theme: e.target.value })}
                      placeholder="Musique des années 80, rock classique..."
                      className={errors.theme ? 'border-destructive' : ''}
                    />
                    {errors.theme && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.theme}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      placeholder="Description détaillée de la station..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Ajouter un tag..."
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      />
                      <Button type="button" onClick={handleAddTag} size="sm">
                        <Tag className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {formData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.tags.map(tag => (
                          <Badge 
                            key={tag} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            {tag} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Paramètres</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="active">Station active</Label>
                    <p className="text-sm text-muted-foreground">
                      Les stations inactives n'apparaissent pas dans le scanner
                    </p>
                  </div>
                  <Switch
                    id="active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) => updateFormData({ isActive: checked })}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Playlist Tab */}
            <TabsContent value="playlist" className="space-y-4">
              {station && (
                <EnhancedPlaylistInterface
                  station={station}
                  user={user}
                  allDjs={allDjs}
                  onUpdate={(updatedStation) => {
                    // Update the station's playlist
                    console.log('Playlist updated:', updatedStation);
                  }}
                />
              )}
              
              {!station && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">Playlist non disponible</h3>
                    <p className="text-muted-foreground">
                      Sauvegardez d'abord la station pour gérer sa playlist
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-6">
                <h3 className="text-lg font-medium">Options avancées</h3>
                
                {/* Station Info */}
                {station && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Informations de la station</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">ID:</span>
                        <code className="ml-2 bg-muted px-1 rounded">{station.id}</code>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Propriétaire:</span>
                        <span className="ml-2">{station.ownerId === 'system' ? 'Système' : 'Utilisateur'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Créée le:</span>
                        <span className="ml-2">{new Date(station.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Pistes:</span>
                        <span className="ml-2">{station.playlist.length}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Playlist Generation */}
                <div className="space-y-4">
                  <h4 className="font-medium">Génération de playlist</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" disabled={!station}>
                      <Zap className="h-3 w-3 mr-2" />
                      Générer playlist automatique
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Génère une playlist basée sur le thème et le DJ sélectionné
                    </p>
                  </div>
                </div>

                {/* Danger Zone */}
                {station && (
                  <div className="space-y-4">
                    <h4 className="font-medium text-destructive">Zone de danger</h4>
                    <div className="p-4 border border-destructive/20 rounded-lg space-y-3">
                      <div className="space-y-2">
                        <Button variant="destructive" size="sm" disabled>
                          <AlertCircle className="h-3 w-3 mr-2" />
                          Supprimer la station
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Cette action est irréversible et supprimera tous les données de la station
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Error Display */}
          {errors.general && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{errors.general}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !isDirty}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-primary border-t-transparent mr-2" />
                  {isEditing ? 'Mise à jour...' : 'Création...'}
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-2" />
                  {isEditing ? 'Mettre à jour' : 'Créer la station'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}