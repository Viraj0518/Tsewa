import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { checkWaitlistStatus, redeemInviteCode, generateInviteCode } from './api';

const WAITLIST_KEY = ['waitlist', 'status'];
const INVITE_CODES_KEY = ['invite', 'codes'];

export function useWaitlistStatus() {
  return useQuery({
    queryKey: WAITLIST_KEY,
    queryFn: checkWaitlistStatus,
  });
}

export function useRedeemInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => redeemInviteCode(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WAITLIST_KEY });
    },
  });
}

export function useGenerateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => generateInviteCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVITE_CODES_KEY });
    },
  });
}
