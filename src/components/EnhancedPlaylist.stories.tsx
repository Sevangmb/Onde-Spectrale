import React from 'react';
import { EnhancedPlaylist } from './EnhancedPlaylist';
import type { PlaylistItem } from '@/lib/types';

export default {
  title: 'Components/EnhancedPlaylist',
  component: EnhancedPlaylist,
};

const samplePlaylist: PlaylistItem[] = [
  {
    title: 'Blue Moon',
    artist: 'Billie Holiday',
    url: '/music/blue-moon.mp3',
    type: 'music'
  },
  {
    title: 'I Don\'t Want to Set the World on Fire',
    artist: 'The Ink Spots',
    url: '/music/fire.mp3',
    type: 'music'
  },
  {
    title: 'Nouvelles du Wasteland',
    artist: 'Radio Onde Spectrale',
    url: '/audio/news-1.mp3',
    type: 'news'
  },
  {
    title: 'Atom Bomb Baby',
    artist: 'The Five Stars',
    url: '/music/atom-bomb.mp3',
    type: 'music'
  },
  {
    title: 'Bulletin météo post-apocalyptique',
    artist: 'Météo Wasteland',
    url: '/audio/weather.mp3',
    type: 'weather'
  }
];

export const Default = () => (
  <EnhancedPlaylist
    playlist={samplePlaylist}
    currentIndex={1}
    onTrackSelect={(index) => console.log('Selected track:', index)}
    isPlaying={true}
  />
);

export const EmptyPlaylist = () => (
  <EnhancedPlaylist
    playlist={[]}
    currentIndex={-1}
    onTrackSelect={(index) => console.log('Selected track:', index)}
    isPlaying={false}
  />
);

export const LongPlaylist = () => {
  const longPlaylist: PlaylistItem[] = Array.from({ length: 20 }, (_, i) => ({
    title: `Titre ${i + 1}`,
    artist: `Artiste ${i + 1}`,
    url: `/music/track-${i + 1}.mp3`,
    type: i % 3 === 0 ? 'news' : i % 3 === 1 ? 'weather' : 'music'
  }));

  return (
    <EnhancedPlaylist
      playlist={longPlaylist}
      currentIndex={5}
      onTrackSelect={(index) => console.log('Selected track:', index)}
      isPlaying={true}
    />
  );
};