import { api } from '../../lib/api';

// ========================
// Types
// ========================

export type FeedPostType = 'TEXT' | 'PHOTO' | 'LINK' | 'EVENT_SHARE';

export interface FeedComment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  content: string;
  createdAt: string;
}

export interface FeedPost {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  type: FeedPostType;
  content: string;
  imageUrl: string | null;
  linkUrl: string | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  comments?: FeedComment[];
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface CreatePostData {
  content: string;
  type?: FeedPostType;
  imageUrl?: string;
  linkUrl?: string;
}

// ========================
// API functions
// ========================

export async function getFeed(
  cursor?: string,
  limit?: number
): Promise<FeedResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  if (limit) params.limit = String(limit);
  const { data } = await api.get<FeedResponse>('/feed', { params });
  return data;
}

export async function getPost(postId: string): Promise<FeedPost> {
  const { data } = await api.get<FeedPost>(`/feed/${postId}`);
  return data;
}

export async function createPost(postData: CreatePostData): Promise<FeedPost> {
  const { data } = await api.post<FeedPost>('/feed', postData);
  return data;
}

export async function deletePost(postId: string): Promise<{ success: boolean }> {
  const { data } = await api.delete<{ success: boolean }>(`/feed/${postId}`);
  return data;
}

export async function likePost(postId: string): Promise<{ liked: boolean }> {
  const { data } = await api.post<{ liked: boolean }>(`/feed/${postId}/like`);
  return data;
}

export async function commentOnPost(
  postId: string,
  content: string
): Promise<FeedComment> {
  const { data } = await api.post<FeedComment>(`/feed/${postId}/comment`, {
    content,
  });
  return data;
}
