import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      // Vous pouvez spécifier une version d'API si nécessaire, ex: 'v1beta'
    }),
  ],
  logLevel: 'debug', // Niveaux possibles: 'debug', 'info', 'warn', 'error'
  enableTracingAndMetrics: true,
});
