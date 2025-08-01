// src/app/__mocks__/actions.ts
export const createDefaultStations = async () => {
  console.log('Mocked: createDefaultStations');
  return Promise.resolve();
};

export const getCustomCharactersForUser = async (userId: string) => {
  console.log('Mocked: getCustomCharactersForUser for userId:', userId);
  return Promise.resolve([]);
};

export const updateUserFrequency = async (userId: string, frequency: number) => {
  console.log(`Mocked: updateUserFrequency for userId: ${userId}, frequency: ${frequency}`);
  return Promise.resolve();
};

export const previewCustomDjAudio = async (params: { message: string; voice: any }) => {
  console.log('Mocked: previewCustomDjAudio', params);
  // Retourner un mock d'audio (chaîne base64 vide)
  return Promise.resolve({
    audioBase64: 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
    error: null
  });
};