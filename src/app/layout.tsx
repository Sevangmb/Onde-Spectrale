import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AlertTriangle } from 'lucide-react';
import RadioErrorBoundary from '@/components/ErrorBoundary';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00ff41',
};

export const metadata: Metadata = {
  title: 'Onde Spectrale',
  description:
    'Une application radio post-apocalyptique où les utilisateurs peuvent scanner des fréquences et créer leurs propres stations avec des DJs IA.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Onde Spectrale'
  }
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
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                      console.log('📻 SW registered:', registration);
                    })
                    .catch(error => {
                      console.log('🚨 SW registration failed:', error);
                    });
                });
              }
            `
          }}
        />
      </head>
      <body className="font-mono antialiased bg-background text-foreground">
        <noscript>
           <div className="bg-destructive text-destructive-foreground p-4 text-center flex items-center justify-center gap-4">
                <AlertTriangle />
                <div>
                  <h1 className="font-bold">JavaScript est requis</h1>
                  <p>Cette application interactive nécessite l&apos;activation de JavaScript pour fonctionner.</p>
                </div>
            </div>
        </noscript>
        <RadioErrorBoundary>
          {children}
        </RadioErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
