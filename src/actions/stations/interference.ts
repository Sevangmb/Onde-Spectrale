// src/actions/stations/interference.ts
'use server';

import { simulateFrequencyInterference } from '@/ai/flows/simulate-frequency-interference';
import { getStationForFrequency } from './queries';

export async function getInterference(frequency: number): Promise<string> {
  try {
    const station = await getStationForFrequency(frequency);
    const result = await simulateFrequencyInterference({
        frequency,
        stationName: station?.name,
    });
    return result.interference;
  } catch (error) {
    console.error(`Erreur de génération d'interférence pour ${frequency}MHz:`, error);
    return "Statique... rien que de la statique.";
  }
}
