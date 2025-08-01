'use client';

import { BaseService, type ServiceResult } from './BaseService';

interface CacheConfig {
  defaultTTL?: number;
  maxMemorySize?: number;
  enablePersistence?: boolean;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheMetrics {
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  cacheSize: number;
}

/**
 * Enhanced multi-layer caching service
 */
export class EnhancedCacheService extends BaseService {
  private static instance: EnhancedCacheService | null = null;
  
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: Required<CacheConfig>;
  private metrics = {
    totalRequests: 0,
    totalHits: 0
  };

  private constructor(config: CacheConfig = {}) {
    super('EnhancedCacheService', {
      enableCaching: false,
      enableMetrics: true,
      retryAttempts: 1
    });

    this.config = {
      defaultTTL: config.defaultTTL ?? 300000, // 5 minutes
      maxMemorySize: config.maxMemorySize ?? 50 * 1024 * 1024, // 50MB
      enablePersistence: config.enablePersistence ?? true
    };
  }

  static getInstance(config?: CacheConfig): EnhancedCacheService {
    if (!EnhancedCacheService.instance) {
      EnhancedCacheService.instance = new EnhancedCacheService(config);
    }
    return EnhancedCacheService.instance;
  }

  async get<T>(key: string): Promise<ServiceResult<T | null>> {
    return this.execute(
      async () => {
        this.metrics.totalRequests++;

        const memoryEntry = this.memoryCache.get(key);
        if (memoryEntry && memoryEntry.expiresAt > Date.now()) {
          memoryEntry.lastAccessed = Date.now();
          memoryEntry.accessCount++;
          this.metrics.totalHits++;
          return memoryEntry.data as T;
        }

        return null;
      },
      'get',
      { retryable: false }
    );
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<ServiceResult<void>> {
    return this.execute(
      async () => {
        const actualTTL = ttl ?? this.config.defaultTTL;
        const size = this.estimateSize(value);
        
        const entry: CacheEntry<T> = {
          data: value,
          expiresAt: Date.now() + actualTTL,
          accessCount: 1,
          lastAccessed: Date.now(),
          size
        };

        this.memoryCache.set(key, entry);
      },
      'set',
      { retryable: false }
    );
  }

  getMetrics(): CacheMetrics {
    const hitRate = this.metrics.totalRequests > 0 
      ? this.metrics.totalHits / this.metrics.totalRequests 
      : 0;

    return {
      hitRate,
      totalRequests: this.metrics.totalRequests,
      totalHits: this.metrics.totalHits,
      cacheSize: this.memoryCache.size
    };
  }

  private estimateSize(value: any): number {
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 1024;
    }
  }
}

export const enhancedCacheService = EnhancedCacheService.getInstance();
export default enhancedCacheService;