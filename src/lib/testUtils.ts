import type { Station, User, PlaylistItem, DJCharacter, CustomDJCharacter } from '@/lib/types';

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@example.com',
  stationsCreated: 2,
  lastFrequency: 100.5,
  createdAt: new Date().toISOString(),
  lastLogin: new Date().toISOString()
};

export const mockStations: Station[] = [
  {
    id: 'station-1',
    name: 'Radio Post-Apocalyptique',
    frequency: 100.5,
    theme: 'post-apocalyptic',
    djCharacterId: 'dj1',
    ownerId: 'test-user-id',
    playlist: [
      {
        id: 'track-1',
        title: 'Test Track 1',
        content: 'Test content 1',
        artist: 'Test Artist',
        duration: 180,
        type: 'music',
        url: 'https://example.com/track1.mp3'
      },
      {
        id: 'track-2',
        title: 'Test Track 2',
        content: 'Test content 2',
        artist: 'Test Artist 2',
        duration: 240,
        type: 'music',
        url: 'https://example.com/track2.mp3'
      }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'station-2',
    name: 'System Radio',
    frequency: 95.2,
    theme: 'system',
    djCharacterId: 'dj2',
    ownerId: 'system',
    playlist: [
      {
        id: 'track-3',
        title: 'System Track',
        content: 'System content',
        artist: 'System Artist',
        duration: 200,
        type: 'music',
        url: 'https://example.com/system.mp3'
      }
    ],
    createdAt: new Date().toISOString()
  }
];

export const mockPlaylistItems: PlaylistItem[] = [
  {
    id: 'item-1',
    title: 'Test Music Track',
    content: 'Test music content',
    artist: 'Test Artist',
    duration: 180,
    type: 'music',
    url: 'https://example.com/music.mp3'
  },
  {
    id: 'item-2',
    title: 'Test DJ Message',
    content: 'Welcome to the wasteland!',
    duration: 30,
    type: 'message',
    url: 'https://example.com/message.mp3'
  }
];

export const mockDJCharacters: DJCharacter[] = [
  {
    id: 'dj1',
    name: 'DJ Wasteland',
    description: 'Post-apocalyptic survivor'
  },
  {
    id: 'dj2',
    name: 'DJ System',
    description: 'Technical and precise'
  }
];

export const mockCustomDJCharacters: CustomDJCharacter[] = [
  {
    id: 'custom-dj1',
    name: 'Custom DJ',
    description: 'Custom DJ character',
    isCustom: true,
    voice: {
      gender: 'male',
      tone: 'deep',
      style: 'casual'
    },
    ownerId: 'test-user-id',
    createdAt: new Date().toISOString()
  }
];

export const mockAudioContext = {
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { value: 1 }
  })),
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 256,
    frequencyBinCount: 128,
    getByteFrequencyData: jest.fn()
  })),
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { value: 440 }
  })),
  createMediaElementSource: jest.fn(() => ({
    connect: jest.fn()
  })),
  destination: {},
  sampleRate: 44100
};

export const mockAudioElement = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 180,
  volume: 1,
  src: '',
  crossOrigin: 'anonymous',
  preload: 'metadata'
};

export const createMockStation = (overrides: Partial<Station> = {}): Station => ({
  id: `station-${Date.now()}`,
  name: 'Mock Station',
  frequency: 100.0,
  theme: 'post-apocalyptic',
  djCharacterId: 'dj1',
  ownerId: 'test-user-id',
  playlist: [],
  createdAt: new Date().toISOString(),
  ...overrides
});

export const createMockPlaylistItem = (overrides: Partial<PlaylistItem> = {}): PlaylistItem => ({
  id: `item-${Date.now()}`,
  title: 'Mock Track',
  content: 'Mock content',
  artist: 'Mock Artist',
  duration: 180,
  type: 'music',
  url: 'https://example.com/mock.mp3',
  ...overrides
});

export const mockFirebaseConfig = {
  apiKey: 'test-api-key',
  authDomain: 'test-project.firebaseapp.com',
  projectId: 'test-project',
  storageBucket: 'test-project.appspot.com',
  messagingSenderId: '123456789',
  appId: 'test-app-id'
};

export const mockFirestoreData = {
  stations: mockStations,
  users: [mockUser],
  playlists: mockPlaylistItems
};

// Mock functions for testing
export const mockFunctions = {
  createStation: jest.fn(),
  updateStation: jest.fn(),
  deleteStation: jest.fn(),
  getStations: jest.fn(),
  createPlaylistItem: jest.fn(),
  updatePlaylistItem: jest.fn(),
  deletePlaylistItem: jest.fn(),
  getAudioForTrack: jest.fn(),
  generateDJMessage: jest.fn()
};

// Test environment setup
export const setupTestEnvironment = () => {
  // Mock window.AudioContext
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: jest.fn(() => mockAudioContext)
  });

  // Mock window.webkitAudioContext
  Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    value: jest.fn(() => mockAudioContext)
  });

  // Mock HTMLAudioElement
  Object.defineProperty(window, 'HTMLAudioElement', {
    writable: true,
    value: jest.fn(() => mockAudioElement)
  });
};

// Cleanup function
export const cleanupTestEnvironment = () => {
  jest.clearAllMocks();
}; 