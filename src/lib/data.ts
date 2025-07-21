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
    id: 'ink-spots-world-on-fire',
    type: 'music',
    title: 'I Don\'t Want to Set the World on Fire',
    artist: 'The Ink Spots',
    url: 'https://archive.org/download/78_i-dont-want-to-set-the-world-on-fire_the-ink-spots-bill-kenny_gbia0015551a/I%20Don%27t%20Want%20To%20Set%20The%20World%20On%20Fire%20-%20The%20Ink%20Spots.mp3',
    duration: 184
  },
   {
    id: 'tex-beneke-a-wonderful-guy',
    type: 'music',
    title: 'A Wonderful Guy',
    artist: 'Tex Beneke',
    url: 'https://archive.org/download/78_a-wonderful-guy_tex-beneke-and-his-orchestra-glenn-douglas-rodgers-hammerstein_gbia0015478b/A%20Wonderful%20Guy%20-%20Tex%20Beneke%20and%20his%20Orchestra.mp3',
    duration: 172
  },
   {
    id: 'roy-brown-butcher-pete',
    type: 'music',
    title: 'Butcher Pete (Part 1)',
    artist: 'Roy Brown',
    url: 'https://archive.org/download/78_butcher-pete-part-1_roy-brown-and-his-mighty-mighty-men_gbia0018423a/Butcher%20Pete%20-%20Part%201%20-%20Roy%20Brown%20and%20his%20Mighty-Mighty%20Men.mp3',
    duration: 167
  },
  {
    id: 'bing-crosby-accentuate',
    type: 'music',
    title: 'Ac-Cent-Tchu-Ate the Positive',
    artist: 'Bing Crosby',
    url: 'https://archive.org/download/78_ac-cent-tchu-ate-the-positive_bing-crosby-and-the-andrews-sisters-vic-schoen-and-h_gbia0015697a/Ac-Cent-Tchu-Ate%20The%20Positive%20-%20Bing%20Crosby%20and%20The%20Andrews%20Sisters.mp3',
    duration: 164
  },
   {
    id: 'betty-hutton-orange-colored-sky',
    type: 'music',
    title: 'Orange Colored Sky',
    artist: 'Betty Hutton',
    url: 'https://archive.org/download/78_orange-colored-sky_betty-hutton-frank-devol-and-his-orchestra-milton-delugg-willie_gbia0004077a/Orange%20Colored%20Sky%20-%20Betty%20Hutton.mp3',
    duration: 153
  },
  {
    id: 'ftr-country-1',
    type: 'music',
    title: 'Pistol Packin\' Mama',
    artist: 'Al Dexter & His Troopers',
    url: 'https://archive.org/download/78_pistol-packin-mama_al-dexter-and-his-troopers_gbia0010078b/Pistol%20Packin%27%20Mama%20-%20Al%20Dexter%20and%20His%20Troopers.mp3',
    duration: 178
  }
];
