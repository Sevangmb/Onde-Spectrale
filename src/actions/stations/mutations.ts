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
  arrayUnion
} from 'firebase/firestore';
import { DJ_CHARACTERS } from '@/lib/data';
import { generatePlaylist, type GeneratePlaylistInput } from '@/ai/flows/generate-playlist-flow';
import { getRandomPlexTracks } from '@/lib/plex';
import { getCustomCharactersForUser } from '../users/queries';
import { getStationForFrequency, getStationById } from './queries';
import type { PlaylistItem, DJCharacter, CustomDJCharacter, Station } from '@/lib/types';

const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
  theme: z.string().min(3, "Le thème est requis."),
  ownerId: z.string(),
});

export async function createStation(ownerId: string, formData: FormData) {
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
