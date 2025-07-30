import type { Station, PlaylistItem, CustomDJCharacter } from '@/lib/types';

// ========================================
// SERVICE DE CACHE BACKEND AVANCÉ
// ========================================

export interface CacheConfig {
  defaultTTL: number; // Time to live en millisecondes
  maxSize: number; // Nombre maximum d'entrées en mémoire
  persistToStorage: boolean; // Sauvegarder dans localStorage/sessionStorage
  compressionEnabled: boolean; // Compression des données
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  compressed?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  memoryUsage: number; // Estimation en bytes
  hitRate: number; // Pourcentage de hits
  totalHits: number;
  totalMisses: number;
  oldestEntry?: number; // timestamp
  newestEntry?: number; // timestamp
}

export enum CacheLevel {
  L1_MEMORY = 'L1_MEMORY', // Cache mémoire ultra-rapide
  L2_SESSION = 'L2_SESSION', // SessionStorage (par onglet)
  L3_LOCAL = 'L3_LOCAL', // LocalStorage (persistant)
}

export class EnhancedCacheService {
  private static instance: EnhancedCacheService;
  
  // Multi-level caches
  private memoryCache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  
  // Statistiques
  private stats = {
    hits: 0,
    misses: 0,
    writes: 0,
    evictions: 0,
  };

  // Timers pour cleanup automatique
  private cleanupInterval?: NodeJS.Timeout;
  private compressionWorker?: Worker;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes par défaut
      maxSize: 500, // 500 entrées max en mémoire
      persistToStorage: true,
      compressionEnabled: false, // Désactivé par défaut pour éviter la complexité
      ...config,
    };

    this.startCleanupScheduler();
    this.loadFromPersistentStorage();
  }

  static getInstance(config?: Partial<CacheConfig>): EnhancedCacheService {
    if (!EnhancedCacheService.instance) {
      EnhancedCacheService.instance = new EnhancedCacheService(config);
    }
    return EnhancedCacheService.instance;
  }

  // ========================================
  // OPÉRATIONS DE CACHE PRINCIPALES
  // ========================================

  async get<T>(key: string, level: CacheLevel = CacheLevel.L1_MEMORY): Promise<T | null> {
    // Vérifier d'abord le cache mémoire (L1)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.updateAccessStats(memoryEntry);
      this.stats.hits++;
      return memoryEntry.data as T;
    }

    // Si pas trouvé en mémoire, chercher dans les niveaux inférieurs
    if (level !== CacheLevel.L1_MEMORY && this.config.persistToStorage) {
      const persistedData = await this.getFromPersistentStorage<T>(key, level);
      if (persistedData !== null) {
        // Promouvoir vers le cache mémoire
        await this.set(key, persistedData, this.config.defaultTTL, CacheLevel.L1_MEMORY);
        this.stats.hits++;
        return persistedData;
      }
    }

    this.stats.misses++;
    return null;
  }

  async set<T>(
    key: string,
    data: T,
    ttl: number = this.config.defaultTTL,
    level: CacheLevel = CacheLevel.L1_MEMORY
  ): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now,
    };

    // Compression si activée
    if (this.config.compressionEnabled && this.shouldCompress(data)) {
      entry.data = await this.compressData(data);
      entry.compressed = true;
    }

    // Stocker selon le niveau demandé
    switch (level) {
      case CacheLevel.L1_MEMORY:
        await this.setInMemory(key, entry);
        break;
      case CacheLevel.L2_SESSION:
        await this.setInStorage(key, entry, 'sessionStorage');
        break;
      case CacheLevel.L3_LOCAL:
        await this.setInStorage(key, entry, 'localStorage');
        break;
    }

    this.stats.writes++;
  }

  async delete(key: string, allLevels: boolean = false): Promise<boolean> {
    let deleted = false;

    // Supprimer du cache mémoire
    if (this.memoryCache.has(key)) {
      this.memoryCache.delete(key);
      deleted = true;
    }

    // Supprimer des storages persistants si demandé
    if (allLevels && this.config.persistToStorage) {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(`cache_${key}`);
          localStorage.removeItem(`cache_${key}`);
        }
        deleted = true;
      } catch (error) {
        console.warn('Erreur suppression storage:', error);
      }
    }

    return deleted;
  }

  async clear(level?: CacheLevel): Promise<void> {
    if (!level || level === CacheLevel.L1_MEMORY) {
      this.memoryCache.clear();
    }

    if ((!level || level === CacheLevel.L2_SESSION) && typeof window !== 'undefined') {
      try {
        const keys = Object.keys(sessionStorage).filter(key => key.startsWith('cache_'));
        keys.forEach(key => sessionStorage.removeItem(key));
      } catch (error) {
        console.warn('Erreur nettoyage sessionStorage:', error);
      }
    }

    if ((!level || level === CacheLevel.L3_LOCAL) && typeof window !== 'undefined') {
      try {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('cache_'));
        keys.forEach(key => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Erreur nettoyage localStorage:', error);
      }
    }
  }

  // ========================================
  // MÉTHODES SPÉCIFIQUES AU DOMAINE
  // ========================================

  // Cache pour stations
  async getStation(frequency: number): Promise<Station | null> {
    return this.get<Station>(`station_${frequency}`);
  }

  async setStation(station: Station, ttl?: number): Promise<void> {
    await this.set(`station_${station.frequency}`, station, ttl);
    
    // Cache également par ID pour les lookups
    await this.set(`station_id_${station.id}`, station, ttl);
  }

  // Cache pour playlists
  async getPlaylist(stationId: string): Promise<PlaylistItem[] | null> {
    return this.get<PlaylistItem[]>(`playlist_${stationId}`);
  }

  async setPlaylist(stationId: string, playlist: PlaylistItem[], ttl?: number): Promise<void> {
    await this.set(`playlist_${stationId}`, playlist, ttl);
  }

  // Cache pour DJ characters
  async getDJCharacters(userId?: string): Promise<CustomDJCharacter[] | null> {
    const key = userId ? `dj_characters_${userId}` : 'dj_characters_all';
    return this.get<CustomDJCharacter[]>(key);
  }

  async setDJCharacters(characters: CustomDJCharacter[], userId?: string, ttl?: number): Promise<void> {
    const key = userId ? `dj_characters_${userId}` : 'dj_characters_all';
    await this.set(key, characters, ttl);
  }

  // Cache pour données Plex
  async getPlexTracks(genre?: string): Promise<any[] | null> {
    const key = genre ? `plex_tracks_${genre}` : 'plex_tracks_all';
    return this.get<any[]>(key);
  }

  async setPlexTracks(tracks: any[], genre?: string, ttl: number = 10 * 60 * 1000): Promise<void> {
    const key = genre ? `plex_tracks_${genre}` : 'plex_tracks_all';
    await this.set(key, tracks, ttl);
  }

  // ========================================
  // MÉTHODES PRIVÉES
  // ========================================

  private async setInMemory<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Vérifier la limite de taille
    if (this.memoryCache.size >= this.config.maxSize) {
      await this.evictLeastUsed();
    }

    this.memoryCache.set(key, entry);

    // Persister si configuré
    if (this.config.persistToStorage) {
      await this.setInStorage(key, entry, 'sessionStorage');
    }
  }

  private async setInStorage<T>(
    key: string,
    entry: CacheEntry<T>,
    storageType: 'localStorage' | 'sessionStorage'
  ): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
      const serialized = JSON.stringify(entry);
      storage.setItem(`cache_${key}`, serialized);
    } catch (error) {
      console.warn(`Erreur sauvegarde ${storageType}:`, error);
      // Storage plein ou indisponible, continuer sans erreur fatale
    }
  }

  private async getFromPersistentStorage<T>(
    key: string,
    level: CacheLevel
  ): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    try {
      const storage = level === CacheLevel.L3_LOCAL ? localStorage : sessionStorage;
      const serialized = storage.getItem(`cache_${key}`);
      
      if (!serialized) return null;

      const entry: CacheEntry<T> = JSON.parse(serialized);
      if (!this.isValid(entry)) {
        storage.removeItem(`cache_${key}`);
        return null;
      }

      // Décompresser si nécessaire
      if (entry.compressed) {
        entry.data = await this.decompressData(entry.data);
        entry.compressed = false;
      }

      return entry.data;
    } catch (error) {
      console.warn('Erreur lecture storage:', error);
      return null;
    }
  }

  private isValid<T>(entry: CacheEntry<T>): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  private updateAccessStats<T>(entry: CacheEntry<T>): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  private async evictLeastUsed(): Promise<void> {
    if (this.memoryCache.size === 0) return;

    // Trouver l'entrée la moins utilisée (LRU)
    let lruKey = '';
    let oldestAccess = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.memoryCache.delete(lruKey);
      this.stats.evictions++;
    }
  }

  private shouldCompress<T>(data: T): boolean {
    try {
      const serialized = JSON.stringify(data);
      return serialized.length > 1024; // Compresser si > 1KB
    } catch {
      return false;
    }
  }

  private async compressData<T>(data: T): Promise<string> {
    // Implémentation basique - dans un vrai projet, utiliser une vraie lib de compression
    try {
      const json = JSON.stringify(data);
      // Ici vous pourriez utiliser pako, lz-string, etc.
      return btoa(json); // Base64 comme placeholder
    } catch {
      return JSON.stringify(data);
    }
  }

  private async decompressData(compressedData: string): Promise<any> {
    try {
      const json = atob(compressedData);
      return JSON.parse(json);
    } catch {
      return compressedData;
    }
  }

  private startCleanupScheduler(): void {
    // Nettoyage automatique toutes les 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 10 * 60 * 1000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => {
      this.memoryCache.delete(key);
      this.stats.evictions++;
    });

    if (toDelete.length > 0) {
      console.log(`🗑️ Cache cleanup: ${toDelete.length} entrées expirées supprimées`);
    }
  }

  private loadFromPersistentStorage(): void {
    // Charger quelques entrées critiques depuis le storage au démarrage
    if (typeof window === 'undefined') return;

    try {
      // Charger les stations récemment utilisées
      const keys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('cache_station_') && key.length < 20 // Éviter les clés trop longues
      );

      keys.slice(0, 10).forEach(key => { // Limiter à 10 entrées au démarrage
        try {
          const data = sessionStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data);
            const cacheKey = key.replace('cache_', '');
            if (this.isValid(entry)) {
              this.memoryCache.set(cacheKey, entry);
            }
          }
        } catch (error) {
          console.warn('Erreur chargement cache entry:', error);
        }
      });
    } catch (error) {
      console.warn('Erreur chargement cache initial:', error);
    }
  }

  // ========================================
  // MÉTHODES PUBLIQUES D'ADMINISTRATION
  // ========================================

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;
    let memoryUsage = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
      
      // Estimation grossière de l'usage mémoire
      try {
        memoryUsage += JSON.stringify(entry).length * 2; // *2 pour UTF-16
      } catch {
        memoryUsage += 1024; // Estimation par défaut
      }
    }

    return {
      totalEntries: this.memoryCache.size,
      memoryUsage,
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      oldestEntry,
      newestEntry,
    };
  }

  // Précharger des données critiques
  async preload(keys: string[]): Promise<void> {
    const promises = keys.map(key => this.get(key));
    await Promise.allSettled(promises);
  }

  // Invalider un pattern de clés
  async invalidatePattern(pattern: RegExp): Promise<number> {
    let invalidated = 0;
    const toDelete: string[] = [];

    for (const key of this.memoryCache.keys()) {
      if (pattern.test(key)) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      await this.delete(key, true);
      invalidated++;
    }

    return invalidated;
  }

  // Nettoyer et arrêter le service
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }

    this.memoryCache.clear();
  }
}

// Instance singleton
export const enhancedCacheService = EnhancedCacheService.getInstance();