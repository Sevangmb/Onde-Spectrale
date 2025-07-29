export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
}

export interface CacheServiceInterface {
  get<T>(key: string): T | null;
  set<T>(key: string, data: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
  has(key: string): boolean;
  isExpired(key: string): boolean;
  getStats(): CacheStats;
  cleanup(): number;
}

export interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  expiredCount: number;
}

export class CacheService implements CacheServiceInterface {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hitCount: 0,
    missCount: 0,
    expiredCount: 0,
  };
  
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.missCount++;
      return null;
    }
    
    if (this.isEntryExpired(entry)) {
      this.cache.delete(key);
      this.stats.expiredCount++;
      this.stats.missCount++;
      return null;
    }
    
    this.stats.hitCount++;
    return entry.data;
  }
  
  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: this.generateVersion(data),
    };
    
    this.cache.set(key, entry);
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.resetStats();
  }
  
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isEntryExpired(entry)) {
      this.cache.delete(key);
      this.stats.expiredCount++;
      return false;
    }
    
    return true;
  }
  
  isExpired(key: string): boolean {
    const entry = this.cache.get(key);
    return !entry || this.isEntryExpired(entry);
  }
  
  private isEntryExpired(entry: CacheEntry<any>): boolean {
    return (Date.now() - entry.timestamp) > entry.ttl;
  }
  
  private generateVersion(data: any): string {
    // Simple hash function for version tracking
    return JSON.stringify(data).length.toString(36) + Date.now().toString(36);
  }
  
  getStats(): CacheStats {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;
    
    return {
      size: this.cache.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      expiredCount: this.stats.expiredCount,
    };
  }
  
  cleanup(): number {
    const sizeBefore = this.cache.size;
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        this.cache.delete(key);
        this.stats.expiredCount++;
      }
    }
    
    return sizeBefore - this.cache.size;
  }
  
  private resetStats(): void {
    this.stats = {
      hitCount: 0,
      missCount: 0,
      expiredCount: 0,
    };
  }
  
  // Advanced cache methods
  
  refresh<T>(key: string, dataProvider: () => Promise<T>, ttl?: number): Promise<T> {
    return new Promise(async (resolve, reject) => {
      try {
        const data = await dataProvider();
        this.set(key, data, ttl);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  getOrSet<T>(key: string, dataProvider: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }
    
    return this.refresh(key, dataProvider, ttl);
  }
  
  // Batch operations
  getMultiple<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      results.set(key, this.get<T>(key));
    }
    
    return results;
  }
  
  setMultiple<T>(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl);
    }
  }
  
  deleteMultiple(keys: string[]): number {
    let deleteCount = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deleteCount++;
      }
    }
    return deleteCount;
  }
  
  // Pattern-based operations
  getKeysByPattern(pattern: RegExp): string[] {
    const matchingKeys: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        matchingKeys.push(key);
      }
    }
    
    return matchingKeys;
  }
  
  deleteByPattern(pattern: RegExp): number {
    const matchingKeys = this.getKeysByPattern(pattern);
    return this.deleteMultiple(matchingKeys);
  }
  
  // Memory management
  evictLRU(maxSize: number): number {
    if (this.cache.size <= maxSize) return 0;
    
    // Sort entries by timestamp (oldest first)
    const sortedEntries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toEvict = this.cache.size - maxSize;
    let evictedCount = 0;
    
    for (let i = 0; i < toEvict && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i];
      if (this.cache.delete(key)) {
        evictedCount++;
      }
    }
    
    return evictedCount;
  }
  
  // Export/Import for persistence
  export(): string {
    const exportData = {
      cache: Array.from(this.cache.entries()),
      stats: this.stats,
      timestamp: Date.now(),
    };
    
    return JSON.stringify(exportData);
  }
  
  import(data: string): boolean {
    try {
      const importData = JSON.parse(data);
      
      // Validate import data
      if (!importData.cache || !Array.isArray(importData.cache)) {
        return false;
      }
      
      // Clear current cache
      this.clear();
      
      // Import entries
      for (const [key, entry] of importData.cache) {
        // Only import non-expired entries
        if (!this.isEntryExpired(entry)) {
          this.cache.set(key, entry);
        }
      }
      
      // Import stats if available
      if (importData.stats) {
        this.stats = { ...this.stats, ...importData.stats };
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import cache data:', error);
      return false;
    }
  }
}

// Multi-level cache implementation
export class MultiLevelCacheService {
  private l1Cache: CacheService; // Memory cache
  private l2Cache: CacheService; // Session storage cache
  private l3Cache: CacheService; // Local storage cache
  
  constructor() {
    this.l1Cache = new CacheService();
    this.l2Cache = new CacheService();
    this.l3Cache = new CacheService();
    
    // Load from persistent storage on initialization
    this.loadFromPersistentStorage();
  }
  
  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first (memory)
    let data = this.l1Cache.get<T>(key);
    if (data !== null) {
      return data;
    }
    
    // Try L2 cache (session storage)
    data = this.l2Cache.get<T>(key);
    if (data !== null) {
      // Promote to L1 cache
      this.l1Cache.set(key, data);
      return data;
    }
    
    // Try L3 cache (local storage)
    data = this.l3Cache.get<T>(key);
    if (data !== null) {
      // Promote to L1 and L2 caches
      this.l1Cache.set(key, data);
      this.l2Cache.set(key, data);
      return data;
    }
    
    return null;
  }
  
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    // Set in all cache levels
    this.l1Cache.set(key, data, ttl);
    this.l2Cache.set(key, data, ttl);
    this.l3Cache.set(key, data, ttl);
    
    // Persist to storage
    this.saveToPersistentStorage();
  }
  
  private loadFromPersistentStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Load from localStorage
      const l3Data = localStorage.getItem('onde-spectrale-l3-cache');
      if (l3Data) {
        this.l3Cache.import(l3Data);
      }
      
      // Load from sessionStorage
      const l2Data = sessionStorage.getItem('onde-spectrale-l2-cache');
      if (l2Data) {
        this.l2Cache.import(l2Data);
      }
    } catch (error) {
      console.warn('Failed to load from persistent storage:', error);
    }
  }
  
  private saveToPersistentStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      // Save to localStorage (L3)
      localStorage.setItem('onde-spectrale-l3-cache', this.l3Cache.export());
      
      // Save to sessionStorage (L2)
      sessionStorage.setItem('onde-spectrale-l2-cache', this.l2Cache.export());
    } catch (error) {
      console.warn('Failed to save to persistent storage:', error);
    }
  }
  
  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('onde-spectrale-l3-cache');
      sessionStorage.removeItem('onde-spectrale-l2-cache');
    }
  }
  
  getStats() {
    return {
      l1: this.l1Cache.getStats(),
      l2: this.l2Cache.getStats(),
      l3: this.l3Cache.getStats(),
    };
  }
}

// Singleton instances
export const cacheService = new CacheService();
export const multiLevelCache = new MultiLevelCacheService();

// Auto-cleanup for browser environments
if (typeof window !== 'undefined') {
  // Cleanup expired entries every 5 minutes
  setInterval(() => {
    cacheService.cleanup();
  }, 5 * 60 * 1000);
  
  // Save cache state before page unload
  window.addEventListener('beforeunload', () => {
    try {
      localStorage.setItem('onde-spectrale-cache-export', cacheService.export());
    } catch (error) {
      console.warn('Failed to save cache on unload:', error);
    }
  });
}