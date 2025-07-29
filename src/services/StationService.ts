import type { Station, PlaylistItem } from '@/lib/types';
import { getStationForFrequency, createDefaultStations, updateUserFrequency } from '@/app/actions';

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
      console.log(`📻 Loading station for frequency ${frequency} (attempt ${retryCount + 1})`);
      
      const station = await getStationForFrequency(frequency);
      
      if (station) {
        console.log(`✅ Station loaded: ${station.name} at ${frequency} MHz`);
        return station;
      } else {
        console.log(`📭 No station found at ${frequency} MHz`);
        return null;
      }
      
    } catch (error) {
      console.error(`❌ Error loading station at ${frequency} MHz:`, error);
      
      if (retryCount < this.MAX_RETRIES) {
        console.log(`🔄 Retrying in ${this.RETRY_DELAY}ms...`);
        await this.delay(this.RETRY_DELAY);
        return this.loadStationWithRetry(frequency, retryCount + 1);
      }
      
      throw new Error(`Failed to load station after ${this.MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.log(`💾 Station cached for ${frequency} MHz`);
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
      console.log(`⏰ Cache expired for ${frequency} MHz`);
      this.cache.delete(frequency);
      return null;
    }
    
    console.log(`💾 Cache hit for ${frequency} MHz`);
    return cacheEntry.station;
  }
  
  invalidateStationCache(frequency?: number): void {
    if (frequency !== undefined) {
      const deleted = this.cache.delete(frequency);
      if (deleted) {
        console.log(`🗑️ Cache invalidated for ${frequency} MHz`);
      }
    } else {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`🗑️ All station cache cleared (${size} entries)`);
    }
  }
  
  async createDefaultStations(): Promise<void> {
    try {
      console.log('🏗️ Creating default stations...');
      await createDefaultStations();
      console.log('✅ Default stations created');
      
      // Invalidate cache to ensure fresh data
      this.invalidateStationCache();
    } catch (error) {
      console.error('❌ Error creating default stations:', error);
      throw error;
    }
  }
  
  async updateUserFrequency(userId: string, frequency: number): Promise<void> {
    try {
      await updateUserFrequency(userId, frequency);
      console.log(`👤 User frequency updated to ${frequency} MHz`);
    } catch (error) {
      console.error('❌ Error updating user frequency:', error);
      throw error;
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
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
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
    
    console.log(`🔄 Preloading ${frequencies.length} nearby stations...`);
    
    // Load stations in parallel but with limited concurrency
    const loadPromises = frequencies.map(freq => 
      this.loadStationForFrequency(freq).catch(error => {
        console.warn(`Failed to preload station at ${freq} MHz:`, error);
        return null;
      })
    );
    
    await Promise.allSettled(loadPromises);
    console.log(`✅ Preloading completed`);
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