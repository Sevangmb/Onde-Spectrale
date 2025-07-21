
'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter } from '@/lib/types';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { z } from 'zod';
import { db, storage, ref, getDownloadURL } from '@/lib/firebase';
import { uploadBytesResumable } from 'firebase/storage';
import { DJ_CHARACTERS, MUSIC_CATALOG } from '@/lib/data';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { generatePlaylist } from '@/ai/flows/generate-playlist-flow';

// Define types locally as they are not exported from the flow file
type GeneratePlaylistInput = {
    stationName: string;
    djName: string;
    djDescription: string;
    theme: string;
};

type GeneratePlaylistOutput = {
    items: {
        type: 'message' | 'music';
        content: string;
    }[];
};

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
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(data.createdAt).toISOString(),
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
        url: message, // Store the raw text
        duration: 15, // Mock duration, will be dynamic on client
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


export async function searchMusic(searchTerm: string): Promise<{data?: PlaylistItem[], error?: string}> {
    if (!searchTerm) return {data:[]};

    const searchUrl = `https://archive.org/advancedsearch.php?q=title:(${searchTerm})%20AND%20mediatype:(audio)&fl=identifier,title,creator,duration&sort=-week%20desc&rows=20&page=1&output=json`;
    
    try {
        const response = await fetch(searchUrl, {
          headers: {
            'Accept': 'application/json'
          }
        });
        if (!response.ok) {
            return {error: `Erreur Archive.org: ${response.statusText}`};
        }
        const data = await response.json();
        const responseData = data.response;
        if (!responseData || !responseData.docs) {
          return { data: [] };
        }
        const docs = responseData.docs;

        const searchResults: PlaylistItem[] = docs
          .filter((doc: any) => doc.identifier && doc.title)
          .map((doc: any) => ({
            id: doc.identifier,
            type: 'music',
            title: doc.title || 'Titre inconnu',
            artist: doc.creator || 'Artiste inconnu',
            url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
            duration: Math.round(parseFloat(doc.duration) || 180),
            addedAt: new Date().toISOString(),
        }));
        
        return {data: searchResults};

    } catch (error) {
        return {error: "La recherche sur Archive.org a échoué."};
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

    const newTrack = {
      ...musicTrack,
      addedAt: new Date().toISOString(),
    }

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
}

export async function generateAndAddPlaylist(stationId: string, theme: string): Promise<{ success: true, playlist: PlaylistItem[] } | { error: string }> {
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

    let playlistScript: GeneratePlaylistOutput | undefined;
    
    try {
        const input: GeneratePlaylistInput = {
            stationName: station.name,
            djName: dj.name,
            djDescription: 'description' in dj ? dj.description : 'Un DJ mystérieux',
            theme: theme,
        };
        playlistScript = await generatePlaylist(input);
    } catch (e: any) {
        let errorMessage = e.message;
        if (e.message.includes('503')) {
           errorMessage = "Les serveurs de l'IA sont actuellement surchargés. Veuillez réessayer dans quelques instants.";
        }
       return { error: `L'IA n'a pas pu générer de playlist: ${errorMessage}` };
    }
    
    if (!playlistScript || !playlistScript.items || playlistScript.items.length === 0) {
      return { error: "L'IA n'a pas pu générer de playlist. Essayez un autre thème." };
    }
    
    const newPlaylist: PlaylistItem[] = [];

    for (const item of playlistScript.items) {
        if (item.type === 'message') {
            const messageId = `msg-${Date.now()}-${Math.random()}`;
            newPlaylist.push({
                id: messageId,
                type: 'message',
                url: item.content, 
                title: item.content.substring(0, 40) + '...',
                duration: 15,
                artist: dj.name,
                addedAt: new Date().toISOString(),
            });

        } else if (item.type === 'music') {
            const randomTrack = MUSIC_CATALOG[Math.floor(Math.random() * MUSIC_CATALOG.length)];
            newPlaylist.push({
                ...randomTrack,
                id: `${randomTrack.id}-${Date.now()}-${Math.random()}`,
                addedAt: new Date().toISOString(),
            });
        }
    }
    
    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, {
        playlist: newPlaylist
    });

    revalidatePath(`/admin/stations/${stationId}`);
    return { success: true, playlist: newPlaylist };
}

export async function getAudioForMessage(message: string, djCharacterId: string, ownerId: string): Promise<{ audioBase64?: string; error?: string }> {
    const allDjs = await getCustomCharactersForUser(ownerId);
    const fullDjList = [...DJ_CHARACTERS, ...allDjs];
    const dj = fullDjList.find(d => d.id === djCharacterId);
    
    if (!dj) {
        return { error: "Personnage DJ non trouvé." };
    }
    
    try {
        let audioResult;
        if ('isCustom' in dj && dj.isCustom) {
            audioResult = await generateCustomDjAudio({ message, voice: dj.voice });
        } else {
            audioResult = await generateDjAudio({ message, characterId: dj.id });
        }

        if (!audioResult || !audioResult.audioBase64) {
            throw new Error('Données audio générées vides.');
        }
        return { audioBase64: audioResult.audioBase64 };
    } catch(err: any) {
        return { error: `La génération de la voix IA a échoué: ${err.message}` };
    }
}
