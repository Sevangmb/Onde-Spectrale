'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter } from '@/lib/types';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { z } from 'zod';
import { auth, db } from '@/lib/firebase';
import { DJ_CHARACTERS } from '@/lib/data';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';


const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
  ownerId: z.string(),
});

function serializeStation(doc: any): Station {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        playlist: data.playlist || [],
    } as Station;
}

export async function getStationForFrequency(frequency: number): Promise<Station | null> {
    const stationsCol = collection(db, 'stations');
    const q = query(stationsCol, where('frequency', '==', frequency));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const stationDoc = querySnapshot.docs[0];
    return serializeStation(stationDoc);
}


export async function getStationById(stationId: string): Promise<Station | null> {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);

    if (!stationDoc.exists()) {
        return null;
    }

    return serializeStation(stationDoc);
}

export async function getStationsForUser(userId: string): Promise<Station[]> {
    if (!userId) return [];
    const stationsCol = collection(db, 'stations');
    const q = query(stationsCol, where('ownerId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(serializeStation);
}


export async function getInterference(frequency: number): Promise<string> {
    const station = await getStationForFrequency(frequency);
    const result = await simulateFrequencyInterference({
        frequency,
        stationName: station?.name,
    });
    return result.interference;
}

export async function createStation(ownerId: string, formData: FormData) {
  if (!ownerId) {
     return { error: { general: 'Authentification requise.' } };
  }
  
  const validatedFields = CreateStationSchema.safeParse({
    name: formData.get('name'),
    frequency: parseFloat(formData.get('frequency') as string),
    djCharacterId: formData.get('djCharacterId'),
    ownerId: ownerId,
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { name, frequency, djCharacterId } = validatedFields.data;

  const existingStation = await getStationForFrequency(frequency);
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
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    await updateDoc(userRef, {
        stationsCreated: increment(1)
    });
  }


  const newStation: Station = {
      id: docRef.id,
      ...newStationData
  }

  revalidatePath('/admin/stations');
  revalidatePath('/admin');
  return { success: true, station: newStation };
}

export async function addMessageToStation(stationId: string, message: string) {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);

    if (!stationDoc.exists()) {
        return { error: "Station non trouvée." };
    }
    const station = await getStationById(stationId);
    if (!station) {
        return { error: "Station non trouvée." };
    }
    
    const officialCharacter = DJ_CHARACTERS.find(c => c.id === station.djCharacterId);

    let audio;

    if (officialCharacter) {
         audio = await generateDjAudio({
            message,
            characterId: officialCharacter.id
        });
    } else {
        // It's a custom character, fetch from Firestore
        const customCharRef = doc(db, 'users', station.ownerId, 'characters', station.djCharacterId);
        const customCharDoc = await getDoc(customCharRef);
        if (!customCharDoc.exists()) {
            return { error: "Personnage DJ personnalisé non trouvé." };
        }
        const customChar = customCharDoc.data() as CustomDJCharacter;
        audio = await generateCustomDjAudio({
            message,
            voice: customChar.voice
        });
    }
    
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

    revalidatePath(`/admin/stations/${stationId}`);
    return { success: true, playlistItem: newPlaylistItem };

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


export async function addMusicToStation(stationId: string, musicTrack: PlaylistItem) {
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
    
    revalidatePath(`/admin/stations/${stationId}`);
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
    if (!userId) return null;
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
        return null;
    }

    const data = userDoc.data();
    const plainObject: { [key: string]: any } = {};
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            plainObject[key] = (data[key] as Timestamp).toDate().toISOString();
        } else {
            plainObject[key] = data[key];
        }
    }
    
    return plainObject;
}

const CreateCustomDJSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères.'),
  background: z.string().min(10, 'L\'histoire doit contenir au moins 10 caractères.'),
  gender: z.string(),
  tone: z.string(),
  style: z.string(),
  speakingRate: z.number(),
});

export async function createCustomDj(userId: string, formData: FormData) {
  if (!userId) {
    return { error: { general: 'Authentification requise.' } };
  }

  const validatedFields = CreateCustomDJSchema.safeParse({
    name: formData.get('name'),
    background: formData.get('background'),
    gender: formData.get('gender'),
    tone: formData.get('tone'),
    style: formData.get('style'),
    speakingRate: parseFloat(formData.get('speakingRate') as string),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, background, gender, tone, style, speakingRate } = validatedFields.data;

  const newCharacterData: Omit<CustomDJCharacter, 'id'> = {
    name,
    description: background,
    voice: {
      gender,
      tone,
      style,
      speakingRate,
    },
    isCustom: true,
    ownerId: userId,
    createdAt: new Date().toISOString(),
  };

  const userCharactersCollection = collection(db, 'users', userId, 'characters');
  const docRef = await addDoc(userCharactersCollection, newCharacterData);

  revalidatePath('/admin/personnages');
  return { success: true, characterId: docRef.id };
}

export async function getCustomCharactersForUser(userId: string): Promise<CustomDJCharacter[]> {
  if (!userId) return [];
  const charactersCol = collection(db, 'users', userId, 'characters');
  const querySnapshot = await getDocs(charactersCol);
  
  if (querySnapshot.empty) {
    return [];
  }

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      description: data.description,
      voice: data.voice,
      isCustom: true,
      ownerId: data.ownerId,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
    };
  });
}
