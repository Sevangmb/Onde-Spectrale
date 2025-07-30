'use server';

import { revalidatePath } from 'next/cache';
import type { Station, PlaylistItem, CustomDJCharacter, DJCharacter, User } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, getDoc, setDoc, increment, serverTimestamp, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore';

// --- Actions are now modularized ---
import { getStationForFrequency, getStationById, getStationsForUser } from '@/actions/stations/queries';
import { createStation, createDefaultStations } from '@/actions/stations/mutations';
import { addMessageToStation, addMusicToStation, regenerateStationPlaylist } from '@/actions/stations/playlist';
import { previewCustomDjAudio, searchMusic, getAudioForTrack } from '@/actions/audio/generation';
import { updateUserOnLogin, updateUserFrequency, getUserData, createCustomDj, getCustomCharactersForUser } from '@/actions/users/queries';
import { getInterference } from '@/actions/stations/interference';


// Re-exporting all actions from the main file for compatibility
export {
  createDefaultStations,
  getStationForFrequency,
  getStationById,
  getStationsForUser,
  getInterference,
  createStation,
  previewCustomDjAudio,
  addMessageToStation,
  searchMusic,
  addMusicToStation,
  regenerateStationPlaylist,
  updateUserOnLogin,
  updateUserFrequency,
  getUserData,
  createCustomDj,
  getCustomCharactersForUser,
  getAudioForTrack
};


// The following are additional actions that might be used by older components.
// It's better to keep them here for now to avoid breaking changes.

/**
 * @deprecated Use actions from src/actions/stations/mutations.ts instead
 */
export async function deleteStation(stationId: string): Promise<boolean> {
  try {
    const stationRef = doc(db, 'stations', stationId);
    await deleteDoc(stationRef);
    revalidatePath('/admin/stations');
    revalidatePath('/');
    return true;
  } catch (error) {
    console.error('Error deleting station:', error);
    return false;
  }
}

/**
 * @deprecated Use actions from src/actions/stations/mutations.ts instead
 */
export async function updateStationData(stationId: string, data: Partial<Station>): Promise<Station | null> {
  try {
    const stationRef = doc(db, 'stations', stationId);
    await updateDoc(stationRef, data);
    const updatedDoc = await getDoc(stationRef);
    revalidatePath('/admin/stations');
    revalidatePath(`/admin/stations/${stationId}`);
    revalidatePath('/');
    return updatedDoc.exists() ? { id: updatedDoc.id, ...updatedDoc.data() } as Station : null;
  } catch (error) {
    console.error('Error updating station:', error);
    return null;
  }
}
