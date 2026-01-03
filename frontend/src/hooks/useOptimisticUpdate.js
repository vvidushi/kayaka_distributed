import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for optimistic updates
 * Updates cache immediately, then reverts on error
 */
export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const optimisticUpdate = useCallback(async ({
    queryKey,
    updateFn,
    optimisticData,
    onSuccess = null,
    onError = null,
  }) => {
    setIsUpdating(true);

    // Save previous data for rollback
    const previousData = queryClient.getQueryData(queryKey);

    try {
      // Optimistically update cache
      if (optimisticData) {
        queryClient.setQueryData(queryKey, optimisticData);
      }

      // Perform actual update
      const result = await updateFn();

      // Update cache with server response
      queryClient.setQueryData(queryKey, result);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey });

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      // Rollback on error
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }

      // Invalidate to refetch correct data
      queryClient.invalidateQueries({ queryKey });

      if (onError) {
        onError(error);
      }

      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [queryClient]);

  return { optimisticUpdate, isUpdating };
};

export default useOptimisticUpdate;

