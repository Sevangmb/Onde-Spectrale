import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPlayer } from '../AudioPlayer';
import type { PlaylistItem } from '@/lib/types';

// Mock audio element
const mockAudioRef = {
  current: {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    currentTime: 0,
    duration: 180,
    volume: 0.75,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  } as any,
};

const mockTrack: PlaylistItem = {
  id: 'track1',
  title: 'Test Song',
  content: 'Test Song Content',
  artist: 'Test Artist',
  url: 'https://test.com/song.mp3',
  type: 'music',
  duration: 180,
};

describe('AudioPlayer', () => {
  const defaultProps = {
    track: mockTrack,
    isPlaying: false,
    isLoading: false,
    audioRef: mockAudioRef,
    onPlayPause: jest.fn(),
    onEnded: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders track information correctly', () => {
    render(<AudioPlayer {...defaultProps} />);
    
    expect(screen.getByText('Test Song')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('>>> MUSIQUE <<<')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    render(<AudioPlayer {...defaultProps} isLoading={true} />);
    
    expect(screen.getByText('Chargement...')).toBeInTheDocument();
    expect(screen.getByText('>>> SIGNAL PERDU <<<')).toBeInTheDocument();
  });

  it('displays error message when provided', () => {
    render(<AudioPlayer {...defaultProps} errorMessage="Audio loading failed" />);
    
    expect(screen.getAllByText(/Audio loading failed/i)).toHaveLength(2); // Shows in multiple places
  });

  it('shows TTS activation button when needed', () => {
    const onEnableTTS = jest.fn();
    const onPlayPause = jest.fn();
    render(
      <AudioPlayer 
        {...defaultProps} 
        errorMessage="Erreur de synthèse vocale" 
        ttsEnabled={false}
        onEnableTTS={onEnableTTS}
        onPlayPause={onPlayPause}
      />
    );
    
    const ttsButton = screen.getByText('Activer TTS');
    fireEvent.click(ttsButton);
    
    expect(onEnableTTS).toHaveBeenCalledTimes(1);
    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('displays TTS message when provided', () => {
    render(<AudioPlayer {...defaultProps} ttsMessage="DJ speaking now" />);
    
    expect(screen.getByText('Synthèse vocale')).toBeInTheDocument();
    expect(screen.getByText('>>> TRANSMISSION <<<')).toBeInTheDocument();
  });

  it('renders message type track differently', () => {
    const messageTrack: PlaylistItem = {
      ...mockTrack,
      type: 'message',
      title: 'DJ Message',
    };
    
    render(<AudioPlayer {...defaultProps} track={messageTrack} />);
    
    expect(screen.getByText('DJ Message')).toBeInTheDocument();
    expect(screen.getByText('>>> MESSAGE <<<')).toBeInTheDocument();
  });

  it('handles volume control with slider', () => {
    render(<AudioPlayer {...defaultProps} />);
    
    const volumeSlider = screen.getByRole('slider');
    fireEvent.change(volumeSlider, { target: { value: '50' } });
    
    // Check if volume percentage is displayed
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('handles mute/unmute functionality', () => {
    render(<AudioPlayer {...defaultProps} />);
    
    // Find the volume control and click it
    const volumeControl = screen.getByText('Vol:').parentElement?.querySelector('.vintage-knob');
    expect(volumeControl).toBeInTheDocument();
    
    if (volumeControl) {
      fireEvent.click(volumeControl);
    }
  });

  it('shows skeleton when loading without track', () => {
    render(<AudioPlayer {...defaultProps} track={undefined} isLoading={true} />);
    
    expect(screen.getByTestId('audio-player-skeleton')).toBeInTheDocument();
  });

  it('displays correct status based on state', () => {
    // Test no track
    const { rerender } = render(<AudioPlayer {...defaultProps} track={undefined} />);
    expect(screen.getByText('Silence radio')).toBeInTheDocument();
    
    // Test with track
    rerender(<AudioPlayer {...defaultProps} />);
    expect(screen.getByText('Test Song')).toBeInTheDocument();
  });
});