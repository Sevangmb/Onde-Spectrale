import { db } from './firebase';
import { doc, updateDoc, arrayUnion, setDoc, serverTimestamp } from 'firebase/firestore';
import { PlayerState } from './types';

export async function pushPlayerLog(stationId: string, log: { type: 'error' | 'info' | 'track' | 'tts'; message: string; timestamp?: string }) {
  const ref = doc(db, 'stations', stationId, 'playerState', 'state');
  const logWithTimestamp = { ...log, timestamp: log.timestamp || new Date().toISOString() };
  await setDoc(ref, { logs: arrayUnion(logWithTimestamp), updatedAt: new Date().toISOString() }, { merge: true });
}

export async function updatePlayerState(stationId: string, state: Partial<PlayerState>) {
  const ref = doc(db, 'stations', stationId, 'playerState', 'state');
  await setDoc(ref, { ...state, updatedAt: new Date().toISOString() }, { merge: true });
}
