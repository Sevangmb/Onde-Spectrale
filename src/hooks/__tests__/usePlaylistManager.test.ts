import { renderHook, act } from '@testing-library/react';
import { usePlaylistManager } from '../usePlaylistManager';
import type { DJCharacter, CustomDJCharacter } from '@/lib/types';
import { createMockMusic, createMockMessage, createMockPlaylist } from '@/lib/playlistUtils';
import type { Station } from '@/lib/types';

// Mock Firebase and external dependencies
jest.mock('@/lib/firebase', () => ({
  db: {},
  auth: {},
}));

jest.mock('@/lib/firestorePlayer', () => ({
  pushPlayerLog: jest.fn(),
  updatePlayerState: jest.fn(),
}));

jest.mock('@/app/actions', () => ({
  getAudioForTrack: jest.fn().mockResolvedValue({
    audioUrl: 'https://test.com/audio.mp3',
    error: null,
  }),
}));

// Mock audio hooks
jest.mock('../audio/usePlaybackState', () => ({
  usePlaybackState: () => ({
    isPlaying: false,
    isLoading: false,
    errorMessage: null,
    audioRef: { current: null },
    setPlaying: jest.fn(),
    setPaused: jest.fn(),
    setLoading: jest.fn(),
    setIdle: jest.fn(),
    setError: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('../audio/useTrackSelection', () => ({
  useTrackSelection: () => ({
    currentTrack: null,
    availableTracks: [],
    canGoBack: false,
    selectTrack: jest.fn(),
    selectNextTrack: jest.fn(),
    selectPreviousTrack: jest.fn(),
    resetForNewStation: jest.fn(),
  }),
}));

jest.mock('../audio/useAutoPlay', () => ({
  useAutoPlay: () => ({
    autoPlayEnabled: false,
    enableAutoPlay: jest.fn(),
    scheduleAutoPlay: jest.fn(),
  }),
}));

jest.mock('../audio/useAudioEffects', () => ({
  useAudioEffects: () => ({
    ttsMessage: null,
    ttsEnabled: false,
    enableTTS: jest.fn(),
    playTTSMessage: jest.fn(),
    clearTTSMessage: jest.fn(),
    stopAllAudio: jest.fn(),
  }),
}));

jest.mock('../audio/useFailedTracks', () => ({
  useFailedTracks: () => ({
    failedTracks: new Set(),
    addFailedTrack: jest.fn(),
  }),
}));

// Setup global mocks
beforeAll(() => {
  // Mock HTMLAudioElement
  global.HTMLAudioElement = jest.fn().mockImplementation(() => ({
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn(),
    load: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    currentTime: 0,
    duration: 180,
    volume: 1,
    src: '',
  }));

  // Mock SpeechSynthesis
  Object.defineProperty(global, 'speechSynthesis', {
    value: {
      getVoices: jest.fn().mockReturnValue([]),
      speak: jest.fn(),
      cancel: jest.fn(),
    },
    writable: true,
  });
});

describe('usePlaylistManager', () => {
  const mockUser = { id: 'user1', email: 'test@test.com' };
  const mockDJs: (DJCharacter | CustomDJCharacter)[] = [];
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const playlist = createMockPlaylist(3);
    const station: Station = {
      id: 'station1',
      name: 'Test Station',
      frequency: 101.1,
      ownerId: 'user1',
      djCharacterId: 'dj1',
      createdAt: new Date().toISOString(),
      playlist,
    };

    const { result } = renderHook(() => usePlaylistManager({ 
      station, 
      user: mockUser, 
      allDjs: mockDJs 
    }));

    expect(result.current.currentTrack).toBeNull();
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.isLoadingTrack).toBe(false);
    expect(result.current.playlistLength).toBe(3);
    expect(typeof result.current.playTrackById).toBe('function');
    expect(typeof result.current.togglePlayPause).toBe('function');
  });

  it('should handle station changes correctly', () => {
    const playlist1 = createMockPlaylist(2);
    const station1: Station = {
      id: 'station1',
      name: 'Test Station 1',
      frequency: 101.1,
      ownerId: 'user1',
      djCharacterId: 'dj1',
      createdAt: new Date().toISOString(),
      playlist: playlist1,
    };

    const { result, rerender } = renderHook(
      ({ station }) => usePlaylistManager({ 
        station, 
        user: mockUser, 
        allDjs: mockDJs 
      }),
      { initialProps: { station: station1 } }
    );

    expect(result.current.playlistLength).toBe(2);

    // Change to different station
    const playlist2 = createMockPlaylist(4);
    const station2: Station = {
      ...station1,
      id: 'station2',
      name: 'Test Station 2',
      playlist: playlist2,
    };

    rerender({ station: station2 });
    expect(result.current.playlistLength).toBe(4);
  });

  it('should handle failed tracks correctly', async () => {
    const playlist = createMockPlaylist(2);
    const station: Station = {
      id: 'station1',
      name: 'Test Station',
      frequency: 101.1,
      ownerId: 'user1',
      djCharacterId: 'dj1',
      createdAt: new Date().toISOString(),
      playlist,
    };

    const { result } = renderHook(() => usePlaylistManager({ 
      station, 
      user: mockUser, 
      allDjs: mockDJs 
    }));

    expect(result.current.failedTracks).toBeInstanceOf(Set);
    expect(typeof result.current.addFailedTrack).toBe('function');
  });

  it('should provide correct audio control functions', () => {
    const playlist = createMockPlaylist(3);
    const station: Station = {
      id: 'station1',
      name: 'Test Station',
      frequency: 101.1,
      ownerId: 'user1',
      djCharacterId: 'dj1',
      createdAt: new Date().toISOString(),
      playlist,
    };

    const { result } = renderHook(() => usePlaylistManager({ 
      station, 
      user: mockUser, 
      allDjs: mockDJs 
    }));

    // Check that all required functions are present
    expect(typeof result.current.togglePlayPause).toBe('function');
    expect(typeof result.current.nextTrack).toBe('function');
    expect(typeof result.current.previousTrack).toBe('function');
    expect(typeof result.current.playTrackById).toBe('function');
    expect(typeof result.current.enableAutoPlay).toBe('function');
    expect(typeof result.current.enableTTS).toBe('function');

    // Check audio ref
    expect(result.current.audioRef).toBeDefined();
  });
});