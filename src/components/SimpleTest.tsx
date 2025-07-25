'use client';

import { useEffect, useState } from 'react';

export function SimpleTest() {
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    setTimestamp(new Date().toISOString());
  }, []);

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Test Simple</h1>
      <p>Si vous voyez ceci, React fonctionne correctement.</p>
      <p>Timestamp: {timestamp}</p>
    </div>
  );
}