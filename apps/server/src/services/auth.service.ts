import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { env } from '../config/env';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign({ userId, email }, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, inviteCode?: string) {
  email = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('Email already registered');
  }

  let isActive = false;
  let validInvite: { id: string; inviterId: string } | null = null;

  // Validate invite code if provided
  if (inviteCode) {
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode },
    });

    if (invite && invite.isActive && invite.usedCount < invite.maxUses) {
      if (!invite.expiresAt || invite.expiresAt > new Date()) {
        validInvite = { id: invite.id, inviterId: invite.inviterId };
        isActive = true;
      }
    }
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      isActive,
    },
  });

  // Create waitlist entry
  await prisma.waitlistEntry.create({
    data: {
      userId: user.id,
      status: isActive ? 'APPROVED' : 'PENDING',
      inviteCode: inviteCode || null,
      referredBy: validInvite?.inviterId || null,
      approvedAt: isActive ? new Date() : null,
    },
  });

  // Increment invite usage if valid
  if (validInvite) {
    await prisma.inviteCode.update({
      where: { id: validInvite.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  const tokens = generateTokens(user.id, user.email);

  // Store refresh token in Redis
  await redis.set(`refresh:${user.id}`, tokens.refreshToken, 'EX', REFRESH_TOKEN_TTL);

  return {
    user: { id: user.id, email: user.email, isActive: user.isActive },
    ...tokens,
  };
}

export async function login(email: string, password: string) {
  email = email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  const tokens = generateTokens(user.id, user.email);

  // Store refresh token in Redis
  await redis.set(`refresh:${user.id}`, tokens.refreshToken, 'EX', REFRESH_TOKEN_TTL);

  return {
    user: { id: user.id, email: user.email, isActive: user.isActive },
    ...tokens,
  };
}

export async function refreshToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
      userId: string;
      email: string;
    };

    // Verify the token matches what's stored in Redis
    const storedToken = await redis.get(`refresh:${decoded.userId}`);
    if (!storedToken || storedToken !== token) {
      throw new Error('Invalid refresh token');
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    return { accessToken };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    throw new Error('Invalid refresh token');
  }
}

export async function logout(userId: string) {
  await redis.del(`refresh:${userId}`);
}
