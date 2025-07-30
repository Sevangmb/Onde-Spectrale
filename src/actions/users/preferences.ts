
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Note: The UserPreferences interface should ideally be shared, but for simplicity
// we define it here. In a real app, it would be in a shared types file.
export interface UserPreferences {
  defaultVolume: number;
  autoPlay: boolean;
  crossfade: boolean;
  theme: 'classic' | 'modern' | 'minimal';
  showVisualizer: boolean;
  showLyrics: boolean;
  compactMode: boolean;
  favoriteGenres: string[];
  skipIntros: boolean;
  autoTune: boolean;
  emergencyAlerts: boolean;
  newTrackNotifications: boolean;
  stationChangeNotifications: boolean;
}

export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { preferences });
    console.log(`Preferences updated for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
}

export async function getUserPreferences(
  userId: string
): Promise<UserPreferences | null> {
  if (!userId) {
    return null;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.preferences as UserPreferences || null;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}
