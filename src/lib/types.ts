
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
  artist?: string;
  content: string; // The message text, or a search term for music
  url: string; // URL to the audio file (can be empty for messages)
  duration: number; // in seconds
  addedAt?: string; // ISO string
};

export type Station = {
  id: string;
  frequency: number;
  name: string;
  theme: string;
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
  createdAt: string;
  lastLogin: string;
};
