import { OllamaModel } from './ollama';

export interface Message {
  role: Role;
  content: string;
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

export interface ChatBody {
  model: string;
  system: string;
  prompt: string;
  images?: string[];
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
}
