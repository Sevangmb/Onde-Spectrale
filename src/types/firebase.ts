/**
 * Types pour l'intégration Firebase
 */

import { Timestamp, DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';

export interface FirebaseDocument {
  id: string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData: Array<{
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
    providerId: string;
  }>;
}

export interface FirebaseError {
  code: string;
  message: string;
  name: string;
  stack?: string;
}

export interface FirestoreQueryOptions {
  limit?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'array-contains-any' | 'not-in';
    value: unknown;
  }>;
  startAfter?: DocumentSnapshot;
  endBefore?: DocumentSnapshot;
}

export interface FirestoreBatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data?: Record<string, unknown>;
}

export interface FirestoreSerializedDocument {
  id: string;
  data: Record<string, unknown>;
  exists: boolean;
  metadata: {
    hasPendingWrites: boolean;
    fromCache: boolean;
  };
}

export type FirestoreDocumentConverter<T> = {
  toFirestore: (data: T) => Record<string, unknown>;
  fromFirestore: (snapshot: QueryDocumentSnapshot | DocumentSnapshot) => T;
};

export interface FirebaseStorageMetadata {
  bucket: string;
  fullPath: string;
  generation: string;
  metageneration: string;
  name: string;
  size: number;
  timeCreated: string;
  updated: string;
  md5Hash?: string;
  cacheControl?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType?: string;
  customMetadata?: Record<string, string>;
}

export interface FirebaseUploadResult {
  ref: {
    bucket: string;
    fullPath: string;
    name: string;
  };
  metadata: FirebaseStorageMetadata;
  downloadURL?: string;
}