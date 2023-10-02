import { OllamaModel } from './ollama';

export interface Prompt {
  id: string;
  name: string;
  description: string;
  content: string;
  model: OllamaModel;
  folderId: string | null;
}
