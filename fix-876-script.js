// Script pour corriger la station 87.6 MHz
// À exécuter dans la console du navigateur sur l'application

async function fixStation876() {
  console.log('🔧 Début de la correction de la station 87.6 MHz...');
  
  try {
    // 1. Test de l'état actuel
    console.log('📍 Étape 1: Test de l\'état actuel');
    const currentState = await radioDebug.testFrequency(87.6);
    console.log('État actuel:', currentState);
    
    // 2. Nettoyage du cache
    console.log('📍 Étape 2: Nettoyage du cache');
    radioDebug.clearCache();
    
    // 3. Correction de la station
    console.log('📍 Étape 3: Correction automatique');
    const result = await radioDebug.fix876();
    
    if (result.success) {
      console.log('✅ Station 87.6 MHz corrigée avec succès !');
      console.log('Détails:', result);
      
      // 4. Attendre un peu et re-tester
      console.log('📍 Étape 4: Vérification finale');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const finalState = await radioDebug.testFrequency(87.6);
      console.log('État final:', finalState);
      
      if (finalState.station && finalState.station.djCharacterId === 'sarah') {
        console.log('🎉 SUCCÈS: Sarah diffuse maintenant sur 87.6 MHz !');
        console.log(`Station: ${finalState.station.name}`);
        console.log(`DJ: ${finalState.station.djCharacterId}`);
        console.log(`Thème: ${finalState.station.theme}`);
      } else {
        console.log('⚠️ La correction n\'a pas fonctionné comme attendu');
      }
      
    } else {
      console.error('❌ Échec de la correction:', result);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
  }
}

// Lancer la correction
fixStation876();