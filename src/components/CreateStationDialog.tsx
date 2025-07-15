'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RadioTower, User } from 'lucide-react';
import { DJ_CHARACTERS } from '@/lib/data';
import { createStation } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';

interface CreateStationDialogProps {
  frequency: number;
  children: React.ReactNode;
}

export function CreateStationDialog({ frequency, children }: CreateStationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedDjId, setSelectedDjId] = useState<string>(DJ_CHARACTERS[0].id);
  const { toast } = useToast();

  const handleCreateStation = async (formData: FormData) => {
    const user = auth.currentUser;
    if (!user) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Vous devez être connecté pour créer une station.' });
        return;
    }

    formData.append('frequency', frequency.toString());
    formData.append('djCharacterId', selectedDjId);

    const result = await createStation(user.uid, formData);

    if (result.error) {
      const errorMessages = Object.values(result.error).join(' ');
      toast({
        variant: "destructive",
        title: "Erreur de création",
        description: errorMessages,
      });
    } else {
      toast({
        title: "Station créée !",
        description: `Votre station "${result.station?.name}" est maintenant en ligne.`,
      });
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-background border-primary/50">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-primary">
            Créer une nouvelle station
          </DialogTitle>
          <DialogDescription>
            Fréquence {frequency.toFixed(1)} MHz. Choisissez un nom et un DJ pour commencer à émettre.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreateStation}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input id="name" name="name" className="col-span-3" required />
            </div>
            <div>
              <Label className="mb-2 block">Personnage DJ</Label>
              <div className="grid grid-cols-3 gap-2">
                {DJ_CHARACTERS.map((dj) => (
                  <Card
                    key={dj.id}
                    onClick={() => setSelectedDjId(dj.id)}
                    className={cn(
                      'cursor-pointer transition-all',
                      selectedDjId === dj.id
                        ? 'border-accent ring-2 ring-accent'
                        : 'border-border hover:border-accent/50'
                    )}
                  >
                    <CardContent className="p-3 text-center">
                      <User className="mx-auto h-8 w-8 mb-1" />
                      <h4 className="text-sm font-semibold">{dj.name}</h4>
                      <p className="text-xs text-muted-foreground">{dj.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">
              <RadioTower className="mr-2 h-4 w-4" />
              Lancer l'émission
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
