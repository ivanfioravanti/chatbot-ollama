import { ErrorMessage } from '@/types/error';
import { OllamaModel, OllamaModelID } from '@/types/ollama';

export interface HomeInitialState {
  loading: boolean;
  lightMode: 'light' | 'dark';
  modelError: ErrorMessage | null;
  models: OllamaModel[];
  defaultModelId: OllamaModelID | undefined;
}

export const initialState: HomeInitialState = {
  loading: false,
  lightMode: 'light',
  modelError: null,
  models: [],
  defaultModelId: undefined,
};
