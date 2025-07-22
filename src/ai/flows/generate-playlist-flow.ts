
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a dynamic radio playlist.
 * It creates a script for a DJ based on a theme, alternating between spoken messages and music tracks.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export type GeneratePlaylistInput = {
    stationName: string;
    djName: string;
    djDescription: string;
    theme: string;
};

export type GeneratePlaylistOutput = {
    items: {
        type: 'message' | 'music';
        content: string;
    }[];
};

const GeneratePlaylistInputSchema = z.object({
  stationName: z.string().describe('Le nom de la station de radio.'),
  djName: z.string().describe('Le nom du personnage DJ.'),
  djDescription: z.string().describe('Une brève description de la personnalité du DJ.'),
  theme: z.string().describe("Le thème général de l'émission (ex: espoir, survie, humour noir)."),
});

const PlaylistItemSchema = z.object({
  type: z.enum(['message', 'music']).describe("Le type d'élément de la playlist."),
  content: z.string().describe("Le contenu du message du DJ ou un terme de recherche pour la musique. Ne doit JAMAIS être une chaîne vide."),
});

const GeneratePlaylistOutputSchema = z.object({
  items: z.array(PlaylistItemSchema).describe("La liste des éléments de la playlist générée."),
});


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

    Instructions STRICTES :
    1.  Crée une playlist contenant EXACTEMENT 7 éléments.
    2.  La structure doit être OBLIGATOIREMENT: Message, Musique, Message, Musique, Message, Musique, Message.
    3.  Les messages ('message') doivent être courts (1-2 phrases), immersifs et correspondre à la personnalité du DJ et au thème de l'émission. Le champ 'content' contiendra le texte du message.
    4.  Les pistes musicales ('music') doivent être représentées par un terme de recherche simple et efficace en anglais (2-3 mots), typique des années 40-50, comme "ink spots", "swing jazz", "sentimental journey", "butcher pete". Le champ 'content' contiendra ce terme de recherche.
    5.  Le champ 'content' NE DOIT JAMAIS être une chaîne de caractères vide. Il doit toujours contenir soit un message, soit un terme de recherche musical.

    Exemple de réponse VALIDE :
    {
      "items": [
        { "type": "message", "content": "Un autre jour se lève sur les terres désolées, mes amis. Restez à l'écoute." },
        { "type": "music", "content": "big band swing" },
        { "type": "message", "content": "N'oubliez pas, même dans l'ombre, une étincelle peut allumer un feu d'espoir." },
        { "type": "music", "content": "i dont want to set the world on fire" },
        { "type": "message", "content": "Faites attention aux goules, elles sont plus agitées que d'habitude aujourd'hui." },
        { "type": "music", "content": "maybe the ink spots" },
        { "type": "message", "content": "C'était votre DJ, vous rappelant de garder vos capsules à portée de main. A la prochaine." }
      ]
    }
  `,
});

const generatePlaylistFlow = ai.defineFlow(
  {
    name: 'generatePlaylistFlow',
    inputSchema: GeneratePlaylistInputSchema,
    outputSchema: GeneratePlaylistOutputSchema,
  },
  async (input) => {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const { output } = await playlistPrompt(input, { model: googleAI.model('gemini-1.5-flash-latest') });

        if (!output || !output.items || output.items.length === 0) {
          throw new Error("L'IA n'a pas réussi à générer de script pour la playlist.");
        }
        return output;

      } catch (e: any) {
        attempts++;
        if (e.message.includes('503') && attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // wait 1.5s
          continue;
        }
        // re-throw other errors or if max attempts reached
        throw e;
      }
    }
    // This part should be unreachable if the loop logic is correct
    throw new Error("Impossible de générer la playlist après plusieurs tentatives.");
  }
);


export async function generatePlaylist(input: GeneratePlaylistInput): Promise<GeneratePlaylistOutput> {
    return await generatePlaylistFlow(input);
}
