import { prisma } from '../config/prisma';
import type { FeedPostType } from '@prisma/client';

// ========================
// Feed Post CRUD
// ========================

export async function createPost(
  authorId: string,
  data: {
    type?: FeedPostType;
    content: string;
    imageUrl?: string;
    linkUrl?: string;
  }
) {
  const post = await prisma.feedPost.create({
    data: {
      authorId,
      type: data.type || 'TEXT',
      content: data.content,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
    },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      _count: { select: { likes: true, comments: true } },
    },
  });

  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.author.profile?.displayName || 'Unknown',
    authorPhoto: post.author.photos[0]?.url || null,
    type: post.type,
    content: post.content,
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isLiked: false,
    createdAt: post.createdAt,
  };
}

export async function getFeed(
  userId: string,
  cursor?: string,
  limit: number = 20
) {
  const posts = await prisma.feedPost.findMany({
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      _count: { select: { likes: true, comments: true } },
      likes: {
        where: { userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  const hasMore = posts.length > limit;
  const items = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    posts: items.map((post) => ({
      id: post.id,
      authorId: post.authorId,
      authorName: post.author.profile?.displayName || 'Unknown',
      authorPhoto: post.author.photos[0]?.url || null,
      type: post.type,
      content: post.content,
      imageUrl: post.imageUrl,
      linkUrl: post.linkUrl,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      isLiked: post.likes.length > 0,
      createdAt: post.createdAt,
    })),
    nextCursor,
  };
}

export async function getPost(postId: string, userId?: string) {
  const post = await prisma.feedPost.findUnique({
    where: { id: postId },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      _count: { select: { likes: true, comments: true } },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              photos: {
                where: { isMain: true },
                select: { url: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  if (!post) throw new Error('Post not found');

  let isLiked = false;
  if (userId) {
    const like = await prisma.feedLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    isLiked = !!like;
  }

  return {
    id: post.id,
    authorId: post.authorId,
    authorName: post.author.profile?.displayName || 'Unknown',
    authorPhoto: post.author.photos[0]?.url || null,
    type: post.type,
    content: post.content,
    imageUrl: post.imageUrl,
    linkUrl: post.linkUrl,
    likeCount: post._count.likes,
    commentCount: post._count.comments,
    isLiked,
    createdAt: post.createdAt,
    comments: post.comments.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      authorName: c.author.profile?.displayName || 'Unknown',
      authorPhoto: c.author.photos[0]?.url || null,
      content: c.content,
      createdAt: c.createdAt,
    })),
  };
}

export async function likePost(postId: string, userId: string) {
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');

  const existing = await prisma.feedLike.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.feedLike.delete({
      where: { postId_userId: { postId, userId } },
    });
    return { liked: false };
  }

  await prisma.feedLike.create({
    data: { postId, userId },
  });

  return { liked: true };
}

export async function commentOnPost(
  postId: string,
  userId: string,
  content: string
) {
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');

  const comment = await prisma.feedComment.create({
    data: {
      postId,
      authorId: userId,
      content,
    },
    include: {
      author: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
    },
  });

  return {
    id: comment.id,
    authorId: comment.authorId,
    authorName: comment.author.profile?.displayName || 'Unknown',
    authorPhoto: comment.author.photos[0]?.url || null,
    content: comment.content,
    createdAt: comment.createdAt,
  };
}

export async function deletePost(postId: string, authorId: string) {
  const post = await prisma.feedPost.findUnique({ where: { id: postId } });
  if (!post) throw new Error('Post not found');
  if (post.authorId !== authorId) throw new Error('Only the author can delete this post');

  await prisma.feedPost.delete({ where: { id: postId } });
  return { success: true };
}
