import { vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock Firebase et Firestore pour isoler la logique playlist
vi.mock('@/lib/firebase', () => ({
  db: {},
}));
vi.mock('@/lib/firestorePlayer', () => ({
  pushPlayerLog: vi.fn(),
  updatePlayerState: vi.fn(),
}));
import { usePlaylistManager } from '../usePlaylistManager';
import type { PlaylistItem } from '@/lib/types';

const playlist: PlaylistItem[] = [
  { id: '1', title: 'Chanson 1', url: 'https://test.com/1.mp3', type: 'music', duration: 120 },
  { id: '2', title: 'Message 1', url: '', type: 'tts', duration: 10, text: 'Bienvenue sur Onde Spectrale' },
  { id: '3', title: 'Chanson 2', url: 'https://test.com/2.mp3', type: 'music', duration: 150 }
];

const station = { id: 'station1', name: 'Test', frequency: 101.1, playlist };

describe('usePlaylistManager', () => {
  beforeAll(() => {
    globalThis.SpeechSynthesisUtterance = class {
      public onend?: () => void;
      constructor(_: string) {}
    } as any;
    globalThis.window.speechSynthesis = {
      getVoices: () => [{ lang: 'fr', name: 'Français' }],
      speak: () => {},
      cancel: () => {},
      pause: () => {},
      resume: () => {},
    } as any;
  });
  it('démarre sur la première piste et peut passer à la suivante', () => {
    const { result } = renderHook(() => usePlaylistManager({ station, user: {}, allDjs: [] }));
    expect(result.current.currentTrack?.title).toBe('Chanson 1');
    act(() => {
      result.current.nextTrack();
    });
    expect(result.current.currentTrack?.title).toBe('Message 1');
    // Simule la fin du TTS
    act(() => {
      (result.current as any).utteranceRef.current?.onend?.();
    });
    expect(result.current.currentTrack?.title).toBe('Chanson 2');
  });

  it('recommence la playlist à la fin', () => {
    const { result } = renderHook(() => usePlaylistManager({ station, user: {}, allDjs: [] }));
    act(() => {
      result.current.nextTrack(); // Message 1
    });
    // Simule la fin du TTS
    act(() => {
      (result.current as any).utteranceRef.current?.onend?.();
    });
    act(() => {
      result.current.nextTrack(); // Chanson 2
    });
    act(() => {
      result.current.nextTrack(); // boucle : retour à Chanson 1
    });
    expect(result.current.currentTrack?.title).toBe('Chanson 1');
  });

  it('gère la lecture des textes TTS', () => {
    const { result } = renderHook(() => usePlaylistManager({ station, user: {}, allDjs: [] }));
    act(() => {
      result.current.nextTrack(); // Passe à Message 1 (TTS)
    });
    expect(result.current.currentTrack?.type).toBe('tts');
    expect(result.current.currentTrack?.text).toBe('Bienvenue sur Onde Spectrale');
    // Simule la fin du TTS
    act(() => {
      (result.current as any).utteranceRef.current?.onend?.();
    });
    expect(result.current.currentTrack?.title).toBe('Chanson 2');
  });
});
