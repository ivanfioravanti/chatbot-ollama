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

  return {
    getModels,
  };
};

export default useApiService;
