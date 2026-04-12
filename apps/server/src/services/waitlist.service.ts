import crypto from 'crypto';
import { prisma } from '../config/prisma';

function generateAlphanumericCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function getStatus(userId: string) {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { userId },
  });

  if (!entry) {
    return null;
  }

  // Calculate position: count entries created before this one that are still PENDING
  let position: number | null = null;
  if (entry.status === 'PENDING') {
    const ahead = await prisma.waitlistEntry.count({
      where: {
        status: 'PENDING',
        createdAt: { lt: entry.createdAt },
      },
    });
    position = ahead + 1;
  }

  return {
    id: entry.id,
    userId: entry.userId,
    status: entry.status,
    position,
    inviteCode: entry.inviteCode,
    referredBy: entry.referredBy,
    createdAt: entry.createdAt.toISOString(),
    approvedAt: entry.approvedAt?.toISOString() || null,
  };
}

export async function redeemCode(userId: string, code: string) {
  // Find the invite code
  const invite = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!invite) {
    throw new Error('Invalid invite code');
  }

  if (!invite.isActive) {
    throw new Error('This invite code is no longer active');
  }

  if (invite.usedCount >= invite.maxUses) {
    throw new Error('This invite code has been fully used');
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    throw new Error('This invite code has expired');
  }

  // Cannot use your own invite code
  if (invite.inviterId === userId) {
    throw new Error('You cannot use your own invite code');
  }

  // Check user's waitlist entry
  const entry = await prisma.waitlistEntry.findUnique({
    where: { userId },
  });

  if (!entry) {
    throw new Error('No waitlist entry found');
  }

  if (entry.status === 'APPROVED') {
    throw new Error('You are already approved');
  }

  // Perform the redemption in a transaction
  await prisma.$transaction([
    // Increment the invite code usage
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    }),
    // Approve the waitlist entry
    prisma.waitlistEntry.update({
      where: { userId },
      data: {
        status: 'APPROVED',
        inviteCode: code.toUpperCase(),
        referredBy: invite.inviterId,
        approvedAt: new Date(),
      },
    }),
    // Activate the user
    prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    }),
  ]);

  return { success: true, message: 'Invite code redeemed successfully' };
}

export async function generateCode(userId: string) {
  // Check how many codes this user has already generated
  const existingCount = await prisma.inviteCode.count({
    where: { inviterId: userId },
  });

  if (existingCount >= 5) {
    throw new Error('You have reached the maximum number of invite codes (5)');
  }

  // Generate a unique code
  let code: string;
  let attempts = 0;
  do {
    code = generateAlphanumericCode(6);
    const existing = await prisma.inviteCode.findUnique({ where: { code } });
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    throw new Error('Failed to generate unique code. Please try again.');
  }

  const inviteCode = await prisma.inviteCode.create({
    data: {
      code,
      inviterId: userId,
      maxUses: 3,
      usedCount: 0,
      isActive: true,
      expiresAt: null, // No expiry by default
    },
  });

  return {
    id: inviteCode.id,
    code: inviteCode.code,
    inviterId: inviteCode.inviterId,
    maxUses: inviteCode.maxUses,
    usedCount: inviteCode.usedCount,
    isActive: inviteCode.isActive,
    expiresAt: inviteCode.expiresAt?.toISOString() || null,
    createdAt: inviteCode.createdAt.toISOString(),
  };
}
