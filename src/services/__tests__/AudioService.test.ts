import { AudioService } from '../AudioService';
import { mockAudioContext, mockAudioElement, setupTestEnvironment, cleanupTestEnvironment, createMockPlaylistItem } from '@/lib/testUtils';

describe('AudioService', () => {
  let audioService: AudioService;
  let mockAudio: HTMLAudioElement;

  beforeEach(() => {
    setupTestEnvironment();
    audioService = new AudioService();
    mockAudio = document.createElement('audio');
  });

  afterEach(() => {
    cleanupTestEnvironment();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize audio context only in browser environment', async () => {
      // Mock window object
      const originalWindow = global.window;
      delete (global as any).window;

      // Should not throw in server environment
      expect(() => {
        new AudioService();
      }).not.toThrow();

      // Restore window
      (global as any).window = originalWindow;
    });

    it('should initialize audio context in browser environment', async () => {
      const mockAudioContext = {
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
        destination: {},
        sampleRate: 44100
      };

      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: jest.fn(() => mockAudioContext)
      });

      const service = new AudioService();
      await service['initializeAudioContext']();

      expect(window.AudioContext).toHaveBeenCalled();
    });
  });

  describe('track loading', () => {
    it('should load track successfully', async () => {
      const track = createMockPlaylistItem({
        title: 'Test Track',
        content: 'Test content',
        artist: 'Test Artist',
        duration: 180,
        type: 'music',
        url: 'https://example.com/test.mp3'
      });

      // Mock the getAudioUrlForTrack method
      jest.spyOn(audioService as any, 'getAudioUrlForTrack').mockResolvedValue('https://example.com/test.mp3');

      await audioService.loadTrack(track, mockAudio);

      expect(mockAudio.src).toBe('https://example.com/test.mp3');
      expect(mockAudio.crossOrigin).toBe('anonymous');
      expect(mockAudio.preload).toBe('metadata');
    });

    it('should handle track loading errors', async () => {
      const track = createMockPlaylistItem({
        title: 'Test Track',
        content: 'Test content',
        artist: 'Test Artist',
        duration: 180,
        type: 'music',
        url: 'invalid-url'
      });

      // Mock the getAudioUrlForTrack method to return null
      jest.spyOn(audioService as any, 'getAudioUrlForTrack').mockResolvedValue(null);

      await expect(audioService.loadTrack(track, mockAudio)).rejects.toThrow('No audio URL available for track');
    });
  });

  describe('playback control', () => {
    it('should play audio successfully', async () => {
      const mockPlay = jest.fn().mockResolvedValue(undefined);
      mockAudio.play = mockPlay;

      await audioService.play(mockAudio);

      expect(mockPlay).toHaveBeenCalled();
    });

    it('should pause audio successfully', () => {
      const mockPause = jest.fn();
      mockAudio.pause = mockPause;

      audioService.pause(mockAudio);

      expect(mockPause).toHaveBeenCalled();
    });

    it('should set volume correctly', () => {
      const volume = 0.5;
      mockAudio.volume = 1;

      audioService.setVolume(mockAudio, volume);

      expect(mockAudio.volume).toBe(volume);
    });

    it('should handle volume clamping', () => {
      mockAudio.volume = 0.5;

      // Test volume below 0
      audioService.setVolume(mockAudio, -0.5);
      expect(mockAudio.volume).toBe(0);

      // Test volume above 1
      audioService.setVolume(mockAudio, 1.5);
      expect(mockAudio.volume).toBe(1);
    });
  });

  describe('audio context connection', () => {
    it('should connect to audio context successfully', async () => {
      const mockGainNode = {
        connect: jest.fn(),
        gain: { value: 1 }
      };

      const mockAnalyserNode = {
        connect: jest.fn(),
        disconnect: jest.fn(),
        fftSize: 256,
        frequencyBinCount: 128,
        getByteFrequencyData: jest.fn()
      };

      const mockAudioContext = {
        createGain: jest.fn(() => mockGainNode),
        createAnalyser: jest.fn(() => mockAnalyserNode),
        createMediaElementSource: jest.fn(() => ({
          connect: jest.fn()
        })),
        destination: {},
        sampleRate: 44100
      };

      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: jest.fn(() => mockAudioContext)
      });

      await audioService['connectToAudioContext'](mockAudio);

      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
      expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(mockAudio);
    });

    it('should handle audio context connection errors', async () => {
      const mockAudioContext = {
        createGain: jest.fn(() => {
          throw new Error('AudioContext not supported');
        }),
        destination: {},
        sampleRate: 44100
      };

      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: jest.fn(() => mockAudioContext)
      });

      // Should not throw, just log warning
      await expect(audioService['connectToAudioContext'](mockAudio)).resolves.toBeUndefined();
    });
  });

  describe('frequency data', () => {
    it('should get frequency data correctly', () => {
      const mockGetByteFrequencyData = jest.fn();
      const mockAnalyserNode = {
        frequencyBinCount: 128,
        getByteFrequencyData: mockGetByteFrequencyData
      };

      // Mock the analyser node
      (audioService as any).analyserNode = mockAnalyserNode;

      const frequencyData = audioService.getFrequencyData();

      expect(mockGetByteFrequencyData).toHaveBeenCalled();
      expect(frequencyData).toBeDefined();
    });

    it('should handle missing analyser node', () => {
      // Mock missing analyser node
      (audioService as any).analyserNode = null;

      const frequencyData = audioService.getFrequencyData();

      expect(frequencyData).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle play errors gracefully', async () => {
      const mockPlay = jest.fn().mockRejectedValue(new Error('Playback failed'));
      mockAudio.play = mockPlay;

      await expect(audioService.play(mockAudio)).rejects.toThrow('Playback failed');
    });

    it('should handle audio context initialization errors', async () => {
      Object.defineProperty(window, 'AudioContext', {
        writable: true,
        value: jest.fn(() => {
          throw new Error('AudioContext not supported');
        })
      });

      const service = new AudioService();
      await expect(service['initializeAudioContext']()).resolves.toBeUndefined();
    });
  });

  describe('utility methods', () => {
    it('should get current time', () => {
      mockAudio.currentTime = 45;
      expect(audioService.getCurrentTime(mockAudio)).toBe(45);
    });

    it('should get duration', () => {
      Object.defineProperty(mockAudio, 'duration', {
        value: 180,
        writable: true
      });
      expect(audioService.getDuration(mockAudio)).toBe(180);
    });

    it('should seek to time', () => {
      audioService.seekTo(mockAudio, 60);
      expect(mockAudio.currentTime).toBe(60);
    });

    it('should disconnect audio context', () => {
      const mockDisconnect = jest.fn();
      (audioService as any).gainNode = { disconnect: mockDisconnect };
      (audioService as any).analyserNode = { disconnect: mockDisconnect };

      audioService.disconnect();

      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });
  });
}); 