import React, { useRef } from 'react';
import { AudioPlayer } from './AudioPlayer';
import type { PlaylistItem } from '@/lib/types';

export default {
  title: 'Components/AudioPlayer',
  component: AudioPlayer,
};

const sampleTrack: PlaylistItem = {
  title: 'Titre de test',
  artist: 'Artiste',
  url: '/test.mp3',
  type: 'music',
  // Ajoutez d'autres champs requis si besoin
};

export const Default = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  return (
    <>
      <AudioPlayer
        track={sampleTrack}
        isPlaying={false}
        isLoading={false}
        audioRef={audioRef}
        ttsMessage={"Ceci est un message de test"}
        errorMessage={null}
        onEnded={() => alert('Fin de la piste')}
      />
      <audio ref={audioRef} src="/test.mp3" />
    </>
  );
};
