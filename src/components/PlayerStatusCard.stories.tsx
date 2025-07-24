import React from 'react';
import { PlayerStatusCard } from './PlayerStatusCard';

export default {
  title: 'Components/PlayerStatusCard',
  component: PlayerStatusCard,
};

export const Playing = () => (
  <PlayerStatusCard
    isPlaying={true}
    currentTrack={{
      title: 'Blue Moon',
      artist: 'Billie Holiday',
      url: '/music/blue-moon.mp3',
      type: 'music'
    }}
    progress={45}
    duration={180}
    volume={75}
    onVolumeChange={(volume) => console.log('Volume:', volume)}
    onSeek={(time) => console.log('Seek:', time)}
  />
);

export const Paused = () => (
  <PlayerStatusCard
    isPlaying={false}
    currentTrack={{
      title: 'Post-Apocalyptic News',
      artist: 'Radio Onde Spectrale',
      url: '/audio/news.mp3',
      type: 'news'
    }}
    progress={30}
    duration={120}
    volume={50}
    onVolumeChange={(volume) => console.log('Volume:', volume)}
    onSeek={(time) => console.log('Seek:', time)}
  />
);

export const NoTrack = () => (
  <PlayerStatusCard
    isPlaying={false}
    currentTrack={null}
    progress={0}
    duration={0}
    volume={75}
    onVolumeChange={(volume) => console.log('Volume:', volume)}
    onSeek={(time) => console.log('Seek:', time)}
  />
);