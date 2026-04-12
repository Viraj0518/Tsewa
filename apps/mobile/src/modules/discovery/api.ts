import { api } from '../../lib/api';
import type { Photo } from '../profile/api';

export interface DeckProfile {
  id: string;
  userId: string;
  displayName: string;
  birthDate: string;
  gender: string;
  bio: string;
  region: string;
  dialect: string;
  buddhistPractice: string;
  hometown: string;
  education: string;
  profession: string;
  languages: string[];
  diet: string;
  familyViews: string;
  currentCity: string;
  currentCountry: string;
  photos: Photo[];
  prompts: Array<{ question: string; answer: string }>;
  categories: string[];
  distance?: number;
}

export interface DeckResponse {
  profiles: DeckProfile[];
  remaining: number;
}

export interface DailyPicksResponse {
  picks: DeckProfile[];
  refreshesAt: string;
}

export type SwipeAction = 'LIKE' | 'PASS' | 'SUPER_LIKE';

export interface SwipeResponse {
  matched: boolean;
  matchId?: string;
  matchedUser?: {
    id: string;
    displayName: string;
    mainPhoto?: string;
  };
}

export async function getDeck(
  category?: string | null,
  limit: number = 20
): Promise<DeckResponse> {
  const params: Record<string, string | number> = { limit };
  if (category) {
    params.category = category;
  }
  const { data } = await api.get<DeckResponse>('/discovery/deck', { params });
  return data;
}

export async function getDailyPicks(): Promise<DailyPicksResponse> {
  const { data } = await api.get<DailyPicksResponse>('/discovery/daily-picks');
  return data;
}

export async function swipe(
  targetUserId: string,
  action: SwipeAction
): Promise<SwipeResponse> {
  const { data } = await api.post<SwipeResponse>('/swipe', {
    targetUserId,
    action,
  });
  return data;
}
