'use client';

import Link from 'next/link';
import { useAdminLayout } from '@/app/admin/layout';
import { DJ_CHARACTERS } from '@/lib/data';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, Radio, Bot } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CharactersPage() {
  const { customCharacters, isLoading } = useAdminLayout();

  const allCharacters = [...DJ_CHARACTERS, ...(customCharacters || [])];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mes Personnages</h1>
        <p className="text-muted-foreground">Gérez vos personnages DJ officiels et personnalisés.</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Personnages Officiels</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {DJ_CHARACTERS.map((character) => (
            <Card key={character.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Radio className="h-8 w-8 text-primary" />
                  <div>
                    <CardTitle>{character.name}</CardTitle>
                    <CardDescription>DJ Officiel</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{character.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Personnages Personnalisés</h2>
          <Button asChild>
            <Link href="/admin/personnages/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Créer un personnage
            </Link>
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {customCharacters.map((character) => (
             <Card key={character.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                    <Bot className="h-8 w-8 text-accent-foreground" />
                    <div>
                        <CardTitle>{character.name}</CardTitle>
                        <CardDescription>DJ Personnalisé</CardDescription>
                    </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                </CardContent>
            </Card>
          ))}
           <Card className="border-dashed border-2 hover:border-primary hover:bg-muted/50 transition-colors flex items-center justify-center">
             <CardContent className="p-6 text-center">
                 <Link href="/admin/personnages/new" className="flex flex-col items-center gap-2">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <PlusCircle className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium">Créer un nouveau personnage</p>
                    <p className="text-xs text-muted-foreground">Donnez vie à une nouvelle voix pour vos ondes.</p>
                </Link>
             </CardContent>
           </Card>
        </div>
         {customCharacters.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
                <p>Vous n'avez pas encore créé de personnage personnalisé.</p>
            </div>
        )}
      </div>
    </div>
  );
}
