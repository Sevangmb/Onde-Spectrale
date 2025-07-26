// src/app/actions-simple-fix.ts
'use server';

import { revalidatePath } from 'next/cache';

// Import direct et simple
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { DJ_CHARACTERS } from '@/lib/data';

export async function simpleFixStation876(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    console.log('🔧 Correction simple de la station 87.6 MHz');
    const db = getFirestore(app);
    
    // 1. Chercher et supprimer la station existante sur 87.6 MHz
    const stationsCol = collection(db, 'stations');
    const frequencyQuery = query(
      stationsCol, 
      where('frequency', '>=', 87.5),
      where('frequency', '<=', 87.7)
    );
    
    const existingSnapshot = await getDocs(frequencyQuery);
    console.log(`Trouvé ${existingSnapshot.docs.length} station(s) sur 87.6 MHz`);
    
    // Supprimer les stations existantes
    for (const stationDoc of existingSnapshot.docs) {
      const data = stationDoc.data();
      console.log(`🗑️ Suppression: ${data.name} (DJ: ${data.djCharacterId})`);
      await deleteDoc(doc(db, 'stations', stationDoc.id));
    }
    
    // 2. Créer la nouvelle station Radio Liberty avec Sarah
    const sarah = DJ_CHARACTERS.find(dj => dj.id === 'sarah') || DJ_CHARACTERS[0];
    
    const newStationData = {
      name: 'Radio Liberty',
      frequency: 87.6,
      djCharacterId: 'sarah',
      theme: 'Nouvelles de l\'aube et musiques de liberté',
      ownerId: 'system',
      playlist: [
        {
          id: `${Date.now()}-msg-1`,
          type: 'message',
          title: 'Message de Sarah',
          content: 'Bonjour à tous les survivants ! Ici Sarah depuis Radio Liberty. Nous diffusons les nouvelles de l\'aube et des musiques de liberté pour illuminer vos journées dans les terres désolées.',
          artist: 'Sarah',
          duration: 15,
          url: '',
          addedAt: new Date().toISOString(),
        },
        {
          id: `${Date.now()}-msg-2`,
          type: 'message',
          title: 'Bulletin de Sarah',
          content: 'C\'est une belle journée pour commencer un nouveau chapitre. Radio Liberty vous accompagne avec espoir et détermination.',
          artist: 'Sarah',
          duration: 12,
          url: '',
          addedAt: new Date().toISOString(),
        },
        {
          id: `${Date.now()}-msg-3`,
          type: 'message',
          title: 'Message d\'espoir',
          content: 'N\'oubliez jamais : même dans les moments les plus sombres, la lumière trouve toujours un moyen de percer. Gardez espoir, survivants.',
          artist: 'Sarah',
          duration: 18,
          url: '',
          addedAt: new Date().toISOString(),
        },
        {
          id: `${Date.now()}-msg-4`,
          type: 'message',
          title: 'Transition musicale',
          content: 'Et maintenant, un peu de musique pour vous accompagner dans votre journée. Radio Liberty, toujours avec vous.',
          artist: 'Sarah',
          duration: 8,
          url: '',
          addedAt: new Date().toISOString(),
        }
      ],
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, 'stations'), newStationData);
    console.log(`✅ Station Radio Liberty créée avec ID: ${docRef.id}`);
    
    // 3. Invalider les caches
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath('/admin/stations');
    
    return {
      success: true,
      message: 'Station 87.6 MHz corrigée : Radio Liberty avec Sarah créée',
      details: {
        stationId: docRef.id,
        name: newStationData.name,
        djCharacterId: newStationData.djCharacterId,
        frequency: newStationData.frequency,
        playlistLength: newStationData.playlist.length
      }
    };
    
  } catch (error: any) {
    console.error('❌ Erreur lors de la correction simple:', error);
    return {
      success: false,
      message: `Erreur: ${error.message}`
    };
  }
}