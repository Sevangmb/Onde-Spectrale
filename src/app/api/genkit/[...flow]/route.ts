
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { nextJSHandler } from '@genkit-ai/next';
import { z } from 'zod';

import '@/ai/flows/generate-dj-audio';
import '@/ai/flows/generate-custom-dj-audio';
import '@/ai/flows/simulate-frequency-interference';

genkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const POST = nextJSHandler();
