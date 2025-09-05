import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OllamaError, OllamaStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';


export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, system, options, prompt, images } = (await req.json()) as ChatBody;


    let promptToSend = system;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = options?.temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const stream = await OllamaStream(model, promptToSend, temperatureToUse, prompt, images);

    return new Response(stream);
  } catch (error) {
    console.error('Chat API error:', error);
    if (error instanceof OllamaError) {
      // Return a more descriptive error message to help with debugging
      return new Response(JSON.stringify({ 
        error: 'Ollama Error', 
        message: error.message,
        suggestion: error.message.includes('OLLAMA_HOST') ? 
          'Try removing the OLLAMA_HOST environment variable or setting it to http://127.0.0.1:11434' : 
          'Check if Ollama is running and accessible'
      }), { 
        status: 500, 
        headers: {
          'Content-Type': 'application/json'
        } 
      });
    } else {
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error', 
        message: error instanceof Error ? error.message : 'Unknown error'
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        } 
      });
    }
  }
};

export default handler;
