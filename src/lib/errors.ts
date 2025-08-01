// ========================================
// SYSTÈME DE GESTION D'ERREURS BACKEND
// ========================================

import { FirebaseError } from '@/types/firebase';

export enum ErrorCode {
  // Erreurs de validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Erreurs d'authentification et autorisation
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Erreurs de ressources
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',

  // Erreurs de service externe
  FIREBASE_ERROR = 'FIREBASE_ERROR',
  PLEX_ERROR = 'PLEX_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',

  // Erreurs système
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Erreurs métier spécifiques
  FREQUENCY_ALREADY_TAKEN = 'FREQUENCY_ALREADY_TAKEN',
  INVALID_FREQUENCY_RANGE = 'INVALID_FREQUENCY_RANGE',
  PLAYLIST_EMPTY = 'PLAYLIST_EMPTY',
  INVALID_AUDIO_FORMAT = 'INVALID_AUDIO_FORMAT',
  DJ_CHARACTER_NOT_FOUND = 'DJ_CHARACTER_NOT_FOUND',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  statusCode: number;
  timestamp: Date;
  context?: Record<string, unknown>;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export class BackendError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;
  public readonly userId?: string;
  public readonly sessionId?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    context?: Record<string, any>,
    userId?: string,
    sessionId?: string
  ) {
    super(message);
    this.name = 'BackendError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date();
    this.context = context;
    this.userId = userId;
    this.sessionId = sessionId;

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BackendError);
    }
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      userId: this.userId,
      sessionId: this.sessionId,
    };
  }

  static fromFirebaseError(error: FirebaseError | { code: string; message: string }, context?: Record<string, unknown>): BackendError {
    const firebaseErrorMap: Record<string, { code: ErrorCode; statusCode: number }> = {
      'permission-denied': { code: ErrorCode.FORBIDDEN, statusCode: 403 },
      'unauthenticated': { code: ErrorCode.UNAUTHORIZED, statusCode: 401 },
      'not-found': { code: ErrorCode.RESOURCE_NOT_FOUND, statusCode: 404 },
      'already-exists': { code: ErrorCode.RESOURCE_ALREADY_EXISTS, statusCode: 409 },
      'resource-exhausted': { code: ErrorCode.RESOURCE_LIMIT_EXCEEDED, statusCode: 429 },
      'invalid-argument': { code: ErrorCode.INVALID_INPUT, statusCode: 400 },
      'deadline-exceeded': { code: ErrorCode.TIMEOUT_ERROR, statusCode: 408 },
      'unavailable': { code: ErrorCode.DATABASE_CONNECTION_ERROR, statusCode: 503 },
    };

    const mapped = firebaseErrorMap[error.code] || {
      code: ErrorCode.FIREBASE_ERROR,
      statusCode: 500,
    };

    return new BackendError(
      mapped.code,
      error.message || 'Erreur Firebase inconnue',
      mapped.statusCode,
      { ...context, originalError: error.code }
    );
  }
}

// ========================================
// ERREURS PRÉDÉFINIES
// ========================================

export class ValidationError extends BackendError {
  constructor(message: string, field?: string, context?: Record<string, any>) {
    super(
      ErrorCode.VALIDATION_ERROR,
      message,
      400,
      { ...context, field }
    );
  }
}

export class AuthenticationError extends BackendError {
  constructor(message: string = 'Non authentifié', context?: Record<string, any>) {
    super(ErrorCode.UNAUTHORIZED, message, 401, context);
  }
}

export class AuthorizationError extends BackendError {
  constructor(message: string = 'Accès interdit', context?: Record<string, any>) {
    super(ErrorCode.FORBIDDEN, message, 403, context);
  }
}

export class ResourceNotFoundError extends BackendError {
  constructor(resource: string, identifier?: string, context?: Record<string, any>) {
    const message = identifier
      ? `${resource} avec l'identifiant '${identifier}' non trouvé`
      : `${resource} non trouvé`;
    
    super(
      ErrorCode.RESOURCE_NOT_FOUND,
      message,
      404,
      { ...context, resource, identifier }
    );
  }
}

export class ResourceConflictError extends BackendError {
  constructor(resource: string, reason: string, context?: Record<string, any>) {
    super(
      ErrorCode.RESOURCE_CONFLICT,
      `Conflit sur ${resource}: ${reason}`,
      409,
      { ...context, resource, reason }
    );
  }
}

export class FrequencyConflictError extends BackendError {
  constructor(frequency: number, existingStationName?: string) {
    const message = existingStationName
      ? `Fréquence ${frequency} MHz déjà occupée par '${existingStationName}'`
      : `Fréquence ${frequency} MHz déjà occupée`;
    
    super(
      ErrorCode.FREQUENCY_ALREADY_TAKEN,
      message,
      409,
      { frequency, existingStationName }
    );
  }
}

export class PlexServiceError extends BackendError {
  constructor(message: string, operation?: string, context?: Record<string, any>) {
    super(
      ErrorCode.PLEX_ERROR,
      `Erreur Plex: ${message}`,
      503,
      { ...context, operation }
    );
  }
}

export class AIServiceError extends BackendError {
  constructor(message: string, service?: string, context?: Record<string, any>) {
    super(
      ErrorCode.AI_SERVICE_ERROR,
      `Erreur service IA: ${message}`,
      503,
      { ...context, service }
    );
  }
}

// ========================================
// GESTIONNAIRE D'ERREURS CENTRALISÉ
// ========================================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorDetails[] = [];
  private readonly maxLogs = 1000;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Enregistrer une erreur
  logError(error: BackendError | Error, context?: Record<string, any>): void {
    let errorDetails: ErrorDetails;

    if (error instanceof BackendError) {
      errorDetails = error.toJSON();
    } else {
      errorDetails = {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: error.message,
        statusCode: 500,
        timestamp: new Date(),
        context,
        stack: error.stack,
      };
    }

    // Ajouter au log interne
    this.errorLogs.unshift(errorDetails);
    if (this.errorLogs.length > this.maxLogs) {
      this.errorLogs.pop();
    }

    // Log console en développement
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Backend Error:', errorDetails);
    }

    // TODO: Intégrer avec service de monitoring externe
    // Exemple: Sentry, LogRocket, etc.
  }

  // Récupérer les erreurs récentes
  getRecentErrors(limit: number = 50): ErrorDetails[] {
    return this.errorLogs.slice(0, limit);
  }

  // Statistiques d'erreurs
  getErrorStats(): {
    total: number;
    byCode: Record<string, number>;
    byStatusCode: Record<string, number>;
    last24h: number;
  } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const byCode: Record<string, number> = {};
    const byStatusCode: Record<string, number> = {};
    let last24h = 0;

    for (const error of this.errorLogs) {
      // Par code d'erreur
      byCode[error.code] = (byCode[error.code] || 0) + 1;
      
      // Par code de statut HTTP
      byStatusCode[error.statusCode.toString()] = 
        (byStatusCode[error.statusCode.toString()] || 0) + 1;
      
      // Dernières 24h
      if (error.timestamp > yesterday) {
        last24h++;
      }
    }

    return {
      total: this.errorLogs.length,
      byCode,
      byStatusCode,
      last24h,
    };
  }

  // Nettoyer les logs anciens
  clearOldLogs(olderThanDays: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    this.errorLogs = this.errorLogs.filter(
      error => error.timestamp > cutoffDate
    );
  }
}

// ========================================
// UTILITAIRES DE GESTION D'ERREURS
// ========================================

export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: Record<string, any>
): Promise<[BackendError | null, T | null]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[BackendError, null]>((error: any) => {
      let backendError: BackendError;
      
      if (error instanceof BackendError) {
        backendError = error;
      } else if (error.code && error.code.startsWith('auth/')) {
        backendError = BackendError.fromFirebaseError(error, context);
      } else {
        backendError = new BackendError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          error.message || 'Erreur inconnue',
          500,
          context
        );
      }
      
      ErrorHandler.getInstance().logError(backendError);
      return [backendError, null];
    });
}

export function createErrorResponse(error: BackendError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      context: error.context,
    },
    success: false,
  };
}

export function isRetryableError(error: BackendError): boolean {
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.TIMEOUT_ERROR,
    ErrorCode.DATABASE_CONNECTION_ERROR,
  ];
  
  return retryableCodes.includes(error.code);
}

// Singleton instance
export const errorHandler = ErrorHandler.getInstance();