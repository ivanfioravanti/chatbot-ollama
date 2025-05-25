import { OLLAMA_HOST, API_TIMEOUT_DURATION } from '../app/const';
import { OllamaModel } from '@/types/ollama';

export class OllamaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaError';
  }
}

export const OllamaStream = async (
  model: string,
  temperature: number,
  messages: { role: string; content: string }[]
): Promise<ReadableStream> => {
  const url = `${OLLAMA_HOST}/api/chat`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_DURATION);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        model,
        messages,
        options: {
          temperature,
        },
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const result = await res.json();
      throw new OllamaError(result.error || 'Unknown error');
    }

    const result = await res.json();

    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(result.message.content));
        controller.close();
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new OllamaError(
        `Connection error: Could not connect to Ollama at ${OLLAMA_HOST}. If you have set the OLLAMA_HOST environment variable, try removing it or ensuring it points to a valid Ollama instance.`
      );
    }

    throw error;
  }
};
