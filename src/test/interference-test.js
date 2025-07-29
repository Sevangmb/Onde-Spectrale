/**
 * Script de test pour vérifier le service d'interférence et l'autoplay
 * À exécuter dans la console du navigateur pour tester les fonctionnalités
 */

// Test de base du service d'interférence
async function testInterferenceService() {
  console.log('🧪 Test du service d\'interférence...');
  
  // Importer le service (dans un environnement browser)
  const { interferenceAudioService } = await import('../services/InterferenceAudioService.ts');
  
  try {
    // Test d'initialisation
    await interferenceAudioService.initialize();
    console.log('✅ Service initialisé');
    
    // Test de capacité d'autoplay
    const canAutoplay = await interferenceAudioService.testAutoplayCapability();
    console.log(`🎵 Autoplay possible: ${canAutoplay}`);
    
    // Test des sons d'interférence
    console.log('🔊 Test sons d\'interférence...');
    
    // Test fréquence basse (static)
    console.log('📻 Test fréquence 88.0 MHz (static)');
    await interferenceAudioService.playInterference(88.0, 'medium');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test fréquence moyenne (white noise)
    console.log('📻 Test fréquence 95.0 MHz (white noise)');
    await interferenceAudioService.playInterference(95.0, 'medium');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test fréquence haute (weak signal)
    console.log('📻 Test fréquence 105.0 MHz (weak signal)');
    await interferenceAudioService.playInterference(105.0, 'medium');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test arrêt
    console.log('⏹️ Arrêt de l\'interférence');
    interferenceAudioService.stopInterference();
    
    console.log('✅ Tous les tests passés !');
    
    return {
      initialized: true,
      autoplayCapable: canAutoplay,
      soundsWorking: true
    };
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return {
      initialized: false,
      error: error.message
    };
  }
}

// Test de transition entre fréquences
async function testFrequencyTransitions() {
  console.log('🔄 Test des transitions de fréquence...');
  
  const frequencies = [87.5, 92.3, 98.1, 104.7];
  const hasStations = [false, true, false, true]; // Simuler présence de stations
  
  for (let i = 0; i < frequencies.length; i++) {
    const freq = frequencies[i];
    const hasStation = hasStations[i];
    
    console.log(`📻 Transition vers ${freq} MHz - ${hasStation ? 'Station' : 'Interférence'}`);
    
    const { interferenceAudioService } = await import('../services/InterferenceAudioService.ts');
    await interferenceAudioService.transitionToFrequency(freq, hasStation);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('✅ Tests de transition terminés');
}

// Test du scan radio
async function testRadioScan() {
  console.log('📡 Test du scan radio...');
  
  const { interferenceAudioService } = await import('../services/InterferenceAudioService.ts');
  
  // Simuler un scan de 88.0 à 90.0
  for (let freq = 88.0; freq <= 90.0; freq += 0.2) {
    console.log(`📻 Scan: ${freq.toFixed(1)} MHz`);
    await interferenceAudioService.playInterference(freq, 'low');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('✅ Test de scan terminé');
}

// Fonction principale de test
async function runAllTests() {
  console.log('🚀 Démarrage des tests d\'interférence radio');
  console.log('=====================================');
  
  // Test 1: Service de base
  const basicTest = await testInterferenceService();
  console.log('📊 Résultats test de base:', basicTest);
  
  if (basicTest.initialized) {
    // Test 2: Transitions
    await testFrequencyTransitions();
    
    // Test 3: Scan
    await testRadioScan();
  }
  
  console.log('=====================================');
  console.log('🏁 Tests terminés');
}

// Instructions d'utilisation
console.log(`
📋 Instructions de test:
1. Ouvrir la console développeur (F12)
2. Naviguer vers http://localhost:9002
3. Coller ce script dans la console et appuyer Entrée
4. Exécuter: await runAllTests()

⚠️ Note: Les tests audio nécessitent une interaction utilisateur sur la page
`);

// Export pour utilisation dans le navigateur
if (typeof window !== 'undefined') {
  window.testInterference = {
    runAllTests,
    testInterferenceService,
    testFrequencyTransitions,
    testRadioScan
  };
}