// src/lib/debug.ts
'use client';

import { getStationForFrequency } from '@/app/actions';
import { simpleFixStation876 } from '@/app/actions-simple-fix';
import { clientCache, CACHE_KEYS } from './cache';

export const radioDebug = {
  async testFrequency(frequency: number) {
    console.log(`🔍 Test détaillé de la fréquence ${frequency} MHz`);
    
    try {
      // Test sans cache
      const station = await getStationForFrequency(frequency);
      console.log(`Station trouvée:`, station);
      
      if (station) {
        console.log(`📊 Détails de la station ${frequency} MHz:`);
        console.log(`  - Nom: ${station.name}`);
        console.log(`  - DJ ID: ${station.djCharacterId}`);
        console.log(`  - Thème: ${station.theme}`);
        console.log(`  - Propriétaire: ${station.ownerId}`);
        console.log(`  - Playlist: ${station.playlist?.length || 0} pistes`);
        
        // Vérifier les pistes de la playlist
        if (station.playlist && station.playlist.length > 0) {
          console.log(`  - Exemples de pistes:`);
          station.playlist.slice(0, 3).forEach((track, i) => {
            console.log(`    ${i+1}. ${track.type === 'message' ? '💬' : '🎵'} ${track.title} (${track.artist})`);
          });
        }
      }
      
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
  },

  async fix876() {
    console.log('🔧 Correction de la station 87.6 MHz...');
    try {
      const result = await simpleFixStation876();
      console.log('Résultat:', result);
      if (result.success) {
        console.log('✅ Station 87.6 MHz corrigée avec succès !');
        this.clearCache();
        // Re-tester la fréquence
        await this.testFrequency(87.6);
      } else {
        console.error('❌ Échec de la correction:', result.message);
      }
      return result;
    } catch (error) {
      console.error('❌ Erreur lors de la correction:', error);
      return { success: false, error };
    }
  }
};

// Exposer globalement en développement
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).radioDebug = radioDebug;
}
