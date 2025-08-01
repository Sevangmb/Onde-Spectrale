// src/app/__mocks__/actions-enhanced.ts
import type { CustomDJCharacter } from '@/lib/types';

// Mock implementation for Storybook
export const createDefaultStations = async (): Promise<void> => {
  console.log('Mock: createDefaultStations called');
  return Promise.resolve();
};

export const getCustomCharactersForUser = async (userId: string): Promise<CustomDJCharacter[]> => {
  console.log('Mock: getCustomCharactersForUser called with userId:', userId);
  
  // Return some mock custom DJ characters for Storybook
  const mockCustomDJs: CustomDJCharacter[] = [
    {
      id: 'custom-dj-1',
      name: 'DJ Wastelander',
      description: 'A mysterious DJ who survived the wasteland with nothing but a radio and determination.',
      voice: {
        gender: 'male',
        tone: 'mysterious',
        style: 'professional',
      },
      isCustom: true,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'custom-dj-2', 
      name: 'Vault Girl Sarah',
      description: 'An optimistic survivor from Vault 111 who brings hope to the wasteland through music.',
      voice: {
        gender: 'female',
        tone: 'friendly',
        style: 'energetic',
      },
      isCustom: true,
      ownerId: userId,
      createdAt: new Date().toISOString(),
    },
  ];
  
  return Promise.resolve(mockCustomDJs);
};

export const updateUserFrequency = async (userId: string, frequency: number): Promise<void> => {
  console.log(`Mock: updateUserFrequency called with userId: ${userId}, frequency: ${frequency}`);
  return Promise.resolve();
};