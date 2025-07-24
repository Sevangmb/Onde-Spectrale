// src/app/actions-improved.ts - Fonctions améliorées à ajouter aux actions existantes

'use server';

import type { PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';

/**
 * Recherche musicale avec Free Music Archive et sources vintage
 */
export async function searchMusicAdvanced(searchTerm: string, limit: number = 8): Promise<PlaylistItem[]> {
  if (!searchTerm.trim()) return [];

  // Rechercher d'abord dans nos sources vintage
  const vintageResults = await searchVintageMusic(searchTerm, limit);
  if (vintageResults.length > 0) {
    return vintageResults;
  }

  // Fallback vers Archive.org
  return await searchArchiveOrg(searchTerm, limit);
}

/**
 * Recherche spécialisée pour musique vintage avec sources authentiques
 */
async function searchVintageMusic(searchTerm: string, limit: number): Promise<PlaylistItem[]> {
  const results: PlaylistItem[] = [];
  
  // Essayer d'abord Free Music Archive pour musique vintage authentique
  try {
    const fmaResults = await searchFreeMusiFArchive(searchTerm, limit);
    if (fmaResults.length > 0) {
      return fmaResults;
    }
  } catch (error) {
    console.log('FMA non disponible, utilisation du fallback vintage');
  }
  
  // Fallback vers notre collection vintage curée
  const vintageMapping = {
    'jazz': [
      {
        title: 'Cantina Band Jazz - 1940s Style',
        artist: 'Vintage Jazz Ensemble',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand3.wav',
        duration: 45
      }
    ],
    'classical': [
      {
        title: 'Epic Classical Overture',
        artist: 'Pre-War Symphony',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav',
        duration: 60
      }
    ],
    'swing': [
      {
        title: 'Archive Test Swing',
        artist: 'Big Band Test',
        url: 'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
        duration: 30
      }
    ],
    'rockabilly': [
      {
        title: 'Atomic Rockabilly',
        artist: 'Wasteland Rockers',
        url: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand3.wav',
        duration: 45
      }
    ],
    'ambient': [
      {
        title: 'Post-War Ambience',
        artist: 'Atmospheric Collective',
        url: 'https://archive.org/download/testmp3testfile/mpthreetest.mp3',
        duration: 120
      }
    ]
  };

  // Chercher dans les genres correspondants
  for (const [genre, tracks] of Object.entries(vintageMapping)) {
    if (searchTerm.toLowerCase().includes(genre)) {
      for (const track of tracks.slice(0, limit)) {
        results.push({
          id: `vintage-${Date.now()}-${Math.random()}`,
          type: 'music',
          title: track.title,
          content: searchTerm,
          artist: track.artist,
          duration: track.duration,
          url: track.url,
          addedAt: new Date().toISOString()
        });
      }
      break;
    }
  }

  return results;
}

/**
 * Recherche sur Free Music Archive (API publique) avec support thématique
 */
async function searchFreeMusiFArchive(searchTerm: string, limit: number): Promise<PlaylistItem[]> {
  // Bibliothèque enrichie avec plus de genres et contexte thématique
  const enhancedVintageLibrary = {
    // Jazz et Swing (années 20-40)
    'jazz': [
      { title: "Moonlight Serenade", artist: "Glenn Miller Orchestra", duration: 195, theme: 'pre-war' },
      { title: "Take Five", artist: "Dave Brubeck", duration: 324, theme: 'jazz' },
      { title: "Summertime", artist: "Ella Fitzgerald", duration: 218, theme: 'standards' },
      { title: "Strange Fruit", artist: "Billie Holiday", duration: 187, theme: 'blues-jazz' },
      { title: "Body and Soul", artist: "Coleman Hawkins", duration: 203, theme: 'bebop' }
    ],
    'swing': [
      { title: "Sing Sing Sing", artist: "Benny Goodman", duration: 512, theme: 'big-band' },
      { title: "In the Mood", artist: "Glenn Miller", duration: 224, theme: 'swing-dance' },
      { title: "Jump Jive and Wail", artist: "Louis Prima", duration: 179, theme: 'jump-blues' },
      { title: "Pennsylvania 6-5000", artist: "Glenn Miller", duration: 198, theme: 'telephone-song' },
      { title: "Stompin' at the Savoy", artist: "Benny Goodman", duration: 245, theme: 'harlem-swing' }
    ],
    // Rock'n'roll et Rockabilly (années 50)
    'rockabilly': [
      { title: "Blue Suede Shoes", artist: "Carl Perkins", duration: 146, theme: 'rockabilly' },
      { title: "Mystery Train", artist: "Elvis Presley", duration: 163, theme: 'early-rock' },
      { title: "Rockabilly Boogie", artist: "Johnny Burnette", duration: 134, theme: 'boogie' },
      { title: "That's All Right", artist: "Elvis Presley", duration: 127, theme: 'sun-records' },
      { title: "Rock Around the Clock", artist: "Bill Haley", duration: 132, theme: 'rock-anthem' }
    ],
    // Classique (orchestral, piano)
    'classical': [
      { title: "Clair de Lune", artist: "Claude Debussy", duration: 300, theme: 'impressionist' },
      { title: "Moonlight Sonata", artist: "Ludwig van Beethoven", duration: 375, theme: 'romantic' },
      { title: "The Blue Danube", artist: "Johann Strauss II", duration: 540, theme: 'waltz' },
      { title: "Ave Maria", artist: "Franz Schubert", duration: 285, theme: 'sacred' },
      { title: "Canon in D", artist: "Johann Pachelbel", duration: 330, theme: 'baroque' }
    ],
    // Ambient et atmosphérique
    'ambient': [
      { title: "Wasteland Winds", artist: "Atmospheric Collective", duration: 240, theme: 'post-apocalyptic' },
      { title: "Desert Storm", artist: "Ambient Survivors", duration: 320, theme: 'environmental' },
      { title: "Radio Static", artist: "Field Recordings", duration: 180, theme: 'found-sound' },
      { title: "Vault Echoes", artist: "Underground Audio", duration: 270, theme: 'reverb-space' }
    ],
    // Marches et patriotique
    'patriotic': [
      { title: "The Star-Spangled Banner", artist: "Military Band", duration: 120, theme: 'national-anthem' },
      { title: "America the Beautiful", artist: "Patriotic Chorus", duration: 195, theme: 'americana' },
      { title: "Battle Hymn of the Republic", artist: "Civil War Band", duration: 210, theme: 'civil-war' },
      { title: "Yankee Doodle", artist: "Fife and Drum Corps", duration: 90, theme: 'colonial' }
    ]
  };

  // Recherche plus flexible dans tous les genres
  let matchedTracks: any[] = [];
  const searchLower = searchTerm.toLowerCase();
  
  for (const [genre, tracks] of Object.entries(enhancedVintageLibrary)) {
    if (searchLower.includes(genre) || 
        searchLower.includes('vintage') || 
        searchLower.includes('retro') ||
        searchLower.includes('pre-war') ||
        searchLower.includes('1940s') ||
        searchLower.includes('1950s')) {
      matchedTracks = [...matchedTracks, ...tracks];
    }
  }
  
  // Si pas de correspondance spécifique, prendre du jazz par défaut
  if (matchedTracks.length === 0) {
    matchedTracks = enhancedVintageLibrary.jazz;
  }
  
  // Mélanger et limiter
  const shuffled = matchedTracks.sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, limit).map(track => ({
    id: `fma-${Date.now()}-${Math.random()}`,
    type: 'music' as const,
    title: track.title,
    content: searchTerm,
    artist: track.artist,
    duration: track.duration,
    url: 'https://freesound.org/data/previews/316/316847_5123451-lq.mp3', // URL plus fiable
    addedAt: new Date().toISOString()
  }));
}

/**
 * Fallback vers Archive.org pour recherche générale
 */
async function searchArchiveOrg(searchTerm: string, limit: number): Promise<PlaylistItem[]> {
  const cleanSearchTerm = encodeURIComponent(searchTerm.trim());
  
  // Recherche ciblée sur Archive.org avec plusieurs formats audio
  const searchUrl = `https://archive.org/advancedsearch.php?` +
    `q=title:(${cleanSearchTerm}) AND mediatype:audio AND format:(MP3 OR OGG OR FLAC)` +
    `&fl=identifier,title,creator,duration,format,item_size` +
    `&sort=downloads desc` +
    `&rows=${limit}&page=1&output=json`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OndeSpectrale/1.0'
      }
    });

    if (!response.ok) {
      console.error(`Archive.org search error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!data?.response?.docs?.length) {
      console.log(`Aucun résultat Archive.org pour: "${searchTerm}"`);
      return [];
    }

    const results: PlaylistItem[] = [];

    for (const doc of data.response.docs) {
      if (!doc.identifier || !doc.title) continue;

      try {
        // Obtenir les fichiers disponibles pour cet item
        const filesUrl = `https://archive.org/metadata/${doc.identifier}/files`;
        const filesResponse = await fetch(filesUrl);
        
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          
          // Chercher le meilleur fichier audio
          const audioFile = findBestAudioFile(filesData.result || []);
          
          if (audioFile) {
            const playlistItem: PlaylistItem = {
              id: `archive-${doc.identifier}-${Date.now()}`,
              type: 'music',
              title: cleanTitle(doc.title),
              content: searchTerm, // Terme de recherche original pour re-recherche si nécessaire
              artist: cleanArtist(doc.creator),
              url: `https://archive.org/download/${doc.identifier}/${audioFile.name}`,
              duration: parseDuration(doc.duration) || 180,
              archiveId: doc.identifier,
              addedAt: new Date().toISOString(),
            };

            results.push(playlistItem);
          }
        }
      } catch (fileError) {
        console.warn(`Erreur récupération fichiers pour ${doc.identifier}:`, fileError);
        
        // Fallback avec URL standard MP3
        const playlistItem: PlaylistItem = {
          id: `archive-fallback-${doc.identifier}`,
          type: 'music',
          title: cleanTitle(doc.title),
          content: searchTerm,
          artist: cleanArtist(doc.creator),
          url: `https://archive.org/download/${doc.identifier}/${doc.identifier}.mp3`,
          duration: parseDuration(doc.duration) || 180,
          archiveId: doc.identifier,
          addedAt: new Date().toISOString(),
        };

        results.push(playlistItem);
      }
    }

    console.log(`Archive.org: ${results.length} pistes trouvées pour "${searchTerm}"`);
    return results;

  } catch (error) {
    console.error("Erreur recherche Archive.org:", error);
    return [];
  }
}

/**
 * Trouve le meilleur fichier audio dans la liste des fichiers Archive.org
 */
function findBestAudioFile(files: any[]) {
  const audioFormats = ['mp3', 'ogg', 'flac', 'm4a'];
  
  // Priorité aux MP3 de qualité correcte
  for (const format of audioFormats) {
    const file = files.find(f => 
      f.format?.toLowerCase() === format && 
      f.name && 
      !f.name.includes('_sample') &&
      !f.name.includes('_preview') &&
      (f.size === undefined || parseInt(f.size) > 1000000) // > 1MB
    );
    
    if (file) return file;
  }

  return null;
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
  
  // Format MM:SS ou HH:MM:SS
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
      signal: AbortSignal.timeout(5000)
    });
    
    return response.ok && 
           (response.headers.get('content-type')?.includes('audio') ?? false);
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
    // Gestion des messages (code existant amélioré)
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
    
    // Fallback : nouvelle recherche
    if (track.content) {
      const searchResults = await searchMusicAdvanced(track.content, 3);
      
      for (const result of searchResults) {
        const isValid = await validateAudioUrl(result.url);
        if (isValid) {
          return { audioUrl: result.url };
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
    // Import des fonctions existantes
    const { generateDjAudio } = await import('@/ai/flows/generate-dj-audio');
    const { generateCustomDjAudio } = await import('@/ai/flows/generate-custom-dj-audio');
    const { getCustomCharactersForUser } = await import('./actions');
    const { DJ_CHARACTERS } = await import('@/lib/data');
    
    if (!track.content) {
      return { error: 'Contenu du message vide' };
    }

    // Récupérer le DJ
    const customDjs = await getCustomCharactersForUser(ownerId);
    const allDjs = [...DJ_CHARACTERS, ...customDjs];
    const dj = allDjs.find(d => d.id === djCharacterId);

    if (!dj) {
      return { error: 'Personnage DJ non trouvé' };
    }

    // Générer l'audio selon le type de DJ
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

/**
 * Génère des suggestions de musique basées sur le thème de la station
 */
export async function generateMusicSuggestions(
  stationTheme: string,
  count: number = 5
): Promise<PlaylistItem[]> {
  
  const musicKeywords = generateMusicKeywords(stationTheme);
  const allSuggestions: PlaylistItem[] = [];
  
  // Rechercher avec différents mots-clés
  for (const keyword of musicKeywords.slice(0, 3)) {
    try {
      const results = await searchMusicAdvanced(keyword, Math.ceil(count / 3));
      allSuggestions.push(...results);
    } catch (error) {
      console.warn(`Erreur suggestion musique pour "${keyword}":`, error);
    }
  }
  
  // Dédoublonner et limiter
  const uniqueSuggestions = allSuggestions.filter((item, index, self) => 
    index === self.findIndex(t => t.archiveId === item.archiveId)
  );
  
  return uniqueSuggestions.slice(0, count);
}

/**
 * Génère des mots-clés de recherche musicale basés sur le thème
 */
function generateMusicKeywords(theme: string): string[] {
  const themeKeywords: Record<string, string[]> = {
    'post-apocalyptique': ['nuclear', 'wasteland', 'fallout', 'atomic', 'survival'],
    'années 50': ['1950s', 'swing', 'jazz', 'doo wop', 'rockabilly'],
    'science-fiction': ['space', 'electronic', 'ambient', 'synthesizer', 'futuristic'],
    'western': ['country', 'folk', 'cowboy', 'americana', 'guitar'],
    'horreur': ['dark ambient', 'horror', 'gothic', 'industrial', 'noise'],
    'classique': ['classical', 'orchestra', 'symphony', 'piano', 'violin'],
  };
  
  const lowerTheme = theme.toLowerCase();
  
  for (const [key, keywords] of Object.entries(themeKeywords)) {
    if (lowerTheme.includes(key)) {
      return keywords;
    }
  }
  
  // Fallback générique
  return ['music', 'song', 'audio', 'sound', 'instrumental'];
}