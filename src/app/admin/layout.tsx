
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserData, getStationsForUser, getCustomCharactersForUser } from '@/app/actions';
import type { Station, CustomDJCharacter } from '@/lib/types';


import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { OndeSpectraleLogo } from '@/components/icons';
import { LayoutDashboard, Radio, Users, Library, BarChart2, Settings, LogOut, RadioTower } from 'lucide-react';
import { OnboardingModal } from '@/components/OnboardingModal';


interface AdminLayoutContextType {
  user: User | null;
  userData: any | null;
  stations: Station[];
  customCharacters: CustomDJCharacter[];
  isLoading: boolean;
}

const AdminLayoutContext = createContext<AdminLayoutContextType | null>(null);

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (!context) {
    throw new Error('useAdminLayout must be used within an AdminLayoutProvider');
  }
  return context;
}


function AdminLayout({ children }: { children: ReactNode }) {
  // Onboarding utilisateur (modale)
  // Affichée au premier accès ou via bouton d’aide

  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [stations, setStations] = useState<Station[]>([]);
  const [customCharacters, setCustomCharacters] = useState<CustomDJCharacter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          
          // Gestion d'erreur pour chaque appel Firebase
          try {
            const data = await getUserData(currentUser.uid);
            setUserData(data);
          } catch (error) {
            console.error('Erreur getUserData:', error);
            setUserData(null);
          }
          
          try {
            const userStations = await getStationsForUser(currentUser.uid);
            setStations(userStations);
          } catch (error) {
            console.error('Erreur getStationsForUser:', error);
            setStations([]);
          }
          
          try {
            const userCharacters = await getCustomCharactersForUser(currentUser.uid);
            setCustomCharacters(userCharacters);
          } catch (error) {
            console.error('Erreur getCustomCharactersForUser:', error);
            setCustomCharacters([]);
          }
        } else {
          setUser(null);
          setUserData(null);
          setStations([]);
          setCustomCharacters([]);
        }
      } catch (error) {
        console.error('Erreur globale dans le layout admin:', error);
        setUser(null);
        setUserData(null);
        setStations([]);
        setCustomCharacters([]);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
      if (!isLoading && !user) {
          router.push('/login');
      }
  }, [isLoading, user, router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const menuItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/stations', label: 'Mes Stations', icon: Radio },
    { href: '/admin/personnages', label: 'Mes Personnages', icon: Users },
    { href: '/admin/bibliotheque', label: 'Bibliothèque Plex', icon: Library },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
    { href: '/admin/parametres', label: 'Paramètres', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
            <RadioTower className="h-12 w-12 animate-pulse text-primary"/>
            <p className="text-muted-foreground">Chargement de la console d'administration...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // La redirection est gérée dans le useEffect
  }
  
  const contextValue = {
    user,
    userData,
    stations,
    customCharacters,
    isLoading,
  };

  return (
    <>
      <OnboardingModal />
      <AdminLayoutContext.Provider value={contextValue}>
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <div className="flex items-center gap-2">
                <OndeSpectraleLogo className="h-6 w-6 text-primary" />
                <span className="font-headline text-lg">Onde Spectrale</span>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                {menuItems.map((item) => {
                  const isActive =
                    item.href === '/admin'
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <Link href={item.href}>
                        <SidebarMenuButton isActive={isActive}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center justify-start gap-2 p-2 h-auto">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/8.x/bottts-neutral/svg?seed=${user.uid}`} />
                      <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="text-left overflow-hidden">
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/"><RadioTower className="mr-2 h-4 w-4" />Retour au Scanner</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-muted/40 min-h-screen">
            <div className="flex items-center gap-4 mb-6 md:hidden">
              <SidebarTrigger />
              <h1 className="text-xl font-semibold">Admin</h1>
            </div>
            {children}
          </main>
        </SidebarProvider>
      </AdminLayoutContext.Provider>
    </>
  );
}

export default AdminLayout;
