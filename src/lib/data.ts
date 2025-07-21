import type { DJCharacter, PlaylistItem } from '@/lib/types';

export const DJ_CHARACTERS: DJCharacter[] = [
  {
    id: 'marcus',
    name: 'Marcus',
    description: 'Voix grave et autoritaire de militaire.',
  },
  {
    id: 'sarah',
    name: 'Sarah',
    description: 'Voix douce et posée de scientifique.',
  },
  {
    id: 'tommy',
    name: 'Tommy',
    description: 'Voix joviale et bricoleuse de mécanicien.',
  },
];

export const MUSIC_CATALOG: PlaylistItem[] = [
  {
    id: 'ftr-blues-1',
    type: 'music',
    title: 'Wasteland Blues',
    artist: 'The Vapors',
    url: 'https://archive.org/download/20210212_202102/20_21_Blues.mp3',
    duration: 185
  },
  {
    id: 'ftr-ambient-1',
    type: 'music',
    title: 'Echoes of the Old World',
    artist: 'Synth Somnia',
    url: 'https://archive.org/download/ambient-music-collection-2/Ambiance%20Fantascientifica.mp3',
    duration: 210
  },
  {
    id: 'ftr-swing-1',
    type: 'music',
    title: 'Atomic Swing',
    artist: 'The Geiger Counters',
    url: 'https://archive.org/download/78_i-dont-want-to-set-the-world-on-fire_the-ink-spots-bill-kenny_gbia0015551a/I%20Don%27t%20Want%20To%20Set%20The%20World%20On%20Fire%20-%20The%20Ink%20Spots.mp3',
    duration: 184
  },
  {
    id: 'ftr-country-1',
    type: 'music',
    title: 'Giddyup, Buttercup!',
    artist: 'Lone Wanderer',
    url: 'https://archive.org/download/78_pistol-packin-mama_al-dexter-and-his-troopers_gbia0010078b/Pistol%20Packin%27%20Mama%20-%20Al%20Dexter%20and%20His%20Troopers.mp3',
    duration: 178
  },
  {
    id: 'ftr-classical-1',
    type: 'music',
    title: 'Radiation Romance',
    artist: 'Brahms',
    url: 'https://archive.org/download/78_hungarian-dance-no.-5_boston-pops-orchestra-arthur-fiedler-johannes-brahms_gbia0018428a/Hungarian%20Dance%20No.%205%20-%20Boston%20Pops%20Orchestra.mp3',
    duration: 140
  },
];
