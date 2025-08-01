/**
 * Export centralisé de tous les types personnalisés
 */

// Types existants (réexportés pour compatibilité)
export * from '../lib/types';

// Nouveaux types spécialisés
export * from './plex';
export * from './firebase';
export * from './monitoring';

// Types utilitaires
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Types pour les réponses API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

// Types pour les hooks
export interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseFormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
}

// Types pour les services
export interface ServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  accessCount: number;
  lastAccess: number;
}

// Types pour les événements
export interface AppEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source: string;
}

export interface UserEvent extends AppEvent {
  userId: string;
  sessionId: string;
}

// Types pour la configuration
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  version: string;
  features: Record<string, boolean>;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  cache: {
    defaultTtl: number;
    maxSize: number;
    strategy: 'lru' | 'fifo' | 'lfu';
  };
  monitoring: {
    enabled: boolean;
    sampleRate: number;
    endpoint?: string;
  };
}