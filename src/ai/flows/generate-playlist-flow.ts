
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a dynamic radio playlist.
 * It creates a script for a DJ based on a theme, alternating between spoken messages and music tracks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const GeneratePlaylistInputSchema = z.object({
  stationName: z.string().describe('Le nom de la station de radio.'),
  djName: z.string().describe('Le nom du personnage DJ.'),
  djDescription: z.string().describe('Une brève description de la personnalité du DJ.'),
  theme: z.string().describe("Le thème général de l'émission (ex: espoir, survie, humour noir)."),
});
export type GeneratePlaylistInput = z.infer<typeof GeneratePlaylistInputSchema>;

const PlaylistItemSchema = z.object({
  type: z.enum(['message', 'music']).describe("Le type d'élément de la playlist."),
  content: z.string().describe("Le contenu du message du DJ. Laisser vide si le type est 'music'."),
});

const GeneratePlaylistOutputSchema = z.object({
  items: z.array(PlaylistItemSchema).describe("La liste des éléments de la playlist générée."),
});
export type GeneratePlaylistOutput = z.infer<typeof GeneratePlaylistOutputSchema>;


const playlistPrompt = ai.definePrompt({
  name: 'generatePlaylistPrompt',
  input: { schema: GeneratePlaylistInputSchema },
  output: { schema: GeneratePlaylistOutputSchema },
  prompt: `
    Tu es un scénariste pour une radio post-apocalyptique dans l'univers de Fallout.
    Ta tâche est de créer une playlist pour une émission de radio.
    L'émission doit alterner entre des messages parlés par le DJ et des pistes musicales.

    Voici les détails de l'émission :
    - Nom de la station : {{{stationName}}}
    - Nom du DJ : {{{djName}}}
    - Personnalité du DJ : {{{djDescription}}}
    - Thème de l'émission : {{{theme}}}

    Instructions :
    1.  Crée une playlist contenant EXACTEMENT 7 éléments.
    2.  La structure doit être : Message, Musique, Message, Musique, Message, Musique, Message.
    3.  Les messages doivent être courts (1-2 phrases), immersifs et correspondre à la personnalité du DJ et au thème de l'émission.
    4.  Les messages doivent être uniques et variés.
    5.  Pour les éléments de type 'music', le champ 'content' doit être une chaîne de caractères vide.

    Exemple de message sur le thème de "l'espoir" pour un DJ optimiste :
    "Un autre jour se lève sur les terres désolées, mes amis. N'oubliez pas, même dans l'ombre, une étincelle peut allumer un feu d'espoir. Restez à l'écoute."
  `,
});

const generatePlaylistFlow = ai.defineFlow(
  {
    name: 'generatePlaylistFlow',
    inputSchema: GeneratePlaylistInputSchema,
    outputSchema: GeneratePlaylistOutputSchema,
  },
  async (input) => {
    const { output } = await playlistPrompt({ input, model: googleAI.model('gemini-1.5-flash-latest') });
    if (!output) {
      throw new Error("L'IA n'a pas réussi à générer de script pour la playlist.");
    }
    return output;
  }
);


export async function generatePlaylist(input: GeneratePlaylistInput): Promise<GeneratePlaylistOutput> {
    return await generatePlaylistFlow(input);
}
