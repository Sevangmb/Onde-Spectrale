/**
 * Types pour l'intégration Plex Media Server
 */

export interface PlexLibrary {
  key: string;
  title: string;
  type: string;
  agent?: string;
  scanner?: string;
  language?: string;
  uuid?: string;
  updatedAt?: number;
  createdAt?: number;
}

export interface PlexTrack {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  url: string;
  duration: number;
  key?: string;
  ratingKey?: string;
  parentKey?: string;
  grandparentKey?: string;
  thumb?: string;
  art?: string;
  year?: number;
  addedAt?: number;
  updatedAt?: number;
}

export interface PlexSearchResult {
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  duration: number;
  key: string;
  ratingKey: string;
  thumb?: string;
  art?: string;
}

export interface PlexMediaContainer {
  size: number;
  allowSync: boolean;
  identifier: string;
  mediaTagPrefix: string;
  mediaTagVersion: number;
  Metadata?: PlexSearchResult[];
  Directory?: PlexLibrary[];
}

export interface PlexResponse {
  MediaContainer: PlexMediaContainer;
}

export interface PlexConnectionStatus {
  connected: boolean;
  libraries: PlexLibrary[];
  error?: string;
}

export interface PlexGenre {
  title: string;
  key?: string;
  count?: number;
}

export interface PlexServerInfo {
  friendlyName: string;
  machineIdentifier: string;
  version: string;
  platform: string;
  platformVersion: string;
  updatedAt: number;
  createdAt: number;
}