import { useCallback } from 'react';

import { useFetch } from '@/hooks/useFetch';


const useApiService = () => {
  const fetchService = useFetch();

  const getModels = useCallback(
    () => {
      return fetchService.get(`/api/models`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    [fetchService],
  );

  const getModelDetails = useCallback(
    (name: string) => {
      return fetchService.post(`/api/modeldetails`, {
        headers: {
          'Content-Type': 'application/json',
        },
        body: {name: name }, 
      });
    },
    [fetchService],
  );

  return {
    getModels,
    getModelDetails
  };
};

export default useApiService;

