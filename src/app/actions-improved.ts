// src/app/actions-improved.ts
'use server';

import { revalidatePath } from 'next/cache';
import { db, collection, query, where, getDocs, deleteDoc, doc } from '@/lib/firebase';
import { createDefaultStations, getStationForFrequency } from './actions';

export async function fixSpecificStation(frequency: number): Promise<{ success: boolean; message: string; station: any }> {
  try {
    console.log(`🔧 Correction de la station ${frequency} MHz`);
    
    // 1. Supprimer la station existante sur cette fréquence
    const existing = await getStationForFrequency(frequency);
    if (existing) {
      console.log(`🗑️ Suppression de l'ancienne station: ${existing.name} (DJ: ${existing.djCharacterId})`);
      await deleteDoc(doc(db, 'stations', existing.id));
    }
    
    // 2. Re-créer les stations par défaut (qui inclut maintenant 87.6 MHz)
    await createDefaultStations();
    
    // 3. Vérifier la nouvelle station
    const newStation = await getStationForFrequency(frequency);
    
    if (newStation) {
      console.log(`✅ Nouvelle station créée: ${newStation.name} (DJ: ${newStation.djCharacterId})`);
      
      // 4. Revalider les caches
      revalidatePath('/');
      revalidatePath('/admin');
      revalidatePath('/admin/stations');
      
      return {
        success: true,
        message: `Station ${frequency} MHz mise à jour: ${newStation.name} avec DJ ${newStation.djCharacterId}`,
        station: {
          frequency: newStation.frequency,
          name: newStation.name,
          djCharacterId: newStation.djCharacterId,
          theme: newStation.theme
        }
      };
    } else {
      return {
        success: false,
        message: `Échec de la création de la station ${frequency} MHz`,
        station: null
      };
    }
    
  } catch (error: any) {
    console.error(`❌ Erreur lors de la correction de ${frequency} MHz:`, error);
    return {
      success: false,
      message: `Erreur: ${error.message}`,
      station: null
    };
  }
}

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