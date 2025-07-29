'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData, getStationsForUser, getCustomCharactersForUser } from '@/app/actions';

export default function DebugPage() {
  const [user, setUser] = useState<User | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        console.log('🔍 Auth state changed:', currentUser ? 'Logged in' : 'Not logged in');
        setUser(currentUser);

        if (currentUser) {
          const debug: any = {
            user: {
              uid: currentUser.uid,
              email: currentUser.email,
            },
            errors: [],
            results: {}
          };

          // Test getUserData
          try {
            console.log('🔍 Testing getUserData...');
            const userData = await getUserData(currentUser.uid);
            debug.results.userData = userData;
            console.log('✅ getUserData success:', userData);
          } catch (error) {
            console.error('❌ getUserData error:', error);
            debug.errors.push({ function: 'getUserData', error: String(error) });
          }

          // Test getStationsForUser
          try {
            console.log('🔍 Testing getStationsForUser...');
            const stations = await getStationsForUser(currentUser.uid);
            debug.results.stations = stations;
            console.log('✅ getStationsForUser success:', stations);
          } catch (error) {
            console.error('❌ getStationsForUser error:', error);
            debug.errors.push({ function: 'getStationsForUser', error: String(error) });
          }

          // Test getCustomCharactersForUser
          try {
            console.log('🔍 Testing getCustomCharactersForUser...');
            const characters = await getCustomCharactersForUser(currentUser.uid);
            debug.results.characters = characters;
            console.log('✅ getCustomCharactersForUser success:', characters);
          } catch (error) {
            console.error('❌ getCustomCharactersForUser error:', error);
            debug.errors.push({ function: 'getCustomCharactersForUser', error: String(error) });
          }

          setDebugInfo(debug);
        }
      } catch (error) {
        console.error('❌ Global error in debug page:', error);
        setDebugInfo({ 
          globalError: String(error),
          user: null,
          errors: [{ function: 'global', error: String(error) }],
          results: {}
        });
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Debug Page - Loading...</h1>
        <p>Initializing debug tests...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Admin Debug Page</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
          <p><strong>User:</strong> {user ? user.email : 'Not logged in'}</p>
          <p><strong>UID:</strong> {user?.uid || 'N/A'}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Debug Results</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {debugInfo.errors && debugInfo.errors.length > 0 && (
          <div className="bg-red-100 border border-red-400 p-4 rounded">
            <h2 className="text-lg font-semibold mb-2 text-red-800">Errors Found</h2>
            {debugInfo.errors.map((error: any, index: number) => (
              <div key={index} className="mb-2">
                <p><strong>Function:</strong> {error.function}</p>
                <p><strong>Error:</strong> {error.error}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-green-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Environment Info</h2>
          <p><strong>Next.js Version:</strong> {process.env.NEXT_PUBLIC_APP_VERSION || 'Unknown'}</p>
          <p><strong>Node Environment:</strong> {process.env.NODE_ENV}</p>
          <p><strong>Current Time:</strong> {new Date().toISOString()}</p>
        </div>
      </div>
    </div>
  );
}