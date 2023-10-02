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
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
