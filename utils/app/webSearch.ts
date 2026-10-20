import { Conversation, Message, WebSearchRequest } from '@/types/chat';

import { v4 as uuidv4, validate, version } from 'uuid';

const validSession = (id?: string) => !!id && validate(id) && version(id) === 4;

export function configureWebSearch(
  conversation: Conversation,
  enabled: boolean,
): Conversation {
  return {
    ...conversation,
    webSearchEnabled: enabled,
    webSearchSessionId: validSession(conversation.webSearchSessionId)
      ? conversation.webSearchSessionId
      : uuidv4(),
  };
}

export function clearConversationMessages(
  conversation: Conversation,
): Conversation {
  return {
    ...conversation,
    messages: [],
    ...(conversation.webSearchSessionId
      ? { webSearchSessionId: uuidv4() }
      : {}),
  };
}

export function conversationSearch(
  conversation: Conversation,
  message: Message,
): WebSearchRequest | undefined {
  // Uploads remain local. Only the latest typed message is sent to Parallel,
  // never the transcript, system prompt, attachment text or image contents.
  if (
    conversation.webSearchEnabled !== true ||
    message.file ||
    message.webSearchExcluded
  )
    return undefined;
  if (!validSession(conversation.webSearchSessionId))
    throw new Error(
      'Please disable and re-enable web search for this conversation.',
    );
  return {
    query: message.content,
    sessionId: conversation.webSearchSessionId!,
  };
}
