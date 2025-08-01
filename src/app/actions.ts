
'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter, DJCharacter } from '@/lib/types';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { z } from 'zod';
import { db, storage, ref, getDownloadURL } from '@/lib/firebase';
import { uploadBytesResumable } from 'firebase/storage';
import { DJ_CHARACTERS } from '@/lib/data';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { safeToISOString } from '@/lib/dateUtils';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { generatePlaylist, type GeneratePlaylistInput } from '@/ai/flows/generate-playlist-flow';
import { searchPlexMusic, getRandomPlexTracks } from '@/lib/plex';

const PLEX_SERVER_URL = process.env.PLEX_SERVER_URL || '';

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
        createdAt: safeToISOString(data.createdAt),
        playlist: data.playlist || [],
    } as Station;
}

export async function createDefaultStations(): Promise<void> {
  const stations = [
    {
      frequency: 87.6,
      name: 'Radio Liberty',
      djId: 'sarah', // Sarah pour une voix douce
      theme: 'Nouvelles de l\'aube et musiques de liberté'
    },
    {
      frequency: 94.5,
      name: 'Diamond City Radio',
      djId: 'tommy', // Tommy pour une ambiance plus légère
      theme: 'Les classiques d\'avant-guerre et les nouvelles de la ville'
    },
    {
      frequency: 98.2,
      name: 'Radio de la Savante',
      djId: 'sarah', // Sarah pour une touche de savoir
      theme: 'Musique classique et réflexions sur le vieux monde'
    },
    {
      frequency: 100.7,
      name: 'Radio Wasteland',
      djId: 'marcus', // Utilisons Marcus pour la radio principale
      theme: 'Histoires et musiques des terres désolées'
    },
    {
      frequency: 102.1,
      name: 'Enclave Radio',
      djId: 'marcus', // Marcus pour une voix autoritaire
      theme: 'Propagande et marches patriotiques de l\'Enclave'
    }
  ];

  for (const stationConfig of stations) {
    try {
      const existing = await getStationForFrequency(stationConfig.frequency);
      if (existing) continue;

      const dj = DJ_CHARACTERS.find(d => d.id === stationConfig.djId) || DJ_CHARACTERS[0];
      
      const playlistInput: GeneratePlaylistInput = {
        stationName: stationConfig.name,
        djName: dj.name,
        djDescription: dj.description,
        theme: stationConfig.theme,
      };

      // Generate playlist with mixed content: messages + Plex music
      const { items } = await generatePlaylist(playlistInput);
      
      // Get random Plex tracks for music items
      const plexTracks = await getRandomPlexTracks(undefined, 10);
      let plexIndex = 0;
      
      const playlistWithIds: PlaylistItem[] = [];
      
      for (const [index, item] of items.entries()) {
        if (item.type === 'message') {
          playlistWithIds.push({
            id: `${Date.now()}-msg-${index}`,
            ...item,
            title: `Message de ${dj.name}`,
            artist: dj.name,
            duration: 10,
            url: '',
            addedAt: safeToISOString(new Date()),
          });
        } else {
          // Use real Plex track instead of placeholder
          if (plexTracks[plexIndex]) {
            const plexTrack = plexTracks[plexIndex];
            playlistWithIds.push({
              ...plexTrack,
              id: `${Date.now()}-plex-${index}`,
              content: item.content || plexTrack.title, // Keep AI-generated context
              addedAt: safeToISOString(new Date()),
            });
            plexIndex++;
          } else {
            // Fallback if no more Plex tracks
            playlistWithIds.push({
              id: `${Date.now()}-fallback-${index}`,
              ...item,
              title: 'Musique d\'ambiance',
              artist: 'Station Radio',
              duration: 180,
              url: '',
              addedAt: safeToISOString(new Date()),
            });
          }
        }
      }

      const stationData = {
        name: stationConfig.name,
        frequency: stationConfig.frequency,
        djCharacterId: dj.id,
        theme: stationConfig.theme,
        ownerId: 'system',
        playlist: playlistWithIds,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'stations'), stationData);
      console.log(`✅ Station créée: ${stationConfig.name} (${stationConfig.frequency})`);
      
    } catch (error) {
      console.error(`Erreur création station ${stationConfig.name}:`, error);
    }
  }
}

export async function getStationForFrequency(frequency: number): Promise<Station | null> {
    const stationsCol = collection(db, 'stations');
    
    const margin = 0.01;
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
    
    // Récupérer les stations de l'utilisateur ET les stations système
    const userQuery = query(stationsCol, where('ownerId', '==', userId));
    const systemQuery = query(stationsCol, where('ownerId', '==', 'system'));
    
    const [userSnapshot, systemSnapshot] = await Promise.all([
        getDocs(userQuery),
        getDocs(systemQuery)
    ]);
    
    const userStations = userSnapshot.docs.map(serializeStation);
    const systemStations = systemSnapshot.docs.map(serializeStation);
    
    // Combiner et trier par fréquence
    return [...systemStations, ...userStations].sort((a, b) => a.frequency - b.frequency);
}


export async function getInterference(frequency: number): Promise<string> {
  try {
    const station = await getStationForFrequency(frequency);
    const result = await simulateFrequencyInterference({
        frequency,
        stationName: station?.name,
    });
    return result.interference;
  } catch (error) {
    console.error(`Erreur de génération d'interférence pour ${frequency}MHz:`, error);
    return "Statique... rien que de la statique.";
  }
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
  
  const playlistInput: GeneratePlaylistInput = {
      stationName: name,
      djName: dj.name,
      djDescription: 'isCustom' in dj && dj.isCustom ? dj.description : (dj as DJCharacter).description,
      theme: theme,
  };

  // Generate playlist with mixed content: messages + Plex music
  const { items } = await generatePlaylist(playlistInput);
  
  // Get random Plex tracks for music items
  const plexTracks = await getRandomPlexTracks(undefined, 15);
  let plexIndex = 0;
  
  const playlistWithIds: PlaylistItem[] = [];
  
  for (const [index, item] of items.entries()) {
    if (item.type === 'message') {
      playlistWithIds.push({
        id: `${Date.now()}-msg-${index}`,
        ...item,
        title: `Message de ${dj.name}`,
        artist: dj.name,
        duration: 10,
        url: '',
        addedAt: safeToISOString(new Date()),
      });
    } else {
      // Use real Plex track instead of placeholder
      if (plexTracks[plexIndex]) {
        const plexTrack = plexTracks[plexIndex];
        playlistWithIds.push({
          ...plexTrack,
          id: `${Date.now()}-plex-${index}`,
          content: item.content || plexTrack.title, // Keep AI-generated context
          addedAt: safeToISOString(new Date()),
        });
        plexIndex++;
      } else {
        // Fallback if no more Plex tracks
        playlistWithIds.push({
          id: `${Date.now()}-fallback-${index}`,
          ...item,
          title: 'Musique d\'ambiance',
          artist: 'Station Radio',
          duration: 180,
          url: '',
          addedAt: safeToISOString(new Date()),
        });
      }
    }
  }


  const newStationData = {
    name,
    frequency,
    djCharacterId,
    theme,
    ownerId,
    playlist: playlistWithIds,
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
  revalidatePath('/'); // Invalider aussi la page principale pour le scanner
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
        content: message, // Store the raw text
        url: '', // will be generated on the fly
        duration: 15, // Mock duration, will be dynamic on client
        artist: dj.name,
        addedAt: safeToISOString(new Date()),
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
    revalidatePath('/'); // Invalider la page principale pour le scanner
    return { success: true, playlistItem: newPlaylistItem };
}

export async function searchMusic(searchTerm: string): Promise<{ data?: PlaylistItem[]; error?: string }> {
    if (!searchTerm || !searchTerm.trim()) {
      return { error: "Search term is empty" };
    }

    try {
        const results = await searchPlexMusic(searchTerm, 8);
        
        if (results.length === 0) {
            return { error: "Aucune musique trouvée dans votre bibliothèque Plex" };
        }

        return { data: results };
    } catch (error: any) {
        console.error("La recherche musicale Plex a échoué:", error);
        return { error: "Erreur de connexion à Plex. Vérifiez votre configuration." };
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
      addedAt: safeToISOString(new Date()),
    }

    await updateDoc(stationRef, {
        playlist: arrayUnion(newTrack)
    });
    
    revalidatePath(`/admin/stations/${stationId}`);
    revalidatePath('/'); // Invalider la page principale pour le scanner
    return { success: true, playlistItem: newTrack };
}

export async function regenerateStationPlaylist(stationId: string): Promise<{ success: true, newPlaylist: PlaylistItem[] } | { error: string }> {
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

    try {
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
              addedAt: safeToISOString(new Date()),
            });
          } else {
            // Use real Plex track
            if (plexTracks[plexIndex]) {
              const plexTrack = plexTracks[plexIndex];
              newPlaylist.push({
                ...plexTrack,
                id: `regen-${Date.now()}-plex-${index}`,
                content: item.content || plexTrack.title,
                addedAt: safeToISOString(new Date()),
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
                addedAt: safeToISOString(new Date()),
              });
            }
          }
        }

        const stationRef = doc(db, 'stations', stationId);
        await updateDoc(stationRef, { playlist: newPlaylist });

        revalidatePath(`/admin/stations/${stationId}`);
        revalidatePath('/admin/stations');
        revalidatePath('/'); // Invalider la page principale pour le scanner
        
        return { success: true, newPlaylist };
    } catch (error: any) {
        return { error: `Erreur de l'IA lors de la régénération: ${error.message}` };
    }
}


export async function updateUserOnLogin(userId: string, email: string | null) {
  const userRef = doc(db, 'users', userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      email: email,
      stationsCreated: 0,
      lastFrequency: 100.7, // Fréquence par défaut
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
    if (!userId) return;
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
            plainObject[key] = safeToISOString(data[key]);
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
    createdAt: safeToISOString(new Date()),
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
        createdAt: safeToISOString(data.createdAt),
      };
    });
  } catch (error: any) {
    console.error(`Erreur chargement DJ personnalisés: ${error.message}`, error);
    return [];
  }
}

export async function getAudioForTrack(track: PlaylistItem, djCharacterId: string, ownerId: string, stationTheme?: string): Promise<{ audioUrl?: string; error?: string }> {
    if (!track) {
        return { error: "Piste non fournie." };
    }

    const allDjs = ownerId && ownerId !== 'anonymous' ? await getCustomCharactersForUser(ownerId) : [];
    const fullDjList: (DJCharacter | CustomDJCharacter)[] = [...DJ_CHARACTERS, ...allDjs];
    const dj = fullDjList.find(d => d.id === djCharacterId);

    if (!dj) {
        return { error: "Personnage DJ non trouvé." };
    }

    if (track.type === 'message') {
        let messageContent = track.content;
        if (!messageContent || !messageContent.trim()) {
            return { error: 'Le contenu du message est vide.' };
        }
        
        try {
            const { audioBase64 } = ('isCustom' in dj && dj.isCustom && dj.voice)
                ? await generateCustomDjAudio({ message: messageContent, voice: dj.voice })
                : await generateDjAudio({ message: messageContent, characterId: dj.id });

            if (!audioBase64) {
                throw new Error("La génération audio n'a retourné aucune donnée.");
            }

            return { audioUrl: `data:audio/wav;base64,${audioBase64}` };
        } catch (err: any) {
            console.error("Erreur de génération vocale IA:", err);
            return { error: `La génération de la voix IA a échoué: ${err.message}` };
        }
    } else { // music
        try {
            // If track already has a Plex URL (from playlist generation), use it directly
            if (track.url && track.url.includes(PLEX_SERVER_URL || 'plex')) {
                console.log(`🎵 Utilisation URL Plex existante: ${track.title} par ${track.artist}`);
                return { audioUrl: track.url };
            }
            
            // Otherwise search Plex by content or title
            const searchTerm = track.content || track.title || 'random music';
            console.log(`🎵 Recherche Plex pour "${searchTerm}"`);
            
            const searchResults = await searchPlexMusic(searchTerm, 3);
            if (searchResults.length > 0) {
                const plexTrack = searchResults[0];
                console.log(`✅ Piste Plex trouvée: ${plexTrack.title} par ${plexTrack.artist}`);
                return { audioUrl: plexTrack.url };
            }

            // Fallback: get random track from Plex music library
            console.log(`🎲 Aucune correspondance exacte, piste aléatoire du répertoire musique.`);
            const randomTracks = await getRandomPlexTracks(undefined, 1);
            if (randomTracks.length > 0) {
                const randomTrack = randomTracks[0];
                console.log(`✅ Piste Plex aléatoire: ${randomTrack.title} par ${randomTrack.artist}`);
                return { audioUrl: randomTrack.url };
            }
            
            return { error: `Aucune musique disponible dans le répertoire Plex.` };
            
        } catch (plexError: any) {
            console.error('❌ Erreur de connexion à Plex:', plexError);
            return { error: `Erreur de connexion à Plex: ${plexError.message}` };
        }
    }
}

/**
 * Updates a station with new data
 */
export async function updateStation(stationId: string, updates: Partial<Station>): Promise<Station | null> {
    try {
        const stationRef = doc(db, 'stations', stationId);
        const stationDoc = await getDoc(stationRef);
        
        if (!stationDoc.exists()) {
            return null;
        }

        // Filter out invalid fields for Firestore update
        const validUpdates = Object.fromEntries(
            Object.entries(updates).filter(([key, value]) => 
                key !== 'id' && value !== undefined
            )
        );

        await updateDoc(stationRef, validUpdates);
        
        revalidatePath(`/admin/stations/${stationId}`);
        revalidatePath('/admin/stations');
        revalidatePath('/');
        
        return await getStationById(stationId);
    } catch (error) {
        console.error('Error updating station:', error);
        throw error;
    }
}

/**
 * Deletes a playlist item from a station
 */
export async function deletePlaylistItem(stationId: string, trackId: string): Promise<Station | null> {
    try {
        const station = await getStationById(stationId);
        if (!station) {
            return null;
        }

        const updatedPlaylist = station.playlist.filter(track => track.id !== trackId);
        const stationRef = doc(db, 'stations', stationId);
        
        await updateDoc(stationRef, { playlist: updatedPlaylist });
        
        revalidatePath(`/admin/stations/${stationId}`);
        revalidatePath('/admin/stations');
        revalidatePath('/');
        
        return await getStationById(stationId);
    } catch (error) {
        console.error('Error deleting playlist item:', error);
        throw error;
    }
}

/**
 * Reorders playlist items according to new order
 */
export async function reorderPlaylistItems(stationId: string, newOrder: string[]): Promise<Station | null> {
    try {
        const station = await getStationById(stationId);
        if (!station) {
            return null;
        }

        // Create a map for quick lookup
        const trackMap = new Map(station.playlist.map(track => [track.id, track]));
        
        // Reorder according to newOrder array
        const reorderedPlaylist = newOrder
            .map(trackId => trackMap.get(trackId))
            .filter(track => track !== undefined) as PlaylistItem[];

        // Add any tracks that weren't in the newOrder array (safety measure)
        const orderedIds = new Set(newOrder);
        const remainingTracks = station.playlist.filter(track => !orderedIds.has(track.id));
        const finalPlaylist = [...reorderedPlaylist, ...remainingTracks];

        const stationRef = doc(db, 'stations', stationId);
        await updateDoc(stationRef, { playlist: finalPlaylist });
        
        revalidatePath(`/admin/stations/${stationId}`);
        revalidatePath('/admin/stations');
        revalidatePath('/');
        
        return await getStationById(stationId);
    } catch (error) {
        console.error('Error reordering playlist:', error);
        throw error;
    }
}

/**
 * Adds multiple playlist items to a station
 */
export async function addPlaylistItems(stationId: string, tracks: Omit<PlaylistItem, 'id'>[]): Promise<Station | null> {
    try {
        const station = await getStationById(stationId);
        if (!station) {
            return null;
        }

        // Generate IDs and add timestamps for new tracks
        const newTracks: PlaylistItem[] = tracks.map((track, index) => ({
            ...track,
            id: `${Date.now()}-${index}`,
            addedAt: safeToISOString(new Date())
        }));

        const updatedPlaylist = [...station.playlist, ...newTracks];
        const stationRef = doc(db, 'stations', stationId);
        
        await updateDoc(stationRef, { playlist: updatedPlaylist });
        
        revalidatePath(`/admin/stations/${stationId}`);
        revalidatePath('/admin/stations');
        revalidatePath('/');
        
        return await getStationById(stationId);
    } catch (error) {
        console.error('Error adding playlist items:', error);
        throw error;
    }
}

// Note: Re-exports moved to separate non-server file to comply with "use server" requirements
// Advanced station management functions are available in @/actions/stations/mutations
