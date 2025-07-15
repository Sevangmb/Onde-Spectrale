import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Onde Spectrale',
  description:
    'Une application radio post-apocalyptique où les utilisateurs peuvent scanner des fréquences et créer leurs propres stations avec des DJs IA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        <noscript>
           <div className="bg-destructive text-destructive-foreground p-4 text-center flex items-center justify-center gap-4">
                <AlertTriangle />
                <div>
                  <h1 className="font-bold">JavaScript est requis</h1>
                  <p>Cette application interactive nécessite l'activation de JavaScript pour fonctionner.</p>
                </div>
            </div>
        </noscript>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
