
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

/**
 * Obtient les URLs thématiques pour la musique selon le thème de la station
 */
function getThemedMusicUrls(stationTheme: string, searchTerm: string): string[] {
  const themedUrls = {
    'post-apocalyptic': {
      'jazz': [
        'https://freesound.org/data/previews/316/316847_5123451-lq.mp3', // Vintage jazz
        'https://freesound.org/data/previews/341/341695_5858296-lq.mp3'  // Atmospheric
      ],
      'classical': [
        'https://freesound.org/data/previews/376/376968_7037445-lq.mp3', // Orchestral
        'https://freesound.org/data/previews/317/317828_5123451-lq.mp3'  // Classical
      ],
      'ambient': [
        'https://freesound.org/data/previews/235/235777_4062622-lq.mp3', // Dark ambient
        'https://freesound.org/data/previews/341/341695_5858296-lq.mp3'  // Atmospheric
      ]
    },
    'pre-war-music': {
      'jazz': [
        'https://freesound.org/data/previews/316/316847_5123451-lq.mp3', // Jazz standards
        'https://freesound.org/data/previews/341/341695_5858296-lq.mp3'  // Swing
      ],
      'classical': [
        'https://freesound.org/data/previews/376/376968_7037445-lq.mp3', // Classical piano
        'https://freesound.org/data/previews/317/317828_5123451-lq.mp3'  // Orchestra
      ]
    },
    'propaganda': {
      'march': [
        'https://freesound.org/data/previews/376/376968_7037445-lq.mp3', // Military march
        'https://freesound.org/data/previews/317/317828_5123451-lq.mp3'  // Patriotic
      ],
      'orchestral': [
        'https://freesound.org/data/previews/376/376968_7037445-lq.mp3', // Full orchestra
        'https://freesound.org/data/previews/316/316847_5123451-lq.mp3'  // Brass band
      ]
    },
    'classical': {
      'classical': [
        'https://freesound.org/data/previews/376/376968_7037445-lq.mp3', // Symphony
        'https://freesound.org/data/previews/317/317828_5123451-lq.mp3'  // Chamber music
      ],
      'piano': [
        'https://freesound.org/data/previews/376/376968_7037445-lq.mp3', // Piano solo
        'https://freesound.org/data/previews/316/316847_5123451-lq.mp3'  // Piano classical
      ]
    }
  };

  const theme = themedUrls[stationTheme as keyof typeof themedUrls];
  if (theme) {
    for (const [genre, urls] of Object.entries(theme)) {
      if (searchTerm.toLowerCase().includes(genre)) {
        return urls;
      }
    }
  }

  // Fallback vers l'ancienne fonction si pas de thème spécifique
  return getFallbackMusicUrls(searchTerm);
}

/**
 * URLs de fallback pour les pistes musicales de test (ancienne version)
 */
function getFallbackMusicUrls(searchTerm: string): string[] {
  // URLs plus fiables de sources audio libres
  const fallbackMusic = {
    'jazz': [
      'https://freesound.org/data/previews/316/316847_5123451-lq.mp3',
      'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvW=='
    ],
    'classical': [
      'https://freesound.org/data/previews/376/376968_7037445-lq.mp3',
      'https://freesound.org/data/previews/317/317828_5123451-lq.mp3',
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvW=='
    ],
    'rock': [
      'https://freesound.org/data/previews/317/317828_5123451-lq.mp3',
      'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvW=='
    ],
    'ambient': [
      'https://freesound.org/data/previews/235/235777_4062622-lq.mp3',
      'https://freesound.org/data/previews/316/316847_5123451-lq.mp3',
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvW=='
    ],
    'electronic': [
      'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
      'https://freesound.org/data/previews/235/235777_4062622-lq.mp3',
      'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvW=='
    ]
  };

  // Correspondance basique par mot-clé
  for (const [genre, urls] of Object.entries(fallbackMusic)) {
    if (searchTerm.toLowerCase().includes(genre)) {
      return urls;
    }
  }

  // Fallback général - URLs d'échantillons audio génériques mais fonctionnels
  return [
    'https://archive.org/download/test_202405/Generic_Audio_Sample.mp3',
    'https://freesound.org/data/previews/316/316738_5123451-lq.mp3',
    'https://archive.org/download/royalty-free-music-samples/Neutral_Background.mp3',
    'https://freesound.org/data/previews/268/268763_4062622-lq.mp3'
  ];
}


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
        url: 'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
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
      url: 'https://freesound.org/data/previews/316/316847_5123451-lq.mp3',
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
      url: 'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
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
      url: 'https://freesound.org/data/previews/316/316847_5123451-lq.mp3',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-3`,
      type: 'message',
      title: 'Bulletin Info',
      content: `Flash info ! Une caravane de marchands a été aperçue près du Vault 101. Ils échangent des capsules contre de l'eau purifiée et des stimpaks. Méfiez-vous tout de même des raiders dans le secteur.`,
      artist: dj.name,
      duration: 10,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-4`,
      type: 'music',
      title: 'Star Wars Theme',
      content: 'classical',
      artist: 'Orchestre Pré-Guerre',
      duration: 30,
      url: 'https://freesound.org/data/previews/376/376968_7037445-lq.mp3',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-5`,
      type: 'message',
      title: 'Météo des Terres Désolées',
      content: `Prévisions météo : tempête de sable radioactive prévue ce soir. Niveau de radiation : modéré à élevé. Portez vos masques à gaz et évitez les sorties non essentielles. La température chutera à moins 10 degrés.`,
      artist: dj.name,
      duration: 15,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-6`,
      type: 'music',
      title: 'Test Audio MP3',
      content: 'electronic',
      artist: 'Archive.org Test',
      duration: 30,
      url: 'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-7`,
      type: 'message',
      title: 'Conseil de Survie',
      content: `Conseil de survie du jour : Les goules ferales sont plus actives la nuit. Si vous entendez des grognements, ne courez pas ! Marchez lentement et évitez le contact visuel. Gardez vos armes à portée de main.`,
      artist: dj.name,
      duration: 18,
      url: '',
      addedAt: new Date().toISOString()
    },
    {
      id: `${Date.now()}-8`,
      type: 'message',
      title: 'Merci d\'écoute',
      content: `Merci d'écouter ${name} ! C'était ${dj.name}. À bientôt !`,
      artist: dj.name,
      duration: 5,
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
        const results = await searchMusicAdvanced(searchTerm, 8);
        return { data: results };
    } catch (error: any) {
        console.error("La recherche musicale a échoué:", error);
        return { error: error.message || "Unknown search error" };
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
            const silentAudio = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvmMaBDbQ2e3FdTgFK3nW9c2FQAUUWeHlvmsgCjGC1vHPgCwFJHfH8N2QQAoUXrTp66hVFApGn+PyvW==';
            
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
        
        // UNIQUEMENT PLEX - Piste aléatoire
        try {
            console.log(`🎵 Récupération d'une piste aléatoire sur Plex`);
            
            const randomTracks = await getRandomPlexTracks(undefined, 1);
            
            if (randomTracks.length > 0) {
                const randomTrack = randomTracks[0];
                console.log(`✅ Piste Plex aléatoire: ${randomTrack.title} par ${randomTrack.artist}`);
                return { audioUrl: randomTrack.url };
            }
            
        } catch (plexError) {
            console.error('❌ Plex non disponible:', plexError);
            return { error: 'Serveur Plex non disponible - Vérifiez la connexion' };
        }
        
        return { error: 'Aucune musique trouvée sur Plex' };
    }
}
