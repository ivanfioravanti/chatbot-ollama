import { DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OllamaError, OllamaStream } from '@/utils/server';
import { ChatBody } from '@/types/chat';
import { getDB } from '@/lib/db';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as ChatBody;

    const model = body.model || 'mistral:instruct';
    const rawPrompt = body.prompt;
    const temperature = body.options?.temperature ?? DEFAULT_TEMPERATURE;
    const tone = body.options?.tone || 'encouraging';

const systemPrompt = `You are a professional fashion stylist AI.
You must respond using the exact format below and always use emojis.
Your tone is "${tone}".

ONLY respond using:
🎯 Style Rating: [1-10] with a short reason
📝 Review: 1-2 stylish and witty sentences
💡 Tip: 1 practical fashion suggestion, include emojis!

Do not introduce or repeat the prompt, just return the styled output.`;

const structuredPrompt = `Outfit: ${rawPrompt}`;


    // Store the prompt and tone in the database
    try {
      const db = await getDB();
      await db.run(
        'INSERT INTO prompts (prompt, tone) VALUES (?, ?)',
        rawPrompt,
        tone
      );
    } catch (dbError) {
      console.warn('⚠️ Failed to insert prompt into DB:', dbError);
    }

    const stream = await OllamaStream(model, temperature, [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: structuredPrompt,
      },
    ]);

    return new Response(stream);
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof OllamaError) {
      return new Response(
        JSON.stringify({
          error: 'Ollama Error',
          message: error.message,
          suggestion: error.message.includes('OLLAMA_HOST')
            ? 'Try removing the OLLAMA_HOST environment variable or setting it to http://127.0.0.1:11434'
            : 'Check if Ollama is running and accessible',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
};

export default handler;