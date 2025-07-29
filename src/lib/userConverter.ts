import { User as FirebaseUser } from 'firebase/auth';
import { User as AppUser } from '@/lib/types';

/**
 * Convert Firebase User to App User structure
 * Handles the type mismatch between Firebase auth and app user model
 */
export function convertFirebaseUser(firebaseUser: FirebaseUser): AppUser {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    stationsCreated: 0, // Will be loaded from Firestore if needed
    lastFrequency: 100.7, // Default frequency
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
  };
}

/**
 * Get user ID regardless of Firebase or App User type
 */
export function getAppUserId(user: FirebaseUser | AppUser | null): string | null {
  if (!user) return null;
  
  // Check if it's Firebase User (has uid property)
  if ('uid' in user) {
    return user.uid;
  }
  
  // Check if it's App User (has id property)
  if ('id' in user) {
    return user.id;
  }
  
  return null;
}

/**
 * Type guards for user types
 */
export function isFirebaseUser(user: any): user is FirebaseUser {
  return user && typeof user.uid === 'string' && user.email !== undefined;
}

export function isAppUser(user: any): user is AppUser {
  return user && typeof user.id === 'string' && typeof user.stationsCreated === 'number';
}

/**
 * Safe user conversion with validation
 */
export function safeConvertUser(user: FirebaseUser | AppUser | null): AppUser | null {
  if (!user) return null;
  
  if (isAppUser(user)) {
    return user;
  }
  
  if (isFirebaseUser(user)) {
    return convertFirebaseUser(user);
  }
  
  console.warn('Unknown user type received:', user);
  return null;
}

/**
 * Get user email regardless of type
 */
export function getUserEmail(user: FirebaseUser | AppUser | null): string | null {
  return user?.email || null;
}

/**
 * Check if user is authenticated (has valid ID)
 */
export function isUserAuthenticated(user: FirebaseUser | AppUser | null): boolean {
  return getAppUserId(user) !== null;
}

/**
 * Enhanced user data with Firestore integration
 */
export interface EnhancedAppUser extends AppUser {
  firebaseUser?: FirebaseUser;
  isLoaded?: boolean;
}

/**
 * Create enhanced user from Firebase user with Firestore data
 */
export function createEnhancedUser(
  firebaseUser: FirebaseUser,
  firestoreData?: Partial<AppUser>
): EnhancedAppUser {
  const baseUser = convertFirebaseUser(firebaseUser);
  
  return {
    ...baseUser,
    ...firestoreData, // Override with Firestore data if available
    firebaseUser,
    isLoaded: !!firestoreData,
  };
}