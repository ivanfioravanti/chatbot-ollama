import { DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OllamaError, OllamaStream } from '@/utils/server';
import { ChatBody } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as ChatBody;

    const model = body.model || 'mistral:instruct';
    const prompt = body.prompt;
    const temperature = body.options?.temperature ?? DEFAULT_TEMPERATURE;
    const tone = body.options?.tone || 'encouraging';

    const systemPrompt = `You are a professional fashion stylist AI.
You must respond using the exact format below and always use emojis.
Your tone is "${tone}".

ONLY respond using this exact format:

🎯 Style Rating: [number from 1 to 10]
📝 Review: [1 short sentence, max 20 words]
💡 Styling Tip: [1 tip to improve the look]

Each line must include at least one relevant emoji.
Return the response **exactly** as 3 lines separated by newline characters (\\n).
Keep responses concise and fun.
Do not add any other text or formatting.`;



    const stream = await OllamaStream(model, temperature, [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: prompt,
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
