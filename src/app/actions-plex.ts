// src/app/actions-plex.ts
'use server';

import { testPlexConnection, getPlexMusicLibraries, searchPlexMusic, getRandomPlexTracks } from '@/lib/plex';
import { PlaylistItem } from '@/lib/types';

/**
 * Action pour tester la connexion Plex
 */
export async function testPlexConnectionAction(): Promise<{
  connected: boolean;
  libraries: any[];
  error?: string;
}> {
  try {
    const isConnected = await testPlexConnection();
    
    if (!isConnected) {
      return {
        connected: false,
        libraries: [],
        error: 'Impossible de se connecter au serveur Plex'
      };
    }

    const libraries = await getPlexMusicLibraries();
    
    return {
      connected: true,
      libraries,
    };

  } catch (error: any) {
    console.error('Erreur test connexion Plex:', error);
    return {
      connected: false,
      libraries: [],
      error: error.message
    };
  }
}

/**
 * Action pour rechercher dans Plex
 */
export async function searchPlexMusicAction(query: string): Promise<PlaylistItem[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    const results = await searchPlexMusic(query, 10);
    console.log(`🎵 Recherche Plex "${query}": ${results.length} résultats`);
    
    return results;

  } catch (error: any) {
    console.error('Erreur recherche Plex:', error);
    return [];
  }
}

/**
 * Action pour obtenir des pistes aléatoires
 */
export async function getRandomPlexTracksAction(limit: number = 20): Promise<PlaylistItem[]> {
  try {
    const results = await getRandomPlexTracks(undefined, limit);
    console.log(`🎲 ${results.length} pistes aléatoires récupérées de Plex`);
    
    return results;

  } catch (error: any) {
    console.error('Erreur pistes aléatoires Plex:', error);
    return [];
  }
}

/**
 * Action pour enrichir une playlist avec du contenu Plex
 */
export async function enrichPlaylistWithPlex(playlist: PlaylistItem[]): Promise<PlaylistItem[]> {
  try {
    const enrichedPlaylist: PlaylistItem[] = [];

    for (const item of playlist) {
      enrichedPlaylist.push(item);

      // Si c'est une piste musicale sans URL, essayer de la trouver sur Plex
      if (item.type === 'music' && !item.url && item.content) {
        try {
          const plexResults = await searchPlexMusic(item.content, 1);
          
          if (plexResults.length > 0) {
            const plexTrack = plexResults[0];
            console.log(`🎵 Enrichissement Plex: "${item.title}" -> "${plexTrack.title}"`);
            
            // Remplacer l'item par la version Plex
            enrichedPlaylist[enrichedPlaylist.length - 1] = {
              ...item,
              title: plexTrack.title,
              artist: plexTrack.artist,
              url: plexTrack.url,
              duration: plexTrack.duration,
              plexKey: plexTrack.plexKey,
            };
          }
        } catch (plexError) {
          console.warn(`Impossible d'enrichir "${item.title}" avec Plex:`, plexError);
        }
      }
    }

    return enrichedPlaylist;

  } catch (error: any) {
    console.error('Erreur enrichissement playlist Plex:', error);
    return playlist; // Retourner la playlist originale en cas d'erreur
  }
}
