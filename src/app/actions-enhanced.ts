// src/app/actions-enhanced.ts
import { isServer } from '@/lib/utils';
import type { CustomDJCharacter } from '@/lib/types';

const serverActions = isServer() ? require('./actions') : null;

export const createDefaultStations = async (): Promise<void> => {
  if (serverActions) {
    return serverActions.createDefaultStations();
  }
  console.log('Mocked: createDefaultStations (client-side)');
  return Promise.resolve();
};

export const getCustomCharactersForUser = async (userId: string): Promise<CustomDJCharacter[]> => {
  if (serverActions) {
    return serverActions.getCustomCharactersForUser(userId);
  }
  console.log('Mocked: getCustomCharactersForUser (client-side) for userId:', userId);
  return Promise.resolve([]);
};

export const updateUserFrequency = async (userId: string, frequency: number): Promise<void> => {
  if (serverActions) {
    return serverActions.updateUserFrequency(userId, frequency);
  }
  console.log(`Mocked: updateUserFrequency (client-side) for userId: ${userId}, frequency: ${frequency}`);
  return Promise.resolve();
};