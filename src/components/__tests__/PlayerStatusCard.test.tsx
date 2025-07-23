import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlayerStatusCard } from '../PlayerStatusCard';
import type { PlaylistItem } from '@/lib/types';

const mockTrack: PlaylistItem = {
  id: 'track1',
  title: 'Test Song',
  url: 'https://test.com/song.mp3',
  type: 'music',
  duration: 180,
};

describe('PlayerStatusCard', () => {
  it('affiche les infos de la piste en cours', () => {
    render(
      <PlayerStatusCard
        currentTrack={mockTrack}
        isPlaying={true}
        ttsMessage={null}
        errorMessage={null}
        logs={[]}
      />
    );
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText(/Lecture/i)).toBeInTheDocument();
  });

  it('affiche un message d’erreur si errorMessage est présent', () => {
    render(
      <PlayerStatusCard
        currentTrack={mockTrack}
        isPlaying={false}
        ttsMessage={null}
        errorMessage={'Erreur de lecture'}
        logs={[]}
      />
    );
    expect(screen.getByText(/Erreur de lecture/i)).toBeInTheDocument();
  });
});
