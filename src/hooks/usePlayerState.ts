import { useEffect, useState } from 'react';
import { PlayerState } from '@/lib/types';
import { doc, onSnapshot, FirestoreError } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function usePlayerState(stationId: string | undefined) {
  const [playerState, setPlayerState] = useState<PlayerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!stationId) return;
    setLoading(true);
    const ref = doc(db, 'stations', stationId, 'playerState', 'state');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setPlayerState(snap.exists() ? (snap.data() as PlayerState) : null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [stationId]);

  return { playerState, loading, error };
}
