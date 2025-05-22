export type RequestModel = {
  params?: object;
  headers?: object;
  signal?: AbortSignal;
};

export type RequestWithBodyModel = RequestModel & {
  body?: object | FormData;
};

import { API_TIMEOUT_DURATION } from '@/utils/app/const';

export const useFetch = () => {
  const handleFetch = async (
    url: string,
    request: any,
    signal?: AbortSignal,
  ) => {
    const baseUrl = import.meta.env.VITE_OLLAMA_API_BASE_URL || 'http://localhost:11434';
    //const requestUrl = request?.params ? `${url}${request.params}` : url;
    const requestUrl = request?.params ? `${baseUrl}${url}${request.params}` : `${baseUrl}${url}`;



    const requestBody = request?.body
      ? request.body instanceof FormData
        ? { ...request, body: request.body }
        : { ...request, body: JSON.stringify(request.body) }
      : request;

    const headers = {
         Host: 'localhost',
      ...(request?.headers
        ? request.headers
        : request?.body && request.body instanceof FormData
        ? {}
        : { 'Content-type': 'application/json' }),
    };

    // Create a timeout signal if one wasn't provided
    let timeoutSignal = signal;
    let timeoutId: NodeJS.Timeout | undefined;
    
    if (!timeoutSignal) {
      const controller = new AbortController();
      timeoutSignal = controller.signal;
      timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_DURATION);
    }

    try {
      return await fetch(requestUrl, { ...requestBody, headers, signal: timeoutSignal })
        .then((response) => {
          if (!response.ok) throw response;

          const contentType = response.headers.get('content-type');
          const contentDisposition = response.headers.get('content-disposition');

          const headers = response.headers;

          const result =
            contentType &&
            (contentType?.indexOf('application/json') !== -1 ||
              contentType?.indexOf('text/plain') !== -1)
              ? response.json()
              : contentDisposition?.indexOf('attachment') !== -1
              ? response.blob()
              : response;

          return result;
        })
        .catch(async (err) => {
          const contentType = err.headers?.get?.('content-type');

          const errResult =
            contentType && contentType?.indexOf('application/problem+json') !== -1
              ? await err.json()
              : err;

          throw errResult;
        });
    } finally {
      // Clean up timeout if we created one
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };

  return {
    get: async <T>(url: string, request?: RequestModel): Promise<T> => {
      return handleFetch(url, { ...request, method: 'get' });
    },
    post: async <T>(
      url: string,
      request?: RequestWithBodyModel,
    ): Promise<T> => {
      return handleFetch(url, { ...request, method: 'post' });
    },
    put: async <T>(url: string, request?: RequestWithBodyModel): Promise<T> => {
      return handleFetch(url, { ...request, method: 'put' });
    },
    patch: async <T>(
      url: string,
      request?: RequestWithBodyModel,
    ): Promise<T> => {
      return handleFetch(url, { ...request, method: 'patch' });
    },
    delete: async <T>(url: string, request?: RequestModel): Promise<T> => {
      return handleFetch(url, { ...request, method: 'delete' });
    },
  };
};
