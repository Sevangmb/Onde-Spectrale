'use server';

import { revalidatePath } from 'next/cache';
import { stations, DJ_CHARACTERS, MOCK_MUSIC_SEARCH_RESULTS } from '@/lib/data';
import type { Station, PlaylistItem } from '@/lib/types';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { z } from 'zod';
import { auth } from '@/lib/firebase';
import { headers } from 'next/headers';

const CreateStationSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères.'),
  frequency: z.number(),
  djCharacterId: z.string(),
});

export async function getStation(frequency: number): Promise<Station | null> {
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  const station = stations.find(s => s.frequency === frequency);
  return station || null;
}

export async function getInterference(frequency: number): Promise<string> {
    const station = stations.find(s => s.frequency === frequency);
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
  // In a real app, you'd verify the token here.
  // For now, we'll just check for its existence.
  // We'll also need the user's UID. Let's assume we can get it.
  // This is a placeholder for actual token verification and UID extraction.
  const MOCK_USER_ID = "mock-user-id-from-token"; 

  const validatedFields = CreateStationSchema.safeParse({
    name: formData.get('name'),
    frequency: parseFloat(formData.get('frequency') as string),
    djCharacterId: formData.get('djCharacterId'),
  });

  if (!validatedFields.success) {
    return {
      error: validatedFields.error.flatten().fieldErrors,
    };
  }
  
  const { name, frequency, djCharacterId } = validatedFields.data;

  if (stations.some(s => s.frequency === frequency)) {
    return { error: { general: 'Cette fréquence est déjà occupée.' } };
  }

  const newStation: Station = {
    id: `station-${Date.now()}`,
    name,
    frequency,
    djCharacterId,
    ownerId: MOCK_USER_ID,
    playlist: [],
    createdAt: new Date().toISOString(),
  };

  stations.push(newStation);
  revalidatePath('/');
  return { success: true, station: newStation };
}

export async function addMessageToStation(stationId: string, message: string) {
    const station = stations.find(s => s.id === stationId);
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
            duration: 15, // Mock duration
        };

        station.playlist.push(newPlaylistItem);
        revalidatePath('/');
        return { success: true, playlistItem: newPlaylistItem };

    } catch (e) {
        return { error: "Erreur lors de la génération de l'audio."}
    }
}

export async function searchMusic(query: string) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
    return MOCK_MUSIC_SEARCH_RESULTS;
}

export async function addMusicToStation(stationId: string, musicId: string) {
    const station = stations.find(s => s.id === stationId);
    if (!station) {
        return { error: "Station non trouvée." };
    }

    const musicTrack = MOCK_MUSIC_SEARCH_RESULTS.find(m => m.id === musicId);
    if (!musicTrack) {
        return { error: "Musique non trouvée." };
    }

    station.playlist.push(musicTrack);
    revalidatePath('/');
    return { success: true, playlistItem: musicTrack };
}
