import { WebSearchRequest } from '@/types/chat';

import { createParser } from 'eventsource-parser';

const ENDPOINT = 'https://search.parallel.ai/mcp';
const USER_AGENT =
  'chatbot-ollama/1.0.0 (+https://github.com/ivanfioravanti/chatbot-ollama)';
const PROTOCOL = '2025-03-26';
const TIMEOUT_MS = 20000;
const MAX_RESPONSE_BYTES = 256000;

export class WebSearchError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
    this.name = 'WebSearchError';
  }
}

// This client only needs the fixed Search MCP endpoint's HTTP request/response
// transport. Keep it on Web APIs so the chat route can still run at the edge.
export async function webContext(
  search: WebSearchRequest,
  signal: AbortSignal,
): Promise<string> {
  if (
    !search ||
    typeof search.query !== 'string' ||
    !search.query.trim() ||
    search.query.length > 2000 ||
    typeof search.sessionId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      search.sessionId,
    )
  ) {
    throw new WebSearchError(
      'Invalid web-search query or conversation ID.',
      400,
    );
  }

  const query = search.query.trim();
  const isUrl = /^https?:\/\//i.test(query);
  if (isUrl) {
    try {
      const url = new URL(query);
      if (url.username || url.password) throw new Error();
    } catch {
      throw new WebSearchError(
        'Use a valid HTTP(S) URL without embedded credentials.',
        400,
      );
    }
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, TIMEOUT_MS);
  let session: string | null = null;
  let nextId = 0;
  const headers = () => ({
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'User-Agent': USER_AGENT,
    'MCP-Protocol-Version': PROTOCOL,
    ...(session ? { 'Mcp-Session-Id': session } : {}),
  });

  const rpc = async (method: string, params?: object, notification = false) => {
    const id = notification ? undefined : ++nextId;
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new WebSearchError(
        response.status === 429
          ? 'Web search is temporarily rate limited. Please try again later.'
          : `Web search returned HTTP ${response.status}.`,
        response.status === 429 ? 429 : 502,
      );
    }
    if (method === 'initialize')
      session = response.headers.get('mcp-session-id');
    if (notification) {
      await response.body?.cancel();
      return;
    }
    if (!response.body) throw new WebSearchError('Empty web-search response.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const sse = response.headers
      .get('content-type')
      ?.includes('text/event-stream');
    let bytes = 0;
    let text = '';
    let message: any;
    const parser = createParser((event) => {
      if (event.type !== 'event') return;
      const value = JSON.parse(event.data);
      if (value.id === id) message = value;
    });
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          bytes += value.byteLength;
          if (bytes > MAX_RESPONSE_BYTES)
            throw new WebSearchError('Web-search response is too large.');
          const chunk = decoder.decode(value, { stream: true });
          if (sse) parser.feed(chunk);
          else text += chunk;
        }
        if (done || message) break;
      }
      if (!sse) message = JSON.parse(text + decoder.decode());
      if (message?.jsonrpc !== '2.0' || message.id !== id)
        throw new WebSearchError('Invalid web-search response.');
      if (message.error)
        throw new WebSearchError(
          'The web-search service could not complete the request.',
        );
      return message.result;
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
  };

  try {
    const initialized = await rpc('initialize', {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: 'chatbot-ollama', version: '1.0.0' },
    });
    if (initialized?.protocolVersion !== PROTOCOL)
      throw new WebSearchError('Unsupported web-search protocol version.');
    await rpc('notifications/initialized', undefined, true);

    const tool = isUrl ? 'web_fetch' : 'web_search';
    const tools = await rpc('tools/list');
    if (!tools?.tools?.some((item: any) => item.name === tool))
      throw new WebSearchError('The web-search tool is unavailable.');
    const result = await rpc('tools/call', {
      name: tool,
      arguments: {
        ...(isUrl
          ? { urls: [query] }
          : {
              objective: query,
              search_queries: [query.split(/\s+/).slice(0, 6).join(' ')],
            }),
        session_id: search.sessionId,
      },
    });
    if (result?.isError)
      throw new WebSearchError(
        'Web search failed. Please try again or disable web search.',
      );
    if (!Array.isArray(result?.content))
      throw new WebSearchError('Invalid web-search content.');
    const context = result.content
      .filter(
        (item: any) => item.type === 'text' && typeof item.text === 'string',
      )
      .map((item: any) => item.text)
      .join('\n')
      .slice(0, 25000);
    if (!context.trim())
      throw new WebSearchError('Web search returned no content.');
    return context;
  } catch (error) {
    if (signal.aborted)
      throw new DOMException('Request cancelled', 'AbortError');
    if (controller.signal.aborted)
      throw new WebSearchError('Web search timed out. Please try again.', 504);
    if (error instanceof WebSearchError) throw error;
    throw new WebSearchError('Could not read the web-search response.');
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
    // The MCP transport session is separate from the conversation's session_id.
    if (session && !controller.signal.aborted) {
      const closeTimer = setTimeout(abort, 1000);
      try {
        const response = await fetch(ENDPOINT, {
          method: 'DELETE',
          headers: headers(),
          signal: controller.signal,
          redirect: 'error',
        });
        await response.body?.cancel();
      } catch {
        // Session cleanup must not replace the search result or original error.
      } finally {
        clearTimeout(closeTimer);
      }
    }
  }
}
