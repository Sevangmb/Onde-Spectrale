
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a single, themed DJ message.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GenerateThemedMessageInputSchema = z.object({
  djName: z.string().describe('Le nom du personnage DJ.'),
  djDescription: z.string().describe('Une brève description de la personnalité du DJ.'),
  theme: z.string().describe("Le thème général du message (ex: espoir, survie, humour noir)."),
});

const GenerateThemedMessageOutputSchema = z.object({
  message: z.string().describe("Le message thématique généré pour le DJ."),
});

const themedMessagePrompt = ai.definePrompt({
  name: 'generateThemedMessagePrompt',
  input: { schema: GenerateThemedMessageInputSchema },
  output: { schema: GenerateThemedMessageOutputSchema },
  prompt: `
    Tu es un scénariste pour une radio post-apocalyptique dans l'univers de Fallout.
    Ta tâche est de créer UN SEUL message court (1-2 phrases) pour une émission de radio.

    Voici les détails :
    - Nom du DJ : {{{djName}}}
    - Personnalité du DJ : {{{djDescription}}}
    - Thème du message : {{{theme}}}

    Le message doit être immersif, unique et correspondre parfaitement à la personnalité du DJ et au thème donné.

    Exemple de message sur le thème de "l'espoir" pour un DJ optimiste :
    "Un autre jour se lève sur les terres désolées, mes amis. N'oubliez pas, même dans l'ombre, une étincelle peut allumer un feu d'espoir. Restez à l'écoute."
  `,
});

export async function generateThemedMessage(
  input: z.infer<typeof GenerateThemedMessageInputSchema>
): Promise<z.infer<typeof GenerateThemedMessageOutputSchema>> {
  const { output } = await themedMessagePrompt(input, { model: googleAI.model('gemini-1.5-flash-latest') });
  if (!output || !output.message) {
    throw new Error("L'IA n'a pas réussi à générer de message.");
  }
  return output;
}
