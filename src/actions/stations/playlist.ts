'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { DJ_CHARACTERS } from '@/lib/data';
import { getStationById } from './queries';
import { getCustomCharactersForUser } from '../users/queries';
import { generatePlaylist, type GeneratePlaylistInput } from '@/ai/flows/generate-playlist-flow';
import { getRandomPlexTracks } from '@/lib/plex';
import type { PlaylistItem, DJCharacter, CustomDJCharacter, Station } from '@/lib/types';

export async function addMessageToStation(
  stationId: string, 
  message: string
): Promise<{ success: true; playlistItem: PlaylistItem } | { error: string }> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      return { error: "Station non trouvée." };
    }
    
    const allDjs = await getCustomCharactersForUser(station.ownerId);
    const fullDjList = [...DJ_CHARACTERS, ...allDjs];
    const dj = fullDjList.find(d => d.id === station.djCharacterId);

    if (!dj) {
      return { error: "Personnage DJ non trouvé." };
    }

    const messageId = `msg-${Date.now()}`;
    const newPlaylistItem: PlaylistItem = {
      id: messageId,
      type: 'message',
      title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
      content: message,
      url: '',
      duration: 15,
      artist: dj.name,
      addedAt: new Date().toISOString(),
    };
    
    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, {
      playlist: arrayUnion(newPlaylistItem)
    });

    revalidatePath(`/admin/stations/${stationId}`);
    revalidatePath('/');
    
    return { success: true, playlistItem: newPlaylistItem };
  } catch (error) {
    console.error('Error adding message to station:', error);
    return { error: 'Erreur lors de l\'ajout du message.' };
  }
}

export async function addMusicToStation(
  stationId: string, 
  musicTrack: PlaylistItem
): Promise<{ success: true; playlistItem: PlaylistItem } | { error: string }> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      return { error: "Station non trouvée." };
    }
    
    if (!musicTrack) {
      return { error: "Musique non trouvée. Essayez une nouvelle recherche." };
    }

    const newTrack = {
      ...musicTrack,
      addedAt: new Date().toISOString(),
    };

    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, {
      playlist: arrayUnion(newTrack)
    });
    
    revalidatePath(`/admin/stations/${stationId}`);
    revalidatePath('/');
    
    return { success: true, playlistItem: newTrack };
  } catch (error) {
    console.error('Error adding music to station:', error);
    return { error: 'Erreur lors de l\'ajout de la musique.' };
  }
}

export async function regenerateStationPlaylist(stationId: string): Promise<{ success: true, newPlaylist: PlaylistItem[] } | { error: string }> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      return { error: "Station non trouvée." };
    }

    const allDjs = await getCustomCharactersForUser(station.ownerId);
    const fullDjList = [...DJ_CHARACTERS, ...allDjs];
    const dj = fullDjList.find(d => d.id === station.djCharacterId);

    if (!dj) {
      return { error: "DJ non trouvé." };
    }
    
    const playlistInput: GeneratePlaylistInput = {
      stationName: station.name,
      djName: dj.name,
      djDescription: 'isCustom' in dj && dj.isCustom ? dj.description : (dj as DJCharacter).description,
      theme: station.theme || 'musique post-apocalyptique',
    };

    const { items } = await generatePlaylist(playlistInput);
  
    // Get fresh Plex tracks for regeneration
    const plexTracks = await getRandomPlexTracks(undefined, 12);
    let plexIndex = 0;
    
    const newPlaylist: PlaylistItem[] = [];
    
    for (const [index, item] of items.entries()) {
      if (item.type === 'message') {
        newPlaylist.push({
          id: `regen-${Date.now()}-msg-${index}`,
          type: item.type,
          content: item.content,
          title: `Message de ${dj.name}`,
          artist: dj.name,
          duration: 12,
          url: '',
          addedAt: new Date().toISOString(),
        });
      } else {
        // Use real Plex track
        if (plexTracks[plexIndex]) {
          const plexTrack = plexTracks[plexIndex];
          newPlaylist.push({
            ...plexTrack,
            id: `regen-${Date.now()}-plex-${index}`,
            content: item.content || plexTrack.title,
            addedAt: new Date().toISOString(),
          });
          plexIndex++;
        } else {
          // Fallback
          newPlaylist.push({
            id: `regen-${Date.now()}-fallback-${index}`,
            type: item.type,
            content: item.content,
            title: `Ambiance ${station.name}`,
            artist: 'Station Radio',
            duration: 180,
            url: '',
            addedAt: new Date().toISOString(),
          });
        }
      }
    }

    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, { playlist: newPlaylist });

    revalidatePath(`/admin/stations/${stationId}`);
    revalidatePath('/admin/stations');
    revalidatePath('/');
    
    return { success: true, newPlaylist };
  } catch (error: any) {
    console.error('Error regenerating playlist:', error);
    return { error: `Erreur de l'IA lors de la régénération: ${error.message}` };
  }
}

export async function deletePlaylistItem(
  stationId: string, 
  trackId: string
): Promise<Station | null> {
  const station = await getStationById(stationId);
  if (!station) return null;

  const newPlaylist = station.playlist.filter(track => track.id !== trackId);
  
  return await updateDoc(doc(db, 'stations', stationId), { playlist: newPlaylist })
    .then(() => ({ ...station, playlist: newPlaylist }));
}

export async function reorderPlaylistItems(
  stationId: string, 
  newOrder: string[]
): Promise<Station | null> {
  const station = await getStationById(stationId);
  if (!station) return null;

  const newPlaylist = newOrder.map(id => {
    const track = station.playlist.find(t => t.id === id);
    if (!track) throw new Error(`Piste ${id} non trouvée`);
    return track;
  });

  return await updateDoc(doc(db, 'stations', stationId), { playlist: newPlaylist })
    .then(() => ({ ...station, playlist: newPlaylist }));
}

export async function addPlaylistItems(
  stationId: string,
  tracks: Omit<PlaylistItem, 'id'>[]
): Promise<Station | null> {
  const stationRef = doc(db, 'stations', stationId);
  const newTracks = tracks.map(track => ({
    ...track,
    id: `added-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    addedAt: new Date().toISOString(),
  }));

  await updateDoc(stationRef, {
    playlist: arrayUnion(...newTracks)
  });

  return getStationById(stationId);
}
