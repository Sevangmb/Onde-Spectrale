
import type { RunFlowOptions } from '@genkit-ai/flow';

class GenkitClient {
  private flowUrl(flowId: string): string {
    const baseUrl =
      typeof window === 'undefined'
        ? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:9002' // Port de développement
        : '';
    return `${baseUrl}/api/genkit/${flowId}`;
  }

  async flow<I, O>(
    flowId: string,
    input?: I,
    options?: RunFlowOptions
  ): Promise<O> {
    const url = this.flowUrl(flowId);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input }),
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Flow failed with status ${response.status}: ${errorBody}`);
        throw new Error(`Flow failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // La réponse de l'API genkit est enveloppée, nous extrayons la sortie.
      if (result && result.output) {
        return result.output as O;
      }
      // Cas où la réponse est directement la sortie (moins courant)
      return result as O;

    } catch (error)
    {
        console.error(`Error calling flow '${flowId}':`, error);
        if (error instanceof Error) {
           throw new Error(`Flow call failed: ${error.message}`);
        }
        throw new Error('An unknown error occurred while calling the flow.');
    }
  }
}

export const genkitClient = new GenkitClient();
