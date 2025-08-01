import { z } from 'zod';
import type { Station, PlaylistItem, CustomDJCharacter, User } from './types';

// ========================================
// SCHEMAS DE VALIDATION BACKEND
// ========================================

// Station Schemas
export const StationCreateSchema = z.object({
  name: z.string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(50, 'Le nom ne doit pas dépasser 50 caractères')
    .regex(/^[a-zA-Z0-9\s\-'éèêëàâäôöîïûüç]+$/, 'Caractères non autorisés dans le nom'),
  frequency: z.number()
    .min(87.0, 'Fréquence minimum 87.0 MHz')
    .max(108.0, 'Fréquence maximum 108.0 MHz')
    .refine(val => Number((val * 10).toFixed(1)) % 1 === 0, 'Fréquence doit être en dixièmes'),
  djCharacterId: z.string()
    .min(1, 'DJ requis')
    .max(50, 'ID DJ invalide'),
  theme: z.string()
    .min(5, 'Le thème doit contenir au moins 5 caractères')
    .max(200, 'Le thème ne doit pas dépasser 200 caractères'),
  ownerId: z.string()
    .min(1, 'Propriétaire requis')
    .max(100, 'ID propriétaire invalide'),
});

export const StationUpdateSchema = StationCreateSchema.partial().extend({
  id: z.string().min(1, 'ID station requis'),
});

// Playlist Schemas
export const PlaylistItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['message', 'music']),
  title: z.string()
    .min(1, 'Titre requis')
    .max(100, 'Titre trop long'),
  content: z.string()
    .min(1, 'Contenu requis')
    .max(1000, 'Contenu trop long'),
  artist: z.string().max(100, 'Nom artiste trop long').optional(),
  album: z.string().max(100, 'Nom album trop long').optional(),
  year: z.number().min(1900).max(2030).optional(),
  genre: z.string().max(200, 'Genre trop long').optional(),
  artwork: z.string().url('URL artwork invalide').optional(),
  url: z.string().url('URL audio invalide'),
  duration: z.number()
    .min(1, 'Durée minimum 1 seconde')
    .max(3600, 'Durée maximum 1 heure'),
  plexKey: z.string().optional(),
});

export const PlaylistUpdateSchema = z.object({
  stationId: z.string().min(1, 'ID station requis'),
  items: z.array(PlaylistItemSchema)
    .min(1, 'Au moins un élément requis')
    .max(100, 'Maximum 100 éléments'),
});

// DJ Character Schemas
export const CustomDJSchema = z.object({
  name: z.string()
    .min(2, 'Nom minimum 2 caractères')
    .max(30, 'Nom maximum 30 caractères')
    .regex(/^[a-zA-Z\s\-'éèêëàâäôöîïûüç]+$/, 'Nom invalide'),
  description: z.string()
    .min(10, 'Description minimum 10 caractères')
    .max(500, 'Description maximum 500 caractères'),
  voice: z.object({
    gender: z.enum(['male', 'female', 'neutral']),
    tone: z.enum(['friendly', 'serious', 'energetic', 'calm', 'mysterious']),
    style: z.enum(['casual', 'professional', 'dramatic', 'humorous']),
  }),
  ownerId: z.string().min(1, 'Propriétaire requis'),
});

// User Schemas
export const UserUpdateSchema = z.object({
  id: z.string().min(1, 'ID utilisateur requis'),
  lastFrequency: z.number()
    .min(87.0, 'Fréquence minimum 87.0 MHz')
    .max(108.0, 'Fréquence maximum 108.0 MHz')
    .optional(),
});

// API Request Schemas
export const FrequencyQuerySchema = z.object({
  frequency: z.number()
    .min(87.0, 'Fréquence minimum 87.0 MHz')
    .max(108.0, 'Fréquence maximum 108.0 MHz'),
});

export const PaginationSchema = z.object({
  page: z.number().min(1, 'Page minimum 1').default(1),
  limit: z.number().min(1, 'Limite minimum 1').max(100, 'Limite maximum 100').default(20),
  sortBy: z.enum(['frequency', 'name', 'createdAt']).default('frequency'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const SearchQuerySchema = z.object({
  query: z.string()
    .min(1, 'Requête requise')
    .max(100, 'Requête trop longue'),
  type: z.enum(['stations', 'playlists', 'djs']).default('stations'),
});

// ========================================
// VALIDATEURS DE SÉCURITÉ
// ========================================

export class SecurityValidator {
  // Validation des permissions utilisateur
  static validateUserOwnership(userId: string, resourceOwnerId: string): boolean {
    if (!userId || !resourceOwnerId) return false;
    return userId === resourceOwnerId || resourceOwnerId === 'system';
  }

  // Validation des fréquences libres
  static validateFrequencyAvailability(frequency: number, existingStations: Station[]): boolean {
    return !existingStations.some(station => 
      Math.abs(station.frequency - frequency) < 0.1
    );
  }

  // Validation des limites utilisateur
  static validateUserLimits(userId: string, userStations: Station[]): {
    canCreate: boolean;
    limit: number;
    current: number;
  } {
    const limit = userId === 'system' ? 1000 : 10; // Limite pour utilisateurs normaux
    const current = userStations.length;
    
    return {
      canCreate: current < limit,
      limit,
      current,
    };
  }

  // Validation du contenu (anti-spam/contenu inapproprié)
  static validateContent(content: string): {
    isValid: boolean;
    reason?: string;
  } {
    // Mots interdits basiques
    const forbiddenWords = ['spam', 'hack', 'cheat', 'exploit'];
    const lowerContent = content.toLowerCase();
    
    for (const word of forbiddenWords) {
      if (lowerContent.includes(word)) {
        return {
          isValid: false,
          reason: `Contenu interdit détecté: ${word}`,
        };
      }
    }

    // Validation longueur excessive
    if (content.length > 5000) {
      return {
        isValid: false,
        reason: 'Contenu trop long',
      };
    }

    return { isValid: true };
  }

  // Validation des URLs et ressources externes
  static validateExternalResource(url: string): {
    isValid: boolean;
    reason?: string;
  } {
    try {
      const urlObj = new URL(url);
      
      // Domaines autorisés
      const allowedDomains = [
        'firebasestorage.googleapis.com',
        'storage.googleapis.com',
        'plexapp.com',
        'plex.tv',
        // Ajoutez vos domaines autorisés
      ];

      const isAllowed = allowedDomains.some(domain => 
        urlObj.hostname.includes(domain)
      );

      if (!isAllowed) {
        return {
          isValid: false,
          reason: `Domaine non autorisé: ${urlObj.hostname}`,
        };
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        reason: 'URL invalide',
      };
    }
  }
}

// ========================================
// TYPES DE VALIDATION
// ========================================

export type ValidationResult<T> = {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    field?: string;
    code?: string;
  };
};

export type SecurityCheck = {
  passed: boolean;
  reason?: string;
  level: 'info' | 'warning' | 'error';
};

// ========================================
// HELPER FUNCTIONS
// ========================================

export function validateAndSanitize<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const validated = schema.parse(data);
    return {
      success: true,
      data: validated,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: {
          message: firstError.message,
          field: firstError.path.join('.'),
          code: firstError.code,
        },
      };
    }
    
    return {
      success: false,
      error: {
        message: 'Erreur de validation inconnue',
        code: 'UNKNOWN_ERROR',
      },
    };
  }
}

export function createSecurityContext(userId: string, role: string = 'user') {
  return {
    userId,
    role,
    permissions: {
      canCreateStation: role === 'admin' || role === 'user',
      canEditAnyStation: role === 'admin',
      canDeleteAnyStation: role === 'admin',
      maxStations: role === 'admin' ? 1000 : 10,
    },
  };
}