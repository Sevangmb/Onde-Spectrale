'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating audio clips for custom DJ characters.
 *
 * It takes a message and a voice configuration object as input, uses Google Cloud Text-to-Speech
 * to generate an audio clip with the specified voice parameters, and returns the generated audio data.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';
import logger from '@/lib/logger';

// Define a mapping from your simplified gender/style to Google TTS voice names
const voiceMap: { [key: string]: { [key: string]: string } } = {
  male: {
    calm: 'umbriel',
    energetic: 'zephyr',
    joker: 'puck',
    deep: 'rasalgethi',
    medium: 'zubenelgenubi',
    high: 'achernar'
  },
  female: {
    calm: 'autonoe',
    energetic: 'callirrhoe',
    joker: 'erinome',
    deep: 'laomedeia',
    medium: 'leda',
    high: 'kore'
  },
};

const VoiceInputSchema = z.object({
  gender: z.string().describe('The gender of the voice (e.g., "male", "female").'),
  tone: z.string().describe('The tone of the voice (e.g., "deep", "medium", "high").'),
  style: z.string().describe('The speaking style (e.g., "calm", "energetic", "joker").'),
  volume: z.number().optional().describe('The volume of the voice (e.g., 0.5 for half volume).'),
  toneAdjust: z.number().optional().describe('The tone adjustment of the voice (e.g., -2 for lower tone, 2 for higher tone).'),
});

const GenerateCustomDjAudioInputSchema = z.object({
  message: z.string().describe('The message to be spoken.'),
  voice: VoiceInputSchema,
});
type GenerateCustomDjAudioInput = z.infer<typeof GenerateCustomDjAudioInputSchema>;

const GenerateCustomDjAudioOutputSchema = z.object({
  audioBase64: z.string().describe('The base64 encoded WAV audio data.'),
});
type GenerateCustomDjAudioOutput = z.infer<typeof GenerateCustomDjAudioOutputSchema>;


// Helper to convert PCM audio data to WAV format
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    }) as any; // Type assertion for wav package compatibility

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d: Buffer) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
}

const generateCustomDjAudioFlow = ai.defineFlow({
    name: 'generateCustomDjAudioFlow',
    inputSchema: GenerateCustomDjAudioInputSchema,
    outputSchema: GenerateCustomDjAudioOutputSchema,
  },
  async (input: GenerateCustomDjAudioInput) => {
    const { voice, message } = input;
    
    const voiceName = voiceMap[voice.gender]?.[voice.style] || voiceMap[voice.gender]?.[voice.tone] || 'vindemiatrix';

    const { media } = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
            // pitch: voice.toneAdjust,
            // gain: voice.volume,
          },
        },
      },
      prompt: message,
    });
    
    if (!media) {
      logger.error('No media was returned from the TTS service.');
      throw new Error('No media was returned from the TTS service.');
    }
    
    const pcmBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    if (pcmBuffer.length === 0) {
      logger.error('Generated PCM buffer is empty.');
      throw new Error('Generated PCM buffer is empty.');
    }
    
    const wavData = await toWav(pcmBuffer);

    return {
      audioBase64: wavData,
    };
  }
);


export async function generateCustomDjAudio(input: GenerateCustomDjAudioInput): Promise<GenerateCustomDjAudioOutput> {
    return await generateCustomDjAudioFlow(input);
}
