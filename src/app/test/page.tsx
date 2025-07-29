'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testFirebase = async () => {
      try {
        // Test basic imports
        setStatus('Testing imports...');
        const { auth } = await import('@/lib/firebase');
        
        setStatus('Testing auth state...');
        const { onAuthStateChanged } = await import('firebase/auth');
        
        onAuthStateChanged(auth, (user) => {
          setStatus(`Auth state: ${user ? 'logged in' : 'not logged in'}`);
        });
        
      } catch (err) {
        setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
        setStatus('error');
      }
    };

    testFirebase();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <div className="space-y-4">
        <p><strong>Status:</strong> {status}</p>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Basic Info</h2>
          <p>Current time: {new Date().toISOString()}</p>
          <p>User agent: {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server'}</p>
        </div>
      </div>
    </div>
  );
}