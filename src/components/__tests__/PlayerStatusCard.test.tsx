import React from 'react';
import { render, screen } from '@testing-library/react';
import { PlayerStatusCard } from '../PlayerStatusCard';

// Mock the usePlayerState hook
jest.mock('@/hooks/usePlayerState', () => ({
  usePlayerState: jest.fn(),
}));

const mockUsePlayerState = require('@/hooks/usePlayerState').usePlayerState;

describe('PlayerStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('affiche les infos de la piste en cours quand elle joue', () => {
    mockUsePlayerState.mockReturnValue({
      playerState: {
        isPlaying: true,
        currentTrack: {
          id: 'track1',
          title: 'Test Song',
          type: 'music',
          artist: 'Test Artist',
          duration: 180,
        },
        ttsMessage: null,
        errorMessage: null,
      },
      loading: false,
      error: null,
    });

    render(<PlayerStatusCard stationId="test-station" />);
    
    expect(screen.getByText(/Lecture/i)).toBeInTheDocument();
    expect(screen.getByText('Test Song')).toBeInTheDocument();
  });

  it('affiche un message erreur si errorMessage est present', () => {
    mockUsePlayerState.mockReturnValue({
      playerState: {
        isPlaying: false,
        currentTrack: null,
        ttsMessage: null,
        errorMessage: 'Erreur de lecture',
      },
      loading: false,
      error: null,
    });

    render(<PlayerStatusCard stationId="test-station" />);
    
    expect(screen.getByText(/Erreur de lecture/i)).toBeInTheDocument();
  });

  it('affiche un indicateur de chargement', () => {
    mockUsePlayerState.mockReturnValue({
      playerState: null,
      loading: true,
      error: null,
    });

    render(<PlayerStatusCard stationId="test-station" />);
    
    expect(screen.getByText(/Chargement de l'état/i)).toBeInTheDocument();
  });
});