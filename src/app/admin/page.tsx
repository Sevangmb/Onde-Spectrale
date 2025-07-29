
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the modern dashboard
    router.replace('/admin/dashboard');
  }, [router]);

  return null; // This component only serves as a redirect
}
