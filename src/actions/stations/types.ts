import type { Station, PlaylistItem } from '@/lib/types';

export interface CreateStationInput {
  name: string;
  frequency: number;
  djCharacterId: string;
  theme: string;
  ownerId: string;
}

export interface StationQueryResult {
  station: Station | null;
  error?: string;
}

export interface CreateStationResult {
  success?: boolean;
  stationId?: string;
  error?: Record<string, string[]> | { general: string };
}