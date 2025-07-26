// src/components/ErrorBoundary.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, RadioTower } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error; retry: () => void}>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class RadioErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Radio Error Boundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Track error in analytics (if available)
    if (typeof window !== 'undefined') {
      try {
        // You can add analytics tracking here
        console.error('Error tracked:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        });
      } catch (analyticsError) {
        console.warn('Failed to track error:', analyticsError);
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent 
          error={this.state.error!} 
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Default error fallback component with radio theme
const DefaultErrorFallback: React.FC<{error: Error; retry: () => void}> = ({ error, retry }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl pip-boy-terminal border-destructive/40">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive animate-pulse" />
            <RadioTower className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl text-destructive font-headline uppercase tracking-wider">
            Transmission Interrompue
          </CardTitle>
          <p className="text-muted-foreground font-mono mt-2">
            Une erreur technique a perturbé le signal radio
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm font-mono text-destructive/90">
                ERREUR SYSTÈME: {error.message}
              </p>
              {isDevelopment && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Détails techniques (mode développement)
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap text-left overflow-auto max-h-40 bg-background/50 p-2 rounded">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={retry}
                className="retro-button bg-primary/20 hover:bg-primary/30"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Rétablir la Transmission
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
                className="retro-button"
              >
                <RadioTower className="mr-2 h-4 w-4" />
                Redémarrer le Récepteur
              </Button>
            </div>

            <div className="text-xs text-muted-foreground font-mono space-y-1">
              <p>• Vérifiez votre connexion réseau</p>
              <p>• Essayez de changer de fréquence</p>
              <p>• Contactez les techniciens si le problème persiste</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Specific error boundary for audio components
export const AudioErrorBoundary: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <RadioErrorBoundary
      fallback={({ error, retry }) => (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
          <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive font-mono mb-3">
            Erreur Audio: {error.message}
          </p>
          <Button 
            size="sm" 
            onClick={retry}
            className="retro-button text-xs"
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Réessayer
          </Button>
        </div>
      )}
      onError={(error) => {
        console.error('🎵 Audio Error:', error.message);
      }}
    >
      {children}
    </RadioErrorBoundary>
  );
};

// Hook for manual error reporting
export const useErrorReporting = () => {
  const reportError = React.useCallback((error: Error, context?: string) => {
    console.error(`🚨 Manual Error Report ${context ? `[${context}]` : ''}:`, error);
    
    // You can add error reporting service integration here
    // Example: Sentry, LogRocket, etc.
  }, []);

  return { reportError };
};

export default RadioErrorBoundary;