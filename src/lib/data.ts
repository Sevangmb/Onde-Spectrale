import type { DJCharacter, Station } from '@/lib/types';

export const DJ_CHARACTERS: DJCharacter[] = [
  {
    id: 'marcus',
    name: 'Marcus',
    description: 'Voix grave et autoritaire de militaire.',
    voice: { name: 'fr-FR-Wavenet-B', pitch: -2, speed: 0.9 },
  },
  {
    id: 'sarah',
    name: 'Sarah',
    description: 'Voix douce et posée de scientifique.',
    voice: { name: 'fr-FR-Wavenet-A', pitch: 1, speed: 1.1 },
  },
  {
    id: 'tommy',
    name: 'Tommy',
    description: 'Voix joviale et bricoleuse de mécanicien.',
    voice: { name: 'fr-FR-Wavenet-D', pitch: 0, speed: 1.0 },
  },
];

export const MOCK_MUSIC_SEARCH_RESULTS = [
    { id: 'music-a', type: 'music', title: 'Midnight Blues', artist: 'The Ghosts', url: '', duration: 210 },
    { id: 'music-b', type: 'music', title: 'Echoes in the Rain', artist: 'Lost Signals', url: '', duration: 185 },
    { id: 'music-c', type: 'music', title: 'Wasteland Waltz', artist: 'The Wanderers', url: '', duration: 150 },
]
