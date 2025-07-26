// src/app/actions-improved.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db, collection, query, where, getDocs, deleteDoc, doc } from '@/lib/firebase';
import { createDefaultStations, getStationForFrequency } from './actions';

export async function resetAndCreateDefaultStations(): Promise<{ success: boolean; message: string; stations: any[] }> {
  try {
    console.log('🔄 Début de la réinitialisation des stations par défaut');
    
    // 1. Supprimer toutes les stations système existantes
    const stationsCol = collection(db, 'stations');
    const systemQuery = query(stationsCol, where('ownerId', '==', 'system'));
    const systemSnapshot = await getDocs(systemQuery);
    
    console.log(`🗑️ Suppression de ${systemSnapshot.docs.length} stations système existantes`);
    for (const stationDoc of systemSnapshot.docs) {
      await deleteDoc(doc(db, 'stations', stationDoc.id));
    }
    
    // 2. Re-créer les stations par défaut
    await createDefaultStations();
    
    // 3. Vérifier que toutes les stations ont été créées
    const expectedFrequencies = [87.6, 94.5, 98.2, 100.7, 102.1];
    const verificationResults = [];
    
    for (const freq of expectedFrequencies) {
      const station = await getStationForFrequency(freq);
      verificationResults.push({
        frequency: freq,
        station: station ? { id: station.id, name: station.name } : null,
        created: !!station
      });
    }
    
    const successCount = verificationResults.filter(r => r.created).length;
    console.log(`✅ ${successCount}/${expectedFrequencies.length} stations créées avec succès`);
    
    // 4. Revalider les caches
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/stations');
    
    return {
      success: successCount === expectedFrequencies.length,
      message: `${successCount}/${expectedFrequencies.length} stations par défaut créées`,
      stations: verificationResults
    };
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      stations: []
    };
  }
}

export async function verifyDefaultStations(): Promise<{ frequencies: any[]; missingCount: number }> {
  const expectedFrequencies = [87.6, 94.5, 98.2, 100.7, 102.1];
  const results = [];
  
  for (const freq of expectedFrequencies) {
    try {
      const station = await getStationForFrequency(freq);
      results.push({
        frequency: freq,
        exists: !!station,
        station: station ? { id: station.id, name: station.name, playlistLength: station.playlist?.length || 0 } : null
      });
    } catch (error) {
      results.push({
        frequency: freq,
        exists: false,
        error: (error as Error).message
      });
    }
  }
  
  const missingCount = results.filter(r => !r.exists).length;
  console.log('🔍 Vérification des stations par défaut:', results);
  
  return {
    frequencies: results,
    missingCount
  };
}