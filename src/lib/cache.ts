// src/lib/cache.ts
'use client';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ClientCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000) { // 5 minutes par défaut
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  invalidate(key: string) {
    this.cache.delete(key);
  }
  
  invalidatePattern(pattern: string) {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
  
  clear() {
    this.cache.clear();
  }
}

export const clientCache = new ClientCache();

// Cache keys
export const CACHE_KEYS = {
  STATION_BY_FREQUENCY: (freq: number) => `station:${freq}`,
  USER_STATIONS: (userId: string) => `stations:${userId}`,
  ALL_STATIONS: 'stations:all',
  STATION_BY_ID: (id: string) => `station:id:${id}`,
} as const;

// Helper pour invalider le cache des stations
export function invalidateStationsCache(userId?: string) {
  clientCache.invalidatePattern('^station:');
  clientCache.invalidatePattern('^stations:');
  console.log('🔄 Cache des stations invalidé');
}