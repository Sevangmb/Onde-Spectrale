import type { Station, PlaylistItem } from '@/lib/types';
import { getStationForFrequency, createDefaultStations, updateUserFrequency } from '@/app/actions';
import logger from '@/lib/logger';
import { BackendError, ErrorCode, handleAsyncError } from '@/lib/errors';

export interface StationServiceInterface {
  loadStationForFrequency(frequency: number): Promise<Station | null>;
  cacheStation(frequency: number, station: Station): void;
  getCachedStation(frequency: number): Station | null;
  invalidateStationCache(frequency?: number): void;
  createDefaultStations(): Promise<void>;
  updateUserFrequency(userId: string, frequency: number): Promise<void>;
}

interface StationCache {
  station: Station;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class StationService implements StationServiceInterface {
  private cache: Map<number, StationCache> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly MAX_RETRIES = 3;
  
  private loadingPromises: Map<number, Promise<Station | null>> = new Map();
  
  async loadStationForFrequency(frequency: number): Promise<Station | null> {
    // Check if we're already loading this frequency
    const existingPromise = this.loadingPromises.get(frequency);
    if (existingPromise) {
      return existingPromise;
    }
    
    // Check cache first
    const cachedStation = this.getCachedStation(frequency);
    if (cachedStation) {
      return cachedStation;
    }
    
    // Create loading promise
    const loadingPromise = this.loadStationWithRetry(frequency);
    this.loadingPromises.set(frequency, loadingPromise);
    
    try {
      const station = await loadingPromise;
      
      // Cache successful result
      if (station) {
        this.cacheStation(frequency, station);
      }
      
      return station;
    } finally {
      // Clean up loading promise
      this.loadingPromises.delete(frequency);
    }
  }
  
  private async loadStationWithRetry(frequency: number, retryCount = 0): Promise<Station | null> {
    try {
      logger.info(`Loading station for frequency ${frequency}`, 'StationService', {
        frequency,
        attempt: retryCount + 1,
        maxRetries: this.MAX_RETRIES
      });
      
      const station = await getStationForFrequency(frequency);
      
      if (station) {
        logger.info(`Station loaded successfully`, 'StationService', {
          stationName: station.name,
          frequency,
          stationId: station.id
        });
        return station;
      } else {
        logger.debug(`No station found at frequency`, 'StationService', { frequency });
        return null;
      }
      
    } catch (error) {
      logger.error(`Error loading station`, 'StationService', {
        frequency,
        attempt: retryCount + 1,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (retryCount < this.MAX_RETRIES) {
        logger.debug(`Retrying station load`, 'StationService', {
          frequency,
          retryDelay: this.RETRY_DELAY,
          nextAttempt: retryCount + 2
        });
        await this.delay(this.RETRY_DELAY);
        return this.loadStationWithRetry(frequency, retryCount + 1);
      }
      
      throw new BackendError(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Failed to load station after ${this.MAX_RETRIES} attempts`,
        404,
        { frequency, attempts: this.MAX_RETRIES, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  cacheStation(frequency: number, station: Station): void {
    const cacheEntry: StationCache = {
      station: { ...station }, // Deep copy to prevent mutations
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL,
    };
    
    this.cache.set(frequency, cacheEntry);
    logger.debug(`Station cached`, 'StationService', { frequency, ttl: this.DEFAULT_TTL });
  }
  
  getCachedStation(frequency: number): Station | null {
    const cacheEntry = this.cache.get(frequency);
    
    if (!cacheEntry) {
      return null;
    }
    
    // Check if cache entry is still valid
    const now = Date.now();
    const isExpired = (now - cacheEntry.timestamp) > cacheEntry.ttl;
    
    if (isExpired) {
      logger.debug(`Cache expired`, 'StationService', { frequency, age: now - cacheEntry.timestamp });
      this.cache.delete(frequency);
      return null;
    }
    
    logger.debug(`Cache hit`, 'StationService', { frequency });
    return cacheEntry.station;
  }
  
  invalidateStationCache(frequency?: number): void {
    if (frequency !== undefined) {
      const deleted = this.cache.delete(frequency);
      if (deleted) {
        logger.debug(`Cache invalidated for frequency`, 'StationService', { frequency });
      }
    } else {
      const size = this.cache.size;
      this.cache.clear();
      logger.info(`All station cache cleared`, 'StationService', { entriesCleared: size });
    }
  }
  
  async createDefaultStations(): Promise<void> {
    try {
      logger.info('Creating default stations', 'StationService');
      const [error] = await handleAsyncError(createDefaultStations());
      if (error) {
        throw error;
      }
      logger.info('Default stations created successfully', 'StationService');
      
      // Invalidate cache to ensure fresh data
      this.invalidateStationCache();
    } catch (error) {
      logger.error('Error creating default stations', 'StationService', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error instanceof BackendError ? error : new BackendError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to create default stations',
        500,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  async updateUserFrequency(userId: string, frequency: number): Promise<void> {
    try {
      await updateUserFrequency(userId, frequency);
      logger.info('User frequency updated', 'StationService', { userId, frequency });
    } catch (error) {
      logger.error('Error updating user frequency', 'StationService', {
        userId,
        frequency,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error instanceof BackendError ? error : new BackendError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        'Failed to update user frequency',
        500,
        { userId, frequency, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
  
  // Performance monitoring
  getCacheStats(): { size: number; hitRate: number; entries: Array<{ frequency: number; age: number; isExpired: boolean }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([frequency, entry]) => ({
      frequency,
      age: now - entry.timestamp,
      isExpired: (now - entry.timestamp) > entry.ttl,
    }));
    
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      entries,
    };
  }
  
  // Cleanup expired entries
  cleanupExpiredEntries(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [frequency, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        this.cache.delete(frequency);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('Cache cleanup completed', 'StationService', { entriesRemoved: cleanedCount });
    }
    
    return cleanedCount;
  }
  
  // Preload stations for better UX
  async preloadNearbyStations(currentFrequency: number, range = 2.0): Promise<void> {
    const startFreq = Math.max(87.0, currentFrequency - range);
    const endFreq = Math.min(108.0, currentFrequency + range);
    
    const frequencies: number[] = [];
    for (let freq = startFreq; freq <= endFreq; freq += 0.5) {
      if (freq !== currentFrequency && !this.getCachedStation(freq)) {
        frequencies.push(freq);
      }
    }
    
    logger.info('Preloading nearby stations', 'StationService', {
      currentFrequency,
      range,
      stationsToLoad: frequencies.length
    });
    
    // Load stations in parallel but with limited concurrency
    const loadPromises = frequencies.map(freq => 
      this.loadStationForFrequency(freq).catch(error => {
        logger.warn('Failed to preload station', 'StationService', {
          frequency: freq,
          error: error instanceof Error ? error.message : String(error)
        });
        return null;
      })
    );
    
    await Promise.allSettled(loadPromises);
    logger.info('Station preloading completed', 'StationService', {
      currentFrequency,
      stationsPreloaded: frequencies.length
    });
  }
}

// Singleton instance
export const stationService = new StationService();

// Auto-cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    stationService.cleanupExpiredEntries();
  }, 5 * 60 * 1000);
}