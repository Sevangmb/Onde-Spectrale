import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  RadioTower, 
  Zap, 
  Volume2, 
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Play
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  target?: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  interactive?: boolean;
  action?: () => void;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: '📻 Bienvenue dans les Terres Désolées',
    description: 'Vous êtes un survivant post-apocalyptique qui vient de découvrir cette vieille radio. Apprenons ensemble à l\'utiliser pour capter les dernières transmissions du monde d\'avant.',
    icon: <RadioTower className="h-8 w-8 text-primary" />,
    position: 'center'
  },
  {
    id: 'frequency',
    title: '🎛️ Le Syntoniseur',
    description: 'Ce cadran vous permet de parcourir les fréquences de 87.0 à 108.0 MHz. Chaque fréquence peut contenir une station avec de la musique, des nouvelles, ou des messages des autres survivants.',
    icon: <Zap className="h-8 w-8 text-primary" />,
    target: '.frequency-display',
    position: 'bottom',
    interactive: true
  },
  {
    id: 'scanning',
    title: '🔍 Scan Automatique',
    description: 'Utilisez ces boutons pour scanner automatiquement et trouver des stations actives. Le scanner s\'arrêtera automatiquement quand il détectera une transmission.',
    icon: <RadioTower className="h-8 w-8 text-primary" />,
    target: '.scan-buttons',
    position: 'top'
  },
  {
    id: 'audio',
    title: '🎵 Contrôles Audio',
    description: 'Une fois connecté à une station, vous pourrez contrôler la lecture, voir les informations sur la piste en cours, et naviguer dans la playlist.',
    icon: <Volume2 className="h-8 w-8 text-primary" />,
    target: '.audio-player',
    position: 'top'
  },
  {
    id: 'admin',
    title: '⚙️ Créer sa Station',
    description: 'Si vous vous connectez, vous pourrez créer votre propre station radio, choisir un DJ IA, et diffuser vos messages aux autres survivants du wasteland.',
    icon: <Settings className="h-8 w-8 text-primary" />,
    target: '.admin-button',
    position: 'bottom'
  },
  {
    id: 'ready',
    title: '🚀 Prêt à Explorer',
    description: 'Vous maîtrisez maintenant les bases ! Commencez par scanner pour trouver votre première station. Bonne chance, survivant !',
    icon: <Play className="h-8 w-8 text-primary" />,
    position: 'center',
    action: () => console.log('Start scanning demo')
  }
];

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardingOverlay({ isOpen, onClose, onComplete }: OnboardingOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<Element | null>(null);

  const step = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  // Update highlighted element when step changes
  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      setHighlightElement(element);
    } else {
      setHighlightElement(null);
    }
  }, [step.target]);

  const nextStep = () => {
    if (step.action) {
      step.action();
    }
    
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const skipTour = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm">
      {/* Highlight overlay */}
      {highlightElement && (
        <div 
          className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
          style={{
            top: highlightElement.getBoundingClientRect().top - 8,
            left: highlightElement.getBoundingClientRect().left - 8,
            width: highlightElement.getBoundingClientRect().width + 16,
            height: highlightElement.getBoundingClientRect().height + 16,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
          }}
        />
      )}

      {/* Tour content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="pip-boy-terminal max-w-md mx-auto relative overflow-hidden">
              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTour}
                className="absolute top-2 right-2 text-muted-foreground hover:text-primary"
              >
                <X className="h-4 w-4" />
              </Button>

              <CardContent className="p-6 space-y-4">
                {/* Progress indicator */}
                <div className="flex justify-center space-x-2 mb-4">
                  {onboardingSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep
                          ? 'bg-primary'
                          : index < currentStep
                          ? 'bg-primary/60'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>

                {/* Step icon */}
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 rounded-full border border-primary/30">
                    {step.icon}
                  </div>
                </div>

                {/* Step content */}
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-headline text-primary tracking-wider">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {step.description}
                  </p>
                </div>

                {/* Interactive element for frequency step */}
                {step.id === 'frequency' && (
                  <div className="my-4 p-4 border border-primary/30 rounded-lg bg-primary/5">
                    <div className="text-center mb-2">
                      <div className="text-2xl font-mono text-primary">101.5 MHz</div>
                      <div className="text-xs text-muted-foreground">Exemple de fréquence</div>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: '0%' }}
                        animate={{ width: '65%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>87.0</span>
                      <span>108.0</span>
                    </div>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-primary/20">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={isFirstStep}
                    className="retro-button text-sm"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Précédent
                  </Button>

                  <span className="text-xs text-muted-foreground font-mono">
                    {currentStep + 1} / {onboardingSteps.length}
                  </span>

                  <Button
                    onClick={nextStep}
                    className="retro-button text-sm"
                  >
                    {isLastStep ? 'Commencer' : 'Suivant'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* Skip option */}
                <div className="text-center mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={skipTour}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Passer le tutoriel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-primary rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>
    </div>
  );
}