import { prisma } from '../config/prisma';
import type { MessageType, Prisma } from '@prisma/client';

export async function getMessages(
  matchId: string,
  userId: string,
  cursor?: string,
  limit: number = 50
) {
  // Verify user is part of this match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.userAId !== userId && match.userBId !== userId) {
    throw new Error('Not authorized to view these messages');
  }

  const where: Prisma.MessageWhereInput = { matchId };

  if (cursor) {
    where.createdAt = {
      lt: (await prisma.message.findUnique({ where: { id: cursor } }))?.createdAt || new Date(),
    };
  }

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1, // Fetch one extra to determine if there are more
    include: {
      sender: {
        select: {
          id: true,
          profile: {
            select: { displayName: true },
          },
        },
      },
    },
  });

  const hasMore = messages.length > limit;
  const items = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    messages: items.map((m) => ({
      id: m.id,
      matchId: m.matchId,
      senderId: m.senderId,
      senderName: m.sender.profile?.displayName || 'Unknown',
      type: m.type,
      content: m.content,
      metadata: m.metadata,
      isRead: m.isRead,
      createdAt: m.createdAt,
    })),
    nextCursor,
    hasMore,
  };
}

export async function createMessage(
  matchId: string,
  senderId: string,
  type: MessageType,
  content: string,
  metadata?: Prisma.InputJsonValue
) {
  // Verify sender is part of this match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match || !match.isActive) {
    throw new Error('Match not found or inactive');
  }

  if (match.userAId !== senderId && match.userBId !== senderId) {
    throw new Error('Not authorized to send messages in this match');
  }

  const message = await prisma.message.create({
    data: {
      matchId,
      senderId,
      type,
      content,
      metadata: metadata || undefined,
    },
    include: {
      sender: {
        select: {
          id: true,
          profile: {
            select: { displayName: true },
          },
        },
      },
    },
  });

  return {
    id: message.id,
    matchId: message.matchId,
    senderId: message.senderId,
    senderName: message.sender.profile?.displayName || 'Unknown',
    type: message.type,
    content: message.content,
    metadata: message.metadata,
    isRead: message.isRead,
    createdAt: message.createdAt,
  };
}

export async function markAsRead(matchId: string, userId: string) {
  // Verify user is part of this match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.userAId !== userId && match.userBId !== userId) {
    throw new Error('Not authorized');
  }

  // Mark all messages from the OTHER user as read
  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;

  const result = await prisma.message.updateMany({
    where: {
      matchId,
      senderId: otherUserId,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { markedRead: result.count };
}
