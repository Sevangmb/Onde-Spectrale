export type DJCharacter = {
  id: string;
  name: string;
  description: string;
  voice: {
    name: string;
    pitch: number;
    speed: number;
  };
};

export type PlaylistItem = {
  id: string;
  type: 'message' | 'music';
  title: string;
  artist?: string;
  url: string;
  duration: number; // in seconds
};

export type Station = {
  id: string;
  frequency: number;
  name: string;
  ownerId: string;
  djCharacterId: string;
  playlist: PlaylistItem[];
  createdAt: string; // ISO string
};

export type User = {
  id:string;
  email: string;
  stationsCreated: number;
  lastFrequency: number;
};
