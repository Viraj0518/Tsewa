import request from 'supertest';
import { app } from '../index';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';

const TEST_PREFIX = 'e2e_test_';

export function testEmail(suffix: string = '') {
  return `${TEST_PREFIX}${suffix || Date.now()}@tsewa.test`;
}

export const TEST_PASSWORD = 'TestPass123!';

export async function registerUser(email?: string, password?: string, inviteCode?: string) {
  const e = email || testEmail();
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: e, password: password || TEST_PASSWORD, inviteCode });
  return { email: e, password: password || TEST_PASSWORD, ...res.body, status: res.status, response: res };
}

export async function loginUser(email: string, password: string = TEST_PASSWORD) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return { ...res.body, status: res.status, response: res };
}

export function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

export async function createTestInvite(inviterId: string, opts: { maxUses?: number; expiresAt?: Date } = {}) {
  const code = `TEST_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return prisma.inviteCode.create({
    data: {
      code,
      inviterId,
      maxUses: opts.maxUses ?? 5,
      usedCount: 0,
      isActive: true,
      expiresAt: opts.expiresAt ?? null,
    },
  });
}

export async function cleanupTestUsers() {
  // Delete test users and all related data
  const testUsers = await prisma.user.findMany({
    where: { email: { startsWith: TEST_PREFIX } },
    select: { id: true, email: true },
  });

  const userIds = testUsers.map((u) => u.id);
  if (userIds.length === 0) return;

  // Clean up in dependency order
  await prisma.roomMessage.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.roomParticipant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.roomScheduleRsvp.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.room.deleteMany({ where: { hostId: { in: userIds } } });
  await prisma.feedLike.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.feedComment.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.feedPost.deleteMany({ where: { authorId: { in: userIds } } });
  await prisma.eventRsvp.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.event.deleteMany({ where: { creatorId: { in: userIds } } });
  await prisma.message.deleteMany({ where: { senderId: { in: userIds } } });
  await prisma.match.deleteMany({
    where: { OR: [{ userAId: { in: userIds } }, { userBId: { in: userIds } }] },
  });
  await prisma.swipe.deleteMany({
    where: { OR: [{ swiperId: { in: userIds } }, { swipedId: { in: userIds } }] },
  });
  await prisma.dailyPick.deleteMany({
    where: { OR: [{ forUserId: { in: userIds } }, { pickedUserId: { in: userIds } }] },
  });
  await prisma.block.deleteMany({
    where: { OR: [{ blockerId: { in: userIds } }, { blockedId: { in: userIds } }] },
  });
  await prisma.report.deleteMany({
    where: { OR: [{ reporterId: { in: userIds } }, { targetUserId: { in: userIds } }] },
  });
  await prisma.conversationPrompt.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.photo.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.profile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.inviteCode.deleteMany({ where: { inviterId: { in: userIds } } });
  await prisma.waitlistEntry.deleteMany({ where: { userId: { in: userIds } } });

  // Clean up Redis tokens
  for (const id of userIds) {
    await redis.del(`refresh:${id}`);
  }

  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
