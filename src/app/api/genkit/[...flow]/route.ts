
import genkit from '@genkit-ai/next';

// Import all flows that you want to be exposed via the API route.
import '@/ai/flows/generate-dj-audio';
import '@/ai/flows/generate-custom-dj-audio';
import '@/ai/flows/simulate-frequency-interference';
import '@/ai/flows/generate-themed-message';
import '@/ai/flows/generate-playlist-flow';


export const {POST} = genkit({} as any);
