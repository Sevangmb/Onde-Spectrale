'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating audio clips for custom DJ characters.
 *
 * It takes a message and a voice configuration object as input, uses Google Cloud Text-to-Speech
 * to generate an audio clip with the specified voice parameters, and returns the URL of the generated audio.
 *
 * @interface GenerateCustomDjAudioInput - The input type for the generateCustomDjAudio function.
 * @interface GenerateCustomDjAudioOutput - The output type for the generateCustomDjAudio function.
 * @function generateCustomDjAudio - A function that handles the custom audio generation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

// Define a mapping from your simplified gender/style to Google TTS voice names
// This is a creative choice to give character to the voices
const voiceMap: { [key: string]: { [key: string]: string } } = {
  male: {
    calm: 'Encke',
    energetic: 'Talitha',
    joker: 'Mizar',
  },
  female: {
    calm: 'Alhena',
    energetic: 'Regulus',
    joker: 'Caph',
  },
};

const VoiceInputSchema = z.object({
  gender: z.string().describe('The gender of the voice (e.g., "male", "female").'),
  tone: z.string().describe('The tone of the voice (e.g., "deep", "medium", "high").'),
  style: z.string().describe('The speaking style (e.g., "calm", "energetic", "joker").'),
  speakingRate: z.number().describe('The speaking rate, from 0.25 to 4.0.'),
});

const GenerateCustomDjAudioInputSchema = z.object({
  message: z.string().describe('The message to be spoken.'),
  voice: VoiceInputSchema,
});
export type GenerateCustomDjAudioInput = z.infer<typeof GenerateCustomDjAudioInputSchema>;

const GenerateCustomDjAudioOutputSchema = z.object({
  audioUrl: z.string().describe('The URL of the generated audio clip.'),
});
export type GenerateCustomDjAudioOutput = z.infer<typeof GenerateCustomDjAudioOutputSchema>;

export async function generateCustomDjAudio(input: GenerateCustomDjAudioInput): Promise<GenerateCustomDjAudioOutput> {
  return generateCustomDjAudioFlow(input);
}

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

const generateCustomDjAudioFlow = ai.defineFlow({
    name: 'generateCustomDjAudioFlow',
    inputSchema: GenerateCustomDjAudioInputSchema,
    outputSchema: GenerateCustomDjAudioOutputSchema,
  },
  async input => {
    const { voice, message } = input;
    
    const voiceName = voiceMap[voice.gender]?.[voice.style] || 'Antares'; // Default to a neutral voice

    // Map tone to pitch
    const pitchMap: { [key: string]: number } = {
        deep: -4.0,
        medium: 0.0,
        high: 4.0,
    };
    const pitch = pitchMap[voice.tone] || 0.0;

    const {media} = await ai.generate({
      model: 'googleai/gemini-2.5-pro-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
          pitch: pitch,
          speakingRate: voice.speakingRate,
        },
      },
      prompt: message,
    });

    if (!media) {
      throw new Error('No media was returned from the TTS service.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    return {
      audioUrl: 'data:audio/wav;base64,' + (await toWav(audioBuffer)),
    };
  }
);
