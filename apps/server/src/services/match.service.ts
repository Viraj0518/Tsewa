import { prisma } from '../config/prisma';

export async function getMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      isActive: true,
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: {
        include: {
          profile: true,
          photos: {
            where: { isMain: true },
            take: 1,
          },
        },
      },
      userB: {
        include: {
          profile: true,
          photos: {
            where: { isMain: true },
            take: 1,
          },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Promise.all(
    matches.map(async (match) => {
      const otherUser = match.userAId === userId ? match.userB : match.userA;

      // Count unread messages from the other user
      const unreadCount = await prisma.message.count({
        where: {
          matchId: match.id,
          senderId: otherUser.id,
          isRead: false,
        },
      });

      const latestMessage = match.messages[0] || null;

      return {
        matchId: match.id,
        chatRoom: match.chatRoom,
        createdAt: match.createdAt,
        otherUser: {
          id: otherUser.id,
          displayName: otherUser.profile?.displayName || 'Unknown',
          photo: otherUser.photos[0]?.url || null,
          region: otherUser.profile?.region || null,
        },
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              type: latestMessage.type,
              content: latestMessage.content,
              senderId: latestMessage.senderId,
              createdAt: latestMessage.createdAt,
              isRead: latestMessage.isRead,
            }
          : null,
        unreadCount,
      };
    })
  );
}

export async function unmatch(userId: string, matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.userAId !== userId && match.userBId !== userId) {
    throw new Error('Not your match');
  }

  await prisma.match.update({
    where: { id: matchId },
    data: { isActive: false },
  });

  return { unmatched: true };
}
