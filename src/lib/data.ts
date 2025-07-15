import type { DJCharacter } from '@/lib/types';

export const DJ_CHARACTERS: DJCharacter[] = [
  {
    id: 'marcus',
    name: 'Marcus',
    description: 'Voix grave et autoritaire de militaire.',
    voice: { name: 'Mizar', pitch: -2, speed: 0.9 }, // Corrected for Gemini TTS
  },
  {
    id: 'sarah',
    name: 'Sarah',
    description: 'Voix douce et posée de scientifique.',
    voice: { name: 'Alhena', pitch: 1, speed: 1.1 }, // Corrected for Gemini TTS
  },
  {
    id: 'tommy',
    name: 'Tommy',
    description: 'Voix joviale et bricoleuse de mécanicien.',
    voice: { name: 'Antares', pitch: 0, speed: 1.0 }, // Corrected for Gemini TTS
  },
];
