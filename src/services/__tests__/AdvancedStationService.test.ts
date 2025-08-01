import { AdvancedStationService, type PlaylistStats, type PlaylistValidation } from '../AdvancedStationService';
import * as actions from '@/app/actions';
import { mockStations, createMockPlaylistItem } from '@/lib/testUtils';
import type { Station, PlaylistItem } from '@/lib/types';

// Mock the actions module
jest.mock('@/app/actions', () => ({
  updateStation: jest.fn(),
  deletePlaylistItem: jest.fn(),
  reorderPlaylistItems: jest.fn(),
  addPlaylistItems: jest.fn(),
  getStationById: jest.fn(),
}));

// Mock the data module
jest.mock('@/lib/data', () => ({
  DJ_CHARACTERS: [
    {
      id: 'dj1',
      name: 'Marcus',
      description: 'Survivant expérimenté',
      voice: { gender: 'male', tone: 'grave', style: 'narrateur' }
    },
    {
      id: 'dj2',
      name: 'Sarah',
      description: 'Technicienne brillante',
      voice: { gender: 'female', tone: 'clair', style: 'informatif' }
    }
  ]
}));

describe('AdvancedStationService', () => {
  let service: AdvancedStationService;
  let mockUpdateStation: jest.MockedFunction<typeof actions.updateStation>;
  let mockDeletePlaylistItem: jest.MockedFunction<typeof actions.deletePlaylistItem>;
  let mockReorderPlaylistItems: jest.MockedFunction<typeof actions.reorderPlaylistItems>;
  let mockAddPlaylistItems: jest.MockedFunction<typeof actions.addPlaylistItems>;
  let mockGetStationById: jest.MockedFunction<typeof actions.getStationById>;

  beforeEach(() => {
    service = new AdvancedStationService();
    mockUpdateStation = actions.updateStation as jest.MockedFunction<typeof actions.updateStation>;
    mockDeletePlaylistItem = actions.deletePlaylistItem as jest.MockedFunction<typeof actions.deletePlaylistItem>;
    mockReorderPlaylistItems = actions.reorderPlaylistItems as jest.MockedFunction<typeof actions.reorderPlaylistItems>;
    mockAddPlaylistItems = actions.addPlaylistItems as jest.MockedFunction<typeof actions.addPlaylistItems>;
    mockGetStationById = actions.getStationById as jest.MockedFunction<typeof actions.getStationById>;
    
    jest.clearAllMocks();
  });

  describe('changeDJ', () => {
    it('should successfully change DJ for a station', async () => {
      const stationId = 'station-1';
      const newDJId = 'dj2';
      const mockStation = { ...mockStations[0], djCharacterId: newDJId };
      
      mockUpdateStation.mockResolvedValue(mockStation);

      const result = await service.changeDJ(stationId, newDJId);

      expect(mockUpdateStation).toHaveBeenCalledWith(stationId, { djCharacterId: newDJId });
      expect(result).toEqual(mockStation);
      expect(result.djCharacterId).toBe(newDJId);
    });

    it('should throw error when station update fails', async () => {
      mockUpdateStation.mockResolvedValue(null);

      await expect(service.changeDJ('station-1', 'dj2'))
        .rejects.toThrow('Failed to change DJ: Failed to update station DJ');
    });

    it('should handle update station errors', async () => {
      const error = new Error('Database connection failed');
      mockUpdateStation.mockRejectedValue(error);

      await expect(service.changeDJ('station-1', 'dj2'))
        .rejects.toThrow('Failed to change DJ: Database connection failed');
    });
  });

  describe('getAvailableDJs', () => {
    it('should return available DJs from cache when valid', async () => {
      // First call to populate cache
      const result1 = await service.getAvailableDJs();
      expect(result1).toHaveLength(2);
      expect(result1[0].name).toBe('Marcus');
      expect(result1[1].name).toBe('Sarah');

      // Second call should use cache
      const result2 = await service.getAvailableDJs();
      expect(result2).toEqual(result1);
    });

    it('should invalidate cache after TTL expires', () => {
      // Test cache invalidation method
      service.invalidateDJCache();
      expect(service['djCache']).toBeNull();
      expect(service['djCacheTimestamp']).toBe(0);
    });
  });

  describe('removeTrackFromPlaylist', () => {
    it('should successfully remove a track from playlist', async () => {
      const stationId = 'station-1';
      const trackId = 'track-1';
      const mockStation = { ...mockStations[0] };
      mockStation.playlist = mockStation.playlist.filter(t => t.id !== trackId);
      
      mockDeletePlaylistItem.mockResolvedValue(mockStation);

      const result = await service.removeTrackFromPlaylist(stationId, trackId);

      expect(mockDeletePlaylistItem).toHaveBeenCalledWith(stationId, trackId);
      expect(result).toEqual(mockStation);
      expect(result.playlist.find(t => t.id === trackId)).toBeUndefined();
    });

    it('should throw error when station not found', async () => {
      mockDeletePlaylistItem.mockResolvedValue(null);

      await expect(service.removeTrackFromPlaylist('invalid-station', 'track-1'))
        .rejects.toThrow('Failed to remove track: Station invalid-station not found');
    });
  });

  describe('reorderPlaylist', () => {
    it('should successfully reorder playlist items', async () => {
      const stationId = 'station-1';
      const newOrder = ['track-2', 'track-1'];
      const mockStation = { ...mockStations[0] };
      
      mockReorderPlaylistItems.mockResolvedValue(mockStation);

      const result = await service.reorderPlaylist(stationId, newOrder);

      expect(mockReorderPlaylistItems).toHaveBeenCalledWith(stationId, newOrder);
      expect(result).toEqual(mockStation);
    });

    it('should throw error when reorder fails', async () => {
      mockReorderPlaylistItems.mockResolvedValue(null);

      await expect(service.reorderPlaylist('station-1', ['track-1', 'track-2']))
        .rejects.toThrow('Failed to reorder playlist: Station station-1 not found');
    });
  });

  describe('moveTrack', () => {
    it('should successfully move track from one position to another', async () => {
      const stationId = 'station-1';
      const fromIndex = 0;
      const toIndex = 1;
      const mockStation = { ...mockStations[0] };
      
      mockGetStationById.mockResolvedValue(mockStation);
      mockReorderPlaylistItems.mockResolvedValue(mockStation);

      const result = await service.moveTrack(stationId, fromIndex, toIndex);

      expect(mockGetStationById).toHaveBeenCalledWith(stationId);
      expect(mockReorderPlaylistItems).toHaveBeenCalled();
      expect(result).toEqual(mockStation);
    });

    it('should throw error for invalid indices', async () => {
      const mockStation = { ...mockStations[0] };
      mockGetStationById.mockResolvedValue(mockStation);

      await expect(service.moveTrack('station-1', -1, 0))
        .rejects.toThrow('Invalid index for track movement');
        
      await expect(service.moveTrack('station-1', 0, 100))
        .rejects.toThrow('Invalid index for track movement');
    });
  });

  describe('removeMultipleTracks', () => {
    it('should successfully remove multiple tracks', async () => {
      const stationId = 'station-1';
      const trackIds = ['track-1', 'track-2'];
      const mockStation = { ...mockStations[0] };
      
      mockDeletePlaylistItem
        .mockResolvedValueOnce(mockStation)
        .mockResolvedValueOnce(mockStation);

      const result = await service.removeMultipleTracks(stationId, trackIds);

      expect(mockDeletePlaylistItem).toHaveBeenCalledTimes(2);
      expect(mockDeletePlaylistItem).toHaveBeenCalledWith(stationId, 'track-1');
      expect(mockDeletePlaylistItem).toHaveBeenCalledWith(stationId, 'track-2');
      expect(result).toEqual(mockStation);
    });

    it('should throw error when removal fails', async () => {
      mockDeletePlaylistItem.mockResolvedValue(null);

      await expect(service.removeMultipleTracks('station-1', ['track-1']))
        .rejects.toThrow('Failed to remove track: Station station-1 not found');
    });
  });

  describe('addTracksToPlaylist', () => {
    it('should successfully add multiple tracks to playlist', async () => {
      const stationId = 'station-1';
      const tracks = [
        createMockPlaylistItem({ title: 'New Track 1' }),
        createMockPlaylistItem({ title: 'New Track 2' })
      ].map(({ id, ...track }) => track); // Remove ID as it's generated
      
      const mockStation = { ...mockStations[0] };
      mockAddPlaylistItems.mockResolvedValue(mockStation);

      const result = await service.addTracksToPlaylist(stationId, tracks);

      expect(mockAddPlaylistItems).toHaveBeenCalledWith(stationId, tracks);
      expect(result).toEqual(mockStation);
    });

    it('should throw error when addition fails', async () => {
      mockAddPlaylistItems.mockResolvedValue(null);

      await expect(service.addTracksToPlaylist('station-1', []))
        .rejects.toThrow('Failed to add tracks: Station station-1 not found');
    });
  });

  describe('getPlaylistStats', () => {
    it('should calculate correct statistics for populated playlist', () => {
      const station = mockStations[0];
      const stats = service.getPlaylistStats(station);

      expect(stats.totalTracks).toBe(station.playlist.length);
      expect(stats.totalDuration).toBeGreaterThan(0);
      expect(stats.averageTrackDuration).toBeGreaterThan(0);
      expect(stats.typeDistribution.music).toBeGreaterThan(0);
    });

    it('should handle empty playlist', () => {
      const emptyStation: Station = {
        ...mockStations[0],
        playlist: []
      };
      
      const stats = service.getPlaylistStats(emptyStation);

      expect(stats.totalTracks).toBe(0);
      expect(stats.totalDuration).toBe(0);
      expect(stats.averageTrackDuration).toBe(0);
      expect(stats.genreDistribution).toEqual({});
      expect(stats.typeDistribution).toEqual({ music: 0, message: 0 });
    });

    it('should correctly distribute genres', () => {
      const station: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ genre: 'rock, blues' }),
          createMockPlaylistItem({ genre: 'rock' }),
          createMockPlaylistItem({ genre: 'jazz' })
        ]
      };

      const stats = service.getPlaylistStats(station);

      expect(stats.genreDistribution.rock).toBe(2);
      expect(stats.genreDistribution.blues).toBe(1);
      expect(stats.genreDistribution.jazz).toBe(1);
    });
  });

  describe('validatePlaylist', () => {
    it('should validate a healthy playlist', () => {
      const station = mockStations[0];
      const validation = service.validatePlaylist(station);

      expect(validation.isValid).toBe(true);
      // May have info-level issues but should still be valid
      expect(validation.issues.filter(issue => issue.type === 'error')).toHaveLength(0);
    });

    it('should identify empty playlist warning', () => {
      const emptyStation: Station = {
        ...mockStations[0],
        playlist: []
      };

      const validation = service.validatePlaylist(emptyStation);

      expect(validation.isValid).toBe(true); // Warning, not error
      expect(validation.issues).toHaveLength(1);
      expect(validation.issues[0].type).toBe('warning');
      expect(validation.issues[0].message).toBe('La playlist est vide');
    });

    it('should identify tracks without URLs as errors', () => {
      const station: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ url: '' }),
          createMockPlaylistItem({ url: 'valid-url' })
        ]
      };

      const validation = service.validatePlaylist(station);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.some(issue => 
        issue.type === 'error' && issue.message.includes('sans URL')
      )).toBe(true);
    });

    it('should provide recommendations for improvement', () => {
      const smallStation: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ duration: 60 }),
          createMockPlaylistItem({ duration: 60 })
        ]
      };

      const validation = service.validatePlaylist(smallStation);

      expect(validation.recommendations).toContain(
        'Une playlist d\'au moins 10 pistes est recommandée pour éviter les répétitions'
      );
      expect(validation.recommendations).toContain(
        'Ajoutez plus de contenu pour une diffusion continue plus longue'
      );
    });
  });

  describe('searchPlaylist', () => {
    it('should return all tracks for empty query', () => {
      const station = mockStations[0];
      const results = service.searchPlaylist(station, '');

      expect(results).toEqual(station.playlist);
    });

    it('should search by title', () => {
      const station: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ title: 'Rock Song' }),
          createMockPlaylistItem({ title: 'Jazz Melody' }),
          createMockPlaylistItem({ title: 'Blues Rock' })
        ]
      };

      const results = service.searchPlaylist(station, 'rock');

      expect(results).toHaveLength(2);
      expect(results.every(track => 
        track.title.toLowerCase().includes('rock')
      )).toBe(true);
    });

    it('should search by artist', () => {
      const station: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ artist: 'The Beatles' }),
          createMockPlaylistItem({ artist: 'Rolling Stones' }),
          createMockPlaylistItem({ artist: 'Led Zeppelin' })
        ]
      };

      const results = service.searchPlaylist(station, 'beatles');

      expect(results).toHaveLength(1);
      expect(results[0].artist).toBe('The Beatles');
    });
  });

  describe('filterPlaylistByType', () => {
    it('should filter by music type', () => {
      const station = mockStations[0];
      const results = service.filterPlaylistByType(station, 'music');

      expect(results.every(track => track.type === 'music')).toBe(true);
    });

    it('should filter by message type', () => {
      const station = mockStations[0];
      const results = service.filterPlaylistByType(station, 'message');

      expect(results.every(track => track.type === 'message')).toBe(true);
    });

    it('should return all tracks for "all" type', () => {
      const station = mockStations[0];
      const results = service.filterPlaylistByType(station, 'all');

      expect(results).toEqual(station.playlist);
    });
  });

  describe('findDuplicateTracks', () => {
    it('should identify duplicate tracks', () => {
      const station: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ id: '1', title: 'Same Song', artist: 'Artist A' }),
          createMockPlaylistItem({ id: '2', title: 'Different Song', artist: 'Artist B' }),
          createMockPlaylistItem({ id: '3', title: 'Same Song', artist: 'Artist A' }),
          createMockPlaylistItem({ id: '4', title: 'Another Song', artist: 'Artist C' })
        ]
      };

      const duplicates = service.findDuplicateTracks(station);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].original.title).toBe('Same Song');
      expect(duplicates[0].duplicates).toHaveLength(1);
      expect(duplicates[0].duplicates[0].id).toBe('3');
    });

    it('should return empty array when no duplicates exist', () => {
      const station: Station = {
        ...mockStations[0],
        playlist: [
          createMockPlaylistItem({ title: 'Song 1', artist: 'Artist A' }),
          createMockPlaylistItem({ title: 'Song 2', artist: 'Artist B' }),
          createMockPlaylistItem({ title: 'Song 3', artist: 'Artist C' })
        ]
      };

      const duplicates = service.findDuplicateTracks(station);

      expect(duplicates).toHaveLength(0);
    });
  });
});