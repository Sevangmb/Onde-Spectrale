'use server';

import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  Timestamp 
} from 'firebase/firestore';
import type { Station } from '@/lib/types';
import type { StationQueryResult } from './types';
import { safeToISOString } from '@/lib/dateUtils';

function serializeStation(doc: any): Station {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: safeToISOString(data.createdAt),
    playlist: data.playlist || [],
  } as Station;
}

export async function getStationForFrequency(frequency: number): Promise<Station | null> {
  try {
    const stationsCol = collection(db, 'stations');
    const margin = 0.01;
    const lowerBound = frequency - margin;
    const upperBound = frequency + margin;

    const q = query(
      stationsCol, 
      where('frequency', '>=', lowerBound),
      where('frequency', '<=', upperBound)
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const stationDoc = querySnapshot.docs.sort((a, b) => 
      Math.abs(a.data().frequency - frequency) - Math.abs(b.data().frequency - frequency)
    )[0];
    
    return serializeStation(stationDoc);
  } catch (error) {
    console.error('Error fetching station:', error);
    return null;
  }
}

export async function getStationById(stationId: string): Promise<Station | null> {
  try {
    const stationRef = doc(db, 'stations', stationId);
    const stationDoc = await getDoc(stationRef);

    if (!stationDoc.exists()) {
      return null;
    }

    return serializeStation(stationDoc);
  } catch (error) {
    console.error('Error fetching station by ID:', error);
    return null;
  }
}

export async function getStationsForUser(userId: string): Promise<Station[]> {
  if (!userId) return [];
  
  try {
    const stationsCol = collection(db, 'stations');
    
    const [userQuery, systemQuery] = [
      query(stationsCol, where('ownerId', '==', userId)),
      query(stationsCol, where('ownerId', '==', 'system'))
    ];
    
    const [userSnapshot, systemSnapshot] = await Promise.all([
      getDocs(userQuery),
      getDocs(systemQuery)
    ]);
    
    const userStations = userSnapshot.docs.map(serializeStation);
    const systemStations = systemSnapshot.docs.map(serializeStation);
    
    return [...systemStations, ...userStations].sort((a, b) => a.frequency - b.frequency);
  } catch (error) {
    console.error('Error fetching user stations:', error);
    return [];
  }
}