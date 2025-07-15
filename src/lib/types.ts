export type DJCharacter = {
  id: string;
  name: string;
  description: string;
  voice: {
    name: string; // Google TTS voice name e.g., 'fr-FR-Wavenet-B'
    pitch: number;
    speed: number;
  };
};

export type PlaylistItem = {
  id: string;
  type: 'message' | 'music';
  title: string;
  artist?: string;
  url: string; // URL to the audio file in Firebase Storage or Archive.org
  duration: number; // in seconds
};

export type Station = {
  id: string;
  frequency: number;
  name: string;
  ownerId: string; // User ID of the owner
  djCharacterId: string;
  playlist: PlaylistItem[];
  createdAt: string; // ISO string
};

export type User = {
  id: string;
  email: string | null;
  stationsCreated: number;
  lastFrequency: number;
};
