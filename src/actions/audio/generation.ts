'use server';

import { DJ_CHARACTERS } from '@/lib/data';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { searchPlexMusic, getRandomPlexTracks } from '@/lib/plex';
import { getCustomCharactersForUser } from '../users/queries';
import type { PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';

const PLEX_SERVER_URL = process.env.PLEX_SERVER_URL || '';

export async function getAudioForTrack(
  track: PlaylistItem, 
  djCharacterId: string, 
  ownerId: string, 
  stationTheme?: string
): Promise<{ audioUrl?: string; error?: string }> {
  if (!track) {
    return { error: "Piste non fournie." };
  }

  const allDjs = ownerId && ownerId !== 'anonymous' 
    ? await getCustomCharactersForUser(ownerId) 
    : [];
  const fullDjList: (DJCharacter | CustomDJCharacter)[] = [...DJ_CHARACTERS, ...allDjs];
  const dj = fullDjList.find(d => d.id === djCharacterId);

  if (!dj) {
    return { error: "Personnage DJ non trouvé." };
  }

  if (track.type === 'message') {
    return await generateMessageAudio(track, dj);
  } else {
    return await getMusicAudio(track);
  }
}

async function generateMessageAudio(
  track: PlaylistItem, 
  dj: DJCharacter | CustomDJCharacter
): Promise<{ audioUrl?: string; error?: string }> {
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
}

async function getMusicAudio(track: PlaylistItem): Promise<{ audioUrl?: string; error?: string }> {
  try {
    // If track already has a Plex URL, use it directly
    if (track.url && track.url.includes(PLEX_SERVER_URL || 'plex')) {
      console.log(`🎵 Using existing Plex URL: ${track.title} by ${track.artist}`);
      return { audioUrl: track.url };
    }
    
    // Search Plex by content or title
    const searchTerm = track.content || track.title || 'random music';
    console.log(`🎵 Searching Plex for "${searchTerm}"`);
    
    const searchResults = await searchPlexMusic(searchTerm, 3);
    if (searchResults.length > 0) {
      const plexTrack = searchResults[0];
      console.log(`✅ Found Plex track: ${plexTrack.title} by ${plexTrack.artist}`);
      return { audioUrl: plexTrack.url };
    }

    // Fallback: get random track from Plex music library
    console.log(`🎲 No exact match, getting random track from music library.`);
    const randomTracks = await getRandomPlexTracks(undefined, 1);
    if (randomTracks.length > 0) {
      const randomTrack = randomTracks[0];
      console.log(`✅ Random Plex track: ${randomTrack.title} by ${randomTrack.artist}`);
      return { audioUrl: randomTrack.url };
    }
    
    return { error: `No music available in Plex library.` };
    
  } catch (plexError: any) {
    console.error('❌ Plex connection error:', plexError);
    return { error: `Plex connection error: ${plexError.message}` };
  }
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

export async function previewCustomDjAudio(input: { message: string, voice: any }): Promise<{ audioBase64?: string; error?: string }> {
  try {
    const result = await generateCustomDjAudio(input);
    return { audioBase64: result.audioBase64 };
  } catch (e: any) {
    return { error: e.message || 'Unknown error during audio generation.' };
  }
}