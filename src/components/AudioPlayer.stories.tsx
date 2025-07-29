import React, { useRef } from 'react';
import { AudioPlayer } from './AudioPlayer';
import { createMockMusic } from '@/lib/playlistUtils';

export default {
  title: 'Components/AudioPlayer',
  component: AudioPlayer,
};

const sampleTrack = createMockMusic({
  title: 'Titre de test',
  artist: 'Artiste',
  url: '/test.mp3',
});

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
