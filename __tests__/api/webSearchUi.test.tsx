// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import toast from 'react-hot-toast';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import { cleanSelectedConversation } from '@/utils/app/clean';
import { updateConversation } from '@/utils/app/conversation';

import { Conversation } from '@/types/chat';
import { OllamaModelID, OllamaModels } from '@/types/ollama';

import handler from '@/pages/api/chat';
import HomeContext from '@/pages/api/home/home.context';
import { initialState, HomeInitialState } from '@/pages/api/home/home.state';

import { Chat } from '@/components/Chat/Chat';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (text: string) => text }),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    custom: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));
vi.mock('@/components/Chat/MemoizedChatMessage', () => ({
  MemoizedChatMessage: ({ message }: any) => <div>{message.content}</div>,
}));

const fresh = (id: string): Conversation => ({
  id,
  name: 'New Conversation',
  messages: [],
  model: OllamaModels[OllamaModelID.DEFAULTMODEL],
  prompt: 'Answer in English.',
  temperature: 0.2,
  folderId: null,
});
let roots: Root[];
let mcpCalls: any[];
let apiBodies: any[];
let toolError: boolean;
let stall: boolean;
let searchStarted: boolean;
let releaseSearch: (() => void) | undefined;
let ignoreAbort: boolean;

beforeEach(() => {
  roots = [];
  mcpCalls = [];
  apiBodies = [];
  toolError = false;
  stall = false;
  searchStarted = false;
  releaseSearch = undefined;
  ignoreAbort = false;
  vi.stubGlobal('React', React);
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('confirm', () => true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      if (url === 'api/chat') {
        apiBodies.push(JSON.parse(init.body as string));
        return handler(new Request('http://localhost/api/chat', init));
      }
      if (url.endsWith('/api/generate')) {
        return new Response(
          JSON.stringify({
            response: 'Observed in 2026: https://example.org/source',
          }),
        );
      }
      expect(url).toBe('https://search.parallel.ai/mcp');
      expect(new Headers(init.headers).get('User-Agent')).toContain(
        'chatbot-ollama/',
      );
      expect(new Headers(init.headers).has('Authorization')).toBe(false);
      if (init.method === 'DELETE') return new Response(null, { status: 204 });
      const rpc = JSON.parse(init.body as string);
      if (rpc.method === 'notifications/initialized')
        return new Response(null, { status: 202 });
      if (rpc.method === 'tools/call') {
        mcpCalls.push(rpc.params);
        searchStarted = true;
        if (stall)
          return new Promise((resolve, reject) => {
            if (!ignoreAbort)
              init.signal!.addEventListener('abort', () =>
                reject(new DOMException('aborted', 'AbortError')),
              );
            releaseSearch = () =>
              resolve(
                Response.json({
                  jsonrpc: '2.0',
                  id: rpc.id,
                  result: {
                    content: [
                      {
                        type: 'text',
                        text: 'https://example.org/source: observed in 2026',
                      },
                    ],
                  },
                }),
              );
          });
      }
      const result =
        rpc.method === 'initialize'
          ? { protocolVersion: '2025-03-26' }
          : rpc.method === 'tools/list'
          ? { tools: [{ name: 'web_search' }, { name: 'web_fetch' }] }
          : {
              isError: toolError,
              content: [
                {
                  type: 'text',
                  text: 'https://example.org/source: observed in 2026',
                },
              ],
            };
      return Response.json({ jsonrpc: '2.0', id: rpc.id, result });
    }),
  );
});

afterEach(async () => {
  await act(async () => {
    for (const root of roots) root.unmount();
  });
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function mount(conversation: Conversation, prompts: any[] = []) {
  let latest: HomeInitialState;
  let select!: (next: Conversation) => void;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);
  function Harness() {
    const stop = React.useRef(false);
    const { state, dispatch } = useCreateReducer({
      initialState: {
        ...initialState,
        selectedConversation: conversation,
        conversations: [conversation],
        models: [conversation.model],
        prompts,
      },
    });
    latest = state;
    select = (next) => {
      dispatch({ field: 'selectedConversation', value: next });
      dispatch({
        field: 'conversations',
        value: [...state.conversations, next],
      });
    };
    return (
      <HomeContext.Provider
        value={
          {
            state,
            dispatch,
            handleUpdateConversation: (
              selected: Conversation,
              data: { key: string; value: any },
            ) => {
              const { single, all } = updateConversation(
                { ...selected, [data.key]: data.value },
                state.conversations,
              );
              dispatch({ field: 'selectedConversation', value: single });
              dispatch({ field: 'conversations', value: all });
            },
          } as any
        }
      >
        <Chat stopConversationRef={stop} />
      </HomeContext.Provider>
    );
  }
  await act(async () => {
    root.render(<Harness />);
  });
  return {
    container,
    state: () => latest!,
    select: async (next: Conversation) => {
      await act(async () => {
        select(next);
      });
    },
  };
}
async function toggle(container: HTMLElement) {
  await act(async () => {
    container
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!
      .click();
  });
}
async function send(container: HTMLElement, text: string) {
  await act(async () => {
    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder*="Type a message"]',
    )!;
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value',
    )!.set!.call(textarea, text);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await act(async () => {
    container
      .querySelector<HTMLTextAreaElement>(
        'textarea[placeholder*="Type a message"]',
      )!
      .dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );
  });
}

describe('composer -> chat request -> MCP -> generation -> displayed result', () => {
  it('requires permission, persists the choice and keeps related search/fetch/follow-up/retry IDs stable', async () => {
    const app = await mount(fresh('chat-one'));
    expect(
      app.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .checked,
    ).toBe(false);
    await send(app.container, 'Keep this local');
    expect(mcpCalls).toHaveLength(0);
    await toggle(app.container);
    const id = app.state().selectedConversation!.webSearchSessionId;
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(
      JSON.parse(localStorage.getItem('selectedConversation')!)
        .webSearchEnabled,
    ).toBe(true);
    await send(app.container, 'latest observatory opening date');
    expect(app.container.textContent).toContain('https://example.org/source');
    await send(app.container, 'https://example.org/source');
    await send(app.container, 'what happened the next year');
    toolError = true;
    await send(app.container, 'try another date');
    toolError = false;
    const toastElement = (vi.mocked(toast.custom).mock.calls.at(-1)![0] as any)(
      { id: 'error-toast', visible: true },
    );
    function findRetry(element: any): any {
      if (element?.props?.children === 'Retry') return element;
      for (const child of React.Children.toArray(element?.props?.children)) {
        if (typeof child !== 'object') continue;
        const result = findRetry(child);
        if (result) return result;
      }
    }
    await act(async () => {
      findRetry(toastElement).props.onClick();
    });
    expect(mcpCalls.map((call) => call.name)).toEqual([
      'web_search',
      'web_fetch',
      'web_search',
      'web_search',
      'web_search',
    ]);
    expect(mcpCalls.every((call) => call.arguments.session_id === id)).toBe(
      true,
    );
    expect(apiBodies.at(-1).webSearch.query).toBe('try another date');
    expect(apiBodies.at(-1).webSearch.query).not.toContain('Keep this local');
    await toggle(app.container);
    await send(app.container, 'local again');
    expect(apiBodies.at(-1).webSearch).toBeUndefined();
    expect(mcpCalls).toHaveLength(5);
  });

  it('isolates interleaved conversations and gives clear/new-chat a fresh identity', async () => {
    const a = await mount(fresh('a'));
    const b = await mount(fresh('b'));
    await toggle(a.container);
    await toggle(b.container);
    await send(a.container, 'first research');
    await send(b.container, 'second research');
    await send(a.container, 'follow up first');
    await send(b.container, 'follow up second');
    const ids = mcpCalls.map((call) => call.arguments.session_id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids[2]).toBe(ids[0]);
    expect(ids[3]).toBe(ids[1]);
    const clear = Array.from(a.container.querySelectorAll('button')).find(
      (button) => button.title === 'Clear all',
    )!;
    await act(async () => {
      clear.click();
    });
    await send(a.container, 'start over');
    expect(mcpCalls.at(-1).arguments.session_id).not.toBe(ids[0]);
    const c = await mount(fresh('new-chat'));
    expect(
      c.container.querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .checked,
    ).toBe(false);
    await toggle(c.container);
    await send(c.container, 'new research');
    expect(ids).not.toContain(mcpCalls.at(-1).arguments.session_id);
  });

  it('restores saved permissions and keeps document and image uploads local', async () => {
    const original = await mount(fresh('saved'));
    await toggle(original.container);
    const saved = cleanSelectedConversation(
      JSON.parse(localStorage.getItem('selectedConversation')!),
    );
    const restored = await mount(saved);
    expect(
      restored.container.querySelector<HTMLInputElement>(
        'input[type="checkbox"]',
      )!.checked,
    ).toBe(true);
    await send(restored.container, 'fresh information after reload');
    expect(mcpCalls[0].arguments.session_id).toBe(saved.webSearchSessionId);
    const attach = restored.container.querySelector<HTMLButtonElement>(
      'button[title="Attach Document"]',
    )!;
    await act(async () => {
      attach.click();
    });
    const file = new File(['private document'], 'private.txt', {
      type: 'text/plain',
    });
    Object.defineProperty(file, 'text', {
      value: async () => 'private document',
    });
    await act(async () => {
      const input =
        restored.container.querySelector<HTMLInputElement>(
          'input[type="file"]',
        )!;
      Object.defineProperty(input, 'files', { value: [file] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(apiBodies.at(-1).webSearch).toBeUndefined();
    expect(apiBodies.at(-1).prompt).toContain('private document');
    await act(async () => {
      restored.container
        .querySelector<HTMLButtonElement>('button[title="Attach Image"]')!
        .click();
    });
    await act(async () => {
      const input =
        restored.container.querySelector<HTMLInputElement>(
          'input[type="file"]',
        )!;
      Object.defineProperty(input, 'files', {
        value: [
          new File(['private image'], 'private.png', { type: 'image/png' }),
        ],
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(apiBodies.at(-1).images).toHaveLength(1);
    expect(apiBodies.at(-1).webSearch).toBeUndefined();
    expect(mcpCalls).toHaveLength(1);
  });

  it('preserves prompt shortcuts after whitespace while allowing URLs to send', async () => {
    const app = await mount(fresh('prompt'), [
      {
        id: 'p',
        name: 'Test prompt',
        content: 'expanded prompt',
        description: '',
        model: fresh('p').model,
        folderId: null,
      },
    ]);
    await send(app.container, 'help /tes');
    expect(apiBodies).toHaveLength(0);
    expect(
      app.container.querySelector<HTMLTextAreaElement>(
        'textarea[placeholder*="Type a message"]',
      )!.value,
    ).toBe('help expanded prompt');
  });

  it('Stop Generating cancels a pending search from the composer', async () => {
    const app = await mount(fresh('cancel'));
    await toggle(app.container);
    stall = true;
    await send(app.container, 'slow research');
    await vi.waitFor(() => expect(searchStarted).toBe(true));
    const stop = Array.from(app.container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('Stop Generating'),
    )!;
    await act(async () => {
      stop.click();
    });
    expect(app.state().messageIsStreaming).toBe(false);
    expect(apiBodies).toHaveLength(1);
    stall = false;
    await send(app.container, 'research after stopping');
    expect(app.state().selectedConversation!.messages.at(-1)?.role).toBe(
      'assistant',
    );
  });
});

it('disabling permission before an existing error Retry must keep the retry local', async () => {
  const app = await mount(fresh('review-permission'));
  await toggle(app.container);
  toolError = true;
  await send(app.container, 'research this question');
  const callback = vi.mocked(toast.custom).mock.calls.at(-1)![0] as any;
  await toggle(app.container);
  expect(app.state().selectedConversation!.webSearchEnabled).toBe(false);
  const toastElement = callback({ id: 'error-toast', visible: true });
  function findRetry(element: any): any {
    if (element?.props?.children === 'Retry') return element;
    for (const child of React.Children.toArray(element?.props?.children)) {
      if (typeof child !== 'object') continue;
      const result = findRetry(child);
      if (result) return result;
    }
  }
  toolError = false;
  await act(async () => {
    findRetry(toastElement).props.onClick();
  });
  expect(apiBodies.at(-1).webSearch).toBeUndefined();
});

it('regenerating an image-upload response must keep the upload local', async () => {
  const app = await mount(fresh('review-image'));
  await toggle(app.container);
  await act(async () => {
    app.container
      .querySelector<HTMLButtonElement>('button[title="Attach Image"]')!
      .click();
  });
  await act(async () => {
    const input =
      app.container.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', {
      value: [
        new File(['private image'], 'private.png', { type: 'image/png' }),
      ],
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  expect(apiBodies.at(-1).images).toHaveLength(1);
  expect(mcpCalls).toHaveLength(0);
  const regenerate = Array.from(app.container.querySelectorAll('button')).find(
    (button) => button.textContent?.includes('Regenerate response'),
  )!;
  await act(async () => {
    regenerate.click();
  });
  expect(apiBodies.at(-1).webSearch).toBeUndefined();
});

it('ignores an old error Retry after clearing the conversation', async () => {
  const app = await mount(fresh('clear-retry'));
  await toggle(app.container);
  toolError = true;
  await send(app.container, 'failed research');
  const renderToast = vi.mocked(toast.custom).mock.calls.at(-1)![0] as any;
  const toastElement = renderToast({ id: 'old-error', visible: true });
  const findRetry = (element: any): any => {
    if (element?.props?.children === 'Retry') return element;
    for (const child of React.Children.toArray(element?.props?.children)) {
      if (typeof child === 'object') {
        const found = findRetry(child);
        if (found) return found;
      }
    }
  };
  await act(async () => {
    Array.from(app.container.querySelectorAll('button'))
      .find((button) => button.title === 'Clear all')!
      .click();
  });
  await act(async () => {
    findRetry(toastElement).props.onClick();
  });
  expect(apiBodies).toHaveLength(1);
  expect(app.state().selectedConversation!.messages).toHaveLength(0);
});

it('retains the reset identity when an old pending search eventually responds', async () => {
  const app = await mount(fresh('pending-clear'));
  await toggle(app.container);
  const oldId = app.state().selectedConversation!.webSearchSessionId;
  stall = true;
  ignoreAbort = true;
  await send(app.container, 'old research');
  expect(searchStarted).toBe(true);
  await act(async () => {
    Array.from(app.container.querySelectorAll('button'))
      .find((button) => button.title === 'Clear all')!
      .click();
  });
  const resetId = app.state().selectedConversation!.webSearchSessionId;
  expect(resetId).not.toBe(oldId);
  await act(async () => {
    releaseSearch!();
  });
  expect(app.state().selectedConversation!.webSearchSessionId).toBe(resetId);
  expect(app.state().selectedConversation!.messages).toHaveLength(0);
  expect(app.state().messageIsStreaming).toBe(false);
});

it('keeps a new conversation when a previous conversation finishes late', async () => {
  const app = await mount(fresh('pending-old'));
  await toggle(app.container);
  stall = true;
  ignoreAbort = true;
  await send(app.container, 'old research');
  const oldId = mcpCalls[0].arguments.session_id;
  const releaseOld = releaseSearch!;
  await app.select(fresh('new-conversation'));
  stall = false;
  await toggle(app.container);
  await send(app.container, 'new research');
  const newId = app.state().selectedConversation!.webSearchSessionId;
  expect(newId).not.toBe(oldId);
  await act(async () => {
    releaseOld();
  });
  expect(app.state().selectedConversation!.id).toBe('new-conversation');
  expect(app.state().selectedConversation!.webSearchSessionId).toBe(newId);
  expect(app.state().selectedConversation!.messages[0].content).toBe(
    'new research',
  );
});
