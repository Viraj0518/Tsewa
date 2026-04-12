import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import * as feedApi from './api';
import type { CreatePostData, FeedResponse } from './api';

// ========================
// Query keys
// ========================

const FEED_KEY = ['feed'];
const POST_KEY = (postId: string) => ['feed-post', postId];

// ========================
// Queries
// ========================

export function useFeed() {
  return useInfiniteQuery<FeedResponse>({
    queryKey: FEED_KEY,
    queryFn: ({ pageParam }) =>
      feedApi.getFeed(pageParam as string | undefined, 20),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30 * 1000,
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: POST_KEY(postId),
    queryFn: () => feedApi.getPost(postId),
    enabled: !!postId,
    staleTime: 15 * 1000,
  });
}

// ========================
// Mutations
// ========================

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePostData) => feedApi.createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => feedApi.likePost(postId),
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: POST_KEY(postId) });
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}

export function useCommentOnPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      feedApi.commentOnPost(postId, content),
    onSuccess: (_data, { postId }) => {
      queryClient.invalidateQueries({ queryKey: POST_KEY(postId) });
      queryClient.invalidateQueries({ queryKey: FEED_KEY });
    },
  });
}
