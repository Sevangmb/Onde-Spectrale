import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { Station } from '@/lib/types';

interface RadioState {
  frequency: number;
  sliderValue: number;
  currentStation: Station | null;
  isLoadingStation: boolean;
  isScanning: boolean;
  signalStrength: number;
  error: string | null;
  setFrequency: (frequency: number) => void;
  setSliderValue: (value: number) => void;
  setCurrentStation: (station: Station | null) => void;
  setIsLoadingStation: (loading: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
  setSignalStrength: (strength: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: Omit<RadioState, 'setFrequency' | 'setSliderValue' | 'setCurrentStation' | 'setIsLoadingStation' | 'setIsScanning' | 'setSignalStrength' | 'setError' | 'reset'> = {
  frequency: 100.7,
  sliderValue: 100.7,
  currentStation: null,
  isLoadingStation: true,
  isScanning: false,
  signalStrength: 0,
  error: null,
};

export const useRadioStore = create<RadioState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setFrequency: (frequency) => set({ frequency }, false, 'setFrequency'),
        setSliderValue: (sliderValue) => set({ sliderValue }, false, 'setSliderValue'),
        setCurrentStation: (currentStation) => set({ currentStation }, false, 'setCurrentStation'),
        setIsLoadingStation: (isLoadingStation) => set({ isLoadingStation }, false, 'setIsLoadingStation'),
        setIsScanning: (isScanning) => set({ isScanning }, false, 'setIsScanning'),
        setSignalStrength: (signalStrength) => set({ signalStrength }, false, 'setSignalStrength'),
        setError: (error) => set({ error }, false, 'setError'),
        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'onde-spectrale-radio-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          frequency: state.frequency,
          sliderValue: state.sliderValue,
        }),
      }
    ),
    { name: 'radio-store' }
  )
);
