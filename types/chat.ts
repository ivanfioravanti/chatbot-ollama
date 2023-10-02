import { OllamaModel } from './ollama';

export interface Message {
  role: Role;
  content: string;
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: string;
  system: string;
  prompt: string;
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
