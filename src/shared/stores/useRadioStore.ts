import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { Station } from '@/lib/types';

interface RadioState {
  frequency: number;
  sliderValue: number;
  isScanning: boolean;
  signalStrength: number;
  error: string | null;
  setFrequency: (frequency: number) => void;
  setSliderValue: (value: number) => void;
  setIsScanning: (scanning: boolean) => void;
  setSignalStrength: (strength: number) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  frequency: 100.7,
  sliderValue: 100.7,
  isScanning: false,
  signalStrength: 0,
  error: null,
};

export const useRadioStore = create<RadioState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,
        setFrequency: (frequency) => set({ frequency }),
        setSliderValue: (sliderValue) => set({ sliderValue }),
        setIsScanning: (isScanning) => set({ isScanning }),
        setSignalStrength: (signalStrength) => set({ signalStrength }),
        setError: (error) => set({ error }),
        reset: () => set(initialState),
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
