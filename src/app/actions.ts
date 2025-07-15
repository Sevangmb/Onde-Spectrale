'use server';

import { revalidatePath } from 'next/cache';
import { DJ_CHARACTERS, MOCK_MUSIC_SEARCH_RESULTS } from '@/lib/data';
import type { Station, PlaylistItem } from '@/lib/types';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { z } from 'zod';
import { auth, db } from '@/lib/firebase';
import { headers } from 'next/headers';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion } from 'firebase/firestore';


const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
});

export async function getStation(frequency: number): Promise<Station | null> {
    const stationsCol = collection(db, 'stations');
    const q = query(stationsCol, where('frequency', '==', frequency));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const stationDoc = querySnapshot.docs[0];
    return { id: stationDoc.id, ...stationDoc.data() } as Station;
}

export async function getInterference(frequency: number): Promise<string> {
    const station = await getStation(frequency);
    const result = await simulateFrequencyInterference({
        frequency,
        stationName: station?.name,
    });
    return result.interference;
}

export async function createStation(formData: FormData) {
  const userToken = headers().get('Authorization')?.split('Bearer ')[1];
  if (!userToken) {
     return { error: { general: 'Authentification requise.' } };
  }
  
  // In a real app, you would verify the token server-side.
  // For now, we'll proceed assuming the client-side check is sufficient for this demo.
  const validatedFields = CreateStationSchema.safeParse({
    name: formData.get('name'),
    frequency: parseFloat(formData.get('frequency') as string),
    djCharacterId: formData.get('djCharacterId'),
    ownerId: formData.get('ownerId')
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { name, frequency, djCharacterId, ownerId } = validatedFields.data;

  const existingStation = await getStation(frequency);
  if (existingStation) {
    return { error: { general: 'Cette fréquence est déjà occupée.' } };
  }

  const newStationData = {
    name,
    frequency,
    djCharacterId,
    ownerId,
    playlist: [],
    createdAt: new Date().toISOString(),
  };
  
  const docRef = await addDoc(collection(db, 'stations'), newStationData);

  const newStation: Station = {
      id: docRef.id,
      ...newStationData
  }

  revalidatePath('/');
  return { success: true, station: newStation };
}

export async function addMessageToStation(stationId: string, message: string) {
    const stationRef = doc(db, 'stations', stationId);
    const station = (await getDocs(query(collection(db, 'stations'), where('__name__', '==', stationId)))).docs[0]?.data() as Station;
    if (!station) {
        return { error: "Station non trouvée." };
    }

    const character = DJ_CHARACTERS.find(c => c.id === station.djCharacterId);
    if (!character) {
        return { error: "Personnage DJ non trouvé." };
    }

    try {
        const audio = await generateDjAudio({
            message,
            characterId: character.id
        });
        
        const newPlaylistItem: PlaylistItem = {
            id: `msg-${Date.now()}`,
            type: 'message',
            title: message.substring(0, 30) + '...',
            url: audio.audioUrl,
            duration: 15, // Mock duration, could be calculated from audio file
        };

        await updateDoc(stationRef, {
            playlist: arrayUnion(newPlaylistItem)
        });

        revalidatePath('/');
        return { success: true, playlistItem: newPlaylistItem };

    } catch (e) {
        console.error(e);
        return { error: "Erreur lors de la génération de l'audio."}
    }
}

export async function searchMusic(query: string) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    return MOCK_MUSIC_SEARCH_RESULTS;
}

export async function addMusicToStation(stationId: string, musicId: string) {
    const stationRef = doc(db, 'stations', stationId);
    const station = (await getDocs(query(collection(db, 'stations'), where('__name__', '==', stationId)))).docs[0]?.data();
    if (!station) {
        return { error: "Station non trouvée." };
    }

    const musicTrack = MOCK_MUSIC_SEARCH_RESULTS.find(m => m.id === musicId);
    if (!musicTrack) {
        return { error: "Musique non trouvée." };
    }

    await updateDoc(stationRef, {
        playlist: arrayUnion(musicTrack)
    });
    
    revalidatePath('/');
    return { success: true, playlistItem: musicTrack };
}
