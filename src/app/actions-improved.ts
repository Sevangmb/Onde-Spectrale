
// src/app/actions-improved.ts - Fonctions améliorées à ajouter aux actions existantes

'use server';

import type { PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';
import { generateDjAudio } from '@/ai/flows/generate-dj-audio';
import { generateCustomDjAudio } from '@/ai/flows/generate-custom-dj-audio';
import { getCustomCharactersForUser } from './actions';
import { DJ_CHARACTERS } from '@/lib/data';


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
      
    console.log(`Archive.org: ${results.length} pistes trouvées pour "${searchTerm}"`);
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
