import { OLLAMA_HOST } from '@/utils/app/const';

import { OllamaModel, OllamaModelID, OllamaModels } from '@/types/ollama';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    let url = `${OLLAMA_HOST}/api/tags`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
        `Ollama API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error('Ollama API returned an error');
    }

    const json = await response.json();

    const models: OllamaModel[] = json.models
      .map((model: any) => {
        const model_name = model.name;
        for (const [key, value] of Object.entries(OllamaModelID)) {
          {
            return {
              id: model.name,
              name: model.name,
              modified_at: model.modified_at,
              size: model.size,
            };
          }
        }
      })
      .filter(Boolean);

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error('Models API error:', error);
    
    // Check if this is a fetch/connection error that might be related to OLLAMA_HOST setting
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new Response(JSON.stringify({
        error: 'Connection Error',
        message: `Could not connect to Ollama at ${OLLAMA_HOST}`,
        suggestion: 'If you have set the OLLAMA_HOST environment variable, try removing it or setting it to http://127.0.0.1:11434'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Error fetching models',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export default handler;
