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

    const model = body.model || 'mistral:instruct'; // try changing to a better model if you can
    const rawPrompt = body.prompt;
    const temperature = body.options?.temperature ?? DEFAULT_TEMPERATURE;
    const tone = body.options?.tone || 'encouraging';

    const systemPrompt = `You are a professional fashion stylist AI.
Your tone is "${tone}".
You must strictly follow this format:
🎯 Style Rating: [Score]/10 — [One short sentence summary]
📝 Review: [One or two witty, fun, and fashion-savvy sentences using emojis]
💡 Tip: [One practical, playful styling tip with at least one emoji]

⚠️ Do NOT write anything before or after.
⚠️ Do NOT list options.
⚠️ Do NOT explain.
Only return the formatted critique.`;

    const structuredPrompt = `Outfit description: ${rawPrompt}`;

    // Save the input to the database
    try {
      const db = await getDB();
      await db.run(
        'INSERT INTO prompts (prompt, tone) VALUES (?, ?)',
        rawPrompt,
        tone
      );
    } catch (dbError) {
      console.warn('⚠️ DB insert failed:', dbError);
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
            ? 'Try removing the OLLAMA_HOST env var or setting it to http://127.0.0.1:11434'
            : 'Check if Ollama is running and accessible',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

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
};

export default handler;
