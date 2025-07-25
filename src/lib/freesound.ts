// src/lib/freesound.ts

interface FreeSoundResult {
  id: number;
  name: string;
  description: string;
  url: string;
  previews: {
    'preview-hq-mp3': string;
    'preview-lq-mp3': string;
    'preview-hq-ogg': string;
    'preview-lq-ogg': string;
  };
  duration: number;
  license: string;
  username: string;
  tags: string[];
}

interface FreeSoundResponse {
  count: number;
  results: FreeSoundResult[];
}

export interface RadioSoundEffect {
  id: string;
  name: string;
  url: string;
  duration: number;
  type: 'static' | 'interference' | 'tuning' | 'beep' | 'ambient';
  description: string;
}

// Collection d'effets sonores radio pré-sélectionnés de FreeSound.org
export const RADIO_SOUND_EFFECTS: Record<string, RadioSoundEffect[]> = {
  static: [
    {
      id: 'static-1',
      name: 'Radio Static Noise',
      url: 'https://freesound.org/data/previews/316/316847_5123451-lq.mp3',
      duration: 3.0,
      type: 'static',
      description: 'Static radio noise for transitions'
    },
    {
      id: 'static-2', 
      name: 'White Noise Static',
      url: 'https://freesound.org/data/previews/235/235777_4062622-lq.mp3',
      duration: 5.0,
      type: 'static',
      description: 'Vintage radio static sound'
    },
    {
      id: 'static-3',
      name: 'Analog Radio Static',
      url: 'https://freesound.org/data/previews/341/341695_5858296-lq.mp3',
      duration: 4.5,
      type: 'static',
      description: 'Analog radio interference'
    }
  ],
  interference: [
    {
      id: 'interference-1',
      name: 'Radio Interference',
      url: 'https://freesound.org/data/previews/376/376968_7037445-lq.mp3',
      duration: 2.8,
      type: 'interference',
      description: 'Radio frequency interference'
    },
    {
      id: 'interference-2',
      name: 'Electromagnetic Interference',
      url: 'https://freesound.org/data/previews/317/317828_5123451-lq.mp3',
      duration: 3.5,
      type: 'interference',
      description: 'Electromagnetic radio interference'
    }
  ],
  tuning: [
    {
      id: 'tuning-1',
      name: 'Radio Tuning Dial',
      url: 'https://freesound.org/data/previews/268/268763_4062622-lq.mp3',
      duration: 2.0,
      type: 'tuning',
      description: 'Sound of tuning radio dial'
    },
    {
      id: 'tuning-2',
      name: 'Frequency Scanning',
      url: 'https://freesound.org/data/previews/316/316738_5123451-lq.mp3',
      duration: 3.2,
      type: 'tuning',
      description: 'Radio frequency scanning sound'
    }
  ],
  beep: [
    {
      id: 'beep-1',
      name: 'Radio Beep Signal',
      url: 'https://freesound.org/data/previews/145/145209_2437358-lq.mp3',
      duration: 1.0,
      type: 'beep',
      description: 'Short radio beep signal'
    }
  ],
  ambient: [
    {
      id: 'ambient-1',
      name: 'Post-Apocalyptic Radio Ambience',
      url: 'https://freesound.org/data/previews/198/198841_3162775-lq.mp3',
      duration: 10.0,
      type: 'ambient',
      description: 'Atmospheric radio background'
    }
  ]
};

/**
 * Obtient un effet sonore aléatoire pour un type donné
 */
export function getRandomRadioEffect(type: keyof typeof RADIO_SOUND_EFFECTS): RadioSoundEffect | null {
  const effects = RADIO_SOUND_EFFECTS[type];
  if (!effects || effects.length === 0) return null;
  
  return effects[Math.floor(Math.random() * effects.length)];
}

/**
 * Obtient tous les effets sonores d'un type
 */
export function getRadioEffectsByType(type: keyof typeof RADIO_SOUND_EFFECTS): RadioSoundEffect[] {
  return RADIO_SOUND_EFFECTS[type] || [];
}

/**
 * Obtient un effet de static pour les transitions
 */
export function getStaticEffect(): RadioSoundEffect {
  return getRandomRadioEffect('static') || RADIO_SOUND_EFFECTS.static[0];
}

/**
 * Obtient un effet d'interférence pour les changements de fréquence
 */
export function getInterferenceEffect(): RadioSoundEffect {
  return getRandomRadioEffect('interference') || RADIO_SOUND_EFFECTS.interference[0];
}

/**
 * Obtient un effet de tuning pour l'ajustement de fréquence
 */
export function getTuningEffect(): RadioSoundEffect {
  return getRandomRadioEffect('tuning') || RADIO_SOUND_EFFECTS.tuning[0];
}

/**
 * Valide qu'une URL audio FreeSound est accessible
 */
export async function validateFreeSoundUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: AbortSignal.timeout(3000)
    });
    
    return response.ok && 
           (response.headers.get('content-type')?.includes('audio') ?? false);
  } catch {
    return false;
  }
}

/**
 * Recherche d'effets sonores sur FreeSound.org (pour une utilisation future avec API key)
 */
export async function searchFreeSoundEffects(
  query: string, 
  filter: string = 'duration:[0 TO 10]',
  limit: number = 10
): Promise<RadioSoundEffect[]> {
  // Note: Cette fonction nécessiterait une clé API FreeSound pour fonctionner
  // Pour l'instant, on utilise notre collection pré-définie
  
  console.warn('FreeSound API search not implemented - using predefined sounds');
  
  // Retourner des effets basés sur la requête
  if (query.toLowerCase().includes('static')) {
    return getRadioEffectsByType('static');
  } else if (query.toLowerCase().includes('interference')) {
    return getRadioEffectsByType('interference');
  } else if (query.toLowerCase().includes('tuning')) {
    return getRadioEffectsByType('tuning');
  }
  
  return [];
}

/**
 * Crée un effet sonore personnalisé pour une situation spécifique
 */
export function createContextualRadioEffect(
  context: 'station_change' | 'frequency_drift' | 'signal_loss' | 'startup' | 'shutdown'
): RadioSoundEffect {
  switch (context) {
    case 'station_change':
      return getTuningEffect();
    case 'frequency_drift':
      return getInterferenceEffect();
    case 'signal_loss':
      return getStaticEffect();
    case 'startup':
      return {
        id: 'startup-custom',
        name: 'Radio Startup',
        url: RADIO_SOUND_EFFECTS.beep[0]?.url || '',
        duration: 1.5,
        type: 'beep',
        description: 'Radio turning on sound'
      };
    case 'shutdown':
      return getStaticEffect();
    default:
      return getStaticEffect();
  }
}