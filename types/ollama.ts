export interface OllamaModel {
  name: string;
  modified_at: Date;
  size: number;
}

export interface OllamaModelDetail {
  license: string,
  modelfile: string,
  parameters: string,
  template: string,
  system: string,
}

export enum OllamaModelID {
  DEFAULTMODEL = 'mistral:latest'
}

// in case the `DEFAULT_MODEL` environment variable is not set or set to an unsupported model
export const fallbackModelID = OllamaModelID.DEFAULTMODEL;

export const OllamaModels: Record<OllamaModelID, OllamaModel> = {
  [OllamaModelID.DEFAULTMODEL]: {
    name: 'mistral:latest',
    modified_at: new Date(),
    size: 16384,
  },
};
