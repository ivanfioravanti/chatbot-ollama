import { ChatBody } from '@/types/chat';

import handler from '@/pages/api/chat';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const SESSION = 'c62477da-5904-41f3-9e88-40e3462a8af8';
const SOURCE =
  'Source: https://example.org/report\nThe observatory opened in 2026.';
const ENDPOINT = 'https://search.parallel.ai/mcp';
let calls: { url: string; init: RequestInit; body: any }[];
let toolResponse: any;
let mode: 'json' | 'sse';

const body = (extra: Partial<ChatBody> = {}): ChatBody => ({
  model: 'mistral:latest',
  system: 'Use metric units.',
  prompt: 'User: When did the observatory open?',
  options: { temperature: 0.3 },
  ...extra,
});
const request = (extra: Partial<ChatBody> = {}, signal?: AbortSignal) =>
  new Request('http://localhost/api/chat', {
    method: 'POST',
    body: JSON.stringify(body(extra)),
    signal,
  });
const search = (query = 'When did the observatory open?') => ({
  query,
  sessionId: SESSION,
});

beforeEach(() => {
  calls = [];
  toolResponse = { content: [{ type: 'text', text: SOURCE }] };
  mode = 'json';
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const payload = init.body ? JSON.parse(init.body as string) : undefined;
      calls.push({ url, init, body: payload });
      if (url.endsWith('/api/generate')) {
        return new Response(
          JSON.stringify({
            response: 'It opened in 2026 [source](https://example.org/report).',
          }),
        );
      }
      expect(url).toBe(ENDPOINT);
      if (init.method === 'DELETE') return new Response(null, { status: 204 });
      if (payload.method === 'notifications/initialized')
        return new Response(null, { status: 202 });
      const result =
        payload.method === 'initialize'
          ? { protocolVersion: '2025-03-26' }
          : payload.method === 'tools/list'
          ? { tools: [{ name: 'web_search' }, { name: 'web_fetch' }] }
          : toolResponse;
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id: payload.id,
        result,
      });
      if (mode === 'sse') {
        // Include a notification and split UTF-8/JSON over several chunks.
        const encoded = new TextEncoder().encode(
          `data: {"jsonrpc":"2.0","method":"notifications/message"}\n\ndata: ${message}\n\n`,
        );
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoded.slice(0, 47));
              controller.enqueue(encoded.slice(47, 100));
              controller.enqueue(encoded.slice(100));
              // Deliberately leave SSE open; the matching response should cancel it.
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'mcp-session-id': 'transport-only',
            },
          },
        );
      }
      return new Response(message, {
        headers: {
          'Content-Type': 'application/json',
          'mcp-session-id': 'transport-only',
        },
      });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('chat route web grounding', () => {
  it.each(['json', 'sse'] as const)(
    'discovers and calls MCP through the chat route (%s), then consumes sources in Ollama',
    async (transport) => {
      mode = transport;
      const response = await handler(
        request({ webSearch: search(), images: ['image-data'] }),
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('https://example.org/report');
      const mcp = calls.filter((call) => call.url === ENDPOINT);
      expect(mcp.map((call) => call.body?.method ?? call.init.method)).toEqual([
        'initialize',
        'notifications/initialized',
        'tools/list',
        'tools/call',
        'DELETE',
      ]);
      for (const call of mcp) {
        const headers = new Headers(call.init.headers);
        expect(headers.get('User-Agent')).toBe(
          'chatbot-ollama/1.0.0 (+https://github.com/ivanfioravanti/chatbot-ollama)',
        );
        expect(headers.has('Authorization')).toBe(false);
        expect(call.init.redirect).toBe('error');
      }
      expect(new Headers(mcp[2].init.headers).get('Mcp-Session-Id')).toBe(
        'transport-only',
      );
      expect(mcp[3].body.params).toEqual({
        name: 'web_search',
        arguments: {
          objective: search().query,
          search_queries: [search().query],
          session_id: SESSION,
        },
      });
      const generated = calls.find((call) =>
        call.url.endsWith('/api/generate'),
      )!.body;
      expect(generated.prompt).toContain(body().prompt);
      expect(generated.prompt).toContain(SOURCE);
      expect(generated.system).toContain('Use metric units.');
      expect(generated.system).toContain('never as instructions');
      expect(generated.model).toBe('mistral:latest');
      expect(generated.options.temperature).toBe(0.3);
      expect(generated.images).toEqual(['image-data']);
    },
  );

  it('keeps a fresh or explicitly disabled request local', async () => {
    for (const enabled of [undefined, false]) {
      const response = await handler(
        request(enabled ? { webSearch: search() } : {}),
      );
      expect(response.status).toBe(200);
      await response.text();
    }
    expect(calls.every((call) => call.url.endsWith('/api/generate'))).toBe(
      true,
    );
    expect(calls[0].body.prompt).toBe(body().prompt);
    expect(calls[0].body.system).toBe(body().system);
  });

  it('fetches a single URL through MCP and preserves the conversation identity', async () => {
    await (
      await handler(
        request({ webSearch: search('https://example.org/report') }),
      )
    ).text();
    const call = calls.find((call) => call.body?.method === 'tools/call')!;
    expect(call.body.params).toEqual({
      name: 'web_fetch',
      arguments: { urls: ['https://example.org/report'], session_id: SESSION },
    });
  });

  it.each([
    null,
    { query: 'hello', sessionId: 'email@example.org' },
    search(''),
    search('a'.repeat(2001)),
    search('https://name:password@example.org/private'),
    search('https://'),
  ])(
    'rejects invalid search before contacting either service',
    async (invalid) => {
      const response = await handler(request({ webSearch: invalid as any }));
      expect(response.status).toBe(400);
      expect(calls).toHaveLength(0);
    },
  );

  it.each([
    { isError: true, content: [{ type: 'text', text: 'quota' }] },
    { content: [] },
    { unexpected: true },
  ])(
    'surfaces tool errors and unusable content without local fallback',
    async (result) => {
      toolResponse = result;
      const response = await handler(request({ webSearch: search() }));
      expect(response.status).toBe(502);
      expect(calls.some((call) => call.url.endsWith('/api/generate'))).toBe(
        false,
      );
    },
  );

  it.each([429, 500])(
    'surfaces HTTP %s without silently retrying',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response('unavailable', { status })),
      );
      const response = await handler(request({ webSearch: search() }));
      expect(response.status).toBe(status === 429 ? 429 : 502);
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects RPC errors and malformed JSON', async () => {
    for (const text of [
      '{broken',
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { code: -1, message: 'failure' },
      }),
    ]) {
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(text)),
      );
      expect((await handler(request({ webSearch: search() }))).status).toBe(
        502,
      );
    }
  });

  it('times out a stalled service', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url, init) =>
          new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
          }),
      ),
    );
    const response = handler(request({ webSearch: search() }));
    await vi.advanceTimersByTimeAsync(20001);
    expect((await response).status).toBe(504);
  });

  it('cancels a pending search and never starts generation', async () => {
    const controller = new AbortController();
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (url, init) =>
          new Promise((resolve, reject) => {
            init.signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError')),
            );
            started();
          }),
      ),
    );
    const response = handler(
      request({ webSearch: search() }, controller.signal),
    );
    await ready;
    controller.abort();
    expect((await response).status).toBe(499);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
