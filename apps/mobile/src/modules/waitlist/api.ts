import { api } from '../../lib/api';

export interface WaitlistStatus {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  position: number | null;
  inviteCode: string | null;
  referredBy: string | null;
  createdAt: string;
  approvedAt: string | null;
}

export interface InviteCode {
  id: string;
  code: string;
  inviterId: string;
  maxUses: number;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export async function checkWaitlistStatus(): Promise<WaitlistStatus> {
  const { data } = await api.get<WaitlistStatus>('/waitlist/status');
  return data;
}

export async function redeemInviteCode(code: string): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post<{ success: boolean; message: string }>(
    '/invite/redeem',
    { code }
  );
  return data;
}

export async function generateInviteCode(): Promise<InviteCode> {
  const { data } = await api.post<InviteCode>('/invite/generate');
  return data;
}
