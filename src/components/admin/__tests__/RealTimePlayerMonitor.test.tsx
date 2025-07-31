import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RealTimePlayerMonitor } from '../RealTimePlayerMonitor';
import { createMockPlaylistItem } from '@/lib/testUtils';

// Mock the usePlayerMonitoring hook
jest.mock('@/hooks/usePlayerMonitoring', () => ({
  usePlayerMonitoring: jest.fn()
}));

const mockUsePlayerMonitoring = require('@/hooks/usePlayerMonitoring').usePlayerMonitoring;

describe('RealTimePlayerMonitor', () => {
  const defaultProps = {
    stationId: 'test-station-id',
    stationName: 'Test Station'
  };

  const mockPlayerState = {
    isPlaying: false,
    currentTrack: null,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    error: null,
    lastUpdate: new Date(),
    listeners: 0,
    stationId: 'test-station-id'
  };

  const mockLogs = [
    {
      id: 'log-1',
      type: 'play' as const,
      message: 'Playback started',
      timestamp: new Date(),
      trackId: 'track-1'
    },
    {
      id: 'log-2',
      type: 'error' as const,
      message: 'Audio loading failed',
      timestamp: new Date(),
      error: 'Network error'
    }
  ];

  const mockHookReturn = {
    playerState: mockPlayerState,
    logs: mockLogs,
    isConnected: true,
    play: jest.fn(),
    pause: jest.fn(),
    setVolume: jest.fn(),
    setError: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePlayerMonitoring.mockReturnValue(mockHookReturn);
  });

  it('should render station information correctly', () => {
    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('Test Station - Monitoring Temps Réel')).toBeInTheDocument();
    expect(screen.getByText('Connecté en temps réel')).toBeInTheDocument();
  });

  it('should show disconnected state', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      isConnected: false
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('Déconnecté')).toBeInTheDocument();
  });

  it('should display player status indicators', () => {
    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // listeners
    expect(screen.getByText('100%')).toBeInTheDocument(); // volume
    expect(screen.getByText('0:00')).toBeInTheDocument(); // current time
  });

  it('should show playing state', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        isPlaying: true
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('En lecture')).toBeInTheDocument();
  });

  it('should display current track information', () => {
    const mockTrack = createMockPlaylistItem({
      title: 'Test Track',
      artist: 'Test Artist',
      duration: 180,
      type: 'music'
    });

    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        currentTrack: mockTrack,
        currentTime: 90,
        duration: 180
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('Piste actuelle')).toBeInTheDocument();
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('Test Artist')).toBeInTheDocument();
    expect(screen.getByText('Musique')).toBeInTheDocument();
    expect(screen.getByText('1:30 / 3:00')).toBeInTheDocument();
  });

  it('should display DJ message track', () => {
    const mockTrack = createMockPlaylistItem({
      title: 'DJ Message',
      content: 'Welcome to the wasteland!',
      type: 'message'
    });

    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        currentTrack: mockTrack
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('Message DJ')).toBeInTheDocument();
  });

  it('should display progress bar', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        currentTime: 90,
        duration: 180
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('Progression')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should display error message', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        error: 'Audio loading failed'
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Audio loading failed')).toBeInTheDocument();
  });

  it('should handle play/pause button clicks', () => {
    const mockPlay = jest.fn();
    const mockPause = jest.fn();

    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      play: mockPlay,
      pause: mockPause
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    const playButton = screen.getByRole('button', { name: /lecture/i });
    fireEvent.click(playButton);

    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('should handle mute/unmute button clicks', () => {
    const mockSetVolume = jest.fn();

    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      setVolume: mockSetVolume
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    const muteButton = screen.getByRole('button', { name: /mute/i });
    fireEvent.click(muteButton);

    expect(mockSetVolume).toHaveBeenCalledWith(0);
  });

  it('should toggle logs visibility', () => {
    render(<RealTimePlayerMonitor {...defaultProps} />);

    const logsButton = screen.getByRole('button', { name: /logs/i });
    fireEvent.click(logsButton);

    expect(screen.getByText('Historique des événements')).toBeInTheDocument();
    expect(screen.getByText('Playback started')).toBeInTheDocument();
    expect(screen.getByText('Audio loading failed')).toBeInTheDocument();
  });

  it('should display logs with correct icons and colors', () => {
    render(<RealTimePlayerMonitor {...defaultProps} />);

    const logsButton = screen.getByRole('button', { name: /logs/i });
    fireEvent.click(logsButton);

    // Check that logs are displayed with proper styling
    expect(screen.getByText('Playback started')).toBeInTheDocument();
    expect(screen.getByText('Audio loading failed')).toBeInTheDocument();
  });

  it('should handle empty logs', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      logs: []
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    const logsButton = screen.getByRole('button', { name: /logs/i });
    fireEvent.click(logsButton);

    expect(screen.getByText('Aucun événement enregistré')).toBeInTheDocument();
  });

  it('should format time correctly', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        currentTime: 125, // 2:05
        duration: 180
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('should handle volume percentage display', () => {
    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      playerState: {
        ...mockPlayerState,
        volume: 0.75
      }
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<RealTimePlayerMonitor {...defaultProps} />);

    // Check for proper ARIA labels and roles
    expect(screen.getByRole('button', { name: /lecture/i })).toHaveAttribute('aria-label');
    expect(screen.getByRole('button', { name: /mute/i })).toHaveAttribute('aria-label');
    expect(screen.getByRole('button', { name: /logs/i })).toHaveAttribute('aria-label');
  });

  it('should handle rapid state changes', async () => {
    const mockPlay = jest.fn();
    const mockPause = jest.fn();

    mockUsePlayerMonitoring.mockReturnValue({
      ...mockHookReturn,
      play: mockPlay,
      pause: mockPause
    });

    render(<RealTimePlayerMonitor {...defaultProps} />);

    const playButton = screen.getByRole('button', { name: /lecture/i });
    
    // Rapid clicks
    fireEvent.click(playButton);
    fireEvent.click(playButton);
    fireEvent.click(playButton);

    expect(mockPlay).toHaveBeenCalledTimes(3);
  });
}); 