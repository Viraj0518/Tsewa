import { api } from '../../lib/api';

export interface MatchUser {
  id: string;
  displayName: string;
  photoUrl: string | null;
}

export interface Match {
  id: string;
  otherUser: MatchUser;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
}

export interface MatchesResponse {
  matches: Match[];
}

export async function getMatches(): Promise<Match[]> {
  const { data } = await api.get<MatchesResponse>('/matches');
  return data.matches;
}

export async function unmatch(matchId: string): Promise<void> {
  await api.delete(`/matches/${matchId}`);
}
