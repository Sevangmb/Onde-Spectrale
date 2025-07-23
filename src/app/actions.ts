
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


// --- Functions from actions-improved.ts are now merged here ---

/**
 * Version améliorée de la recherche musicale Archive.org
 * avec meilleure gestion des URLs et formats audio
 */
export async function searchMusicAdvanced(searchTerm: string, limit: number = 8): Promise<PlaylistItem[]> {
  if (!searchTerm.trim()) return [];

  const cleanSearchTerm = encodeURIComponent(searchTerm.trim());
  
  // Recherche ciblée sur Archive.org avec plusieurs formats audio
  const searchUrl = `https://archive.org/advancedsearch.php?` +
    `q=(${cleanSearchTerm}) AND mediatype:audio AND format:(MP3 OR "VBR MP3")` +
    `&fl=identifier,title,creator,duration,format,item_size,year` +
    `&sort=downloads desc` +
    `&rows=${limit}&page=1&output=json`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OndeSpectrale/1.0 (contact: sevangmb@gmail.com)'
      }
    });

    if (!response.ok) {
      console.error(`Archive.org search error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!data?.response?.docs?.length) {
      console.log(`Aucun résultat pour: "${searchTerm}"`);
      return [];
    }

    const results: PlaylistItem[] = data.response.docs
      .map((doc: any) => {
        if (!doc.identifier || !doc.title) return null;
        
        const mp3Url = `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`;
        // Fallback pour les noms de fichiers qui ne correspondent pas à l'identifier
        const genericVbrUrl = `https://archive.org/download/${doc.identifier}/${doc.identifier}_vbr.mp3`;

        return {
          id: `archive-${doc.identifier}-${Date.now()}`,
          type: 'music',
          title: cleanTitle(doc.title),
          content: searchTerm, // Terme de recherche original
          artist: cleanArtist(doc.creator),
          url: mp3Url, // On fournit une URL par défaut, `validateAudioUrl` pourra la vérifier
          duration: parseDuration(doc.duration) || 180,
          archiveId: doc.identifier,
          addedAt: new Date().toISOString(),
        };
      })
      .filter((item: PlaylistItem | null): item is PlaylistItem => item !== null);
      
    return results;

  } catch (error) {
    console.error("Erreur recherche Archive.org:", error);
    return [];
  }
}

/**
 * Nettoie et formate le titre
 */
function cleanTitle(title: string): string {
  if (!title) return 'Titre inconnu';
  
  return title
    .replace(/\[.*?\]/g, '') // Supprimer les crochets
    .replace(/\(.*?\)/g, '') // Supprimer les parenthèses
    .replace(/\s+/g, ' ') // Normaliser les espaces
    .trim()
    .substring(0, 100); // Limiter la longueur
}

/**
 * Nettoie et formate l'artiste
 */
function cleanArtist(creator: string | string[]): string {
  if (!creator) return 'Artiste inconnu';
  
  const artistName = Array.isArray(creator) ? creator[0] : creator;
  return artistName.substring(0, 50);
}

/**
 * Parse la durée depuis Archive.org
 */
function parseDuration(duration: string | number): number {
  if (!duration) return 180; // 3 minutes par défaut
  
  if (typeof duration === 'number') return Math.round(duration);
  
  const parts = duration.toString().split(':').map(p => parseInt(p) || 0);
  
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]; // MM:SS
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
  }
  
  return 180;
}

/**
 * Valide qu'une URL audio est accessible
 */
export async function validateAudioUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 secondes de timeout
    });
    
    return response.ok && response.headers.get('content-type')?.includes('audio') === true;
  } catch {
    return false;
  }
}

/**
 * Version améliorée de getAudioForTrack avec retry et fallback
 */
export async function getAudioForTrackImproved(
  track: PlaylistItem, 
  djCharacterId: string, 
  ownerId: string
): Promise<{ audioUrl?: string; error?: string }> {
  
  if (track.type === 'message') {
    return getAudioForMessage(track, djCharacterId, ownerId);
  } 
  
  if (track.type === 'music') {
    // Essayer l'URL existante d'abord
    if (track.url) {
      const isValid = await validateAudioUrl(track.url);
      if (isValid) {
        return { audioUrl: track.url };
      }
    }
    
    // Fallback : nouvelle recherche si l'URL est invalide ou manquante
    if (track.content) {
      const searchResults = await searchMusicAdvanced(track.content, 3);
      
      for (const result of searchResults) {
        if (result.url) {
          const isValid = await validateAudioUrl(result.url);
          if (isValid) {
            return { audioUrl: result.url };
          }
        }
      }
    }
    
    return { error: `Impossible de trouver une source audio valide pour "${track.title}"` };
  }
  
  return { error: 'Type de piste non reconnu' };
}

/**
 * Gestion améliorée des messages audio avec les DJ
 */
async function getAudioForMessage(
  track: PlaylistItem, 
  djCharacterId: string, 
  ownerId: string
): Promise<{ audioUrl?: string; error?: string }> {
  
  try {
    if (!track.content) {
      return { error: 'Contenu du message vide.' };
    }

    const customDjs = await getCustomCharactersForUser(ownerId);
    const allDjs = [...DJ_CHARACTERS, ...customDjs];
    const dj = allDjs.find(d => d.id === djCharacterId);

    if (!dj) {
      return { error: 'Personnage DJ non trouvé' };
    }

    let audioResult;
    
    if ('isCustom' in dj && dj.isCustom) {
      audioResult = await generateCustomDjAudio({ 
        message: track.content, 
        voice: (dj as CustomDJCharacter).voice 
      });
    } else {
      audioResult = await generateDjAudio({ 
        message: track.content, 
        characterId: dj.id 
      });
    }

    if (!audioResult?.audioBase64) {
      throw new Error('Aucune donnée audio générée');
    }

    return { 
      audioUrl: `data:audio/wav;base64,${audioResult.audioBase64}` 
    };

  } catch (error: any) {
    console.error("Erreur génération vocale:", error);
    return { 
      error: `Génération vocale échouée: ${error.message}` 
    };
  }
}

// --- Original functions from actions.ts ---

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

export async function getAudioForTrack(
  track: PlaylistItem,
  djCharacterId: string,
  ownerId: string
): Promise<{ audioUrl?: string; error?: string }> {
  try {
    if (track.type === 'message') {
      if (!track.content) {
        return { error: 'Contenu du message vide.' };
      }

      const { getCustomCharactersForUser } = await import('./actions');
      const customDjs = await getCustomCharactersForUser(ownerId);
      const allDjs = [...DJ_CHARACTERS, ...customDjs];
      const dj = allDjs.find(d => d.id === djCharacterId);

      if (!dj) {
        return { error: 'Personnage DJ non trouvé' };
      }

      let audioResult;
      if ('isCustom' in dj && dj.isCustom) {
        audioResult = await generateCustomDjAudio({
          message: track.content,
          voice: (dj as CustomDJCharacter).voice,
        });
      } else {
        audioResult = await generateDjAudio({
          message: track.content,
          characterId: dj.id,
        });
      }

      if (!audioResult?.audioBase64) {
        throw new Error('Aucune donnée audio générée');
      }
      return { audioUrl: `data:audio/wav;base64,${audioResult.audioBase64}` };
    }

    if (track.type === 'music') {
      if (track.url && !track.url.startsWith('https://archive.org')) {
        return { audioUrl: track.url };
      }

      const searchTerm = track.content || track.title;
      const searchResults = await searchMusicAdvanced(searchTerm, 1);
      if (searchResults.length > 0 && searchResults[0].url) {
        return { audioUrl: searchResults[0].url };
      } else {
        return { error: `Aucune piste trouvée pour "${searchTerm}"` };
      }
    }

    return { error: 'Type de piste non reconnu' };
  } catch (error: any) {
    console.error("Erreur dans getAudioForTrack:", error);
    return {
      error: `La génération de la voix IA a échoué: ${error.message}`,
    };
  }
}
