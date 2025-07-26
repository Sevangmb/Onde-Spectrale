// src/lib/debug.ts
'use client';

import { getStationForFrequency } from '@/app/actions';
import { clientCache, CACHE_KEYS } from './cache';

export const radioDebug = {
  async testFrequency(frequency: number) {
    console.log(`🔍 Test de la fréquence ${frequency} MHz`);
    
    try {
      // Test sans cache
      const station = await getStationForFrequency(frequency);
      console.log(`Station trouvée:`, station);
      
      // Vérifier le cache
      const cacheKey = CACHE_KEYS.STATION_BY_FREQUENCY(frequency);
      const cached = clientCache.get(cacheKey);
      console.log(`Cache pour ${frequency}:`, cached);
      
      return { station, cached };
    } catch (error) {
      console.error(`Erreur test fréquence ${frequency}:`, error);
      return { error };
    }
  },
  
  async testMultipleFrequencies() {
    const frequencies = [87.6, 94.5, 100.7, 102.1, 98.2];
    console.log('🔍 Test de plusieurs fréquences:', frequencies);
    
    const results = await Promise.allSettled(
      frequencies.map(async (freq) => {
        const result = await this.testFrequency(freq);
        return { frequency: freq, ...result };
      })
    );
    
    console.table(results.map(r => 
      r.status === 'fulfilled' ? r.value : { error: r.reason }
    ));
    
    return results;
  },
  
  clearCache() {
    clientCache.clear();
    console.log('🧹 Cache complètement vidé');
  },
  
  showCacheContents() {
    const cache = (clientCache as any).cache;
    console.log('📦 Contenu du cache:');
    for (const [key, value] of cache.entries()) {
      console.log(`${key}:`, value);
    }
  }
};

// Exposer globalement en développement
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).radioDebug = radioDebug;
}