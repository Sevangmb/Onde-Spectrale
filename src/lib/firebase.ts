
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp, 
  arrayUnion, 
  increment 
} from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, uploadBytes, listAll, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Vérification que les variables d'environnement sont bien chargées
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Les variables d'environnement Firebase ne sont pas correctement configurées. Vérifiez votre fichier .env et assurez-vous que les variables commençant par NEXT_PUBLIC_FIREBASE_ sont bien définies.");
}


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Utilitaires pour le stockage
export const createStorageRef = (path: string) => ref(storage, path);

export const uploadAudioFile = async (file: File, path: string) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};

export const uploadAudioData = async (data: string, path: string, metadata?: any) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadString(storageRef, data, 'data_url', metadata);
  return await getDownloadURL(snapshot.ref);
};

export const deleteAudioFile = async (path: string) => {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};

export const listAudioFiles = async (path: string) => {
  const storageRef = ref(storage, path);
  const result = await listAll(storageRef);
  return result.items.map(item => ({
    name: item.name,
    fullPath: item.fullPath,
    ref: item
  }));
};

export { 
  app, 
  auth, 
  db, 
  storage, 
  ref, 
  uploadString, 
  getDownloadURL, 
  uploadBytes, 
  listAll, 
  deleteObject,
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp, 
  Timestamp, 
  arrayUnion, 
  increment 
};
