import { useState, useEffect } from 'react';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà vu l'onboarding
    const hasSeenTour = localStorage.getItem('onde-spectrale-onboarding-completed');
    setHasSeenOnboarding(!!hasSeenTour);

    // Afficher l'onboarding pour les nouveaux utilisateurs après un délai
    if (!hasSeenTour) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const startOnboarding = () => {
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setHasSeenOnboarding(true);
    localStorage.setItem('onde-spectrale-onboarding-completed', 'true');
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('onde-spectrale-onboarding-completed', 'true');
  };

  return {
    showOnboarding,
    hasSeenOnboarding,
    startOnboarding,
    completeOnboarding,
    skipOnboarding
  };
}