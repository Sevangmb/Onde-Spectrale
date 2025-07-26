// API route pour corriger la station 87.6 MHz
import { NextResponse } from 'next/server';
import { fixSpecificStation, verifyDefaultStations } from '@/app/actions-improved';

export async function POST() {
  try {
    console.log('🔧 API: Début de la correction de la station 87.6 MHz');
    
    // 1. Vérifier l'état actuel
    const verification = await verifyDefaultStations();
    const station876 = verification.frequencies.find(f => f.frequency === 87.6);
    
    console.log('État actuel de 87.6 MHz:', station876);
    
    // 2. Corriger la station
    const result = await fixSpecificStation(87.6);
    
    if (result.success) {
      console.log('✅ Station 87.6 MHz corrigée:', result.station);
      
      // 3. Vérification finale
      const finalVerification = await verifyDefaultStations();
      const finalStation876 = finalVerification.frequencies.find(f => f.frequency === 87.6);
      
      return NextResponse.json({
        success: true,
        message: 'Station 87.6 MHz corrigée avec succès',
        before: station876,
        after: finalStation876,
        correctionResult: result
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Échec de la correction',
        error: result.message,
        before: station876
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error('❌ Erreur API de correction:', error);
    return NextResponse.json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Juste vérifier l'état actuel
    const verification = await verifyDefaultStations();
    const station876 = verification.frequencies.find(f => f.frequency === 87.6);
    
    return NextResponse.json({
      frequency: 87.6,
      station: station876,
      message: station876?.exists 
        ? `Station trouvée: ${station876.station?.name} avec DJ ${station876.station?.djCharacterId || 'inconnu'}`
        : 'Aucune station sur 87.6 MHz'
    });
    
  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}