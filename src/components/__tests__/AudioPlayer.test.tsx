import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AudioPlayer } from '../AudioPlayer';
import { createMockPlaylistItem } from '@/lib/testUtils';

// Mock the audio element
const mockAudioRef = {
  current: {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    volume: 1,
    currentTime: 0,
    duration: 180
  }
};

describe('AudioPlayer', () => {
  const defaultProps = {
    track: createMockPlaylistItem(),
    isPlaying: false,
    isLoading: false,
    audioRef: mockAudioRef,
    onPlayPause: jest.fn(),
    onEnded: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render music track correctly', () => {
    const track = createMockPlaylistItem({
      title: 'Test Music Track',
      artist: 'Test Artist',
      type: 'music'
    });

    render(<AudioPlayer {...defaultProps} track={track} />);

    expect(screen.getByText('Test Music Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
  });

  it('should render DJ message correctly', () => {
    const track = createMockPlaylistItem({
      title: 'DJ Message',
      content: 'Welcome to the wasteland!',
      type: 'message'
    });

    render(<AudioPlayer {...defaultProps} track={track} />);

    expect(screen.getByText('DJ Message')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the wasteland!')).toBeInTheDocument();
  });

  it('should show play button when not playing', () => {
    render(<AudioPlayer {...defaultProps} isPlaying={false} />);

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
  });

  it('should show pause button when playing', () => {
    render(<AudioPlayer {...defaultProps} isPlaying={true} />);

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /play/i })).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<AudioPlayer {...defaultProps} isLoading={true} />);

    expect(screen.getByText(/chargement/i)).toBeInTheDocument();
  });

  it('should call onPlayPause when play/pause button is clicked', () => {
    const onPlayPause = jest.fn();
    render(<AudioPlayer {...defaultProps} onPlayPause={onPlayPause} />);

    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);

    expect(onPlayPause).toHaveBeenCalledTimes(1);
  });

  it('should display error message when provided', () => {
    const errorMessage = 'Failed to load audio';
    render(<AudioPlayer {...defaultProps} errorMessage={errorMessage} />);

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should display TTS message when provided', () => {
    const ttsMessage = 'Text-to-speech message';
    render(<AudioPlayer {...defaultProps} ttsMessage={ttsMessage} />);

    expect(screen.getByText(ttsMessage)).toBeInTheDocument();
  });

  it('should handle TTS enable button', () => {
    const onEnableTTS = jest.fn();
    render(<AudioPlayer {...defaultProps} ttsEnabled={false} onEnableTTS={onEnableTTS} />);

    const enableTTSButton = screen.getByRole('button', { name: /activer tts/i });
    fireEvent.click(enableTTSButton);

    expect(onEnableTTS).toHaveBeenCalledTimes(1);
  });

  it('should handle empty track', () => {
    render(<AudioPlayer {...defaultProps} track={undefined} />);

    expect(screen.getByText(/aucune piste/i)).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<AudioPlayer {...defaultProps} />);

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });
});