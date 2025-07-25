// src/hooks/useTheme.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  VisualTheme, 
  VISUAL_THEMES, 
  applyTheme, 
  getSavedTheme, 
  getThemeForStation 
} from '@/lib/themes';

interface UseThemeOptions {
  autoAdapt?: boolean; // S'adapter automatiquement au thème de la station
  savePreference?: boolean; // Sauvegarder la préférence utilisateur
}

export function useTheme(options: UseThemeOptions = {}) {
  const { autoAdapt = true, savePreference = true } = options;
  
  const [currentTheme, setCurrentTheme] = useState<VisualTheme>(VISUAL_THEMES['modern-dark']);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userOverride, setUserOverride] = useState<string | null>(null);

  // Initialisation du thème
  useEffect(() => {
    const savedTheme = getSavedTheme();
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Fonction pour changer de thème avec transition
  const changeTheme = useCallback(async (themeId: string, isUserChoice = false) => {
    const newTheme = VISUAL_THEMES[themeId];
    if (!newTheme || newTheme.id === currentTheme.id) return;

    setIsTransitioning(true);

    // Si c'est un choix utilisateur, on l'enregistre comme override
    if (isUserChoice) {
      setUserOverride(themeId);
      if (savePreference) {
        localStorage.setItem('onde-spectrale-theme-override', themeId);
      }
    }

    // Ajouter une classe de transition
    document.documentElement.classList.add('theme-transitioning');

    // Appliquer le nouveau thème après un court délai
    setTimeout(() => {
      setCurrentTheme(newTheme);
      applyTheme(newTheme);
      
      // Retirer la classe de transition
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        setIsTransitioning(false);
      }, 300);
    }, 150);
  }, [currentTheme, savePreference]);

  // Adaptation automatique au thème de la station
  const adaptToStation = useCallback((stationTheme?: string) => {
    if (!autoAdapt || userOverride) return;
    
    const suggestedTheme = getThemeForStation(stationTheme);
    if (suggestedTheme.id !== currentTheme.id) {
      changeTheme(suggestedTheme.id, false);
    }
  }, [autoAdapt, userOverride, currentTheme, changeTheme]);

  // Réinitialiser l'override utilisateur
  const resetUserOverride = useCallback(() => {
    setUserOverride(null);
    if (savePreference) {
      localStorage.removeItem('onde-spectrale-theme-override');
    }
  }, [savePreference]);

  // Toggle entre mode sombre et clair
  const toggleLightDark = useCallback(() => {
    const isCurrentlyLight = currentTheme.id === 'light';
    const newThemeId = isCurrentlyLight ? 'modern-dark' : 'light';
    changeTheme(newThemeId, true);
  }, [currentTheme, changeTheme]);

  // Récupération de l'override au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedOverride = localStorage.getItem('onde-spectrale-theme-override');
      if (savedOverride && VISUAL_THEMES[savedOverride]) {
        setUserOverride(savedOverride);
        changeTheme(savedOverride, false);
      }
    }
  }, [changeTheme]);

  return {
    // État actuel
    currentTheme,
    isTransitioning,
    userOverride,
    
    // Actions
    changeTheme: (themeId: string) => changeTheme(themeId, true),
    adaptToStation,
    resetUserOverride,
    toggleLightDark,
    
    // Utilitaires
    availableThemes: VISUAL_THEMES,
    isLightMode: currentTheme.id === 'light',
    isDarkMode: currentTheme.id !== 'light',
    
    // Configuration
    setAutoAdapt: (enabled: boolean) => {
      // Cette fonction pourrait être étendue pour modifier le comportement
    }
  };
}