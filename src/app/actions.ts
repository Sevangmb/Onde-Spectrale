'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem } from '@/lib/types';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { z } from 'zod';
import { auth, db } from '@/lib/firebase';
import { DJ_CHARACTERS } from '@/lib/data';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';


const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
  ownerId: z.string(),
});

export async function getStation(frequency: number): Promise<Station | null> {
    const stationsCol = collection(db, 'stations');
    const q = query(stationsCol, where('frequency', '==', frequency));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const stationDoc = querySnapshot.docs[0];
    const stationData = stationDoc.data();
    
    if (!stationData.playlist) {
        stationData.playlist = [];
    }

    return { id: stationDoc.id, ...stationData } as Station;
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
  const user = auth.currentUser;
  if (!user) {
     return { error: { general: 'Authentification requise.' } };
  }
  
  const validatedFields = CreateStationSchema.safeParse({
    name: formData.get('name'),
    frequency: parseFloat(formData.get('frequency') as string),
    djCharacterId: formData.get('djCharacterId'),
    ownerId: user.uid
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

  // Increment user's station count
  const userRef = doc(db, 'users', ownerId);
  await updateDoc(userRef, {
      stationsCreated: increment(1)
  });

  const newStation: Station = {
      id: docRef.id,
      ...newStationData
  }

  revalidatePath('/');
  return { success: true, station: newStation };
}

export async function addMessageToStation(stationId: string, message: string) {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);

    if (!stationDoc.exists()) {
        return { error: "Station non trouvée." };
    }
    const station = { id: stationDoc.id, ...stationDoc.data() } as Station;
    
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
            title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
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


export async function searchMusic(searchTerm: string): Promise<PlaylistItem[]> {
    if (!searchTerm) return [];

    const searchUrl = `https://archive.org/advancedsearch.php?q=title:(${searchTerm})%20AND%20mediatype:(audio)&fl=identifier,title,creator,avg_rating&sort=avg_rating%20desc&rows=10&page=1&output=json`;
    
    try {
        const response = await fetch(searchUrl);
        if (!response.ok) {
            console.error('Archive.org API error:', response.statusText);
            return [];
        }
        const data = await response.json();
        const docs = data.response.docs;

        const searchResults: PlaylistItem[] = docs.map((doc: any) => ({
            id: doc.identifier,
            type: 'music',
            title: doc.title || 'Titre inconnu',
            artist: doc.creator || 'Artiste inconnu',
            url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
            duration: 180, // Mock duration
        }));
        
        return searchResults;

    } catch (error) {
        console.error('Failed to fetch from Archive.org:', error);
        return [];
    }
}


export async function addMusicToStation(stationId: string, musicId: string, musicTrack: PlaylistItem) {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);
    if (!stationDoc.exists()) {
        return { error: "Station non trouvée." };
    }
    
    if (!musicTrack) {
        return { error: "Musique non trouvée. Essayez une nouvelle recherche." };
    }

    await updateDoc(stationRef, {
        playlist: arrayUnion(musicTrack)
    });
    
    revalidatePath('/');
    return { success: true, playlistItem: musicTrack };
}


export async function updateUserOnLogin(userId: string, email: string | null) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: email,
      stationsCreated: 0,
      lastFrequency: 92.1,
      createdAt: serverTimestamp(),
    });
  } else {
     await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
    });
  }
}

export async function updateUserFrequency(userId: string, frequency: number) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { lastFrequency: frequency });
}

export async function getUserData(userId: string) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() : null;
}