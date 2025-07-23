
'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter, DJCharacter } from '@/lib/types';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { DJ_CHARACTERS } from '@/lib/data';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { generateThemedMessage, type GenerateThemedMessageInput } from '@/ai/flows/generate-themed-message';
import { searchMusicAdvanced, getAudioForTrackImproved as getAudioForTrack } from './actions-improved';


const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
  theme: z.string().min(3, "Le thème est requis."),
  ownerId: z.string(),
});

function serializeStation(doc: any): Station {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
        playlist: data.playlist || [],
    } as Station;
}

export async function getStationForFrequency(frequency: number): Promise<Station | null> {
    const stationsCol = collection(db, 'stations');
    
    const margin = 0.05; // Marge de fréquence pour trouver une station
    const lowerBound = frequency - margin;
    const upperBound = frequency + margin;

    const q = query(
        stationsCol, 
        where('frequency', '>=', lowerBound),
        where('frequency', '<=', upperBound)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const stationDoc = querySnapshot.docs.sort((a, b) => 
        Math.abs(a.data().frequency - frequency) - Math.abs(b.data().frequency - frequency)
    )[0];
    
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


export async function createStation(ownerId: string, formData: FormData) {
  if (!ownerId) {
     return { error: { general: 'Authentification requise.' } };
  }
  
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

  const existingStation = await getStationForFrequency(frequency);
  if (existingStation) {
    return { error: { general: 'Cette fréquence est déjà occupée.' } };
  }
  
  const allDjs = await getCustomCharactersForUser(ownerId);
  const fullDjList: (DJCharacter | CustomDJCharacter)[] = [...DJ_CHARACTERS, ...allDjs];
  const dj = fullDjList.find(d => d.id === djCharacterId);

  if (!dj) {
    return { error: { general: 'Personnage DJ non trouvé.' } };
  }

  // Création de la playlist initiale
  const initialMessage: PlaylistItem = {
    id: `msg-${Date.now()}`,
    type: 'message',
    title: 'Message de bienvenue',
    content: `Bienvenue sur ${name}. Je suis ${dj.name}, et je vous accompagnerai sur le thème "${theme}".`,
    artist: dj.name,
    url: '',
    duration: 10,
    addedAt: new Date().toISOString(),
  };

  const initialMusic = await searchMusicAdvanced(theme, 5);
  
  const newStationData = {
    name,
    frequency,
    djCharacterId,
    theme,
    ownerId,
    playlist: [initialMessage, ...initialMusic],
    createdAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, 'stations'), newStationData);

  const userRef = doc(db, 'users', ownerId);
  const userDoc = await getDoc(userRef);
  if (userDoc.exists()) {
    await updateDoc(userRef, {
        stationsCreated: increment(1)
    });
  }
  
  revalidatePath('/admin/stations');
  revalidatePath('/admin');
  return { success: true, stationId: docRef.id };
}

export async function previewCustomDjAudio(input: { message: string, voice: any }): Promise<{ audioBase64?: string; error?: string }> {
  try {
    const result = await generateCustomDjAudio(input);
    return { audioBase64: result.audioBase64 };
  } catch (e: any) {
    return { error: e.message || 'Unknown error during audio generation.' };
  }
}

export async function addMessageToStation(stationId: string, message: string): Promise<{ success: true, playlistItem: PlaylistItem } | { error: string }> {
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
        url: '', // Sera générée à la volée
        duration: 15, // Sera recalculée par le lecteur TTS
        artist: dj.name,
        addedAt: new Date().toISOString(),
    };
    
    try {
        const stationRef = doc(db, 'stations', stationId);
        await updateDoc(stationRef, {
            playlist: arrayUnion(newPlaylistItem)
        });
    } catch (firestoreError: any) {
        return { error: `La mise à jour de la base de données a échoué: ${firestoreError.message}` };
    }

    revalidatePath(`/admin/stations/${stationId}`);
    return { success: true, playlistItem: newPlaylistItem };
}


export async function searchMusic(searchTerm: string): Promise<{ data?: PlaylistItem[]; error?: string }> {
    if (!searchTerm || !searchTerm.trim()) {
      return { error: "Le terme de recherche est vide" };
    }

    try {
        const results = await searchMusicAdvanced(searchTerm, 8);
        return { data: results };
    } catch (error: any) {
        console.error("La recherche musicale a échoué:", error);
        return { error: error.message || "Erreur de recherche inconnue" };
    }
}


export async function addMusicToStation(stationId: string, musicTrack: PlaylistItem) {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);
    if (!stationDoc.exists()) {
        return { error: "Station non trouvée." };
    }
    
    if (!musicTrack) {
        return { error: "Piste musicale non valide." };
    }

    const newTrack = {
      ...musicTrack,
      addedAt: new Date().toISOString(),
    };

    await updateDoc(stationRef, {
        playlist: arrayUnion(newTrack)
    });
    
    revalidatePath(`/admin/stations/${stationId}`);
    return { success: true, playlistItem: newTrack };
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
      lastLogin: serverTimestamp(),
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
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { name, background, gender, tone, style } = validatedFields.data;

  const newCharacterData: Omit<CustomDJCharacter, 'id'> = {
    name,
    description: background,
    voice: {
      gender,
      tone,
      style,
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
  
  try {
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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
      };
    });
  } catch (error: any) {
    console.error(`Erreur chargement DJ personnalisés: ${error.message}`, error);
    return [];
  }
}

// Remplacé par `getAudioForTrackImproved` dans `actions-improved.ts`
export { getAudioForTrack };
