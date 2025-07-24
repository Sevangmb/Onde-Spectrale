import React, { useRef } from 'react';
import { AudioVisualizer } from './AudioVisualizer';

export default {
  title: 'Components/AudioVisualizer',
  component: AudioVisualizer,
};

export const Playing = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  return (
    <div>
      <AudioVisualizer
        audioRef={audioRef}
        isPlaying={true}
      />
      <audio 
        ref={audioRef} 
        src="https://www.soundjay.com/misc/sounds/bell-ringing-05.wav" 
        crossOrigin="anonymous"
        autoPlay
        loop
        style={{ display: 'none' }}
      />
    </div>
  );
};

export const Paused = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  return (
    <AudioVisualizer
      audioRef={audioRef}
      isPlaying={false}
    />
  );
};