'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  getDoc,
  serverTimestamp,
  increment,
  deleteDoc,
  arrayRemove,
  arrayUnion
} from 'firebase/firestore';
import { DJ_CHARACTERS } from '@/lib/data';
import { generatePlaylist, type GeneratePlaylistInput } from '@/ai/flows/generate-playlist-flow';
import { getRandomPlexTracks } from '@/lib/plex';
import { getCustomCharactersForUser } from '../users/queries';
import { getStationForFrequency, getStationById } from './queries';
import type { CreateStationInput, CreateStationResult } from './types';
import type { PlaylistItem, DJCharacter, CustomDJCharacter, Station } from '@/lib/types';

const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
  theme: z.string().min(3, "Le thème est requis."),
  ownerId: z.string(),
});

export async function createStation(ownerId: string, formData: FormData): Promise<CreateStationResult> {
  if (!ownerId) {
    return { error: { general: 'Authentification requise.' } };
  }

  // Validation
  const validatedFields = CreateStationSchema.safeParse({
    name: formData.get('name'),
    frequency: parseFloat(formData.get('frequency') as string),
    djCharacterId: formData.get('djCharacterId'),
    theme: formData.get('theme'),
    ownerId: ownerId,
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { name, frequency, djCharacterId, theme } = validatedFields.data;

  try {
    // Check if frequency is available
    const existingStation = await getStationForFrequency(frequency);
    if (existingStation) {
      return { error: { general: 'Cette fréquence est déjà occupée.' } };
    }
    
    // Get DJ character
    const allDjs = await getCustomCharactersForUser(ownerId);
    const fullDjList: (DJCharacter | CustomDJCharacter)[] = [...DJ_CHARACTERS, ...allDjs];
    const dj = fullDjList.find(d => d.id === djCharacterId);

    if (!dj) {
      return { error: { general: 'Personnage DJ non trouvé.' } };
    }
    
    // Generate playlist
    const playlist = await generateStationPlaylist({
      stationName: name,
      djName: dj.name,
      djDescription: 'isCustom' in dj && dj.isCustom ? dj.description : (dj as DJCharacter).description,
      theme: theme,
    });

    // Create station document
    const stationData = {
      name,
      frequency,
      djCharacterId,
      theme,
      ownerId,
      playlist,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'stations'), stationData);

    // Update user stats
    const userRef = doc(db, 'users', ownerId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        stationsCreated: increment(1)
      });
    }
    
    // Revalidate relevant paths
    revalidatePath('/admin/stations');
    revalidatePath('/admin');
    revalidatePath('/');
    
    return { success: true, stationId: docRef.id };
  } catch (error) {
    console.error('Error creating station:', error);
    return { error: { general: 'Erreur lors de la création de la station.' } };
  }
}

async function generateStationPlaylist(input: GeneratePlaylistInput): Promise<PlaylistItem[]> {
  const { items } = await generatePlaylist(input);
  const plexTracks = await getRandomPlexTracks(undefined, 15);
  let plexIndex = 0;
  
  const playlistWithIds: PlaylistItem[] = [];
  
  for (const [index, item] of items.entries()) {
    if (item.type === 'message') {
      playlistWithIds.push({
        id: `${Date.now()}-msg-${index}`,
        ...item,
        title: `Message de ${input.djName}`,
        artist: input.djName,
        duration: 10,
        url: '',
        addedAt: new Date().toISOString(),
      });
    } else {
      if (plexTracks[plexIndex]) {
        const plexTrack = plexTracks[plexIndex];
        playlistWithIds.push({
          ...plexTrack,
          id: `${Date.now()}-plex-${index}`,
          content: item.content || plexTrack.title,
          addedAt: new Date().toISOString(),
        });
        plexIndex++;
      } else {
        playlistWithIds.push({
          id: `${Date.now()}-fallback-${index}`,
          ...item,
          title: 'Musique d\'ambiance',
          artist: 'Station Radio',
          duration: 180,
          url: '',
          addedAt: new Date().toISOString(),
        });
      }
    }
  }

  return playlistWithIds;
}

export async function createDefaultStations(): Promise<void> {
  const stations = [
    {
      frequency: 87.6,
      name: 'Radio Liberty',
      djId: 'sarah',
      theme: 'Nouvelles de l\'aube et musiques de liberté'
    },
    {
      frequency: 94.5,
      name: 'Diamond City Radio',
      djId: 'tommy',
      theme: 'Les classiques d\'avant-guerre et les nouvelles de la ville'
    },
    {
      frequency: 98.2,
      name: 'Radio de la Savante',
      djId: 'sarah',
      theme: 'Musique classique et réflexions sur le vieux monde'
    },
    {
      frequency: 100.7,
      name: 'Radio Wasteland',
      djId: 'marcus',
      theme: 'Histoires et musiques des terres désolées'
    },
    {
      frequency: 102.1,
      name: 'Enclave Radio',
      djId: 'marcus',
      theme: 'Propagande et marches patriotiques de l\'Enclave'
    }
  ];

  for (const stationConfig of stations) {
    try {
      const existing = await getStationForFrequency(stationConfig.frequency);
      if (existing) continue;

      const dj = DJ_CHARACTERS.find(d => d.id === stationConfig.djId) || DJ_CHARACTERS[0];
      
      const playlist = await generateStationPlaylist({
        stationName: stationConfig.name,
        djName: dj.name,
        djDescription: dj.description,
        theme: stationConfig.theme,
      });

      const stationData = {
        name: stationConfig.name,
        frequency: stationConfig.frequency,
        djCharacterId: dj.id,
        theme: stationConfig.theme,
        ownerId: 'system',
        playlist,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'stations'), stationData);
      console.log(`✅ Station créée: ${stationConfig.name} (${stationConfig.frequency})`);
      
    } catch (error) {
      console.error(`Erreur création station ${stationConfig.name}:`, error);
    }
  }
}

// ================================
// ADVANCED STATION MANAGEMENT
// ================================

/**
 * Met à jour une station (DJ, nom, thème, etc.)
 */
export async function updateStation(stationId: string, updates: Partial<{
  name: string;
  djCharacterId: string;
  theme: string;
  frequency: number;
}>): Promise<Station | null> {
  try {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);
    
    if (!stationDoc.exists()) {
      throw new Error(`Station ${stationId} not found`);
    }

    const stationData = stationDoc.data();
    
    // Vérifier si la nouvelle fréquence est disponible (si changée)
    if (updates.frequency && updates.frequency !== stationData.frequency) {
      const existingStation = await getStationForFrequency(updates.frequency);
      if (existingStation && existingStation.id !== stationId) {
        throw new Error('Cette fréquence est déjà occupée');
      }
    }

    // Mettre à jour les champs
    await updateDoc(stationRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    // Revalidate paths
    revalidatePath('/admin/stations');
    revalidatePath('/admin');
    revalidatePath('/');

    // Retourner la station mise à jour
    return await getStationById(stationId);
  } catch (error) {
    console.error('Error updating station:', error);
    throw error;
  }
}

/**
 * Supprime une piste de la playlist d'une station
 */
export async function deletePlaylistItem(stationId: string, trackId: string): Promise<Station | null> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Trouver et supprimer la piste
    const updatedPlaylist = station.playlist.filter(track => track.id !== trackId);
    
    if (updatedPlaylist.length === station.playlist.length) {
      throw new Error(`Track ${trackId} not found in playlist`);
    }

    // Mettre à jour la station
    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, {
      playlist: updatedPlaylist,
      updatedAt: serverTimestamp()
    });

    // Revalidate paths
    revalidatePath('/admin/stations');
    revalidatePath('/');

    return {
      ...station,
      playlist: updatedPlaylist
    };
  } catch (error) {
    console.error('Error deleting playlist item:', error);
    throw error;
  }
}

/**
 * Réorganise la playlist selon un nouvel ordre
 */
export async function reorderPlaylistItems(stationId: string, newOrder: string[]): Promise<Station | null> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Créer un map pour retrouver rapidement les pistes
    const trackMap = new Map(station.playlist.map(track => [track.id, track]));
    
    // Construire la nouvelle playlist dans l'ordre spécifié
    const reorderedPlaylist: PlaylistItem[] = [];
    
    for (const trackId of newOrder) {
      const track = trackMap.get(trackId);
      if (track) {
        reorderedPlaylist.push(track);
      }
    }

    // Vérifier que toutes les pistes sont présentes
    if (reorderedPlaylist.length !== station.playlist.length) {
      throw new Error('Invalid reorder: missing tracks in new order');
    }

    // Mettre à jour la station
    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, {
      playlist: reorderedPlaylist,
      updatedAt: serverTimestamp()
    });

    // Revalidate paths
    revalidatePath('/admin/stations');
    revalidatePath('/');

    return {
      ...station,
      playlist: reorderedPlaylist
    };
  } catch (error) {
    console.error('Error reordering playlist:', error);
    throw error;
  }
}

/**
 * Ajoute plusieurs pistes à la playlist
 */
export async function addPlaylistItems(stationId: string, tracks: Omit<PlaylistItem, 'id'>[]): Promise<Station | null> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Générer des IDs uniques pour les nouvelles pistes
    const newTracks: PlaylistItem[] = tracks.map((track, index) => ({
      ...track,
      id: `${Date.now()}-${index}`,
      addedAt: new Date().toISOString()
    }));

    // Ajouter les nouvelles pistes à la playlist existante
    const updatedPlaylist = [...station.playlist, ...newTracks];

    // Mettre à jour la station
    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, {
      playlist: updatedPlaylist,
      updatedAt: serverTimestamp()
    });

    // Revalidate paths
    revalidatePath('/admin/stations');
    revalidatePath('/');

    return {
      ...station,
      playlist: updatedPlaylist
    };
  } catch (error) {
    console.error('Error adding playlist items:', error);
    throw error;
  }
}

/**
 * Supprime une station complètement
 */
export async function deleteStation(stationId: string, ownerId: string): Promise<boolean> {
  try {
    const station = await getStationById(stationId);
    if (!station) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Vérifier les permissions (seulement le propriétaire ou system)
    if (station.ownerId !== ownerId && ownerId !== 'system') {
      throw new Error('Unauthorized to delete this station');
    }

    // Supprimer la station
    const stationRef = doc(db, 'stations', stationId);
    await deleteDoc(stationRef);

    // Mettre à jour les stats utilisateur si ce n'est pas une station système
    if (station.ownerId !== 'system') {
      const userRef = doc(db, 'users', station.ownerId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          stationsCreated: increment(-1)
        });
      }
    }

    // Revalidate paths
    revalidatePath('/admin/stations');
    revalidatePath('/admin');
    revalidatePath('/');

    console.log(`✅ Station ${station.name} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error deleting station:', error);
    throw error;
  }
}

/**
 * Clone une station existante
 */
export async function cloneStation(
  stationId: string, 
  newFrequency: number, 
  newName: string, 
  ownerId: string
): Promise<Station | null> {
  try {
    const originalStation = await getStationById(stationId);
    if (!originalStation) {
      throw new Error(`Station ${stationId} not found`);
    }

    // Vérifier que la nouvelle fréquence est disponible
    const existingStation = await getStationForFrequency(newFrequency);
    if (existingStation) {
      throw new Error('Cette fréquence est déjà occupée');
    }

    // Créer la nouvelle station avec les mêmes paramètres
    const stationData = {
      name: newName,
      frequency: newFrequency,
      djCharacterId: originalStation.djCharacterId,
      theme: originalStation.theme,
      ownerId: ownerId,
      playlist: originalStation.playlist.map((track, index) => ({
        ...track,
        id: `${Date.now()}-clone-${index}`,
        addedAt: new Date().toISOString()
      })),
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'stations'), stationData);

    // Mettre à jour les stats utilisateur
    const userRef = doc(db, 'users', ownerId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        stationsCreated: increment(1)
      });
    }
    
    // Revalidate paths
    revalidatePath('/admin/stations');
    revalidatePath('/admin');
    revalidatePath('/');
    
    console.log(`✅ Station cloned: ${newName} (${newFrequency})`);
    return await getStationById(docRef.id);
  } catch (error) {
    console.error('Error cloning station:', error);
    throw error;
  }
}