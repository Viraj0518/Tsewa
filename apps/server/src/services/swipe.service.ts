import { prisma } from '../config/prisma';
import type { SwipeAction } from '@prisma/client';

export async function swipe(
  swiperId: string,
  swipedId: string,
  action: SwipeAction
): Promise<{ matched: boolean; matchId?: string }> {
  if (swiperId === swipedId) {
    throw new Error('Cannot swipe on yourself');
  }

  // Check target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: swipedId },
  });
  if (!targetUser) {
    throw new Error('User not found');
  }

  // Check if already swiped
  const existing = await prisma.swipe.findUnique({
    where: { swiperId_swipedId: { swiperId, swipedId } },
  });
  if (existing) {
    throw new Error('Already swiped on this user');
  }

  // Check if blocked
  const blocked = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: swiperId, blockedId: swipedId },
        { blockerId: swipedId, blockedId: swiperId },
      ],
    },
  });
  if (blocked) {
    throw new Error('Cannot swipe on blocked user');
  }

  // Create the swipe
  await prisma.swipe.create({
    data: {
      swiperId,
      swipedId,
      action,
    },
  });

  // Check for mutual like (LIKE or SUPER_LIKE)
  if (action === 'LIKE' || action === 'SUPER_LIKE') {
    const reciprocal = await prisma.swipe.findFirst({
      where: {
        swiperId: swipedId,
        swipedId: swiperId,
        action: { in: ['LIKE', 'SUPER_LIKE'] },
      },
    });

    if (reciprocal) {
      // Ensure consistent ordering for the unique constraint
      const [userAId, userBId] =
        swiperId < swipedId ? [swiperId, swipedId] : [swipedId, swiperId];

      // Check if match already exists
      const existingMatch = await prisma.match.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
      });

      if (!existingMatch) {
        const match = await prisma.match.create({
          data: { userAId, userBId },
        });

        return { matched: true, matchId: match.id };
      }

      return { matched: true, matchId: existingMatch.id };
    }
  }

  return { matched: false };
}
