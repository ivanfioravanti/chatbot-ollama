export interface OllamaModel {
  name: string;
  modified_at: Date;
  size: number;
}

export enum OllamaModelID {
  DEFAULTMODEL = 'llama2:latest'
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = OllamaModelID.DEFAULTMODEL;

export const OllamaModels: Record<OllamaModelID, OllamaModel> = {
  [OllamaModelID.DEFAULTMODEL]: {
    name: 'llama2',
    modified_at: new Date(),
    size: 4000,
  },
};
