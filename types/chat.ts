import { OllamaModel } from './ollama';

export interface Message {
  role: Role;
  content: string;
  webSearchExcluded?: boolean;
  file?: {
    name: string;
    size: number;
    type: string;
    metadata?: {
      pages?: number;
      title?: string;
      author?: string;
      contentText?: string; // full or truncated content not shown in UI
      preview?: string;     // short preview snippet for UI
      kind?: 'pdf' | 'text' | 'markdown' | 'image' | 'other';
    };
  };
}

export type Role = 'assistant' | 'user';

export interface WebSearchRequest {
  query: string;
  sessionId: string;
}

export interface ChatBody {
  model: string;
  system: string;
  prompt: string;
  images?: string[];
  webSearch?: WebSearchRequest;
  options?: 
    { temperature: number }
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OllamaModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
  webSearchEnabled?: boolean;
  webSearchSessionId?: string;
}
