'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating audio clips of a DJ character speaking a message.
 *
 * The flow takes a message and a DJ character ID as input, uses Google Cloud Text-to-Speech to generate
 * an audio clip in the selected DJ's voice, and returns the URL of the generated audio.
 *
 * @interface GenerateDjAudioInput - The input type for the generateDjAudio function.
 * @interface GenerateDjAudioOutput - The output type for the generateDjAudio function.
 * @function generateDjAudio - A function that handles the audio generation process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';

const GenerateDjAudioInputSchema = z.object({
  message: z.string().describe('The message to be spoken by the DJ character.'),
  characterId: z.string().describe('The ID of the DJ character to use for the voice.'),
});
export type GenerateDjAudioInput = z.infer<typeof GenerateDjAudioInputSchema>;

const GenerateDjAudioOutputSchema = z.object({
  audioUrl: z.string().describe('The URL of the generated audio clip.'),
});
export type GenerateDjAudioOutput = z.infer<typeof GenerateDjAudioOutputSchema>;

export async function generateDjAudio(input: GenerateDjAudioInput): Promise<GenerateDjAudioOutput> {
  return generateDjAudioFlow(input);
}

const DjCharacterSchema = z.object({
  name: z.string(),
  voiceName: z.string(),
});

const getDjCharacter = ai.defineTool({
  name: 'getDjCharacter',
  description: 'Retrieves the voice configuration for a specific DJ character.',
  inputSchema: z.object({
    characterId: z.string().describe('The ID of the DJ character.'),
  }),
  outputSchema: DjCharacterSchema,
},
async (input) => {
    // Mock implementation of fetching DJ character data.
    // In a real application, this would fetch from a database.
    switch (input.characterId) {
      case 'marcus':
        return {
          name: 'Marcus',
          voiceName: 'Mizar', // Corrected for Gemini TTS
        };
      case 'sarah':
        return {
          name: 'Sarah',
          voiceName: 'Alhena', // Corrected for Gemini TTS
        };
      case 'tommy':
        return {
          name: 'Tommy',
          voiceName: 'Antares', // Corrected for Gemini TTS
        };
      default:
        throw new Error(`Unknown character ID: ${input.characterId}`);
    }
  }
);

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

    let bufs: any[] = [];
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

const generateDjAudioFlow = ai.defineFlow({
    name: 'generateDjAudioFlow',
    inputSchema: GenerateDjAudioInputSchema,
    outputSchema: GenerateDjAudioOutputSchema,
  },
  async input => {
    const character = await getDjCharacter(input);

    const {media} = await ai.generate({
      model: 'gemini-2.5-flash-preview-tts',
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: character.voiceName },
          },
        },
      },
      prompt: { text: input.message },
    });

    if (!media) {
      throw new Error('no media returned');
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
