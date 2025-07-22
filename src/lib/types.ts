// src/lib/types.ts - Version corrigée

export type DJCharacter = {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
};

export type CustomDJCharacter = DJCharacter & {
  voice: {
    gender: string;
    tone: string;
    style: string;
  };
  isCustom: true;
  ownerId: string;
  createdAt: string;
};

export type PlaylistItem = {
  id: string;
  type: 'message' | 'music';
  title: string;
  content: string; // ✅ AJOUTÉ - Contenu réel (texte du message ou nom de recherche)
  artist?: string;
  url: string; // URL to the audio file in Firebase Storage or Archive.org
  duration: number; // in seconds
  addedAt?: string; // ISO string
  archiveId?: string; // ✅ AJOUTÉ - ID spécifique Archive.org pour les musiques
  isLoading?: boolean; // ✅ AJOUTÉ - État de chargement
  error?: string; // ✅ AJOUTÉ - Message d'erreur
};

export type Station = {
  id: string;
  frequency: number;
  name: string;
  ownerId: string; // User ID of the owner
  djCharacterId: string;
  playlist: PlaylistItem[];
  createdAt: string; // ISO string
  theme?: string; // ✅ AJOUTÉ - Thème de la station
};

export type User = {
  id: string;
  email: string | null;
  stationsCreated: number;
  lastFrequency: number;
  createdAt: string;
  lastLogin: string;
};