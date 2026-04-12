import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDeck, getDailyPicks, swipe, SwipeAction } from './api';

export function useDeck(category?: string | null) {
  return useQuery({
    queryKey: ['discovery', 'deck', category ?? 'all'],
    queryFn: () => getDeck(category),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDailyPicks() {
  return useQuery({
    queryKey: ['discovery', 'daily-picks'],
    queryFn: getDailyPicks,
    staleTime: 10 * 60 * 1000,
  });
}

export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      targetUserId,
      action,
    }: {
      targetUserId: string;
      action: SwipeAction;
    }) => swipe(targetUserId, action),
    onSuccess: () => {
      // Invalidate deck to refetch when running low
      queryClient.invalidateQueries({ queryKey: ['discovery', 'deck'] });
    },
  });
}
