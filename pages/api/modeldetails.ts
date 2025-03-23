import { OLLAMA_HOST } from '@/utils/app/const';
import { OllamaModelDetail } from '@/types/ollama';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    let url = `${OLLAMA_HOST}/api/show`;

    const { name } = await req.json();

    if (typeof name !== 'string' || name.trim() === '') {
      return new Response('Name parameter is required', { status: 400 });
    }

    const response = await fetch(url, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }), 
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

    return new Response(JSON.stringify(json), { status: 200 });
  } catch (error) {
    console.error('Model details API error:', error);
    
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
      error: 'Error fetching model details',
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
