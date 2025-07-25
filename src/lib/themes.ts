// src/lib/themes.ts
'use client';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: {
    start: string;
    middle: string;
    end: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  glow: string;
  particle: string;
  border: string;
  glass: string;
}

export interface VisualTheme {
  id: string;
  name: string;
  description: string;
  colors: ThemeColors;
  animations: {
    particleSpeed: number;
    glowIntensity: number;
    pulseRate: number;
  };
  effects: {
    showParticles: boolean;
    showGlow: boolean;
    showPulse: boolean;
    showScanlines: boolean;
  };
}

export const VISUAL_THEMES: Record<string, VisualTheme> = {
  'post-apocalyptic': {
    id: 'post-apocalyptic',
    name: 'Post-Apocalyptique',
    description: 'Terres désolées radioactives avec lueurs orangées',
    colors: {
      primary: '#ff6b35',
      secondary: '#f7931e',
      accent: '#ffb627',
      background: {
        start: '#1a0f0a',
        middle: '#2d1810',
        end: '#0f0a08'
      },
      text: {
        primary: '#ff8c5a',
        secondary: '#ffb884',
        muted: '#cc6633'
      },
      glow: '#ff6b35',
      particle: '#f7931e',
      border: '#ff6b35',
      glass: 'rgba(255, 107, 53, 0.1)'
    },
    animations: {
      particleSpeed: 2,
      glowIntensity: 0.8,
      pulseRate: 2000
    },
    effects: {
      showParticles: true,
      showGlow: true,
      showPulse: true,
      showScanlines: true
    }
  },

  'pre-war-music': {
    id: 'pre-war-music',
    name: 'Pré-Guerre Vintage',
    description: 'Élégance dorée des années 1940-50',
    colors: {
      primary: '#d4af37',
      secondary: '#f4e4bc',
      accent: '#ffd700',
      background: {
        start: '#1a1510',
        middle: '#2d2318',
        end: '#0f0c08'
      },
      text: {
        primary: '#f4e4bc',
        secondary: '#e6d7b3',
        muted: '#b8a882'
      },
      glow: '#d4af37',
      particle: '#ffd700',
      border: '#d4af37',
      glass: 'rgba(212, 175, 55, 0.12)'
    },
    animations: {
      particleSpeed: 1.5,
      glowIntensity: 0.6,
      pulseRate: 3000
    },
    effects: {
      showParticles: true,
      showGlow: true,
      showPulse: false,
      showScanlines: false
    }
  },

  'propaganda': {
    id: 'propaganda',
    name: 'Propagande Enclave',
    description: 'Rouge autoritaire avec accents métalliques',
    colors: {
      primary: '#dc2626',
      secondary: '#991b1b',
      accent: '#fca5a5',
      background: {
        start: '#1a0606',
        middle: '#2d0a0a',
        end: '#0f0303'
      },
      text: {
        primary: '#fca5a5',
        secondary: '#f87171',
        muted: '#dc2626'
      },
      glow: '#dc2626',
      particle: '#991b1b',
      border: '#dc2626',
      glass: 'rgba(220, 38, 38, 0.15)'
    },
    animations: {
      particleSpeed: 3,
      glowIntensity: 1.0,
      pulseRate: 1500
    },
    effects: {
      showParticles: true,
      showGlow: true,
      showPulse: true,
      showScanlines: true
    }
  },

  'classical': {
    id: 'classical',
    name: 'Classique Raffiné',
    description: 'Bleus élégants et sophistiqués',
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      accent: '#93c5fd',
      background: {
        start: '#0a0f1a',
        middle: '#0f1729',
        end: '#050a14'
      },
      text: {
        primary: '#93c5fd',
        secondary: '#60a5fa',
        muted: '#3b82f6'
      },
      glow: '#3b82f6',
      particle: '#93c5fd',
      border: '#1e40af',
      glass: 'rgba(59, 130, 246, 0.08)'
    },
    animations: {
      particleSpeed: 1,
      glowIntensity: 0.4,
      pulseRate: 4000
    },
    effects: {
      showParticles: true,
      showGlow: false,
      showPulse: false,
      showScanlines: false
    }
  },

  'cyberpunk': {
    id: 'cyberpunk',
    name: 'Cyberpunk Néon',
    description: 'Néons violets et cyans futuristes',
    colors: {
      primary: '#8b5cf6',
      secondary: '#06b6d4',
      accent: '#a78bfa',
      background: {
        start: '#0c0a1a',
        middle: '#1a0f2e',
        end: '#050208'
      },
      text: {
        primary: '#a78bfa',
        secondary: '#67e8f9',
        muted: '#8b5cf6'
      },
      glow: '#8b5cf6',
      particle: '#06b6d4',
      border: '#8b5cf6',
      glass: 'rgba(139, 92, 246, 0.12)'
    },
    animations: {
      particleSpeed: 4,
      glowIntensity: 1.2,
      pulseRate: 1000
    },
    effects: {
      showParticles: true,
      showGlow: true,
      showPulse: true,
      showScanlines: true
    }
  },

  'modern-dark': {
    id: 'modern-dark',
    name: 'Moderne Sombre',
    description: 'Design épuré avec accents verts',
    colors: {
      primary: '#10b981',
      secondary: '#059669',
      accent: '#6ee7b7',
      background: {
        start: '#0f1419',
        middle: '#1f2937',
        end: '#111827'
      },
      text: {
        primary: '#f9fafb',
        secondary: '#d1d5db',
        muted: '#9ca3af'
      },
      glow: '#10b981',
      particle: '#6ee7b7',
      border: '#374151',
      glass: 'rgba(16, 185, 129, 0.05)'
    },
    animations: {
      particleSpeed: 1.5,
      glowIntensity: 0.3,
      pulseRate: 5000
    },
    effects: {
      showParticles: false,
      showGlow: false,
      showPulse: false,
      showScanlines: false
    }
  },

  'light': {
    id: 'light',
    name: 'Clair Moderne',
    description: 'Interface claire et minimaliste',
    colors: {
      primary: '#2563eb',
      secondary: '#1d4ed8',
      accent: '#3b82f6',
      background: {
        start: '#f8fafc',
        middle: '#ffffff',
        end: '#f1f5f9'
      },
      text: {
        primary: '#1e293b',
        secondary: '#475569',
        muted: '#64748b'
      },
      glow: '#2563eb',
      particle: '#3b82f6',
      border: '#e2e8f0',
      glass: 'rgba(37, 99, 235, 0.03)'
    },
    animations: {
      particleSpeed: 1,
      glowIntensity: 0.1,
      pulseRate: 8000
    },
    effects: {
      showParticles: false,
      showGlow: false,
      showPulse: false,
      showScanlines: false
    }
  }
};

/**
 * Détermine le thème approprié selon le thème de la station
 */
export function getThemeForStation(stationTheme?: string): VisualTheme {
  if (!stationTheme) return VISUAL_THEMES['modern-dark'];
  
  const themeKey = Object.keys(VISUAL_THEMES).find(key => 
    stationTheme.toLowerCase().includes(key.toLowerCase()) ||
    key.toLowerCase().includes(stationTheme.toLowerCase())
  );
  
  return VISUAL_THEMES[themeKey || 'modern-dark'];
}

/**
 * Génère les variables CSS pour un thème donné
 */
export function generateThemeCSS(theme: VisualTheme): Record<string, string> {
  return {
    '--theme-primary': theme.colors.primary,
    '--theme-secondary': theme.colors.secondary,
    '--theme-accent': theme.colors.accent,
    '--theme-bg-start': theme.colors.background.start,
    '--theme-bg-middle': theme.colors.background.middle,
    '--theme-bg-end': theme.colors.background.end,
    '--theme-text-primary': theme.colors.text.primary,
    '--theme-text-secondary': theme.colors.text.secondary,
    '--theme-text-muted': theme.colors.text.muted,
    '--theme-glow': theme.colors.glow,
    '--theme-particle': theme.colors.particle,
    '--theme-border': theme.colors.border,
    '--theme-glass': theme.colors.glass,
    '--theme-particle-speed': `${theme.animations.particleSpeed}s`,
    '--theme-glow-intensity': theme.animations.glowIntensity.toString(),
    '--theme-pulse-rate': `${theme.animations.pulseRate}ms`
  };
}

/**
 * Applique un thème au document
 */
export function applyTheme(theme: VisualTheme): void {
  const root = document.documentElement;
  const cssVars = generateThemeCSS(theme);
  
  Object.entries(cssVars).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });
  
  // Ajouter des classes pour les effets
  root.classList.toggle('theme-particles', theme.effects.showParticles);
  root.classList.toggle('theme-glow', theme.effects.showGlow);
  root.classList.toggle('theme-pulse', theme.effects.showPulse);
  root.classList.toggle('theme-scanlines', theme.effects.showScanlines);
  
  // Stocker le thème actuel
  localStorage.setItem('onde-spectrale-theme', theme.id);
}

/**
 * Récupère le thème sauvegardé ou le thème par défaut
 */
export function getSavedTheme(): VisualTheme {
  if (typeof window === 'undefined') return VISUAL_THEMES['modern-dark'];
  
  const savedThemeId = localStorage.getItem('onde-spectrale-theme');
  return VISUAL_THEMES[savedThemeId || 'modern-dark'] || VISUAL_THEMES['modern-dark'];
}