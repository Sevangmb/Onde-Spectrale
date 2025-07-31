import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayerMonitoring } from '../usePlayerMonitoring';
import { mockStations } from '@/lib/testUtils';

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  db: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date())
}));

describe('usePlayerMonitoring', () => {
  const mockStationId = 'test-station-id';
  let mockOnSnapshot: jest.Mock;
  let mockUpdateDoc: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot = jest.fn();
    mockUpdateDoc = jest.fn();

    const { onSnapshot, updateDoc } = require('firebase/firestore');
    onSnapshot.mockImplementation(mockOnSnapshot);
    updateDoc.mockImplementation(mockUpdateDoc);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    expect(result.current.playerState).toEqual({
      isPlaying: false,
      currentTrack: null,
      currentTime: 0,
      duration: 0,
      volume: 1,
      isMuted: false,
      error: null,
      lastUpdate: expect.any(Date),
      listeners: 0,
      stationId: mockStationId
    });

    expect(result.current.logs).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('should handle null stationId', () => {
    const { result } = renderHook(() => usePlayerMonitoring());

    expect(result.current.playerState.stationId).toBeNull();
    expect(result.current.isConnected).toBe(false);
  });

  it('should subscribe to player state updates', () => {
    renderHook(() => usePlayerMonitoring(mockStationId));

    expect(mockOnSnapshot).toHaveBeenCalled();
  });

  it('should update player state from Firestore data', async () => {
    const mockPlayerData = {
      isPlaying: true,
      currentTrack: {
        id: 'track-1',
        title: 'Test Track',
        artist: 'Test Artist',
        duration: 180,
        type: 'music'
      },
      currentTime: 90,
      duration: 180,
      volume: 0.8,
      isMuted: false,
      error: null,
      lastUpdate: new Date(),
      listeners: 5,
      stationId: mockStationId
    };

    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    // Simulate Firestore update
    act(() => {
      const onSnapshotCallback = mockOnSnapshot.mock.calls[0][1];
      onSnapshotCallback({
        exists: () => true,
        data: () => mockPlayerData
      });
    });

    await waitFor(() => {
      expect(result.current.playerState.isPlaying).toBe(true);
      expect(result.current.playerState.currentTrack).toEqual(mockPlayerData.currentTrack);
      expect(result.current.playerState.currentTime).toBe(90);
      expect(result.current.playerState.listeners).toBe(5);
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('should handle Firestore errors', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    // Simulate Firestore error
    act(() => {
      const onSnapshotErrorCallback = mockOnSnapshot.mock.calls[0][2];
      onSnapshotErrorCallback(new Error('Firestore error'));
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false);
    });
  });

      it('should update player state', async () => {
      const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

      await act(async () => {
        await result.current.setVolume(0.5);
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
        isPlaying: true,
        volume: 0.5,
        lastUpdate: expect.any(Date)
      })
    );
  });

  it('should add log entries', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await result.current.addLog({
        type: 'play',
        message: 'Playback started'
      });
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        logs: expect.arrayContaining([
          expect.objectContaining({
            type: 'play',
            message: 'Playback started'
          })
        ])
      })
    );
  });

  it('should handle play action', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await result.current.play();
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPlaying: true,
        error: null
      })
    );
  });

  it('should handle pause action', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await result.current.pause();
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        isPlaying: false
      })
    );
  });

  it('should handle volume change', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await result.current.setVolume(0.7);
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        volume: 0.7
      })
    );
  });

  it('should handle track change', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    const newTrack = {
      id: 'track-2',
      title: 'New Track',
      content: 'New track content',
      artist: 'New Artist',
      duration: 200,
      type: 'music' as const,
      url: 'https://example.com/new-track.mp3'
    };

    await act(async () => {
      await result.current.setCurrentTrack(newTrack);
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        currentTrack: newTrack,
        currentTime: 0,
        duration: 200,
        error: null
      })
    );
  });

  it('should handle error setting', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await result.current.setError('Audio loading failed');
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        error: 'Audio loading failed',
        isPlaying: false
      })
    );
  });

  it('should handle progress updates', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await result.current.updateProgress(45);
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        currentTime: 45
      })
    );
  });

  it('should limit logs to last 50 entries', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    // Add more than 50 logs
    const manyLogs = Array.from({ length: 60 }, (_, i) => ({
      type: 'play' as const,
      message: `Log ${i}`
    }));

    await act(async () => {
      for (const log of manyLogs) {
        await result.current.addLog(log);
      }
    });

    // Should only keep last 50 logs
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        logs: expect.arrayContaining([
          expect.objectContaining({
            message: 'Log 59' // Last log should be kept
          })
        ])
      })
    );
  });

  it('should handle multiple rapid updates', async () => {
    const { result } = renderHook(() => usePlayerMonitoring(mockStationId));

    await act(async () => {
      await Promise.all([
        result.current.play(),
        result.current.setVolume(0.8),
        result.current.updateProgress(30)
      ]);
    });

    expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
  });
}); 