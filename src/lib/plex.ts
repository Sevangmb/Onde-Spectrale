// src/lib/plex.ts
'use server';

import { PlaylistItem } from '@/lib/types';
import { PlexLibrary, PlexResponse as PlexApiResponse, PlexGenre } from '@/types/plex';

interface PlexTrack {
  key: string;
  title: string;
  parentTitle?: string; // Album
  grandparentTitle?: string; // Artist
  duration?: number;
  year?: number;
  genre?: Array<{ tag: string }>;
  rating?: number;
  viewCount?: number;
  thumb?: string; // Album artwork
  parentThumb?: string; // Album artwork fallback
  grandparentThumb?: string; // Artist artwork
  Media?: Array<{
    Part: Array<{
      key: string;
    }>;
  }>;
}

interface PlexResponse {
  MediaContainer: {
    Metadata?: PlexTrack[];
    size?: number;
  };
}

const PLEX_SERVER_URL = process.env.PLEX_SERVER_URL || '';
const PLEX_TOKEN = process.env.PLEX_TOKEN || '';

/**
 * Recherche de musique dans la bibliothèque Plex
 */
export async function searchPlexMusic(query: string, limit: number = 10): Promise<PlaylistItem[]> {
  if (!PLEX_SERVER_URL || !PLEX_TOKEN) {
    console.warn('URL ou Token Plex manquant');
    return [];
  }

  try {
    const searchUrl = `${PLEX_SERVER_URL}/search?query=${encodeURIComponent(query)}&type=10&X-Plex-Token=${PLEX_TOKEN}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Plex-Token': PLEX_TOKEN,
      },
      signal: AbortSignal.timeout(10000), // 10 secondes timeout
    });

    if (!response.ok) {
      throw new Error(`Erreur Plex: ${response.status} ${response.statusText}`);
    }

    const data: PlexResponse = await response.json();
    const tracks = data.MediaContainer.Metadata || [];

    const results: PlaylistItem[] = [];

    for (const track of tracks.slice(0, limit)) {
      const mediaKey = track.Media?.[0]?.Part?.[0]?.key;
      if (!mediaKey) {
        console.warn(`⚠️ Pas de clé média pour la piste: ${track.title}`);
        continue;
      }

      const streamUrl = `${PLEX_SERVER_URL}${mediaKey}?X-Plex-Token=${PLEX_TOKEN}`;

      const playlistItem: PlaylistItem = {
        id: `plex-${track.key.replace(/\D/g, '')}-${Date.now()}`,
        type: 'music',
        title: track.title || 'Titre inconnu',
        content: query, // Terme de recherche original
        artist: track.grandparentTitle || track.parentTitle || 'Artiste inconnu',
        duration: track.duration ? Math.round(track.duration / 1000) : 180, // Plex donne en ms
        url: streamUrl,
        plexKey: track.key,
        addedAt: new Date().toISOString(),
      };
      results.push(playlistItem);
    }
    return results;
  } catch (error) {
    console.error('Erreur recherche Plex:', error);
    return [];
  }
}

/**
 * Récupère les bibliothèques musicales disponibles
 */
export async function getPlexMusicLibraries() {
  if (!PLEX_SERVER_URL || !PLEX_TOKEN) return [];

  try {
    const librariesUrl = `${PLEX_SERVER_URL}/library/sections?X-Plex-Token=${PLEX_TOKEN}`;
    
    const response = await fetch(librariesUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur récupération bibliothèques: ${response.status}`);
    }

    const data = await response.json();
    return data.MediaContainer.Directory?.filter((lib: PlexLibrary) => lib.type === 'artist') || [];

  } catch (error) {
    console.error('Erreur récupération bibliothèques Plex:', error);
    return [];
  }
}

/**
 * Récupère des pistes aléatoires d'une bibliothèque
 */
export async function getRandomPlexTracks(libraryKey?: string, limit: number = 20): Promise<PlaylistItem[]> {
  if (!PLEX_SERVER_URL || !PLEX_TOKEN) return [];

  try {
    let targetLibrary = libraryKey;
    if (!targetLibrary) {
      const libraries = await getPlexMusicLibraries();
      if (libraries.length === 0) {
        return [];
      }
      targetLibrary = libraries[0].key;
    }

    const randomUrl = `${PLEX_SERVER_URL}/library/sections/${targetLibrary}/all?type=10&sort=random&X-Plex-Token=${PLEX_TOKEN}&limit=${limit}`;
    
    const response = await fetch(randomUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Erreur pistes aléatoires: ${response.status}`);
    }

    const data: PlexResponse = await response.json();
    const tracks = data.MediaContainer.Metadata || [];
    const results: PlaylistItem[] = [];

    for (const track of tracks) {
      const mediaKey = track.Media?.[0]?.Part?.[0]?.key;
      if (!mediaKey) continue;
      const streamUrl = `${PLEX_SERVER_URL}${mediaKey}?X-Plex-Token=${PLEX_TOKEN}`;
      results.push({
        id: `plex-random-${track.key.replace(/\D/g, '')}-${Date.now()}`,
        type: 'music',
        title: track.title || 'Titre inconnu',
        content: 'random',
        artist: track.grandparentTitle || 'Artiste inconnu',
        duration: track.duration ? Math.round(track.duration / 1000) : 180,
        url: streamUrl,
        plexKey: track.key,
        addedAt: new Date().toISOString(),
      });
    }
    return results;

  } catch (error) {
    console.error('Erreur pistes aléatoires Plex:', error);
    return [];
  }
}

/**
 * Test de connexion au serveur Plex avec diagnostic détaillé
 */
export async function testPlexConnection(): Promise<boolean> {
  if (!PLEX_SERVER_URL || !PLEX_TOKEN) {
    return false;
  }

  try {
    const testUrl = `${PLEX_SERVER_URL}/?X-Plex-Token=${PLEX_TOKEN}`;
    const response = await fetch(testUrl, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Obtient des pistes filtrées par genre
 */
export async function getPlexTracksByGenre(genre: string, limit: number = 20): Promise<PlaylistItem[]> {
  if (!PLEX_SERVER_URL || !PLEX_TOKEN) return [];

  try {
    const libraries = await getPlexMusicLibraries();
    if (libraries.length === 0) return [];

    const targetLibrary = libraries[0].key;
    const genreUrl = `${PLEX_SERVER_URL}/library/sections/${targetLibrary}/all?type=10&genre=${encodeURIComponent(genre)}&sort=random&X-Plex-Token=${PLEX_TOKEN}&limit=${limit}`;
    
    const response = await fetch(genreUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: PlexResponse = await response.json();
    const tracks = data.MediaContainer.Metadata || [];

    return tracks.map(track => {
      const mediaKey = track.Media?.[0]?.Part?.[0]?.key;
      const streamUrl = mediaKey ? `${PLEX_SERVER_URL}${mediaKey}?X-Plex-Token=${PLEX_TOKEN}` : '';
      return {
        id: track.key,
        type: 'music' as const,
        title: track.title,
        content: track.title,
        artist: track.grandparentTitle || 'Artiste inconnu',
        album: track.parentTitle,
        year: track.year,
        genre: track.genre?.map(g => g.tag).join(', '),
        duration: Math.floor((track.duration || 0) / 1000),
        url: streamUrl,
        plexKey: track.key,
        addedAt: new Date().toISOString(),
        artwork: track.thumb ? `${PLEX_SERVER_URL}${track.thumb}?X-Plex-Token=${PLEX_TOKEN}` : undefined
      };
    }).filter(track => track.url);

  } catch (error) {
    console.error(`Erreur récupération pistes genre "${genre}":`, error);
    return [];
  }
}

/**
 * Obtient la liste des genres disponibles
 */
export async function getPlexGenres(): Promise<string[]> {
  if (!PLEX_SERVER_URL || !PLEX_TOKEN) return [];
  try {
    const libraries = await getPlexMusicLibraries();
    if (libraries.length === 0) return [];

    const targetLibrary = libraries[0].key;
    const genresUrl = `${PLEX_SERVER_URL}/library/sections/${targetLibrary}/genre?X-Plex-Token=${PLEX_TOKEN}`;
    
    const response = await fetch(genresUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const genres = data.MediaContainer?.Metadata || [];
    return genres.map((genre: PlexGenre) => genre.title).sort();
  } catch (error) {
    console.error('Erreur récupération genres Plex:', error);
    return [];
  }
}
