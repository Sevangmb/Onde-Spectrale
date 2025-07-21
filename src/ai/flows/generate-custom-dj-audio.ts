
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating audio clips for custom DJ characters.
 *
 * It takes a message and a voice configuration object as input, uses Google Cloud Text-to-Speech
 * to generate an audio clip with the specified voice parameters, and returns the URL of the generated audio.
 *
 * @interface GenerateCustomDjAudioInput - The input type for the generateCustomDjAudio function.
 * @interface GenerateCustomDjAudioOutput - The output type for the generateCustomDjAudio function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';
import wav from 'wav';

// Define a mapping from your simplified gender/style to Google TTS voice names
// This is a creative choice to give character to the voices
const voiceMap: { [key: string]: { [key: string]: string } } = {
  male: {
    calm: 'Encke',
    energetic: 'Talitha',
    joker: 'Mizar',
    deep: 'Encke',
    medium: 'Talitha',
    high: 'Mizar'
  },
  female: {
    calm: 'Alhena',
    energetic: 'Regulus',
    joker: 'Caph',
    deep: 'Alhena',
    medium: 'Regulus',
    high: 'Caph'
  },
};

const VoiceInputSchema = z.object({
  gender: z.string().describe('The gender of the voice (e.g., "male", "female").'),
  tone: z.string().describe('The tone of the voice (e.g., "deep", "medium", "high").'),
  style: z.string().describe('The speaking style (e.g., "calm", "energetic", "joker").'),
});

const GenerateCustomDjAudioInputSchema = z.object({
  message: z.string().describe('The message to be spoken.'),
  voice: VoiceInputSchema,
});
export type GenerateCustomDjAudioInput = z.infer<typeof GenerateCustomDjAudioInputSchema>;

const GenerateCustomDjAudioOutputSchema = z.object({
  audioUrl: z.string().describe('The URL of the generated audio clip.'),
  rawPcm: z.string().optional().describe('Raw PCM audio data, base64 encoded.'),
});
export type GenerateCustomDjAudioOutput = z.infer<typeof GenerateCustomDjAudioOutputSchema>;


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
    });

    let bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}

export const generateCustomDjAudioFlow = ai.defineFlow({
    name: 'generateCustomDjAudioFlow',
    inputSchema: GenerateCustomDjAudioInputSchema,
    outputSchema: GenerateCustomDjAudioOutputSchema,
  },
  async (input, streamingCallback) => {
    const { voice, message } = input;
    
    // Prioritize style, then tone for voice mapping
    const voiceName = voiceMap[voice.gender]?.[voice.style] || voiceMap[voice.gender]?.[voice.tone] || 'Antares'; // Default to a neutral voice

    const {media, "response": responsePromise} = await ai.generateStream({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
      prompt: message,
    });

    if (streamingCallback) {
        for await (const chunk of media) {
            if (chunk.media) {
                const audioBuffer = Buffer.from(
                    chunk.media.url.substring(chunk.media.url.indexOf(',') + 1),
                    'base64'
                );
                streamingCallback(audioBuffer.toString('base64'));
            }
        }
    }
    
    const finalResponse = await responsePromise;
    const finalMedia = finalResponse.media;

    if (!finalMedia) {
      throw new Error('No media was returned from the TTS service.');
    }

    const audioBuffer = Buffer.from(
      finalMedia.url.substring(finalMedia.url.indexOf(',') + 1),
      'base64'
    );
    
    const wavData = await toWav(audioBuffer);

    return {
      audioUrl: 'data:audio/wav;base64,' + wavData,
      rawPcm: audioBuffer.toString('base64'),
    };
  }
);
