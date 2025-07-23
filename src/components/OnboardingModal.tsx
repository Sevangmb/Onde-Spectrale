import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ONBOARDING_KEY = 'onde_onboarding_done_v1';

const steps = [
  {
    title: 'Bienvenue sur Onde Spectrale',
    description: 'Cette interface vous permet de gérer vos stations de radio, programmer des messages et surveiller le player en temps réel.',
  },
  {
    title: 'Navigation',
    description: 'Utilisez la barre latérale pour accéder rapidement aux stations, logs, dashboard et paramètres.',
  },
  {
    title: 'Gestion des stations',
    description: 'Créez, modifiez ou supprimez vos stations. Ajoutez de la musique ou des messages à la playlist de chaque station.',
  },
  {
    title: 'Suivi du player',
    description: 'Surveillez en temps réel la piste en cours, les messages TTS, les erreurs et l’état du player via la carte de statut.',
  },
  {
    title: 'Ajout de contenu',
    description: 'Ajoutez des musiques ou messages à la volée. Utilisez la recherche ou la génération TTS pour enrichir votre playlist.',
  },
  {
    title: 'Support',
    description: 'Besoin d’aide ? Consultez la documentation ou contactez l’administrateur via le menu support.',
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem(ONBOARDING_KEY);
      if (!done) setOpen(true);
    }
  }, []);

  const close = () => {
    setOpen(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ONBOARDING_KEY, '1');
    }
  };

  const skip = () => {
    setStep(steps.length - 1);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{steps[step].title}</DialogTitle>
        </DialogHeader>
        <div className="py-2 text-muted-foreground">{steps[step].description}</div>
        <DialogFooter className="flex flex-row gap-2 justify-between mt-4">
          <Button variant="ghost" onClick={close}>Ne plus afficher</Button>
          <div className="flex gap-2">
            {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>Précédent</Button>}
            {step < steps.length - 1 ? (
              <>
                <Button variant="outline" onClick={skip}>Passer</Button>
                <Button onClick={() => setStep(step + 1)}>Suivant</Button>
              </>
            ) : (
              <Button onClick={close}>Terminer</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
