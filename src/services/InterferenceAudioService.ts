'use client';

/**
 * Service de gestion des sons d'interférence radio et autoplay automatique
 * Gère les bruits radio réalistes et la transition automatique entre stations
 */
export class InterferenceAudioService {
  private static instance: InterferenceAudioService | null = null;
  private interferenceAudio: HTMLAudioElement | null = null;
  private isInitialized = false;
  private currentInterferenceType: string | null = null;
  
  // Sons d'interférence disponibles
  private interferenceTypes = {
    static: 'https://cdn.freesound.org/previews/316/316847_5123451-lq.mp3', // Static radio
    white_noise: 'https://cdn.freesound.org/previews/316/316695_5123451-lq.mp3', // White noise
    radio_scan: 'https://cdn.freesound.org/previews/341/341695_6070975-lq.mp3', // Radio scanning
    weak_signal: 'https://cdn.freesound.org/previews/316/316696_5123451-lq.mp3', // Weak signal
  };

  // Fallback: générer du bruit blanc programmatiquement
  private whiteNoiseBuffer: AudioBuffer | null = null;
  private audioContext: AudioContext | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;

  static getInstance(): InterferenceAudioService {
    if (!InterferenceAudioService.instance) {
      InterferenceAudioService.instance = new InterferenceAudioService();
    }
    return InterferenceAudioService.instance;
  }

  /**
   * Initialise le service audio (doit être appelé après une interaction utilisateur)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Créer le contexte audio pour le bruit blanc généré
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Générer buffer de bruit blanc comme fallback
      this.generateWhiteNoiseBuffer();
      
      // Créer l'élément audio pour les sons d'interférence
      this.interferenceAudio = new Audio();
      this.interferenceAudio.loop = true;
      this.interferenceAudio.volume = 0.3;
      this.interferenceAudio.crossOrigin = 'anonymous';
      
      // Précharger un son d'interférence par défaut
      await this.preloadInterferenceSound('static');
      
      this.isInitialized = true;
      console.log('✅ InterferenceAudioService initialized');
    } catch (error) {
      console.warn('⚠️ Failed to initialize InterferenceAudioService:', error);
      // Continue with limited functionality
      this.isInitialized = true;
    }
  }

  /**
   * Génère un buffer de bruit blanc programmatiquement
   */
  private generateWhiteNoiseBuffer(): void {
    if (!this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * 2; // 2 secondes
    this.whiteNoiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = this.whiteNoiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // Bruit blanc entre -1 et 1
    }
  }

  /**
   * Précharge un son d'interférence
   */
  private async preloadInterferenceSound(type: keyof typeof this.interferenceTypes): Promise<void> {
    if (!this.interferenceAudio) return;

    return new Promise((resolve, reject) => {
      if (!this.interferenceAudio) {
        reject(new Error('Audio element not initialized'));
        return;
      }

      const handleLoad = () => {
        this.interferenceAudio!.removeEventListener('canplaythrough', handleLoad);
        this.interferenceAudio!.removeEventListener('error', handleError);
        resolve();
      };

      const handleError = () => {
        this.interferenceAudio!.removeEventListener('canplaythrough', handleLoad);
        this.interferenceAudio!.removeEventListener('error', handleError);
        console.warn(`Failed to load interference sound: ${type}`);
        resolve(); // Continue même en cas d'erreur
      };

      this.interferenceAudio.addEventListener('canplaythrough', handleLoad);
      this.interferenceAudio.addEventListener('error', handleError);
      this.interferenceAudio.src = this.interferenceTypes[type];
    });
  }

  /**
   * Joue un son d'interférence basé sur la fréquence
   */
  async playInterference(frequency: number, intensity: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Déterminer le type d'interférence basé sur la fréquence
    const interferenceType = this.getInterferenceTypeForFrequency(frequency);
    
    // Si c'est le même type, pas besoin de changer
    if (this.currentInterferenceType === interferenceType) {
      return;
    }

    // Arrêter l'interférence actuelle
    this.stopInterference();

    try {
      // Essayer d'abord avec les sons externes
      if (this.interferenceAudio && this.interferenceTypes[interferenceType as keyof typeof this.interferenceTypes]) {
        await this.playExternalInterference(interferenceType as keyof typeof this.interferenceTypes, intensity);
      } else {
        // Fallback sur le bruit blanc généré
        this.playGeneratedWhiteNoise(intensity);
      }

      this.currentInterferenceType = interferenceType;
    } catch (error) {
      console.warn('Failed to play interference, using fallback:', error);
      this.playGeneratedWhiteNoise(intensity);
    }
  }

  /**
   * Détermine le type d'interférence selon la fréquence
   */
  private getInterferenceTypeForFrequency(frequency: number): string {
    // Fréquences basses (87-92): static fort
    if (frequency < 92) return 'static';
    
    // Fréquences moyennes (92-100): bruit blanc
    if (frequency < 100) return 'white_noise';
    
    // Fréquences hautes (100-108): signal faible
    return 'weak_signal';
  }

  /**
   * Joue un son d'interférence externe
   */
  private async playExternalInterference(type: keyof typeof this.interferenceTypes, intensity: 'low' | 'medium' | 'high'): Promise<void> {
    if (!this.interferenceAudio) return;

    // Ajuster le volume selon l'intensité
    const volumeMap = { low: 0.15, medium: 0.3, high: 0.5 };
    this.interferenceAudio.volume = volumeMap[intensity];

    // Charger et jouer le son
    if (this.interferenceAudio.src !== this.interferenceTypes[type]) {
      this.interferenceAudio.src = this.interferenceTypes[type];
    }

    try {
      await this.interferenceAudio.play();
    } catch (error) {
      throw new Error(`Failed to play interference sound: ${error}`);
    }
  }

  /**
   * Joue le bruit blanc généré
   */
  private playGeneratedWhiteNoise(intensity: 'low' | 'medium' | 'high'): void {
    if (!this.audioContext || !this.whiteNoiseBuffer) return;

    // Arrêter la source précédente
    if (this.noiseSource) {
      this.noiseSource.stop();
    }

    // Créer une nouvelle source
    this.noiseSource = this.audioContext.createBufferSource();
    this.noiseSource.buffer = this.whiteNoiseBuffer;
    this.noiseSource.loop = true;

    // Contrôle du volume
    const volumeMap = { low: 0.1, medium: 0.2, high: 0.35 };
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volumeMap[intensity];

    // Connecter et jouer
    this.noiseSource.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    this.noiseSource.start();
  }

  /**
   * Arrête tous les sons d'interférence
   */
  stopInterference(): void {
    // Arrêter l'audio externe
    if (this.interferenceAudio && !this.interferenceAudio.paused) {
      this.interferenceAudio.pause();
      this.interferenceAudio.currentTime = 0;
    }

    // Arrêter le bruit blanc généré
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch (error) {
        // Ignore si déjà arrêté
      }
      this.noiseSource = null;
    }

    this.currentInterferenceType = null;
  }

  /**
   * Transition en douceur vers une nouvelle fréquence
   */
  async transitionToFrequency(frequency: number, hasStation: boolean): Promise<void> {
    if (hasStation) {
      // Fade out de l'interférence
      await this.fadeOutInterference();
      this.stopInterference();
    } else {
      // Jouer l'interférence pour cette fréquence
      const intensity = this.getInterferenceIntensity(frequency);
      await this.playInterference(frequency, intensity);
    }
  }

  /**
   * Détermine l'intensité d'interférence selon la fréquence
   */
  private getInterferenceIntensity(frequency: number): 'low' | 'medium' | 'high' {
    // Plus d'interférence aux extrémités de la bande FM
    if (frequency < 88 || frequency > 107) return 'high';
    if (frequency < 90 || frequency > 105) return 'medium';
    return 'low';
  }

  /**
   * Fade out progressif de l'interférence
   */
  private async fadeOutInterference(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      if (!this.interferenceAudio || this.interferenceAudio.paused) {
        resolve();
        return;
      }

      const startVolume = this.interferenceAudio.volume;
      const fadeStep = startVolume / (duration / 50);
      
      const fadeInterval = setInterval(() => {
        if (!this.interferenceAudio || this.interferenceAudio.volume <= 0) {
          clearInterval(fadeInterval);
          resolve();
          return;
        }
        
        this.interferenceAudio.volume = Math.max(0, this.interferenceAudio.volume - fadeStep);
      }, 50);
    });
  }

  /**
   * Test si l'autoplay est autorisé
   */
  async testAutoplayCapability(): Promise<boolean> {
    try {
      const testAudio = new Audio();
      testAudio.muted = true;
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFAl0tu3wujkqJr7u9fJeNyqV1e3l8n0w';
      
      await testAudio.play();
      testAudio.pause();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Force l'initialisation du contexte audio après interaction
   */
  async ensureAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Nettoyage des ressources
   */
  dispose(): void {
    this.stopInterference();
    
    if (this.interferenceAudio) {
      this.interferenceAudio.src = '';
      this.interferenceAudio = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.whiteNoiseBuffer = null;
    this.isInitialized = false;
    this.currentInterferenceType = null;
  }
}

// Export singleton instance
export const interferenceAudioService = InterferenceAudioService.getInstance();