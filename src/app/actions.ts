'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter, DJCharacter } from '@/lib/types';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { z } from 'zod';
import { db, storage, ref, getDownloadURL } from '@/lib/firebase';
import { uploadBytesResumable } from 'firebase/storage';
import { DJ_CHARACTERS } from '@/lib/data';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp, Timestamp } from 'firebase/firestore';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { generatePlaylist, type GeneratePlaylistInput } from '@/ai/flows/generate-playlist-flow';
import { searchPlexMusic, getRandomPlexTracks } from '@/lib/plex';

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

export async function createDefaultStations(): Promise<void> {
  const stations = [
    {
      frequency: 100.7,
      name: 'Radio Wasteland',
      djId: 'three-dog',
      theme: 'post-apocalyptic'
    },
    {
      frequency: 94.5,
      name: 'Diamond City Radio',
      djId: 'travis',
      theme: 'pre-war-music'
    },
    {
      frequency: 102.1,
      name: 'Enclave Radio',
      djId: 'john-henry-eden',
      theme: 'propaganda'
    },
    {
      frequency: 98.2,
      name: 'Classical Radio',
      djId: 'classical-dj',
      theme: 'classical'
    }
  ];

  for (const stationConfig of stations) {
    try {
      // Vérifier si existe déjà
      const existing = await getStationForFrequency(stationConfig.frequency);
      if (existing) continue;

      const dj = DJ_CHARACTERS.find(d => d.id === stationConfig.djId) || DJ_CHARACTERS[0];
      
      const playlist = createPlaylistForTheme(stationConfig.theme, stationConfig.name, dj);
      
      const stationData = {
        name: stationConfig.name,
        frequency: stationConfig.frequency,
        djCharacterId: dj.id,
        theme: stationConfig.theme,
        ownerId: 'system',
        playlist: playlist,
        createdAt: serverTimestamp(),
      };
      
      await addDoc(collection(db, 'stations'), stationData);
      console.log(`✅ Station créée: ${stationConfig.name} (${stationConfig.frequency})`);
      
    } catch (error) {
      console.error(`Erreur création station ${stationConfig.name}:`, error);
    }
  }
}

function createPlaylistForTheme(theme: string, stationName: string, dj: any): PlaylistItem[] {
  const baseId = Date.now();
  
  if (theme === 'classical') {
    return [
      {
        id: `${baseId}-1`,
        type: 'message',
        title: 'Ouverture Classique',
        content: `Bonsoir, ici ${dj.name} sur ${stationName}. Voici les plus belles œuvres d'avant-guerre.`,
        artist: dj.name,
        duration: 8,
        url: '',
        addedAt: new Date().toISOString()
      },
      {
        id: `${baseId}-2`,
        type: 'music',
        title: 'Musique Classique',
        content: 'classical piano symphony',
        artist: 'À découvrir',
        duration: 180,
        url: '',
        addedAt: new Date().toISOString()
      },
      {
        id: `${baseId}-3`,
        type: 'music',
        title: 'Orchestre Symphonique',
        content: 'orchestra symphony classical',
        artist: 'À découvrir',
        duration: 200,
        url: '',
        addedAt: new Date().toISOString()
      }
    ];
  }

  if (theme === 'propaganda') {
    return [
      {
        id: `${baseId}-1`,
        type: 'message',
        title: 'Message Enclave',
        content: `Citoyens américains, ici votre président ${dj.name}. L'Enclave veille sur vous.`,
        artist: dj.name,
        duration: 8,
        url: '',
        addedAt: new Date().toISOString()
      },
      {
        id: `${baseId}-2`,
        type: 'music',
        title: 'Marche Patriotique',
        content: 'patriotic',
        artist: 'Enclave Band',
        duration: 30,
        url: '',
        addedAt: new Date().toISOString()
      }
    ];
  }

  // Station par défaut (Wasteland/Diamond City)
  const vintageJazzTracks = [
    { title: "Moonlight Serenade", artist: "Glenn Miller Orchestra" },
    { title: "Take Five", artist: "Dave Brubeck" },
    { title: "Summertime", artist: "Ella Fitzgerald" },
    { title: "In the Mood", artist: "Glenn Miller" },
    { title: "Sing Sing Sing", artist: "Benny Goodman" }
  ];
  
  const randomTrack = vintageJazzTracks[Math.floor(Math.random() * vintageJazzTracks.length)];
  
  return [
    {
      id: `${baseId}-1`,
      type: 'message',
      title: 'Ouverture Radio',
      content: `Salut les survivants ! Ici ${dj.name} sur ${stationName}. Bienvenue dans les terres désolées ! On commence avec du jazz d'avant-guerre.`,
      artist: dj.name,
      duration: 8,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${baseId}-2`,
      type: 'music',
      title: randomTrack.title,
      content: 'jazz',
      artist: randomTrack.artist,
      duration: 45,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${baseId}-3`,
      type: 'message',
      title: 'Info du jour',
      content: `Flash info ! Des raiders ont été aperçus près du Vault 101. Ils semblent chercher de vieux disques de jazz. Coïncidence ? Je ne pense pas...`,
      artist: dj.name,
      duration: 8,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${baseId}-4`,
      type: 'music',
      title: 'Blue Suede Shoes',
      content: 'rockabilly',
      artist: 'Carl Perkins',
      duration: 40,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${baseId}-5`,
      type: 'message',
      title: 'Message de fin',
      content: `C'était ${dj.name} sur ${stationName}. On se retrouve bientôt avec plus de classiques d'avant-guerre. Restez à l'écoute !`,
      artist: dj.name,
      duration: 6,
      url: '',
      addedAt: new Date().toISOString()
    }
  ];
}

export async function createDefaultStation(): Promise<Station | null> {
  try {
    const frequency = 100.7;
    
    // Vérifier si la station par défaut existe déjà
    const existing = await getStationForFrequency(frequency);
    if (existing) return existing;
    
    // Créer toutes les stations par défaut
    await createDefaultStations();
    
    // Retourner la station principale
    return await getStationForFrequency(frequency);
    
  } catch (error) {
    console.error('Erreur création station par défaut:', error);
    return null;
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
    const q = query(stationsCol, where('ownerId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(serializeStation);
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

  // TEMPORAIRE: Créer une playlist statique pour éviter les problèmes d'IA
  const playlistWithIds: PlaylistItem[] = [
    {
      id: `${Date.now()}-0`,
      type: 'message',
      title: 'Message de bienvenue',
      content: `Bonjour et bienvenue sur ${name}. Je suis ${dj.name}, votre DJ post-apocalyptique. Nous diffusons de la musique sur le thème ${theme} pour tous les survivants des terres désolées.`,
      artist: dj.name,
      duration: 10,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-1`,
      type: 'message',
      title: 'Ouverture de Station',
      content: `Salut les survivants ! Ici ${dj.name} sur ${name}. Bienvenue dans les terres désolées radioactives ! On va vous faire passer un bon moment avec de la musique d'avant-guerre et les dernières nouvelles de l'apocalypse.`,
      artist: dj.name,
      duration: 12,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-2`,
      type: 'music',
      title: 'Cantina Band',
      content: 'jazz',
      artist: 'Pre-War Classics',
      duration: 30,
      url: '',
      addedAt: new Date().toISOString()
    }
  ];


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
      return { error: "Search term is empty" };
    }

    try {
        // Use Plex search only
        const results = await searchPlexMusic(searchTerm, 8);
        
        if (results.length === 0) {
            return { error: "Aucune musique trouvée dans votre bibliothèque Plex" };
        }

        // Convert Plex results to PlaylistItem format
        const playlistItems: PlaylistItem[] = results.map(track => ({
            id: `plex-${Date.now()}-${Math.random()}`,
            type: 'music',
            title: track.title,
            content: searchTerm,
            artist: track.artist,
            duration: track.duration || 180,
            url: track.url,
            addedAt: new Date().toISOString()
        }));

        return { data: playlistItems };
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
      addedAt: new Date().toISOString(),
    }

    await updateDoc(stationRef, {
        playlist: arrayUnion(newTrack)
    });
    
    revalidatePath(`/admin/stations/${stationId}`);
    return { success: true, playlistItem: newTrack };
}

export async function regenerateStationPlaylist(stationId: string): Promise<{ success: true } | { error: string }> {
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

    // Créer une nouvelle playlist avec contenu
    const newPlaylist: PlaylistItem[] = [
        {
            id: `${Date.now()}-0`,
            type: 'message',
            title: 'Message de bienvenue',
            content: `Bonjour et bienvenue sur ${station.name}. Je suis ${dj.name}, votre DJ. Nous diffusons de la musique sur le thème ${station.theme}.`,
            artist: dj.name,
            duration: 8,
            url: '',
            addedAt: new Date().toISOString()
        },
        {
            id: `${Date.now()}-1`,
            type: 'music',
            title: 'Première chanson',
            content: 'jazz',
            artist: 'Artiste Inconnu',
            duration: 180,
            url: '',
            addedAt: new Date().toISOString()
        },
        {
            id: `${Date.now()}-2`,
            type: 'message',
            title: 'Transition musicale',
            content: `Voici une belle chanson pour accompagner votre écoute sur ${station.name}. Restez à l'écoute !`,
            artist: dj.name,
            duration: 5,
            url: '',
            addedAt: new Date().toISOString()
        },
        {
            id: `${Date.now()}-3`,
            type: 'music',
            title: 'Deuxième chanson',
            content: 'classical',
            artist: 'Artiste Inconnu',
            duration: 200,
            url: '',
            addedAt: new Date().toISOString()
        }
    ];

    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, { playlist: newPlaylist });

    revalidatePath(`/admin/stations/${stationId}`);
    revalidatePath('/admin/stations');
    
    return { success: true };
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

export async function getAudioForTrack(track: PlaylistItem, djCharacterId: string, ownerId: string, stationTheme?: string): Promise<{ audioUrl?: string; error?: string }> {
    if (!track) {
      return { error: "Piste non fournie." };
    }

    // Gérer l'utilisateur anonyme
    const allDjs = ownerId && ownerId !== 'anonymous' ? await getCustomCharactersForUser(ownerId) : [];
    const fullDjList: (DJCharacter | CustomDJCharacter)[] = [...DJ_CHARACTERS, ...allDjs];
    const dj = fullDjList.find(d => d.id === djCharacterId);
    
    if (!dj) {
        return { error: "Personnage DJ non trouvé." };
    }

    if (track.type === 'message') {
        // Fallback pour les anciens messages sans content
        let messageContent = track.content;
        if (!messageContent || messageContent.trim() === '') {
            messageContent = track.title || 'Message du DJ';
        }
        
        if (!messageContent || messageContent.trim() === '') {
             return { error: 'Aucun contenu de message disponible.' };
        }
        
        // TEMPORAIRE: Désactiver la génération IA pour diagnostiquer
        console.log(`Message DJ: "${track.content}" par ${dj.name}`);
        
        // Créer un audio silencieux temporaire ou utiliser TTS du navigateur
        try {
            // Fallback: utiliser TTS du navigateur côté client
            return { audioUrl: `tts:${encodeURIComponent(messageContent)}` };
            
        } catch(err: any) {
            console.error("Erreur de génération vocale IA:", err);
            return { error: `La génération de la voix IA a échoué: ${err.message}` };
        }
    } else { // music
        if (!track.content) {
            return { error: 'Terme de recherche musical vide.' };
        }
        
        // Essayer l'URL existante d'abord si elle existe
        if (track.url) {
            try {
                const response = await fetch(track.url, { method: 'HEAD', signal: AbortSignal.timeout(2000) });
                if (response.ok && response.headers.get('content-type')?.includes('audio')) {
                    return { audioUrl: track.url };
                }
            } catch (err) {
                console.warn(`URL existante invalide pour ${track.title}:`, err);
            }
        }
        
        // PLEX - Recherche dans le répertoire musique
        try {
            console.log(`🎵 Recherche Plex pour "${track.content}"`);
            
            // D'abord essayer de chercher spécifiquement
            const searchResults = await searchPlexMusic(track.content, 3);
            
            if (searchResults.length > 0) {
                const plexTrack = searchResults[0];
                console.log(`✅ Piste Plex trouvée: ${plexTrack.title} par ${plexTrack.artist}`);
                return { audioUrl: plexTrack.url };
            }
            
            // Fallback: essayer avec le titre de la piste
            if (track.title && track.title !== track.content) {
                const titleResults = await searchPlexMusic(track.title, 1);
                if (titleResults.length > 0) {
                    const plexTrack = titleResults[0];
                    console.log(`✅ Piste Plex trouvée par titre: ${plexTrack.title} par ${plexTrack.artist}`);
                    return { audioUrl: plexTrack.url };
                }
            }
            
            // Dernier recours: une piste aléatoire du même genre
            console.log(`🎲 Aucune correspondance exacte, piste aléatoire du thème "${stationTheme}"`);
            const randomTracks = await getRandomPlexTracks(undefined, 1);
            
            if (randomTracks.length > 0) {
                const randomTrack = randomTracks[0];
                console.log(`✅ Piste Plex aléatoire: ${randomTrack.title} par ${randomTrack.artist}`);
                return { audioUrl: randomTrack.url };
            }
            
        } catch (plexError) {
            console.error('❌ Plex non disponible:', plexError);
        }
        
        // FALLBACK TEMPORAIRE: Mode démo sans audio réel
        console.log('🔄 Mode démo - Interface fonctionnelle sans audio Plex');
        
        // Retourner une indication que c'est en mode démo
        return { 
            error: `Mode démo - Plex non configuré. Interface fonctionnelle pour tester les thèmes.`
        };
    }
}