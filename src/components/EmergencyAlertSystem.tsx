'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, X, Volume2, RadioIcon } from 'lucide-react';

interface EmergencyAlert {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration: number;
  soundFile?: string;
}

const EMERGENCY_ALERTS: EmergencyAlert[] = [
  {
    id: 'eas-1',
    title: 'ALERTE RADIOLOGIQUE',
    message: 'Niveau de radiation détecté dans les secteurs 7-12. Évitez les zones contaminées. Restez à l\'intérieur et scellez les ouvertures.',
    severity: 'critical',
    duration: 15000,
  },
  {
    id: 'eas-2',
    title: 'MISE À JOUR MÉTÉO',
    message: 'Tempête radioactive approchant du sud-est. Prévisions: pluies acides pendant 48h. Rassemblez vos provisions.',
    severity: 'high',
    duration: 12000,
  },
  {
    id: 'eas-3',
    title: 'NOTICE COMMUNAUTAIRE',
    message: 'Échange de ressources au marché central demain à 14h. Apportez des capsules de RadAway et des stimpaks.',
    severity: 'low',
    duration: 8000,
  },
  {
    id: 'eas-4',
    title: 'ALERTE SÉCURITÉ',
    message: 'Activité de mutants signalée près de l\'ancienne autoroute. Voyagez en groupe et restez armés.',
    severity: 'medium',
    duration: 10000,
  },
  {
    id: 'eas-5',
    title: 'ANNONCE VAULT-TEC',
    message: 'Test du système d\'alerte d\'urgence Vault-TEC. Ceci est un test. En cas d\'urgence réelle, suivez les protocoles.',
    severity: 'low',
    duration: 7000,
  },
  {
    id: 'eas-6',
    title: 'ALERTE CONTAMINATION',
    message: 'Fuite détectée dans les canalisations du secteur nord. Évitez de boire l\'eau non purifiée. Utilisez des Rad-X.',
    severity: 'high',
    duration: 13000,
  },
];

const getSeverityColor = (severity: EmergencyAlert['severity']) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-900/90 border-red-500 text-red-100';
    case 'high':
      return 'bg-orange-900/90 border-orange-500 text-orange-100';
    case 'medium':
      return 'bg-yellow-900/90 border-yellow-500 text-yellow-100';
    case 'low':
      return 'bg-blue-900/90 border-blue-500 text-blue-100';
    default:
      return 'bg-gray-900/90 border-gray-500 text-gray-100';
  }
};

interface EmergencyAlertSystemProps {
  isRadioActive: boolean;
  currentFrequency: number;
}

export function EmergencyAlertSystem({ isRadioActive, currentFrequency }: EmergencyAlertSystemProps) {
  const [currentAlert, setCurrentAlert] = useState<EmergencyAlert | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Déclencher des alertes aléatoirement
  useEffect(() => {
    if (!isRadioActive) return;

    const triggerRandomAlert = () => {
      // Probabilité d'alerte basée sur la fréquence (plus de chance sur certaines fréquences)
      const baseChance = 0.1; // 10% de chance de base
      const frequencyBonus = currentFrequency > 100 ? 0.05 : 0; // Bonus sur hautes fréquences
      const chance = baseChance + frequencyBonus;

      if (Math.random() < chance) {
        const randomAlert = EMERGENCY_ALERTS[Math.floor(Math.random() * EMERGENCY_ALERTS.length)];
        showAlert(randomAlert);
      }
    };

    // Vérifier toutes les 30 secondes
    const interval = setInterval(triggerRandomAlert, 30000);

    // Première alerte après 10 secondes pour le test
    timerRef.current = setTimeout(() => {
      if (Math.random() < 0.3) { // 30% de chance
        triggerRandomAlert();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRadioActive, currentFrequency]);

  const showAlert = (alert: EmergencyAlert) => {
    if (currentAlert) return; // Ne pas superposer les alertes

    setCurrentAlert(alert);
    setIsVisible(true);
    setIsAnimating(true);

    // Son d'alerte (simulé par une vibration sur mobile)
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Animation d'entrée
    setTimeout(() => setIsAnimating(false), 500);

    // Auto-fermeture après la durée spécifiée
    alertTimeoutRef.current = setTimeout(() => {
      hideAlert();
    }, alert.duration);
  };

  const hideAlert = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      setCurrentAlert(null);
      setIsAnimating(false);
    }, 300);

    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  };

  if (!isVisible || !currentAlert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className={`w-full max-w-md mx-auto ${getSeverityColor(currentAlert.severity)} border-2 ${
        isAnimating ? 'animate-pulse scale-105' : ''
      } transition-all duration-300`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertTriangle 
                className={`h-6 w-6 ${
                  currentAlert.severity === 'critical' ? 'text-red-400' : 
                  currentAlert.severity === 'high' ? 'text-orange-400' : 
                  currentAlert.severity === 'medium' ? 'text-yellow-400' : 
                  'text-blue-400'
                } animate-pulse`} 
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <RadioIcon className="h-4 w-4 opacity-75" />
                <div className="text-xs font-mono opacity-75">
                  SYSTÈME D'ALERTE D'URGENCE
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-2 leading-tight">
                {currentAlert.title}
              </h3>
              
              <p className="text-sm leading-relaxed opacity-90">
                {currentAlert.message}
              </p>
              
              <div className="flex items-center gap-2 mt-4 text-xs opacity-75">
                <Volume2 className="h-3 w-3" />
                <span>Diffusion sur toutes les fréquences</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={hideAlert}
              className="flex-shrink-0 h-8 w-8 p-0 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4 w-full bg-black/20 rounded-full h-1">
            <div 
              className="bg-current h-1 rounded-full transition-all duration-300"
              style={{
                width: '100%',
                animation: `shrink ${currentAlert.duration}ms linear`
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
