'use server';

/**
 * @fileOverview Simulates radio frequency interference for empty stations.
 *
 * - simulateFrequencyInterference - A function that simulates static and cross-talk for a given frequency.
 * - SimulateFrequencyInterferenceInput - The input type for the simulateFrequencyInterference function.
 * - SimulateFrequencyInterferenceOutput - The return type for the simulateFrequencyInterference function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SimulateFrequencyInterferenceInputSchema = z.object({
  frequency: z
    .number()
    .describe('The radio frequency to simulate interference for (87.0-108.0).'),
  stationName: z.string().optional().describe('The name of the station, if one exists.'),
});
export type SimulateFrequencyInterferenceInput = z.infer<
  typeof SimulateFrequencyInterferenceInputSchema
>;

const SimulateFrequencyInterferenceOutputSchema = z.object({
  interference: z
    .string()
    .describe(
      'A description of the simulated radio interference, including static and potential cross-talk from other stations.'
    ),
});
export type SimulateFrequencyInterferenceOutput = z.infer<
  typeof SimulateFrequencyInterferenceOutputSchema
>;

export async function simulateFrequencyInterference(
  input: SimulateFrequencyInterferenceInput
): Promise<SimulateFrequencyInterferenceOutput> {
  return simulateFrequencyInterferenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'simulateFrequencyInterferencePrompt',
  input: {schema: SimulateFrequencyInterferenceInputSchema},
  output: {schema: SimulateFrequencyInterferenceOutputSchema},
  prompt: `You are simulating radio frequency interference for a post-apocalyptic radio application.

  The user is tuning into frequency {{frequency}}.  

  {{#if stationName}}
  There is a station with name {{stationName}} on the frequency, so there should be minimal interference.
  {{else}}
  The frequency is empty. Describe the kind of static and cross-talk that might be heard on this frequency.  Consider potential bleed-over from nearby stations, atmospheric conditions, and the general state of disrepair of radio equipment in a post-apocalyptic world.
  The interference should sound realistic and immersive, contributing to the overall atmosphere of the application.
  Keep the response to two sentences.
  {{/if}}
  `,
});

const simulateFrequencyInterferenceFlow = ai.defineFlow(
  {
    name: 'simulateFrequencyInterferenceFlow',
    inputSchema: SimulateFrequencyInterferenceInputSchema,
    outputSchema: SimulateFrequencyInterferenceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
