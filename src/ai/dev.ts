
import { config } from 'dotenv';
config();

// Keep only the audio generation flows
import '@/ai/flows/generate-dj-audio.ts';
import '@/ai/flows/generate-custom-dj-audio.ts';
import '@/ai/flows/generate-themed-message.ts';
import '@/ai/flows/generate-playlist-flow.ts';
