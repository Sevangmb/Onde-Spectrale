import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  startAfter,
  endBefore,
  DocumentSnapshot,
  QuerySnapshot,
  WriteBatch,
  writeBatch,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { safeToISOString } from '@/lib/dateUtils';
import type { Station, PlaylistItem, CustomDJCharacter, User } from '@/lib/types';
import { enhancedCacheService } from './EnhancedCacheService';
import { BackendError, ErrorCode, handleAsyncError } from '@/lib/errors';
import { validateAndSanitize, StationCreateSchema, StationUpdateSchema } from '@/lib/validation';

// ========================================
// SERVICE FIREBASE OPTIMISÉ
// ========================================

export interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: any;
  endBefore?: any;
  useCache?: boolean;
  cacheTTL?: number;
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  id?: string;
  data?: any;
}

export interface PaginationResult<T> {
  data: T[];
  hasNext: boolean;
  hasPrevious: boolean;
  totalCount?: number;
  lastDoc?: DocumentSnapshot;
  firstDoc?: DocumentSnapshot;
}

export class OptimizedFirebaseService {
  private static instance: OptimizedFirebaseService;
  private activeListeners = new Map<string, () => void>();
  private batchQueue: BatchOperation[] = [];
  private batchTimer?: NodeJS.Timeout;
  private readonly BATCH_DELAY = 100; // 100ms de délai pour batcher les opérations

  private constructor() {}

  static getInstance(): OptimizedFirebaseService {
    if (!OptimizedFirebaseService.instance) {
      OptimizedFirebaseService.instance = new OptimizedFirebaseService();
    }
    return OptimizedFirebaseService.instance;
  }

  // ========================================
  // OPÉRATIONS STATIONS OPTIMISÉES
  // ========================================

  async getStationByFrequency(
    frequency: number,
    options: QueryOptions = {}
  ): Promise<Station | null> {
    const cacheKey = `station_${frequency}`;
    
    // Vérifier le cache d'abord si activé
    if (options.useCache !== false) {
      const cached = await enhancedCacheService.getStation(frequency);
      if (cached) {
        return cached;
      }
    }

    const [error, querySnapshot] = await handleAsyncError(
      getDocs(query(
        collection(db, 'stations'),
        where('frequency', '==', frequency),
        limit(1)
      ))
    );

    if (error) {
      throw error;
    }

    if (querySnapshot!.empty) {
      return null;
    }

    const stationDoc = querySnapshot!.docs[0];
    const station = this.serializeStation(stationDoc);
    
    // Mettre en cache si activé
    if (options.useCache !== false) {
      await enhancedCacheService.setStation(station, options.cacheTTL);
    }

    return station;
  }

  async getStationsInRange(
    minFreq: number,
    maxFreq: number,
    options: QueryOptions = {}
  ): Promise<Station[]> {
    const cacheKey = `stations_range_${minFreq}_${maxFreq}`;
    
    // Vérifier le cache
    if (options.useCache !== false) {
      const cached = await enhancedCacheService.get<Station[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    let baseQuery = query(
      collection(db, 'stations'),
      where('frequency', '>=', minFreq),
      where('frequency', '<=', maxFreq),
      orderBy('frequency', 'asc')
    );

    if (options.limit) {
      baseQuery = query(baseQuery, limit(options.limit));
    }

    const [error, querySnapshot] = await handleAsyncError(getDocs(baseQuery));

    if (error) {
      throw error;
    }

    const stations = querySnapshot!.docs.map(doc => this.serializeStation(doc));
    
    // Mettre en cache
    if (options.useCache !== false) {
      await enhancedCacheService.set(cacheKey, stations, options.cacheTTL);
    }

    return stations;
  }

  async createStation(stationData: any): Promise<Station> {
    // Validation
    const validation = validateAndSanitize(StationCreateSchema, stationData);
    if (!validation.success) {
      throw new BackendError(
        ErrorCode.VALIDATION_ERROR,
        validation.error!.message,
        400,
        { field: validation.error!.field }
      );
    }

    const validatedData = validation.data!;

    // Vérifier que la fréquence est libre
    const existingStation = await this.getStationByFrequency(validatedData.frequency);
    if (existingStation) {
      throw new BackendError(
        ErrorCode.FREQUENCY_ALREADY_TAKEN,
        `Fréquence ${validatedData.frequency} MHz déjà occupée`,
        409,
        { frequency: validatedData.frequency, existingStation: existingStation.name }
      );
    }

    const stationDoc = {
      ...validatedData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const [error, docRef] = await handleAsyncError(
      addDoc(collection(db, 'stations'), stationDoc)
    );

    if (error) {
      throw error;
    }

    const newStation: Station = {
      id: docRef!.id,
      ...validatedData,
      createdAt: safeToISOString(new Date()),
      playlist: [], // validatedData.playlist || [],
    };

    // Invalider le cache des ranges qui pourraient inclure cette station
    await this.invalidateStationCaches(validatedData.frequency);
    
    // Mettre en cache la nouvelle station
    await enhancedCacheService.setStation(newStation);

    return newStation;
  }

  async updateStation(stationId: string, updates: Partial<Station>): Promise<Station> {
    // Validation
    const validation = validateAndSanitize(StationUpdateSchema, { id: stationId, ...updates });
    if (!validation.success) {
      throw new BackendError(
        ErrorCode.VALIDATION_ERROR,
        validation.error!.message,
        400,
        { field: validation.error!.field }
      );
    }

    const validatedUpdates = validation.data!;
    // delete validatedUpdates.id; // Retirer l'ID des updates

    // Vérifier que la station existe
    const stationRef = doc(db, 'stations', stationId);
    const [getError, stationDoc] = await handleAsyncError(getDoc(stationRef));

    if (getError) {
      throw getError;
    }

    if (!stationDoc!.exists()) {
      throw new BackendError(
        ErrorCode.RESOURCE_NOT_FOUND,
        `Station avec l'ID ${stationId} non trouvée`,
        404,
        { stationId }
      );
    }

    // Si on change la fréquence, vérifier qu'elle est libre
    if (validatedUpdates.frequency) {
      const existingStation = await this.getStationByFrequency(validatedUpdates.frequency);
      if (existingStation && existingStation.id !== stationId) {
        throw new BackendError(
          ErrorCode.FREQUENCY_ALREADY_TAKEN,
          `Fréquence ${validatedUpdates.frequency} MHz déjà occupée`,
          409,
          { frequency: validatedUpdates.frequency }
        );
      }
    }

    const updateData = {
      ...validatedUpdates,
      updatedAt: serverTimestamp(),
    };

    const [updateError] = await handleAsyncError(updateDoc(stationRef, updateData));

    if (updateError) {
      throw updateError;
    }

    // Récupérer la station mise à jour
    const [getUpdatedError, updatedDoc] = await handleAsyncError(getDoc(stationRef));

    if (getUpdatedError) {
      throw getUpdatedError;
    }

    const updatedStation = this.serializeStation(updatedDoc!);

    // Invalider les caches
    await this.invalidateStationCaches(updatedStation.frequency);
    if (validatedUpdates.frequency && validatedUpdates.frequency !== updatedStation.frequency) {
      await this.invalidateStationCaches(validatedUpdates.frequency);
    }

    // Mettre à jour le cache
    await enhancedCacheService.setStation(updatedStation);

    return updatedStation;
  }

  async deleteStation(stationId: string): Promise<boolean> {
    // Récupérer la station pour obtenir sa fréquence (pour le cache)
    const stationRef = doc(db, 'stations', stationId);
    const [getError, stationDoc] = await handleAsyncError(getDoc(stationRef));

    if (getError) {
      throw getError;
    }

    if (!stationDoc!.exists()) {
      return false; // Déjà supprimée
    }

    const station = this.serializeStation(stationDoc!);

    const [deleteError] = await handleAsyncError(deleteDoc(stationRef));

    if (deleteError) {
      throw deleteError;
    }

    // Invalider les caches
    await this.invalidateStationCaches(station.frequency);
    await enhancedCacheService.delete(`station_${station.frequency}`, true);
    await enhancedCacheService.delete(`station_id_${stationId}`, true);

    return true;
  }

  // ========================================
  // OPÉRATIONS BATCH OPTIMISÉES
  // ========================================

  async executeBatch(operations: BatchOperation[]): Promise<void> {
    if (operations.length === 0) return;

    const batch = writeBatch(db);
    const cacheInvalidations: string[] = [];

    for (const operation of operations) {
      const collectionRef = collection(db, operation.collection);
      
      switch (operation.type) {
        case 'create':
          if (!operation.data) throw new Error('Data required for create operation');
          const newDocRef = doc(collectionRef);
          batch.set(newDocRef, {
            ...operation.data,
            createdAt: serverTimestamp(),
          });
          break;

        case 'update':
          if (!operation.id || !operation.data) {
            throw new Error('ID and data required for update operation');
          }
          const updateDocRef = doc(collectionRef, operation.id);
          batch.update(updateDocRef, {
            ...operation.data,
            updatedAt: serverTimestamp(),
          });
          cacheInvalidations.push(`${operation.collection}_${operation.id}`);
          break;

        case 'delete':
          if (!operation.id) throw new Error('ID required for delete operation');
          const deleteDocRef = doc(collectionRef, operation.id);
          batch.delete(deleteDocRef);
          cacheInvalidations.push(`${operation.collection}_${operation.id}`);
          break;
      }
    }

    const [error] = await handleAsyncError(batch.commit());

    if (error) {
      throw error;
    }

    // Invalider les caches concernés
    for (const cacheKey of cacheInvalidations) {
      await enhancedCacheService.delete(cacheKey, true);
    }
  }

  // Ajouter une opération à la queue de batch
  queueBatchOperation(operation: BatchOperation): void {
    this.batchQueue.push(operation);

    // Débounce: exécuter le batch après un délai
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(async () => {
      if (this.batchQueue.length > 0) {
        const operations = [...this.batchQueue];
        this.batchQueue = [];
        
        try {
          await this.executeBatch(operations);
        } catch (error) {
          console.error('Erreur exécution batch:', error);
          // Remettre les opérations en queue en cas d'erreur
          this.batchQueue.unshift(...operations);
        }
      }
    }, this.BATCH_DELAY);
  }

  // ========================================
  // PAGINATION OPTIMISÉE
  // ========================================

  async getPaginatedStations(
    pageSize: number = 20,
    lastDoc?: DocumentSnapshot,
    options: QueryOptions = {}
  ): Promise<PaginationResult<Station>> {
    let baseQuery = query(
      collection(db, 'stations'),
      orderBy(options.orderBy || 'frequency', options.orderDirection || 'asc'),
      limit(pageSize + 1) // +1 pour détecter s'il y a une page suivante
    );

    if (lastDoc) {
      baseQuery = query(baseQuery, startAfter(lastDoc));
    }

    const [error, querySnapshot] = await handleAsyncError(getDocs(baseQuery));

    if (error) {
      throw error;
    }

    const docs = querySnapshot!.docs;
    const hasNext = docs.length > pageSize;
    
    // Retirer le document supplémentaire si présent
    const resultDocs = hasNext ? docs.slice(0, -1) : docs;
    const stations = resultDocs.map(doc => this.serializeStation(doc));

    return {
      data: stations,
      hasNext,
      hasPrevious: !!lastDoc,
      lastDoc: resultDocs.length > 0 ? resultDocs[resultDocs.length - 1] : undefined,
      firstDoc: resultDocs.length > 0 ? resultDocs[0] : undefined,
    };
  }

  // ========================================
  // LISTENERS TEMPS RÉEL OPTIMISÉS
  // ========================================

  subscribeToStation(
    stationId: string,
    callback: (station: Station | null) => void,
    options: { includeMetadata?: boolean } = {}
  ): () => void {
    const listenerId = `station_${stationId}`;
    
    // Annuler l'ancien listener s'il existe
    if (this.activeListeners.has(listenerId)) {
      this.activeListeners.get(listenerId)!();
    }

    const stationRef = doc(db, 'stations', stationId);
    const unsubscribe = onSnapshot(
      stationRef,
      (doc) => {
        if (doc.exists()) {
          const station = this.serializeStation(doc);
          callback(station);
          
          // Mettre à jour le cache
          enhancedCacheService.setStation(station);
        } else {
          callback(null);
          
          // Supprimer du cache
          enhancedCacheService.delete(`station_id_${stationId}`, true);
        }
      },
      (error) => {
        console.error(`Erreur listener station ${stationId}:`, error);
        callback(null);
      }
    );

    this.activeListeners.set(listenerId, unsubscribe);
    return unsubscribe;
  }

  subscribeToStationsInRange(
    minFreq: number,
    maxFreq: number,
    callback: (stations: Station[]) => void
  ): () => void {
    const listenerId = `stations_range_${minFreq}_${maxFreq}`;
    
    // Annuler l'ancien listener s'il existe
    if (this.activeListeners.has(listenerId)) {
      this.activeListeners.get(listenerId)!();
    }

    const stationsQuery = query(
      collection(db, 'stations'),
      where('frequency', '>=', minFreq),
      where('frequency', '<=', maxFreq),
      orderBy('frequency', 'asc')
    );

    const unsubscribe = onSnapshot(
      stationsQuery,
      (querySnapshot) => {
        const stations = querySnapshot.docs.map(doc => this.serializeStation(doc));
        callback(stations);
        
        // Mettre à jour le cache
        enhancedCacheService.set(`stations_range_${minFreq}_${maxFreq}`, stations);
      },
      (error) => {
        console.error(`Erreur listener stations range ${minFreq}-${maxFreq}:`, error);
        callback([]);
      }
    );

    this.activeListeners.set(listenerId, unsubscribe);
    return unsubscribe;
  }

  // ========================================
  // MÉTHODES GÉNÉRIQUES
  // ========================================

  /**
   * Récupère un document par son ID dans une collection donnée
   */
  async getDocument(collectionName: string, documentId: string): Promise<any | null> {
    const docRef = doc(db, collectionName, documentId);
    const [error, docSnapshot] = await handleAsyncError(getDoc(docRef));
    
    if (error) {
      throw error;
    }
    
    if (!docSnapshot || !docSnapshot.exists()) {
      return null;
    }
    
    const data = docSnapshot.data();
    if (collectionName === 'stations' && data) {
      return this.serializeStation(docSnapshot);
    }
    
    return {
      id: docSnapshot.id,
      ...data,
    };
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  private serializeStation(doc: QueryDocumentSnapshot | DocumentSnapshot): Station {
    const data = doc.data();
    if (!data) {
      throw new Error('Document data is undefined');
    }

    return {
      id: doc.id,
      name: data.name,
      frequency: data.frequency,
      ownerId: data.ownerId,
      djCharacterId: data.djCharacterId,
      playlist: data.playlist || [],
      theme: data.theme,
      createdAt: safeToISOString(data.createdAt),
    } as Station;
  }

  private async invalidateStationCaches(frequency: number): Promise<void> {
    // Invalider les caches de range qui pourraient inclure cette fréquence
    const patterns = [
      new RegExp(`^stations_range_.*${Math.floor(frequency)}`),
      new RegExp(`^station_${frequency}`),
    ];

    for (const pattern of patterns) {
      await enhancedCacheService.invalidatePattern(pattern);
    }
  }

  // ========================================
  // NETTOYAGE ET ADMINISTRATION
  // ========================================

  cleanup(): void {
    // Annuler tous les listeners actifs
    for (const [listenerId, unsubscribe] of this.activeListeners.entries()) {
      unsubscribe();
    }
    this.activeListeners.clear();

    // Annuler le timer de batch
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Exécuter les opérations en attente
    if (this.batchQueue.length > 0) {
      this.executeBatch([...this.batchQueue]).catch(console.error);
      this.batchQueue = [];
    }
  }

  getActiveListenersCount(): number {
    return this.activeListeners.size;
  }

  getPendingBatchOperations(): number {
    return this.batchQueue.length;
  }
}

// Instance singleton
export const optimizedFirebaseService = OptimizedFirebaseService.getInstance();