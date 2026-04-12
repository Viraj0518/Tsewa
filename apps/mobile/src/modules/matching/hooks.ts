import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMatches, unmatch } from './api';

const MATCHES_KEY = ['matches'];

export function useMatches() {
  return useQuery({
    queryKey: MATCHES_KEY,
    queryFn: getMatches,
  });
}

export function useUnmatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) => unmatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MATCHES_KEY });
    },
  });
}
