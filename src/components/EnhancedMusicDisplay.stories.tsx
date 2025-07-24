import React from 'react';
import { EnhancedMusicDisplay } from './EnhancedMusicDisplay';
import type { PlaylistItem } from '@/lib/types';

export default {
  title: 'Components/EnhancedMusicDisplay',
  component: EnhancedMusicDisplay,
};

const sampleTrack: PlaylistItem = {
  id: '1',
  type: 'music',
  title: 'Blue Moon',
  content: 'Blue Moon',
  artist: 'Billie Holiday',
  album: 'The Complete Decca Recordings',
  year: 1952,
  genre: 'Jazz, Vocal Jazz, Swing',
  duration: 180,
  url: '/music/blue-moon.mp3',
  artwork: 'https://via.placeholder.com/300x300/f97316/ffffff?text=Album',
  addedAt: new Date().toISOString(),
  plexKey: 'library/metadata/12345'
};

const minimalTrack: PlaylistItem = {
  id: '2',
  type: 'music',
  title: 'Mystery Song',
  content: 'Mystery Song',
  duration: 240,
  url: '/music/mystery.mp3',
  addedAt: new Date().toISOString()
};

export const WithFullMetadata = () => (
  <EnhancedMusicDisplay track={sampleTrack} />
);

export const WithMinimalData = () => (
  <EnhancedMusicDisplay track={minimalTrack} />
);

export const NoTrack = () => (
  <EnhancedMusicDisplay track={null} />
);

export const NonMusicTrack = () => (
  <EnhancedMusicDisplay 
    track={{
      id: '3',
      type: 'message',
      title: 'DJ Message',
      content: 'Welcome to the wasteland radio',
      duration: 30,
      url: '/audio/message.mp3',
      addedAt: new Date().toISOString()
    }}
  />
);