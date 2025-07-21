
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { updateUserOnLogin } from '@/app/actions';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OndeSpectraleLogo } from '@/components/icons';
import { RadioTower, Mail, Lock, AlertTriangle, Zap } from 'lucide-react';

interface ParticleStyle {
  left: string;
  top: string;
  animationDelay: string;
  animationDuration: string;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClient, setIsClient] = useState(false);
  const [particleStyles, setParticleStyles] = useState<ParticleStyle[]>([]);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Generate particle styles on client
    setParticleStyles(
      Array.from({ length: 20 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 8}s`,
        animationDuration: `${4 + Math.random() * 6}s`,
      }))
    );

    // Check if user is already authenticated
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      router.push('/admin');
    }
  }, [user, router]);
  
  const handleAuthAction = async (isSignUp = false) => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      await updateUserOnLogin(userCredential.user.uid, userCredential.user.email);
      router.push('/admin');
    } catch (err: any) {
      console.error('Erreur d\'authentification:', err);
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError('Adresse e-mail ou mot de passe incorrect.');
          break;
        case 'auth/email-already-in-use':
          setError('Cette adresse email est déjà utilisée.');
          break;
        case 'auth/weak-password':
          setError('Le mot de passe doit contenir au moins 6 caractères.');
          break;
        case 'auth/invalid-email':
          setError('Adresse email invalide.');
          break;
        case 'auth/too-many-requests':
          setError('Trop de tentatives. Veuillez réessayer plus tard.');
          break;
        default:
          setError('Erreur de connexion. Vérifiez la console pour plus de détails.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      await updateUserOnLogin(userCredential.user.uid, userCredential.user.email);
      router.push('/admin');
    } catch (err: any) {
      console.error('Erreur de connexion Google:', err);
       if (err.code === 'auth/popup-closed-by-user') {
        setError('La fenêtre de connexion a été fermée.');
      } else {
        setError('Erreur de connexion Google. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      {/* Background post-apocalyptique */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-zinc-900"></div>
      
      {/* Effets de radiation */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-red-700/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-yellow-500/30 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* Grille déformée */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(255, 165, 0, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 69, 0, 0.2) 0%, transparent 50%),
              linear-gradient(90deg, transparent 49%, rgba(255, 165, 0, 0.3) 49%, rgba(255, 165, 0, 0.3) 51%, transparent 51%),
              linear-gradient(0deg, transparent 49%, rgba(255, 165, 0, 0.2) 49%, rgba(255, 165, 0, 0.2) 51%, transparent 51%)
            `,
            backgroundSize: '100px 100px, 150px 150px, 50px 50px, 50px 50px',
            animation: 'drift 20s linear infinite'
          }}
        />
      </div>

      {/* Particules flottantes */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particleStyles.map((style, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-orange-400/50 rounded-full animate-float"
              style={style}
            />
          ))}
        </div>
      )}

      {/* Interface de connexion */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        <Card className="border-2 border-orange-500/30 bg-black/90 backdrop-blur-sm shadow-2xl shadow-orange-500/20 relative overflow-hidden">
          {/* Effet de scanline */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-orange-400/50 to-transparent animate-scanline"></div>
          </div>
          
          {/* Bordure intérieure */}
          <div className="absolute inset-1 border border-orange-400/20 rounded-lg pointer-events-none animate-pulse-subtle"></div>

          <CardHeader className="text-center border-b-2 border-orange-500/30 pb-6 bg-gradient-to-r from-black/90 to-zinc-900/90">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <OndeSpectraleLogo className="h-12 w-12 text-orange-400 drop-shadow-lg" />
                <div className="absolute inset-0 bg-orange-400/30 blur-sm animate-pulse"></div>
              </div>
              <CardTitle className="font-headline text-2xl text-orange-100 tracking-wider drop-shadow-lg">
                <span className="inline-block animate-flicker">Onde Spectrale</span>
              </CardTitle>
              <p className="text-orange-300/80 text-sm">
                Accédez aux transmissions secrètes
              </p>
            </div>
          </CardHeader>

          <CardContent className="p-6 bg-gradient-to-br from-black/70 to-zinc-900/70">
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black/60 border border-orange-500/20">
                <TabsTrigger 
                  value="login"
                  className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100 text-orange-300/70"
                >
                  Connexion
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-100 text-orange-300/70"
                >
                  Inscription
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-orange-300/80 font-medium">
                      Signal d'identification
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400/60" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@transmission.net"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-black/60 border-orange-500/30 text-orange-100 placeholder-orange-400/40 focus:border-orange-400/50"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-orange-300/80 font-medium">
                      Code de cryptage
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400/60" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-black/60 border-orange-500/30 text-orange-100 placeholder-orange-400/40 focus:border-orange-400/50"
                        disabled={isLoading}
                        onKeyPress={(e) => e.key === 'Enter' && handleAuthAction(false)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAuthAction(false)}
                    disabled={isLoading}
                    className="w-full bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <RadioTower className="h-4 w-4" />
                      {isLoading ? 'Connexion...' : 'Établir la connexion'}
                    </div>
                    {isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent animate-pulse"></div>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-orange-300/80 font-medium">
                      Nouveau signal d'identification
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400/60" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="votre@transmission.net"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 bg-black/60 border-orange-500/30 text-orange-100 placeholder-orange-400/40 focus:border-orange-400/50"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-orange-300/80 font-medium">
                      Code de cryptage (min. 6 caractères)
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-orange-400/60" />
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 bg-black/60 border-orange-500/30 text-orange-100 placeholder-orange-400/40 focus:border-orange-400/50"
                        disabled={isLoading}
                        onKeyPress={(e) => e.key === 'Enter' && handleAuthAction(true)}
                      />
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAuthAction(true)}
                    disabled={isLoading}
                    className="w-full bg-orange-600/80 text-orange-100 hover:bg-orange-500/90 border border-orange-400/50 shadow-lg shadow-orange-500/20 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" />
                      {isLoading ? 'Création...' : 'Créer une nouvelle station'}
                    </div>
                    {isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-400/20 to-transparent animate-pulse"></div>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-orange-500/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black/80 px-2 text-orange-400/60">
                    Transmission alternative
                  </span>
                </div>
              </div>

              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                variant="outline"
                className="w-full mt-4 border-orange-500/30 text-orange-300 hover:bg-orange-500/10 hover:text-orange-100 hover:border-orange-400/50"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connexion Google
              </Button>
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="text-orange-400/60 hover:text-orange-300 text-sm"
              >
                ← Retour à la radio
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
