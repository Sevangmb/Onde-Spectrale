import type { PlaylistItem } from '@/lib/types';

export interface AudioServiceInterface {
  loadTrack(track: PlaylistItem, audioRef: HTMLAudioElement): Promise<void>;
  play(audioRef: HTMLAudioElement): Promise<void>;
  pause(audioRef: HTMLAudioElement): void;
  setVolume(audioRef: HTMLAudioElement, volume: number): void;
  getCurrentTime(audioRef: HTMLAudioElement): number;
  getDuration(audioRef: HTMLAudioElement): number;
  seekTo(audioRef: HTMLAudioElement, time: number): void;
}

export class AudioService implements AudioServiceInterface {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isInitialized = false;
  
  constructor() {
    // Don't initialize AudioContext in constructor for SSR compatibility
  }
  
  private async initializeAudioContext(): Promise<void> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.warn('AudioContext not available in server environment');
      return;
    }
    
    if (this.isInitialized) {
      return;
    }
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      
      // Connect nodes: source -> gain -> analyser -> destination
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
      // Configure analyser for spectrum visualization
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      this.isInitialized = true;
    } catch (error) {
      console.warn('AudioContext initialization failed:', error);
    }
  }
  
  async loadTrack(track: PlaylistItem, audioRef: HTMLAudioElement): Promise<void> {
    if (!audioRef) {
      throw new Error('Audio element not available');
    }
    
    // Clear any existing source
    audioRef.src = '';
    audioRef.load();
    
    try {
      // Set crossOrigin before setting src
      audioRef.crossOrigin = 'anonymous';
      audioRef.preload = 'metadata';
      
      // Get audio URL for track
      const audioUrl = await this.getAudioUrlForTrack(track);
      
      if (!audioUrl) {
        throw new Error('No audio URL available for track');
      }
      
      audioRef.src = audioUrl;
      
      // Wait for loadedmetadata event
      return new Promise((resolve, reject) => {
        const onLoadedMetadata = async () => {
          audioRef.removeEventListener('loadedmetadata', onLoadedMetadata);
          audioRef.removeEventListener('error', onError);
          
          // Connect to Web Audio API if available
          await this.connectToAudioContext(audioRef);
          
          resolve();
        };
        
        const onError = (error: Event) => {
          audioRef.removeEventListener('loadedmetadata', onLoadedMetadata);
          audioRef.removeEventListener('error', onError);
          reject(new Error('Failed to load audio metadata'));
        };
        
        audioRef.addEventListener('loadedmetadata', onLoadedMetadata);
        audioRef.addEventListener('error', onError);
        
        // Start loading
        audioRef.load();
      });
      
    } catch (error) {
      throw new Error(`Failed to load track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async getAudioUrlForTrack(track: PlaylistItem): Promise<string> {
    // If track already has a direct URL, use it
    if (track.url && !track.url.includes('placeholder')) {
      return track.url;
    }
    
    // For message type tracks, we'll need to generate TTS audio
    if (track.type === 'message') {
      return await this.generateTTSAudio(track);
    }
    
    // For music tracks, return the URL or throw if not available
    if (track.type === 'music' && track.url) {
      return track.url;
    }
    
    throw new Error('No valid audio source for track');
  }
  
  private async generateTTSAudio(track: PlaylistItem): Promise<string> {
    // This would integrate with your existing TTS system
    // For now, we'll return a data URL placeholder
    // In the real implementation, this would call your AI services
    
    try {
      // Use Web Speech API as fallback
      if ('speechSynthesis' in window) {
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(track.content);
          utterance.rate = 0.8;
          utterance.pitch = 1.0;
          utterance.volume = 0.8;
          
          // This is a simplified implementation
          // You'd need to capture the audio and convert to blob URL
          resolve('data:audio/wav;base64,'); // Placeholder
        });
      }
      
      throw new Error('TTS not available');
    } catch (error) {
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async connectToAudioContext(audioRef: HTMLAudioElement): Promise<void> {
    await this.initializeAudioContext();
    
    if (!this.audioContext || !this.gainNode) return;
    
    try {
      // Create media element source if not already created
      const source = this.audioContext.createMediaElementSource(audioRef);
      source.connect(this.gainNode);
    } catch (error) {
      console.warn('Failed to connect to AudioContext:', error);
    }
  }
  
  async play(audioRef: HTMLAudioElement): Promise<void> {
    if (!audioRef) {
      throw new Error('Audio element not available');
    }
    
    // Resume AudioContext if suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    try {
      await audioRef.play();
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        throw new Error('Autoplay blocked by browser. User interaction required.');
      }
      throw error;
    }
  }
  
  pause(audioRef: HTMLAudioElement): void {
    if (audioRef) {
      audioRef.pause();
    }
  }
  
  setVolume(audioRef: HTMLAudioElement, volume: number): void {
    if (audioRef) {
      audioRef.volume = Math.max(0, Math.min(1, volume));
    }
    
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(volume, this.audioContext?.currentTime || 0);
    }
  }
  
  getCurrentTime(audioRef: HTMLAudioElement): number {
    return audioRef?.currentTime || 0;
  }
  
  getDuration(audioRef: HTMLAudioElement): number {
    return audioRef?.duration || 0;
  }
  
  seekTo(audioRef: HTMLAudioElement, time: number): void {
    if (audioRef) {
      audioRef.currentTime = time;
    }
  }
  
  // Spectrum analysis for visualizations
  getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode) return null;
    
    const bufferLength = this.analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(dataArray);
    
    return dataArray;
  }
  
  // Cleanup
  disconnect(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
      this.gainNode = null;
      this.analyserNode = null;
    }
  }
}

// Singleton instance
export const audioService = new AudioService();