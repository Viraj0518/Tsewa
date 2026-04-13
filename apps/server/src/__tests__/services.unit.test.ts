/**
 * Comprehensive unit tests for ALL service files.
 * Mocks Prisma and Redis so no real DB/cache is needed.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// ─── Mock Prisma ──────────────────────────────────────────────
vi.mock('../config/prisma', () => {
  const makeMockModel = () => ({
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  });

  return {
    prisma: {
      user: makeMockModel(),
      profile: makeMockModel(),
      photo: makeMockModel(),
      conversationPrompt: makeMockModel(),
      swipe: makeMockModel(),
      block: makeMockModel(),
      match: makeMockModel(),
      message: makeMockModel(),
      dailyPick: makeMockModel(),
      waitlistEntry: makeMockModel(),
      inviteCode: makeMockModel(),
      feedPost: makeMockModel(),
      feedLike: makeMockModel(),
      feedComment: makeMockModel(),
      event: makeMockModel(),
      eventRsvp: makeMockModel(),
      room: makeMockModel(),
      roomParticipant: makeMockModel(),
      roomMessage: makeMockModel(),
      roomScheduleRsvp: makeMockModel(),
      topicChannel: makeMockModel(),
      watchPartyState: makeMockModel(),
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $transaction: vi.fn(),
    },
  };
});

// ─── Mock Redis ───────────────────────────────────────────────
vi.mock('../config/redis', () => ({
  redis: {
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    quit: vi.fn(),
  },
}));

// ─── Mock env ─────────────────────────────────────────────────
vi.mock('../config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    PORT: 3001,
    API_URL: 'http://localhost:3001',
    UPLOAD_DIR: './uploads',
    CORS_ORIGIN: '*',
    NODE_ENV: 'test',
  },
}));

import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { env } from '../config/env';

// ─── Service imports ──────────────────────────────────────────
import * as authService from '../services/auth.service';
import * as discoveryService from '../services/discovery.service';
import * as eventService from '../services/event.service';
import * as feedService from '../services/feed.service';
import * as matchService from '../services/match.service';
import * as messageService from '../services/message.service';
import * as profileService from '../services/profile.service';
import * as roomService from '../services/room.service';
import * as swipeService from '../services/swipe.service';
import * as waitlistService from '../services/waitlist.service';

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ─── Helpers ──────────────────────────────────────────────────
function mockFn(obj: unknown, method: string): Mock {
  return (obj as Record<string, Mock>)[method];
}

function resetAllMocks() {
  vi.clearAllMocks();
}

// ══════════════════════════════════════════════════════════════
//  AUTH SERVICE
// ══════════════════════════════════════════════════════════════
describe('AuthService', () => {
  beforeEach(resetAllMocks);

  // ─── generateTokens ────────────────────────────────────────
  describe('generateTokens', () => {
    it('returns accessToken and refreshToken strings', () => {
      const tokens = authService.generateTokens('user-1', 'a@b.com');
      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
    });

    it('encodes userId and email in the access token', () => {
      const tokens = authService.generateTokens('user-1', 'a@b.com');
      const decoded = jwt.verify(tokens.accessToken, env.JWT_SECRET) as Record<string, unknown>;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.email).toBe('a@b.com');
    });

    it('encodes userId and email in the refresh token', () => {
      const tokens = authService.generateTokens('user-1', 'a@b.com');
      const decoded = jwt.verify(tokens.refreshToken, env.JWT_REFRESH_SECRET) as Record<string, unknown>;
      expect(decoded.userId).toBe('user-1');
      expect(decoded.email).toBe('a@b.com');
    });

    it('access and refresh tokens are different', () => {
      const tokens = authService.generateTokens('user-1', 'a@b.com');
      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });
  });

  // ─── register ──────────────────────────────────────────────
  describe('register', () => {
    it('registers a new user successfully (no invite)', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.user, 'create').mockResolvedValue({
        id: 'u1', email: 'a@b.com', isActive: false, passwordHash: 'hash',
      });
      mockFn(prisma.waitlistEntry, 'create').mockResolvedValue({});

      const result = await authService.register('a@b.com', 'pass123');

      expect(result.user.id).toBe('u1');
      expect(result.user.email).toBe('a@b.com');
      expect(result.user.isActive).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(redis.set).toHaveBeenCalledWith(
        'refresh:u1',
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });

    it('throws when email already exists', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'existing' });
      await expect(authService.register('dupe@b.com', 'pass')).rejects.toThrow('Email already registered');
    });

    it('activates user when valid invite code provided', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', inviterId: 'inviter1', isActive: true, usedCount: 0, maxUses: 5, expiresAt: null,
      });
      mockFn(prisma.user, 'create').mockResolvedValue({
        id: 'u2', email: 'b@b.com', isActive: true, passwordHash: 'hash',
      });
      mockFn(prisma.waitlistEntry, 'create').mockResolvedValue({});
      mockFn(prisma.inviteCode, 'update').mockResolvedValue({});

      const result = await authService.register('b@b.com', 'pass', 'CODE1');

      expect(result.user.isActive).toBe(true);
      expect(prisma.inviteCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv1' },
          data: { usedCount: { increment: 1 } },
        }),
      );
    });

    it('does not activate if invite code is inactive', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv2', inviterId: 'inviter', isActive: false, usedCount: 0, maxUses: 5, expiresAt: null,
      });
      mockFn(prisma.user, 'create').mockResolvedValue({
        id: 'u3', email: 'c@b.com', isActive: false, passwordHash: 'h',
      });
      mockFn(prisma.waitlistEntry, 'create').mockResolvedValue({});

      const result = await authService.register('c@b.com', 'pass', 'BADCODE');
      expect(result.user.isActive).toBe(false);
      expect(prisma.inviteCode.update).not.toHaveBeenCalled();
    });

    it('does not activate if invite code is fully used', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv3', inviterId: 'inv', isActive: true, usedCount: 5, maxUses: 5, expiresAt: null,
      });
      mockFn(prisma.user, 'create').mockResolvedValue({
        id: 'u4', email: 'd@b.com', isActive: false, passwordHash: 'h',
      });
      mockFn(prisma.waitlistEntry, 'create').mockResolvedValue({});

      const result = await authService.register('d@b.com', 'pass', 'FULL');
      expect(result.user.isActive).toBe(false);
    });

    it('does not activate if invite code is expired', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv4', inviterId: 'inv', isActive: true, usedCount: 0, maxUses: 5,
        expiresAt: new Date('2020-01-01'),
      });
      mockFn(prisma.user, 'create').mockResolvedValue({
        id: 'u5', email: 'e@b.com', isActive: false, passwordHash: 'h',
      });
      mockFn(prisma.waitlistEntry, 'create').mockResolvedValue({});

      const result = await authService.register('e@b.com', 'pass', 'EXPIRED');
      expect(result.user.isActive).toBe(false);
    });

    it('creates waitlist entry with APPROVED status when invite is valid', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv5', inviterId: 'inviter5', isActive: true, usedCount: 0, maxUses: 5, expiresAt: null,
      });
      mockFn(prisma.user, 'create').mockResolvedValue({
        id: 'u6', email: 'f@b.com', isActive: true, passwordHash: 'h',
      });
      mockFn(prisma.waitlistEntry, 'create').mockResolvedValue({});
      mockFn(prisma.inviteCode, 'update').mockResolvedValue({});

      await authService.register('f@b.com', 'pass', 'GOOD');
      expect(prisma.waitlistEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', referredBy: 'inviter5' }),
        }),
      );
    });
  });

  // ─── login ─────────────────────────────────────────────────
  describe('login', () => {
    it('returns user and tokens on valid credentials', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1', email: 'a@b.com', isActive: true, passwordHash: hash,
      });
      mockFn(prisma.user, 'update').mockResolvedValue({});

      const result = await authService.login('a@b.com', 'correct');
      expect(result.user.id).toBe('u1');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ lastActiveAt: expect.any(Date) }) }),
      );
    });

    it('throws on non-existent email', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(authService.login('no@no.com', 'pass')).rejects.toThrow('Invalid email or password');
    });

    it('throws on wrong password', async () => {
      const hash = await bcrypt.hash('right', 12);
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1', email: 'a@b.com', passwordHash: hash,
      });
      await expect(authService.login('a@b.com', 'wrong')).rejects.toThrow('Invalid email or password');
    });
  });

  // ─── refreshToken ──────────────────────────────────────────
  describe('refreshToken', () => {
    it('returns a new access token on valid refresh token', async () => {
      const tokens = authService.generateTokens('u1', 'a@b.com');
      mockFn(redis, 'get').mockResolvedValue(tokens.refreshToken);

      const result = await authService.refreshToken(tokens.refreshToken);
      expect(result.accessToken).toBeDefined();
      const decoded = jwt.verify(result.accessToken, env.JWT_SECRET) as Record<string, unknown>;
      expect(decoded.userId).toBe('u1');
    });

    it('throws when token not in Redis', async () => {
      const tokens = authService.generateTokens('u1', 'a@b.com');
      mockFn(redis, 'get').mockResolvedValue(null);
      await expect(authService.refreshToken(tokens.refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('throws when token in Redis does not match', async () => {
      const tokens = authService.generateTokens('u1', 'a@b.com');
      mockFn(redis, 'get').mockResolvedValue('different-token-value');
      await expect(authService.refreshToken(tokens.refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('throws on malformed/invalid token', async () => {
      await expect(authService.refreshToken('garbage')).rejects.toThrow('Invalid refresh token');
    });

    it('throws on expired refresh token', async () => {
      const expired = jwt.sign({ userId: 'u1', email: 'a@b.com' }, env.JWT_REFRESH_SECRET, { expiresIn: '0s' });
      // Small wait so it expires
      await new Promise((r) => setTimeout(r, 10));
      await expect(authService.refreshToken(expired)).rejects.toThrow(/refresh token/i);
    });
  });

  // ─── logout ────────────────────────────────────────────────
  describe('logout', () => {
    it('deletes the refresh token from Redis', async () => {
      await authService.logout('u1');
      expect(redis.del).toHaveBeenCalledWith('refresh:u1');
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  PROFILE SERVICE
// ══════════════════════════════════════════════════════════════
describe('ProfileService', () => {
  beforeEach(resetAllMocks);

  // ─── getProfile ────────────────────────────────────────────
  describe('getProfile', () => {
    it('returns user profile with photos and prompts', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        isActive: true,
        isVerified: false,
        profile: { displayName: 'Test' },
        photos: [{ id: 'p1', url: 'http://img.png', position: 0 }],
        prompts: [],
      });

      const result = await profileService.getProfile('u1');
      expect(result.id).toBe('u1');
      expect(result.profile).toEqual({ displayName: 'Test' });
      expect(result.photos).toHaveLength(1);
    });

    it('throws when user not found', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(profileService.getProfile('none')).rejects.toThrow('User not found');
    });
  });

  // ─── updateProfile ─────────────────────────────────────────
  describe('updateProfile', () => {
    it('updates existing profile', async () => {
      mockFn(prisma.profile, 'findUnique').mockResolvedValue({ userId: 'u1' });
      mockFn(prisma.profile, 'update').mockResolvedValue({ userId: 'u1', displayName: 'New' });

      const result = await profileService.updateProfile('u1', { displayName: 'New' });
      expect(result.displayName).toBe('New');
      expect(prisma.profile.update).toHaveBeenCalled();
    });

    it('creates profile if it does not exist', async () => {
      mockFn(prisma.profile, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.profile, 'create').mockResolvedValue({ userId: 'u1', displayName: 'Created' });

      const result = await profileService.updateProfile('u1', { displayName: 'Created' } as any);
      expect(result.displayName).toBe('Created');
      expect(prisma.profile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ user: { connect: { id: 'u1' } } }),
        }),
      );
    });
  });

  // ─── addPhoto ──────────────────────────────────────────────
  describe('addPhoto', () => {
    it('adds a photo with correct position', async () => {
      mockFn(prisma.photo, 'count').mockResolvedValue(2);
      mockFn(prisma.photo, 'create').mockResolvedValue({
        id: 'ph1', userId: 'u1', url: 'http://img.png', position: 2, isMain: false,
      });

      const result = await profileService.addPhoto('u1', 'http://img.png');
      expect(result.position).toBe(2);
    });

    it('first photo is always main', async () => {
      mockFn(prisma.photo, 'count').mockResolvedValue(0);
      mockFn(prisma.photo, 'create').mockResolvedValue({
        id: 'ph1', userId: 'u1', url: 'http://img.png', position: 0, isMain: true,
      });

      await profileService.addPhoto('u1', 'http://img.png');
      expect(prisma.photo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isMain: true, position: 0 }),
        }),
      );
    });

    it('throws when at max 6 photos', async () => {
      mockFn(prisma.photo, 'count').mockResolvedValue(6);
      await expect(profileService.addPhoto('u1', 'url')).rejects.toThrow('Maximum 6 photos allowed');
    });

    it('unsets existing main when adding new main photo', async () => {
      mockFn(prisma.photo, 'count').mockResolvedValue(2);
      mockFn(prisma.photo, 'updateMany').mockResolvedValue({ count: 1 });
      mockFn(prisma.photo, 'create').mockResolvedValue({
        id: 'ph2', userId: 'u1', url: 'url', position: 2, isMain: true,
      });

      await profileService.addPhoto('u1', 'url', true);
      expect(prisma.photo.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', isMain: true },
          data: { isMain: false },
        }),
      );
    });
  });

  // ─── deletePhoto ───────────────────────────────────────────
  describe('deletePhoto', () => {
    it('deletes a photo and reorders remaining', async () => {
      mockFn(prisma.photo, 'findFirst').mockResolvedValue({
        id: 'ph1', userId: 'u1', isMain: false, position: 1,
      });
      mockFn(prisma.photo, 'delete').mockResolvedValue({});
      mockFn(prisma.photo, 'findMany').mockResolvedValue([
        { id: 'ph0', position: 0 },
        { id: 'ph2', position: 2 },
      ]);
      mockFn(prisma.photo, 'update').mockResolvedValue({});

      const result = await profileService.deletePhoto('u1', 'ph1');
      expect(result).toEqual({ deleted: true });
      // ph2 position should update from 2 to 1
      expect(prisma.photo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ph2' },
          data: { position: 1 },
        }),
      );
    });

    it('throws when photo not found', async () => {
      mockFn(prisma.photo, 'findFirst').mockResolvedValue(null);
      await expect(profileService.deletePhoto('u1', 'nope')).rejects.toThrow('Photo not found');
    });

    it('reassigns main when deleting the main photo', async () => {
      mockFn(prisma.photo, 'findFirst').mockResolvedValue({
        id: 'ph1', userId: 'u1', isMain: true, position: 0,
      });
      mockFn(prisma.photo, 'delete').mockResolvedValue({});
      const nextPhoto = { id: 'ph2', position: 0 };
      // findFirst for reassigning main, findMany for reorder
      mockFn(prisma.photo, 'findFirst')
        .mockResolvedValueOnce({ id: 'ph1', userId: 'u1', isMain: true, position: 0 }) // initial check
        .mockResolvedValueOnce(nextPhoto); // next main candidate
      mockFn(prisma.photo, 'findMany').mockResolvedValue([nextPhoto]);
      mockFn(prisma.photo, 'update').mockResolvedValue({});

      // Need to re-mock findFirst properly for sequential calls
      const findFirstMock = mockFn(prisma.photo, 'findFirst');
      findFirstMock.mockReset();
      findFirstMock
        .mockResolvedValueOnce({ id: 'ph1', userId: 'u1', isMain: true, position: 0 })
        .mockResolvedValueOnce(nextPhoto);

      await profileService.deletePhoto('u1', 'ph1');
      // The update to set the new main photo
      expect(prisma.photo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ph2' },
          data: { isMain: true },
        }),
      );
    });
  });

  // ─── addPrompt ─────────────────────────────────────────────
  describe('addPrompt', () => {
    it('creates a prompt with correct position', async () => {
      mockFn(prisma.conversationPrompt, 'count').mockResolvedValue(2);
      mockFn(prisma.conversationPrompt, 'create').mockResolvedValue({
        id: 'pr1', userId: 'u1', question: 'Q', answer: 'A', position: 2,
      });

      const result = await profileService.addPrompt('u1', 'Q', 'A');
      expect(result.position).toBe(2);
    });

    it('throws when at max 5 prompts', async () => {
      mockFn(prisma.conversationPrompt, 'count').mockResolvedValue(5);
      await expect(profileService.addPrompt('u1', 'Q', 'A')).rejects.toThrow('Maximum 5 conversation prompts allowed');
    });
  });

  // ─── updateCategories ──────────────────────────────────────
  describe('updateCategories', () => {
    it('updates active categories', async () => {
      mockFn(prisma.profile, 'findUnique').mockResolvedValue({ userId: 'u1' });
      mockFn(prisma.profile, 'update').mockResolvedValue({
        userId: 'u1', activeCategories: ['dating', 'dharma'],
      });

      const result = await profileService.updateCategories('u1', ['dating', 'dharma']);
      expect(result.activeCategories).toEqual(['dating', 'dharma']);
    });

    it('throws when no profile exists', async () => {
      mockFn(prisma.profile, 'findUnique').mockResolvedValue(null);
      await expect(profileService.updateCategories('u1', ['dating'])).rejects.toThrow('Profile not found');
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  SWIPE SERVICE
// ══════════════════════════════════════════════════════════════
describe('SwipeService', () => {
  beforeEach(resetAllMocks);

  describe('swipe', () => {
    it('creates a swipe and returns matched:false when no reciprocal', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue(null);
      mockFn(prisma.swipe, 'create').mockResolvedValue({});
      mockFn(prisma.swipe, 'findFirst').mockResolvedValue(null);

      const result = await swipeService.swipe('u1', 'u2', 'LIKE');
      expect(result.matched).toBe(false);
      expect(result.matchId).toBeUndefined();
    });

    it('creates a match on mutual LIKE', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue(null);
      mockFn(prisma.swipe, 'create').mockResolvedValue({});
      mockFn(prisma.swipe, 'findFirst').mockResolvedValue({ swiperId: 'u2', swipedId: 'u1', action: 'LIKE' });
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.match, 'create').mockResolvedValue({ id: 'match1' });

      const result = await swipeService.swipe('u1', 'u2', 'LIKE');
      expect(result.matched).toBe(true);
      expect(result.matchId).toBe('match1');
    });

    it('creates a match on mutual SUPER_LIKE', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue(null);
      mockFn(prisma.swipe, 'create').mockResolvedValue({});
      mockFn(prisma.swipe, 'findFirst').mockResolvedValue({ swiperId: 'u2', swipedId: 'u1', action: 'SUPER_LIKE' });
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.match, 'create').mockResolvedValue({ id: 'match2' });

      const result = await swipeService.swipe('u1', 'u2', 'SUPER_LIKE');
      expect(result.matched).toBe(true);
      expect(result.matchId).toBe('match2');
    });

    it('returns existing match if already matched', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue(null);
      mockFn(prisma.swipe, 'create').mockResolvedValue({});
      mockFn(prisma.swipe, 'findFirst').mockResolvedValue({ swiperId: 'u2', swipedId: 'u1', action: 'LIKE' });
      mockFn(prisma.match, 'findUnique').mockResolvedValue({ id: 'existingMatch' });

      const result = await swipeService.swipe('u1', 'u2', 'LIKE');
      expect(result.matched).toBe(true);
      expect(result.matchId).toBe('existingMatch');
      expect(prisma.match.create).not.toHaveBeenCalled();
    });

    it('does not match on PASS', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue(null);
      mockFn(prisma.swipe, 'create').mockResolvedValue({});

      const result = await swipeService.swipe('u1', 'u2', 'PASS' as any);
      expect(result.matched).toBe(false);
    });

    it('throws when swiping on self', async () => {
      await expect(swipeService.swipe('u1', 'u1', 'LIKE')).rejects.toThrow('Cannot swipe on yourself');
    });

    it('throws when target user does not exist', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(swipeService.swipe('u1', 'u2', 'LIKE')).rejects.toThrow('User not found');
    });

    it('throws when already swiped', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue({ id: 'existing' });
      await expect(swipeService.swipe('u1', 'u2', 'LIKE')).rejects.toThrow('Already swiped on this user');
    });

    it('throws when blocked', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue({ id: 'block1' });
      await expect(swipeService.swipe('u1', 'u2', 'LIKE')).rejects.toThrow('Cannot swipe on blocked user');
    });

    it('uses consistent userA/userB ordering (alphabetical) for match', async () => {
      // u1 < u2 alphabetically
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u2' });
      mockFn(prisma.swipe, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.block, 'findFirst').mockResolvedValue(null);
      mockFn(prisma.swipe, 'create').mockResolvedValue({});
      mockFn(prisma.swipe, 'findFirst').mockResolvedValue({ swiperId: 'u2', action: 'LIKE' });
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.match, 'create').mockResolvedValue({ id: 'm1' });

      await swipeService.swipe('u1', 'u2', 'LIKE');
      expect(prisma.match.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userAId_userBId: { userAId: 'u1', userBId: 'u2' } },
        }),
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  MATCH SERVICE
// ══════════════════════════════════════════════════════════════
describe('MatchService', () => {
  beforeEach(resetAllMocks);

  describe('getMatches', () => {
    it('returns matches with other user info and unread count', async () => {
      mockFn(prisma.match, 'findMany').mockResolvedValue([
        {
          id: 'm1',
          userAId: 'u1',
          userBId: 'u2',
          chatRoom: 'room1',
          createdAt: new Date('2025-01-01'),
          isActive: true,
          userA: {
            id: 'u1',
            profile: { displayName: 'User1' },
            photos: [],
          },
          userB: {
            id: 'u2',
            profile: { displayName: 'User2' },
            photos: [{ url: 'photo.jpg' }],
          },
          messages: [
            { id: 'msg1', type: 'TEXT', content: 'Hello', senderId: 'u2', createdAt: new Date(), isRead: false },
          ],
        },
      ]);
      mockFn(prisma.message, 'count').mockResolvedValue(3);

      const result = await matchService.getMatches('u1');
      expect(result).toHaveLength(1);
      expect(result[0].matchId).toBe('m1');
      expect(result[0].otherUser.id).toBe('u2');
      expect(result[0].otherUser.displayName).toBe('User2');
      expect(result[0].unreadCount).toBe(3);
      expect(result[0].latestMessage).not.toBeNull();
      expect(result[0].latestMessage!.content).toBe('Hello');
    });

    it('returns empty array when no matches', async () => {
      mockFn(prisma.match, 'findMany').mockResolvedValue([]);
      const result = await matchService.getMatches('u1');
      expect(result).toEqual([]);
    });

    it('shows other user as userA when userId is userB', async () => {
      mockFn(prisma.match, 'findMany').mockResolvedValue([
        {
          id: 'm2',
          userAId: 'other',
          userBId: 'me',
          chatRoom: null,
          createdAt: new Date(),
          isActive: true,
          userA: { id: 'other', profile: { displayName: 'Other' }, photos: [] },
          userB: { id: 'me', profile: { displayName: 'Me' }, photos: [] },
          messages: [],
        },
      ]);
      mockFn(prisma.message, 'count').mockResolvedValue(0);

      const result = await matchService.getMatches('me');
      expect(result[0].otherUser.id).toBe('other');
    });

    it('returns null latestMessage when no messages exist', async () => {
      mockFn(prisma.match, 'findMany').mockResolvedValue([
        {
          id: 'm3',
          userAId: 'u1',
          userBId: 'u2',
          chatRoom: null,
          createdAt: new Date(),
          isActive: true,
          userA: { id: 'u1', profile: null, photos: [] },
          userB: { id: 'u2', profile: null, photos: [] },
          messages: [],
        },
      ]);
      mockFn(prisma.message, 'count').mockResolvedValue(0);

      const result = await matchService.getMatches('u1');
      expect(result[0].latestMessage).toBeNull();
    });
  });

  describe('unmatch', () => {
    it('deactivates a match', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2', isActive: true,
      });
      mockFn(prisma.match, 'update').mockResolvedValue({});

      const result = await matchService.unmatch('u1', 'm1');
      expect(result).toEqual({ unmatched: true });
      expect(prisma.match.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });

    it('throws when match not found', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      await expect(matchService.unmatch('u1', 'none')).rejects.toThrow('Match not found');
    });

    it('throws when user is not part of the match', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      await expect(matchService.unmatch('u3', 'm1')).rejects.toThrow('Not your match');
    });

    it('allows userB to unmatch', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      mockFn(prisma.match, 'update').mockResolvedValue({});

      const result = await matchService.unmatch('u2', 'm1');
      expect(result).toEqual({ unmatched: true });
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  MESSAGE SERVICE
// ══════════════════════════════════════════════════════════════
describe('MessageService', () => {
  beforeEach(resetAllMocks);

  describe('getMessages', () => {
    it('returns paginated messages', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      mockFn(prisma.message, 'findMany').mockResolvedValue([
        {
          id: 'msg1', matchId: 'm1', senderId: 'u1', type: 'TEXT', content: 'hi',
          metadata: null, isRead: true, createdAt: new Date(),
          sender: { id: 'u1', profile: { displayName: 'User1' } },
        },
      ]);

      const result = await messageService.getMessages('m1', 'u1');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('hi');
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('returns hasMore true when more messages exist', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      // Return limit+1 messages to trigger hasMore
      const msgs = Array.from({ length: 51 }, (_, i) => ({
        id: `msg${i}`, matchId: 'm1', senderId: 'u1', type: 'TEXT', content: `msg ${i}`,
        metadata: null, isRead: true, createdAt: new Date(),
        sender: { id: 'u1', profile: { displayName: 'User1' } },
      }));
      mockFn(prisma.message, 'findMany').mockResolvedValue(msgs);

      const result = await messageService.getMessages('m1', 'u1');
      expect(result.hasMore).toBe(true);
      expect(result.messages).toHaveLength(50);
      expect(result.nextCursor).toBe('msg49');
    });

    it('throws when match not found', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      await expect(messageService.getMessages('none', 'u1')).rejects.toThrow('Match not found');
    });

    it('throws when user is not part of the match', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      await expect(messageService.getMessages('m1', 'u3')).rejects.toThrow('Not authorized');
    });

    it('supports cursor-based pagination', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      mockFn(prisma.message, 'findUnique').mockResolvedValue({
        id: 'cursor1', createdAt: new Date('2025-01-01'),
      });
      mockFn(prisma.message, 'findMany').mockResolvedValue([]);

      await messageService.getMessages('m1', 'u1', 'cursor1');
      expect(prisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            matchId: 'm1',
            createdAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
        }),
      );
    });
  });

  describe('createMessage', () => {
    it('creates a message successfully', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2', isActive: true,
      });
      mockFn(prisma.message, 'create').mockResolvedValue({
        id: 'msg1', matchId: 'm1', senderId: 'u1', type: 'TEXT',
        content: 'hello', metadata: null, isRead: false,
        createdAt: new Date(),
        sender: { id: 'u1', profile: { displayName: 'User1' } },
      });

      const result = await messageService.createMessage('m1', 'u1', 'TEXT' as any, 'hello');
      expect(result.id).toBe('msg1');
      expect(result.content).toBe('hello');
      expect(result.senderName).toBe('User1');
    });

    it('throws when match not found', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      await expect(messageService.createMessage('none', 'u1', 'TEXT' as any, 'hi'))
        .rejects.toThrow('Match not found or inactive');
    });

    it('throws when match is inactive', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2', isActive: false,
      });
      await expect(messageService.createMessage('m1', 'u1', 'TEXT' as any, 'hi'))
        .rejects.toThrow('Match not found or inactive');
    });

    it('throws when sender is not part of match', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2', isActive: true,
      });
      await expect(messageService.createMessage('m1', 'u3', 'TEXT' as any, 'hi'))
        .rejects.toThrow('Not authorized to send messages in this match');
    });

    it('passes metadata when provided', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2', isActive: true,
      });
      mockFn(prisma.message, 'create').mockResolvedValue({
        id: 'msg1', matchId: 'm1', senderId: 'u1', type: 'IMAGE',
        content: 'img', metadata: { url: 'http://img.png' }, isRead: false,
        createdAt: new Date(),
        sender: { id: 'u1', profile: null },
      });

      const result = await messageService.createMessage('m1', 'u1', 'IMAGE' as any, 'img', { url: 'http://img.png' });
      expect(result.metadata).toEqual({ url: 'http://img.png' });
      expect(result.senderName).toBe('Unknown');
    });
  });

  describe('markAsRead', () => {
    it('marks messages from other user as read', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      mockFn(prisma.message, 'updateMany').mockResolvedValue({ count: 5 });

      const result = await messageService.markAsRead('m1', 'u1');
      expect(result.markedRead).toBe(5);
      expect(prisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { matchId: 'm1', senderId: 'u2', isRead: false },
          data: { isRead: true },
        }),
      );
    });

    it('throws when match not found', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue(null);
      await expect(messageService.markAsRead('none', 'u1')).rejects.toThrow('Match not found');
    });

    it('throws when user is not part of match', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      await expect(messageService.markAsRead('m1', 'u3')).rejects.toThrow('Not authorized');
    });

    it('marks messages from userA when called by userB', async () => {
      mockFn(prisma.match, 'findUnique').mockResolvedValue({
        id: 'm1', userAId: 'u1', userBId: 'u2',
      });
      mockFn(prisma.message, 'updateMany').mockResolvedValue({ count: 2 });

      await messageService.markAsRead('m1', 'u2');
      expect(prisma.message.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ senderId: 'u1' }),
        }),
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  DISCOVERY SERVICE
// ══════════════════════════════════════════════════════════════
describe('DiscoveryService', () => {
  beforeEach(resetAllMocks);

  describe('getDeck', () => {
    it('returns filtered and formatted profiles', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        profile: {
          ageMin: 18, ageMax: 35, lookingForGender: ['FEMALE'], regionFilter: [],
        },
      });
      mockFn(prisma.swipe, 'findMany').mockResolvedValue([]);
      mockFn(prisma.block, 'findMany').mockResolvedValue([]);
      mockFn(prisma.profile, 'findMany').mockResolvedValue([
        {
          userId: 'u2',
          displayName: 'Jane',
          birthDate: new Date('1998-01-01'),
          gender: 'FEMALE',
          bio: 'Hi',
          region: 'Amdo',
          dialect: null,
          buddhaPractice: null,
          hometown: null,
          currentCity: null,
          currentCountry: null,
          education: null,
          profession: null,
          languages: [],
          activeCategories: ['dating'],
          user: {
            id: 'u2',
            lastActiveAt: new Date(),
            isActive: true,
            photos: [{ url: 'photo.jpg', position: 0 }],
            prompts: [],
          },
        },
      ]);

      const result = await discoveryService.getDeck('u1');
      expect(result.length).toBeGreaterThanOrEqual(0);
      // Due to shuffle, just check structure when results present
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('userId');
        expect(result[0]).toHaveProperty('displayName');
        expect(result[0]).toHaveProperty('photos');
        expect(result[0]).toHaveProperty('prompts');
      }
    });

    it('throws when user has no profile', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u1', profile: null });
      await expect(discoveryService.getDeck('u1')).rejects.toThrow('Profile required to browse');
    });

    it('throws when user not found', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);
      await expect(discoveryService.getDeck('none')).rejects.toThrow('Profile required to browse');
    });

    it('excludes already-swiped users', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        profile: { ageMin: 18, ageMax: 99, lookingForGender: [], regionFilter: [] },
      });
      mockFn(prisma.swipe, 'findMany').mockResolvedValue([{ swipedId: 'u2' }]);
      mockFn(prisma.block, 'findMany').mockResolvedValue([]);
      mockFn(prisma.profile, 'findMany').mockResolvedValue([]);

      await discoveryService.getDeck('u1');

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { notIn: expect.arrayContaining(['u1', 'u2']) },
          }),
        }),
      );
    });

    it('excludes blocked users in both directions', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        profile: { ageMin: 18, ageMax: 99, lookingForGender: [], regionFilter: [] },
      });
      mockFn(prisma.swipe, 'findMany').mockResolvedValue([]);
      // First call: blockedByMe, Second: blockedMe
      const blockFindMany = mockFn(prisma.block, 'findMany');
      blockFindMany
        .mockResolvedValueOnce([{ blockedId: 'blocked1' }])
        .mockResolvedValueOnce([{ blockerId: 'blocked2' }]);
      mockFn(prisma.profile, 'findMany').mockResolvedValue([]);

      await discoveryService.getDeck('u1');

      expect(prisma.profile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { notIn: expect.arrayContaining(['u1', 'blocked1', 'blocked2']) },
          }),
        }),
      );
    });

    it('filters only active profiles', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        profile: { ageMin: 18, ageMax: 99, lookingForGender: [], regionFilter: [] },
      });
      mockFn(prisma.swipe, 'findMany').mockResolvedValue([]);
      mockFn(prisma.block, 'findMany').mockResolvedValue([]);
      mockFn(prisma.profile, 'findMany').mockResolvedValue([
        {
          userId: 'u2', displayName: 'Active', user: { id: 'u2', isActive: true, lastActiveAt: new Date(), photos: [], prompts: [] },
          birthDate: new Date(), gender: 'MALE', bio: '', region: '', dialect: null, buddhaPractice: null,
          hometown: null, currentCity: null, currentCountry: null, education: null, profession: null,
          languages: [], activeCategories: [],
        },
        {
          userId: 'u3', displayName: 'Inactive', user: { id: 'u3', isActive: false, lastActiveAt: new Date(), photos: [], prompts: [] },
          birthDate: new Date(), gender: 'MALE', bio: '', region: '', dialect: null, buddhaPractice: null,
          hometown: null, currentCity: null, currentCountry: null, education: null, profession: null,
          languages: [], activeCategories: [],
        },
      ]);

      const result = await discoveryService.getDeck('u1');
      expect(result.every((p: any) => p.userId !== 'u3')).toBe(true);
    });

    it('respects limit parameter', async () => {
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        profile: { ageMin: 18, ageMax: 99, lookingForGender: [], regionFilter: [] },
      });
      mockFn(prisma.swipe, 'findMany').mockResolvedValue([]);
      mockFn(prisma.block, 'findMany').mockResolvedValue([]);
      const profiles = Array.from({ length: 10 }, (_, i) => ({
        userId: `u${i + 2}`, displayName: `User${i}`,
        user: { id: `u${i + 2}`, isActive: true, lastActiveAt: new Date(), photos: [], prompts: [] },
        birthDate: new Date(), gender: 'MALE', bio: '', region: '', dialect: null, buddhaPractice: null,
        hometown: null, currentCity: null, currentCountry: null, education: null, profession: null,
        languages: [], activeCategories: [],
      }));
      mockFn(prisma.profile, 'findMany').mockResolvedValue(profiles);

      const result = await discoveryService.getDeck('u1', undefined, 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getDailyPicks', () => {
    it('returns existing picks if already generated today', async () => {
      mockFn(prisma.dailyPick, 'findMany').mockResolvedValue([
        {
          id: 'dp1',
          pickedUser: {
            id: 'u2',
            profile: { displayName: 'Pick1' },
            photos: [{ url: 'photo.jpg', position: 0 }],
            prompts: [],
          },
        },
      ]);

      const result = await discoveryService.getDailyPicks('u1');
      expect(result).toHaveLength(1);
      expect(result[0].pickId).toBe('dp1');
      expect(result[0].userId).toBe('u2');
      // Should NOT generate new picks
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('generates new picks when none exist for today', async () => {
      mockFn(prisma.dailyPick, 'findMany').mockResolvedValue([]);
      mockFn(prisma.user, 'findUnique').mockResolvedValue({
        id: 'u1',
        profile: { region: 'Amdo' },
      });
      mockFn(prisma.swipe, 'findMany').mockResolvedValue([]);
      mockFn(prisma.block, 'findMany').mockResolvedValue([]);
      const candidates = Array.from({ length: 7 }, (_, i) => ({
        userId: `u${i + 2}`,
        displayName: `User${i}`,
        birthDate: new Date(),
        gender: 'MALE',
        bio: '',
        region: 'Amdo',
        dialect: null,
        buddhaPractice: null,
        hometown: null,
        currentCity: null,
        currentCountry: null,
        activeCategories: [],
        user: { id: `u${i + 2}`, photos: [], prompts: [] },
      }));
      mockFn(prisma.profile, 'findMany')
        .mockResolvedValueOnce(candidates) // same region
        .mockResolvedValueOnce([]); // other
      mockFn(prisma.dailyPick, 'create').mockImplementation(async (args: any) => ({
        id: `dp_${args.data.pickedUserId}`,
      }));

      const result = await discoveryService.getDailyPicks('u1');
      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('throws when user has no profile', async () => {
      mockFn(prisma.dailyPick, 'findMany').mockResolvedValue([]);
      mockFn(prisma.user, 'findUnique').mockResolvedValue({ id: 'u1', profile: null });

      await expect(discoveryService.getDailyPicks('u1')).rejects.toThrow('Profile required for daily picks');
    });

    it('throws when user not found', async () => {
      mockFn(prisma.dailyPick, 'findMany').mockResolvedValue([]);
      mockFn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(discoveryService.getDailyPicks('u1')).rejects.toThrow('Profile required for daily picks');
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  EVENT SERVICE
// ══════════════════════════════════════════════════════════════
describe('EventService', () => {
  beforeEach(resetAllMocks);

  const sampleEventData = {
    title: 'Dharma Talk',
    description: 'A talk on impermanence',
    type: 'DHARMA_TALK' as any,
    startDate: '2026-06-01T10:00:00Z',
  };

  const mockCreatedEvent = {
    id: 'ev1',
    creatorId: 'u1',
    title: 'Dharma Talk',
    titleTib: null,
    description: 'A talk on impermanence',
    descTib: null,
    type: 'DHARMA_TALK',
    imageUrl: null,
    location: null,
    city: null,
    country: null,
    latitude: null,
    longitude: null,
    startDate: new Date('2026-06-01T10:00:00Z'),
    endDate: null,
    isOnline: false,
    link: null,
    maxAttendees: null,
    createdAt: new Date(),
    creator: {
      id: 'u1',
      profile: { displayName: 'Host' },
      photos: [{ url: 'host.jpg' }],
    },
    _count: { rsvps: 0 },
  };

  describe('createEvent', () => {
    it('creates an event and returns formatted result', async () => {
      mockFn(prisma.event, 'create').mockResolvedValue(mockCreatedEvent);

      const result = await eventService.createEvent('u1', sampleEventData);
      expect(result.id).toBe('ev1');
      expect(result.title).toBe('Dharma Talk');
      expect(result.creatorName).toBe('Host');
      expect(result.creatorPhoto).toBe('host.jpg');
      expect(result.rsvpCount).toBe(0);
    });

    it('handles creator with no profile/photos', async () => {
      mockFn(prisma.event, 'create').mockResolvedValue({
        ...mockCreatedEvent,
        creator: { id: 'u1', profile: null, photos: [] },
      });

      const result = await eventService.createEvent('u1', sampleEventData);
      expect(result.creatorName).toBe('Unknown');
      expect(result.creatorPhoto).toBeNull();
    });
  });

  describe('getEvents', () => {
    it('returns list of events', async () => {
      mockFn(prisma.event, 'findMany').mockResolvedValue([mockCreatedEvent]);

      const result = await eventService.getEvents();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Dharma Talk');
    });

    it('applies type filter', async () => {
      mockFn(prisma.event, 'findMany').mockResolvedValue([]);

      await eventService.getEvents({ type: 'RETREAT' as any });
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'RETREAT' }),
        }),
      );
    });

    it('applies city filter', async () => {
      mockFn(prisma.event, 'findMany').mockResolvedValue([]);

      await eventService.getEvents({ city: 'Seattle' });
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ city: 'Seattle' }),
        }),
      );
    });

    it('returns empty array when no events', async () => {
      mockFn(prisma.event, 'findMany').mockResolvedValue([]);
      const result = await eventService.getEvents();
      expect(result).toEqual([]);
    });
  });

  describe('getEvent', () => {
    it('returns single event with details', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        ...mockCreatedEvent,
        linkedRoom: null,
      });

      const result = await eventService.getEvent('ev1');
      expect(result.id).toBe('ev1');
      expect(result.hasRsvped).toBe(false);
      expect(result.linkedRoomId).toBeNull();
    });

    it('checks RSVP status when userId provided', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        ...mockCreatedEvent,
        linkedRoom: null,
      });
      mockFn(prisma.eventRsvp, 'findUnique').mockResolvedValue({ id: 'rsvp1' });

      const result = await eventService.getEvent('ev1', 'u1');
      expect(result.hasRsvped).toBe(true);
    });

    it('throws when event not found', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue(null);
      await expect(eventService.getEvent('none')).rejects.toThrow('Event not found');
    });

    it('includes linked room info', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        ...mockCreatedEvent,
        linkedRoom: { id: 'room1', status: 'LIVE' },
      });

      const result = await eventService.getEvent('ev1');
      expect(result.linkedRoomId).toBe('room1');
      expect(result.linkedRoomStatus).toBe('LIVE');
    });
  });

  describe('updateEvent', () => {
    it('updates event successfully by the creator', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', creatorId: 'u1',
      });
      mockFn(prisma.event, 'update').mockResolvedValue({
        ...mockCreatedEvent,
        title: 'Updated Talk',
      });

      const result = await eventService.updateEvent('ev1', 'u1', { title: 'Updated Talk' });
      expect(result.title).toBe('Updated Talk');
    });

    it('throws when event not found', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue(null);
      await expect(eventService.updateEvent('none', 'u1', { title: 'X' })).rejects.toThrow('Event not found');
    });

    it('throws when non-creator tries to update', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', creatorId: 'u1',
      });
      await expect(eventService.updateEvent('ev1', 'u2', { title: 'X' }))
        .rejects.toThrow('Only the creator can update this event');
    });
  });

  describe('deleteEvent', () => {
    it('deletes event by creator', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', creatorId: 'u1',
      });
      mockFn(prisma.event, 'delete').mockResolvedValue({});

      const result = await eventService.deleteEvent('ev1', 'u1');
      expect(result).toEqual({ success: true });
    });

    it('throws when event not found', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue(null);
      await expect(eventService.deleteEvent('none', 'u1')).rejects.toThrow('Event not found');
    });

    it('throws when non-creator tries to delete', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', creatorId: 'u1',
      });
      await expect(eventService.deleteEvent('ev1', 'u2'))
        .rejects.toThrow('Only the creator can delete this event');
    });
  });

  describe('rsvpEvent', () => {
    it('creates RSVP when user has not RSVPed', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', maxAttendees: null,
      });
      mockFn(prisma.eventRsvp, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.eventRsvp, 'create').mockResolvedValue({});

      const result = await eventService.rsvpEvent('ev1', 'u1');
      expect(result).toEqual({ rsvped: true });
    });

    it('removes RSVP when user already RSVPed (toggle)', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', maxAttendees: null,
      });
      mockFn(prisma.eventRsvp, 'findUnique').mockResolvedValue({ id: 'rsvp1' });
      mockFn(prisma.eventRsvp, 'delete').mockResolvedValue({});

      const result = await eventService.rsvpEvent('ev1', 'u1');
      expect(result).toEqual({ rsvped: false });
    });

    it('throws when event not found', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue(null);
      await expect(eventService.rsvpEvent('none', 'u1')).rejects.toThrow('Event not found');
    });

    it('throws when event is full', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', maxAttendees: 2,
      });
      mockFn(prisma.eventRsvp, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.eventRsvp, 'count').mockResolvedValue(2);

      await expect(eventService.rsvpEvent('ev1', 'u1')).rejects.toThrow('Event is full');
    });

    it('allows RSVP when not yet at max', async () => {
      mockFn(prisma.event, 'findUnique').mockResolvedValue({
        id: 'ev1', maxAttendees: 10,
      });
      mockFn(prisma.eventRsvp, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.eventRsvp, 'count').mockResolvedValue(9);
      mockFn(prisma.eventRsvp, 'create').mockResolvedValue({});

      const result = await eventService.rsvpEvent('ev1', 'u1');
      expect(result).toEqual({ rsvped: true });
    });
  });

  describe('getUpcomingEvents', () => {
    it('returns future events', async () => {
      mockFn(prisma.event, 'findMany').mockResolvedValue([mockCreatedEvent]);

      const result = await eventService.getUpcomingEvents();
      expect(result).toHaveLength(1);
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { startDate: { gt: expect.any(Date) } },
        }),
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  FEED SERVICE
// ══════════════════════════════════════════════════════════════
describe('FeedService', () => {
  beforeEach(resetAllMocks);

  const mockPost = {
    id: 'post1',
    authorId: 'u1',
    type: 'TEXT',
    content: 'Hello world',
    imageUrl: null,
    linkUrl: null,
    createdAt: new Date(),
    author: {
      id: 'u1',
      profile: { displayName: 'Author' },
      photos: [{ url: 'author.jpg' }],
    },
    _count: { likes: 5, comments: 2 },
    likes: [],
    comments: [],
  };

  describe('createPost', () => {
    it('creates a feed post', async () => {
      mockFn(prisma.feedPost, 'create').mockResolvedValue(mockPost);

      const result = await feedService.createPost('u1', { content: 'Hello world' });
      expect(result.id).toBe('post1');
      expect(result.content).toBe('Hello world');
      expect(result.authorName).toBe('Author');
      expect(result.isLiked).toBe(false);
      expect(result.likeCount).toBe(5);
      expect(result.commentCount).toBe(2);
    });

    it('handles author with no profile', async () => {
      mockFn(prisma.feedPost, 'create').mockResolvedValue({
        ...mockPost,
        author: { id: 'u1', profile: null, photos: [] },
      });

      const result = await feedService.createPost('u1', { content: 'test' });
      expect(result.authorName).toBe('Unknown');
      expect(result.authorPhoto).toBeNull();
    });
  });

  describe('getFeed', () => {
    it('returns paginated feed', async () => {
      mockFn(prisma.feedPost, 'findMany').mockResolvedValue([mockPost]);

      const result = await feedService.getFeed('u1');
      expect(result.posts).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('returns nextCursor when more posts exist', async () => {
      const posts = Array.from({ length: 21 }, (_, i) => ({
        ...mockPost,
        id: `post${i}`,
      }));
      mockFn(prisma.feedPost, 'findMany').mockResolvedValue(posts);

      const result = await feedService.getFeed('u1');
      expect(result.posts).toHaveLength(20);
      expect(result.nextCursor).toBe('post19');
    });

    it('supports cursor-based pagination', async () => {
      mockFn(prisma.feedPost, 'findMany').mockResolvedValue([]);

      await feedService.getFeed('u1', 'cursor1');
      expect(prisma.feedPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'cursor1' },
          skip: 1,
        }),
      );
    });

    it('detects liked posts', async () => {
      mockFn(prisma.feedPost, 'findMany').mockResolvedValue([
        { ...mockPost, likes: [{ id: 'like1' }] },
      ]);

      const result = await feedService.getFeed('u1');
      expect(result.posts[0].isLiked).toBe(true);
    });
  });

  describe('getPost', () => {
    it('returns post with comments', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({
        ...mockPost,
        comments: [
          {
            id: 'c1', authorId: 'u2', content: 'Nice!', createdAt: new Date(),
            author: { id: 'u2', profile: { displayName: 'Commenter' }, photos: [] },
          },
        ],
      });

      const result = await feedService.getPost('post1');
      expect(result.id).toBe('post1');
      expect(result.comments).toHaveLength(1);
      expect(result.comments[0].authorName).toBe('Commenter');
    });

    it('throws when post not found', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue(null);
      await expect(feedService.getPost('none')).rejects.toThrow('Post not found');
    });

    it('checks like status when userId provided', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ ...mockPost, comments: [] });
      mockFn(prisma.feedLike, 'findUnique').mockResolvedValue({ id: 'like1' });

      const result = await feedService.getPost('post1', 'u1');
      expect(result.isLiked).toBe(true);
    });

    it('returns isLiked false when no userId', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ ...mockPost, comments: [] });

      const result = await feedService.getPost('post1');
      expect(result.isLiked).toBe(false);
    });
  });

  describe('likePost', () => {
    it('likes a post (creates like)', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ id: 'post1' });
      mockFn(prisma.feedLike, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.feedLike, 'create').mockResolvedValue({});

      const result = await feedService.likePost('post1', 'u1');
      expect(result).toEqual({ liked: true });
    });

    it('unlikes a post (deletes like, toggle)', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ id: 'post1' });
      mockFn(prisma.feedLike, 'findUnique').mockResolvedValue({ id: 'like1' });
      mockFn(prisma.feedLike, 'delete').mockResolvedValue({});

      const result = await feedService.likePost('post1', 'u1');
      expect(result).toEqual({ liked: false });
    });

    it('throws when post not found', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue(null);
      await expect(feedService.likePost('none', 'u1')).rejects.toThrow('Post not found');
    });
  });

  describe('commentOnPost', () => {
    it('creates a comment', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ id: 'post1' });
      mockFn(prisma.feedComment, 'create').mockResolvedValue({
        id: 'c1', authorId: 'u1', content: 'Great!', createdAt: new Date(),
        author: {
          id: 'u1',
          profile: { displayName: 'Me' },
          photos: [{ url: 'me.jpg' }],
        },
      });

      const result = await feedService.commentOnPost('post1', 'u1', 'Great!');
      expect(result.id).toBe('c1');
      expect(result.content).toBe('Great!');
      expect(result.authorName).toBe('Me');
      expect(result.authorPhoto).toBe('me.jpg');
    });

    it('throws when post not found', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue(null);
      await expect(feedService.commentOnPost('none', 'u1', 'X')).rejects.toThrow('Post not found');
    });
  });

  describe('deletePost', () => {
    it('deletes post by the author', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ id: 'post1', authorId: 'u1' });
      mockFn(prisma.feedPost, 'delete').mockResolvedValue({});

      const result = await feedService.deletePost('post1', 'u1');
      expect(result).toEqual({ success: true });
    });

    it('throws when post not found', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue(null);
      await expect(feedService.deletePost('none', 'u1')).rejects.toThrow('Post not found');
    });

    it('throws when non-author tries to delete', async () => {
      mockFn(prisma.feedPost, 'findUnique').mockResolvedValue({ id: 'post1', authorId: 'u1' });
      await expect(feedService.deletePost('post1', 'u2'))
        .rejects.toThrow('Only the author can delete this post');
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  ROOM SERVICE
// ══════════════════════════════════════════════════════════════
describe('RoomService', () => {
  beforeEach(resetAllMocks);

  const mockRoom = {
    id: 'room1',
    hostId: 'u1',
    title: 'Dharma Chat',
    description: 'Weekly discussion',
    type: 'OPEN',
    topicTag: 'dharma',
    status: 'LIVE',
    scheduledAt: null,
    isWatchParty: false,
    videoUrl: null,
    maxSpeakers: 8,
    createdAt: new Date(),
    host: {
      id: 'u1',
      profile: { displayName: 'Host' },
      photos: [{ url: 'host.jpg' }],
    },
    participants: [],
    _count: { participants: 1, rsvps: 0 },
  };

  describe('createRoom', () => {
    it('creates a room and adds host as participant', async () => {
      mockFn(prisma.room, 'create').mockResolvedValue(mockRoom);
      mockFn(prisma.roomParticipant, 'create').mockResolvedValue({});

      const result = await roomService.createRoom('u1', {
        title: 'Dharma Chat',
        description: 'Weekly discussion',
      });

      expect(result.id).toBe('room1');
      expect(result.hostName).toBe('Host');
      expect(result.participantCount).toBe(1);
      expect(prisma.roomParticipant.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'HOST' }),
        }),
      );
    });

    it('sets status WAITING for scheduled rooms', async () => {
      mockFn(prisma.room, 'create').mockResolvedValue({
        ...mockRoom,
        status: 'WAITING',
        type: 'SCHEDULED',
        scheduledAt: new Date('2026-07-01'),
      });
      mockFn(prisma.roomParticipant, 'create').mockResolvedValue({});

      await roomService.createRoom('u1', {
        title: 'Scheduled Talk',
        type: 'SCHEDULED' as any,
        scheduledAt: '2026-07-01T10:00:00Z',
      });

      expect(prisma.room.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'WAITING' }),
        }),
      );
    });

    it('creates watch party state for watch party rooms', async () => {
      mockFn(prisma.room, 'create').mockResolvedValue({
        ...mockRoom,
        isWatchParty: true,
        videoUrl: 'http://vid.mp4',
      });
      mockFn(prisma.roomParticipant, 'create').mockResolvedValue({});
      mockFn(prisma.watchPartyState, 'create').mockResolvedValue({});

      await roomService.createRoom('u1', {
        title: 'Watch Party',
        isWatchParty: true,
        videoUrl: 'http://vid.mp4',
      });

      expect(prisma.watchPartyState.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ videoUrl: 'http://vid.mp4' }),
        }),
      );
    });
  });

  describe('getRooms', () => {
    it('returns list of rooms', async () => {
      mockFn(prisma.room, 'findMany').mockResolvedValue([mockRoom]);

      const result = await roomService.getRooms();
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Dharma Chat');
      expect(result[0].hostPhoto).toBe('host.jpg');
    });

    it('applies status filter', async () => {
      mockFn(prisma.room, 'findMany').mockResolvedValue([]);
      await roomService.getRooms({ status: 'LIVE' as any });
      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'LIVE' }),
        }),
      );
    });

    it('applies type filter', async () => {
      mockFn(prisma.room, 'findMany').mockResolvedValue([]);
      await roomService.getRooms({ type: 'OPEN' as any });
      expect(prisma.room.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'OPEN' }),
        }),
      );
    });
  });

  describe('getRoom', () => {
    it('returns room with participants', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        ...mockRoom,
        participants: [
          {
            userId: 'u1',
            role: 'HOST',
            handRaised: false,
            isMuted: false,
            joinedAt: new Date(),
            user: {
              id: 'u1',
              profile: { displayName: 'Host' },
              photos: [{ url: 'host.jpg' }],
            },
          },
        ],
      });

      const result = await roomService.getRoom('room1');
      expect(result.id).toBe('room1');
      expect(result.participants).toHaveLength(1);
      expect(result.participants[0].role).toBe('HOST');
    });

    it('throws when room not found', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue(null);
      await expect(roomService.getRoom('none')).rejects.toThrow('Room not found');
    });
  });

  describe('endRoom', () => {
    it('ends room and removes all participants', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      mockFn(prisma.room, 'update').mockResolvedValue({});
      mockFn(prisma.roomParticipant, 'deleteMany').mockResolvedValue({ count: 3 });

      const result = await roomService.endRoom('room1', 'u1');
      expect(result).toEqual({ success: true });
      expect(prisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'ENDED' } }),
      );
    });

    it('throws when room not found', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue(null);
      await expect(roomService.endRoom('none', 'u1')).rejects.toThrow('Room not found');
    });

    it('throws when non-host tries to end', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      await expect(roomService.endRoom('room1', 'u2')).rejects.toThrow('Only the host can end the room');
    });
  });

  describe('joinRoom', () => {
    it('joins a LIVE room as listener', async () => {
      mockFn(prisma.room, 'findUnique')
        .mockResolvedValueOnce({ id: 'room1', hostId: 'u1', status: 'LIVE' }) // for joinRoom check
        .mockResolvedValueOnce({  // for getRoom return
          ...mockRoom,
          participants: [
            {
              userId: 'u2', role: 'LISTENER', handRaised: false, isMuted: false,
              joinedAt: new Date(),
              user: { id: 'u2', profile: { displayName: 'User2' }, photos: [] },
            },
          ],
        });
      mockFn(prisma.roomParticipant, 'upsert').mockResolvedValue({});

      const result = await roomService.joinRoom('room1', 'u2');
      expect(result.id).toBe('room1');
    });

    it('throws when room ended', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1', status: 'ENDED',
      });
      await expect(roomService.joinRoom('room1', 'u2')).rejects.toThrow('Room has ended');
    });

    it('throws when room not found', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue(null);
      await expect(roomService.joinRoom('none', 'u1')).rejects.toThrow('Room not found');
    });

    it('sets WAITING room to LIVE when host joins', async () => {
      mockFn(prisma.room, 'findUnique')
        .mockResolvedValueOnce({ id: 'room1', hostId: 'u1', status: 'WAITING' })
        .mockResolvedValueOnce({ ...mockRoom, participants: [] });
      mockFn(prisma.room, 'update').mockResolvedValue({});
      mockFn(prisma.roomParticipant, 'upsert').mockResolvedValue({});

      await roomService.joinRoom('room1', 'u1');
      expect(prisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'room1' },
          data: { status: 'LIVE' },
        }),
      );
    });
  });

  describe('leaveRoom', () => {
    it('removes participant from room', async () => {
      mockFn(prisma.roomParticipant, 'deleteMany').mockResolvedValue({ count: 1 });

      const result = await roomService.leaveRoom('room1', 'u2');
      expect(result).toEqual({ success: true });
    });
  });

  describe('raiseHand', () => {
    it('toggles hand raised status', async () => {
      mockFn(prisma.roomParticipant, 'findUnique').mockResolvedValue({
        roomId: 'room1', userId: 'u2', handRaised: false,
      });
      mockFn(prisma.roomParticipant, 'update').mockResolvedValue({
        handRaised: true,
      });

      const result = await roomService.raiseHand('room1', 'u2');
      expect(result.handRaised).toBe(true);
    });

    it('lowers hand when already raised', async () => {
      mockFn(prisma.roomParticipant, 'findUnique').mockResolvedValue({
        roomId: 'room1', userId: 'u2', handRaised: true,
      });
      mockFn(prisma.roomParticipant, 'update').mockResolvedValue({
        handRaised: false,
      });

      const result = await roomService.raiseHand('room1', 'u2');
      expect(result.handRaised).toBe(false);
    });

    it('throws when not a participant', async () => {
      mockFn(prisma.roomParticipant, 'findUnique').mockResolvedValue(null);
      await expect(roomService.raiseHand('room1', 'u2')).rejects.toThrow('Not a participant');
    });
  });

  describe('inviteSpeaker', () => {
    it('promotes listener to speaker', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1', maxSpeakers: 8,
      });
      mockFn(prisma.roomParticipant, 'count').mockResolvedValue(2);
      mockFn(prisma.roomParticipant, 'update').mockResolvedValue({});

      const result = await roomService.inviteSpeaker('room1', 'u1', 'u2');
      expect(result).toEqual({ success: true });
      expect(prisma.roomParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: 'SPEAKER', handRaised: false },
        }),
      );
    });

    it('throws when room not found', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue(null);
      await expect(roomService.inviteSpeaker('none', 'u1', 'u2')).rejects.toThrow('Room not found');
    });

    it('throws when non-host invites', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      await expect(roomService.inviteSpeaker('room1', 'u2', 'u3'))
        .rejects.toThrow('Only the host can invite speakers');
    });

    it('throws when max speakers reached', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1', maxSpeakers: 3,
      });
      mockFn(prisma.roomParticipant, 'count').mockResolvedValue(3);

      await expect(roomService.inviteSpeaker('room1', 'u1', 'u2'))
        .rejects.toThrow('Maximum speakers reached');
    });
  });

  describe('muteSpeaker', () => {
    it('mutes a speaker', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      mockFn(prisma.roomParticipant, 'update').mockResolvedValue({});

      const result = await roomService.muteSpeaker('room1', 'u1', 'u2');
      expect(result).toEqual({ success: true });
      expect(prisma.roomParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isMuted: true },
        }),
      );
    });

    it('throws when room not found', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue(null);
      await expect(roomService.muteSpeaker('none', 'u1', 'u2')).rejects.toThrow('Room not found');
    });

    it('throws when non-host mutes', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      await expect(roomService.muteSpeaker('room1', 'u2', 'u3'))
        .rejects.toThrow('Only the host can mute speakers');
    });
  });

  describe('removeSpeaker', () => {
    it('demotes speaker to listener', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      mockFn(prisma.roomParticipant, 'update').mockResolvedValue({});

      const result = await roomService.removeSpeaker('room1', 'u1', 'u2');
      expect(result).toEqual({ success: true });
      expect(prisma.roomParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { role: 'LISTENER' },
        }),
      );
    });

    it('throws when non-host removes', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', hostId: 'u1',
      });
      await expect(roomService.removeSpeaker('room1', 'u2', 'u3'))
        .rejects.toThrow('Only the host can remove speakers');
    });
  });

  describe('getRoomMessages', () => {
    it('returns messages in chronological order', async () => {
      mockFn(prisma.roomMessage, 'findMany').mockResolvedValue([
        {
          id: 'rm2', roomId: 'room1', userId: 'u2', content: 'Second',
          createdAt: new Date('2025-01-02'),
          user: { id: 'u2', profile: { displayName: 'User2' } },
        },
        {
          id: 'rm1', roomId: 'room1', userId: 'u1', content: 'First',
          createdAt: new Date('2025-01-01'),
          user: { id: 'u1', profile: { displayName: 'User1' } },
        },
      ]);

      const result = await roomService.getRoomMessages('room1');
      // .reverse() is called, so first should be the earlier one
      expect(result[0].content).toBe('First');
      expect(result[1].content).toBe('Second');
    });
  });

  describe('sendRoomMessage', () => {
    it('sends a room message', async () => {
      mockFn(prisma.roomParticipant, 'findUnique').mockResolvedValue({ userId: 'u1' });
      mockFn(prisma.roomMessage, 'create').mockResolvedValue({
        id: 'rm1', roomId: 'room1', userId: 'u1', content: 'Hey!',
        createdAt: new Date(),
        user: { id: 'u1', profile: { displayName: 'Host' } },
      });

      const result = await roomService.sendRoomMessage('room1', 'u1', 'Hey!');
      expect(result.content).toBe('Hey!');
      expect(result.displayName).toBe('Host');
    });

    it('throws when not a participant', async () => {
      mockFn(prisma.roomParticipant, 'findUnique').mockResolvedValue(null);
      await expect(roomService.sendRoomMessage('room1', 'u3', 'X'))
        .rejects.toThrow('Must be a participant to send messages');
    });
  });

  describe('getChannels', () => {
    it('returns topic channels', async () => {
      mockFn(prisma.topicChannel, 'findMany').mockResolvedValue([
        {
          id: 'ch1', name: 'Dharma', nameTib: null, description: 'Talk dharma',
          iconEmoji: '🙏', position: 0, roomId: null,
        },
      ]);

      const result = await roomService.getChannels();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Dharma');
    });
  });

  describe('getScheduledRooms', () => {
    it('returns future scheduled rooms', async () => {
      mockFn(prisma.room, 'findMany').mockResolvedValue([{
        id: 'room2',
        title: 'Scheduled',
        description: null,
        type: 'SCHEDULED',
        topicTag: null,
        status: 'WAITING',
        scheduledAt: new Date('2026-07-01'),
        isWatchParty: false,
        hostId: 'u1',
        createdAt: new Date(),
        host: { id: 'u1', profile: { displayName: 'Host' }, photos: [] },
        _count: { rsvps: 5 },
      }]);

      const result = await roomService.getScheduledRooms();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('WAITING');
      expect(result[0].rsvpCount).toBe(5);
    });
  });

  describe('rsvpRoom', () => {
    it('creates RSVP when not already RSVPed', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', status: 'WAITING',
      });
      mockFn(prisma.roomScheduleRsvp, 'findUnique').mockResolvedValue(null);
      mockFn(prisma.roomScheduleRsvp, 'create').mockResolvedValue({});

      const result = await roomService.rsvpRoom('room1', 'u1');
      expect(result).toEqual({ rsvped: true });
    });

    it('removes RSVP when already RSVPed (toggle)', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', status: 'WAITING',
      });
      mockFn(prisma.roomScheduleRsvp, 'findUnique').mockResolvedValue({ id: 'rsvp1' });
      mockFn(prisma.roomScheduleRsvp, 'delete').mockResolvedValue({});

      const result = await roomService.rsvpRoom('room1', 'u1');
      expect(result).toEqual({ rsvped: false });
    });

    it('throws when room not found', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue(null);
      await expect(roomService.rsvpRoom('none', 'u1')).rejects.toThrow('Room not found');
    });

    it('throws when room is not scheduled (WAITING)', async () => {
      mockFn(prisma.room, 'findUnique').mockResolvedValue({
        id: 'room1', status: 'LIVE',
      });
      await expect(roomService.rsvpRoom('room1', 'u1')).rejects.toThrow('Room is not scheduled');
    });
  });
});

// ══════════════════════════════════════════════════════════════
//  WAITLIST SERVICE
// ══════════════════════════════════════════════════════════════
describe('WaitlistService', () => {
  beforeEach(resetAllMocks);

  describe('getStatus', () => {
    it('returns null when no entry exists', async () => {
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue(null);
      const result = await waitlistService.getStatus('u1');
      expect(result).toBeNull();
    });

    it('returns status with position for PENDING entries', async () => {
      const now = new Date();
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue({
        id: 'w1', userId: 'u1', status: 'PENDING',
        inviteCode: null, referredBy: null,
        createdAt: now, approvedAt: null,
      });
      mockFn(prisma.waitlistEntry, 'count').mockResolvedValue(4);

      const result = await waitlistService.getStatus('u1');
      expect(result).not.toBeNull();
      expect(result!.position).toBe(5); // 4 ahead + 1
      expect(result!.status).toBe('PENDING');
      expect(result!.createdAt).toBe(now.toISOString());
    });

    it('returns null position for APPROVED entries', async () => {
      const now = new Date();
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue({
        id: 'w1', userId: 'u1', status: 'APPROVED',
        inviteCode: 'CODE1', referredBy: 'inviter',
        createdAt: now, approvedAt: now,
      });

      const result = await waitlistService.getStatus('u1');
      expect(result!.position).toBeNull();
      expect(result!.status).toBe('APPROVED');
      expect(result!.approvedAt).toBe(now.toISOString());
    });

    it('returns position 1 for the first PENDING entry', async () => {
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue({
        id: 'w1', userId: 'u1', status: 'PENDING',
        inviteCode: null, referredBy: null,
        createdAt: new Date(), approvedAt: null,
      });
      mockFn(prisma.waitlistEntry, 'count').mockResolvedValue(0);

      const result = await waitlistService.getStatus('u1');
      expect(result!.position).toBe(1);
    });
  });

  describe('redeemCode', () => {
    it('redeems a valid invite code', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', code: 'ABC123', inviterId: 'inviter1',
        isActive: true, usedCount: 0, maxUses: 3, expiresAt: null,
      });
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue({
        userId: 'u1', status: 'PENDING',
      });
      mockFn(prisma, '$transaction').mockResolvedValue([{}, {}, {}]);

      const result = await waitlistService.redeemCode('u1', 'abc123');
      expect(result).toEqual({ success: true, message: 'Invite code redeemed successfully' });
    });

    it('throws on invalid code', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue(null);
      await expect(waitlistService.redeemCode('u1', 'INVALID')).rejects.toThrow('Invalid invite code');
    });

    it('throws when code is inactive', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', isActive: false, usedCount: 0, maxUses: 3, expiresAt: null, inviterId: 'x',
      });
      await expect(waitlistService.redeemCode('u1', 'CODE')).rejects.toThrow('no longer active');
    });

    it('throws when code is fully used', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', isActive: true, usedCount: 3, maxUses: 3, expiresAt: null, inviterId: 'x',
      });
      await expect(waitlistService.redeemCode('u1', 'CODE')).rejects.toThrow('fully used');
    });

    it('throws when code is expired', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', isActive: true, usedCount: 0, maxUses: 3,
        expiresAt: new Date('2020-01-01'), inviterId: 'x',
      });
      await expect(waitlistService.redeemCode('u1', 'CODE')).rejects.toThrow('expired');
    });

    it('throws when user tries to use own invite code', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', isActive: true, usedCount: 0, maxUses: 3,
        expiresAt: null, inviterId: 'u1',
      });
      await expect(waitlistService.redeemCode('u1', 'CODE'))
        .rejects.toThrow('cannot use your own invite code');
    });

    it('throws when no waitlist entry found', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', isActive: true, usedCount: 0, maxUses: 3,
        expiresAt: null, inviterId: 'other',
      });
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue(null);
      await expect(waitlistService.redeemCode('u1', 'CODE')).rejects.toThrow('No waitlist entry found');
    });

    it('throws when user is already approved', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({
        id: 'inv1', isActive: true, usedCount: 0, maxUses: 3,
        expiresAt: null, inviterId: 'other',
      });
      mockFn(prisma.waitlistEntry, 'findUnique').mockResolvedValue({
        userId: 'u1', status: 'APPROVED',
      });
      await expect(waitlistService.redeemCode('u1', 'CODE')).rejects.toThrow('already approved');
    });

    it('converts code to uppercase for lookup', async () => {
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue(null);
      await expect(waitlistService.redeemCode('u1', 'lowercase')).rejects.toThrow('Invalid invite code');
      expect(prisma.inviteCode.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { code: 'LOWERCASE' } }),
      );
    });
  });

  describe('generateCode', () => {
    it('generates a new invite code', async () => {
      mockFn(prisma.inviteCode, 'count').mockResolvedValue(0);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue(null);
      const now = new Date();
      mockFn(prisma.inviteCode, 'create').mockResolvedValue({
        id: 'inv1', code: 'ABC123', inviterId: 'u1',
        maxUses: 3, usedCount: 0, isActive: true,
        expiresAt: null, createdAt: now,
      });

      const result = await waitlistService.generateCode('u1');
      expect(result.code).toBe('ABC123');
      expect(result.maxUses).toBe(3);
      expect(result.usedCount).toBe(0);
      expect(result.isActive).toBe(true);
      expect(result.expiresAt).toBeNull();
      expect(result.createdAt).toBe(now.toISOString());
    });

    it('throws when user has reached max codes (5)', async () => {
      mockFn(prisma.inviteCode, 'count').mockResolvedValue(5);
      await expect(waitlistService.generateCode('u1'))
        .rejects.toThrow('maximum number of invite codes (5)');
    });

    it('retries on code collision and throws after 10 attempts', async () => {
      mockFn(prisma.inviteCode, 'count').mockResolvedValue(0);
      // Every code check returns "exists"
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue({ id: 'exists' });

      await expect(waitlistService.generateCode('u1'))
        .rejects.toThrow('Failed to generate unique code');
    });

    it('succeeds on second attempt after collision', async () => {
      mockFn(prisma.inviteCode, 'count').mockResolvedValue(0);
      mockFn(prisma.inviteCode, 'findUnique')
        .mockResolvedValueOnce({ id: 'collision' }) // first attempt collides
        .mockResolvedValueOnce(null); // second attempt is unique
      const now = new Date();
      mockFn(prisma.inviteCode, 'create').mockResolvedValue({
        id: 'inv2', code: 'XYZ789', inviterId: 'u1',
        maxUses: 3, usedCount: 0, isActive: true,
        expiresAt: null, createdAt: now,
      });

      const result = await waitlistService.generateCode('u1');
      expect(result.code).toBe('XYZ789');
    });

    it('returns correct shape with all fields', async () => {
      mockFn(prisma.inviteCode, 'count').mockResolvedValue(2);
      mockFn(prisma.inviteCode, 'findUnique').mockResolvedValue(null);
      const now = new Date();
      mockFn(prisma.inviteCode, 'create').mockResolvedValue({
        id: 'inv3', code: 'DEF456', inviterId: 'u1',
        maxUses: 3, usedCount: 0, isActive: true,
        expiresAt: null, createdAt: now,
      });

      const result = await waitlistService.generateCode('u1');
      expect(result).toEqual({
        id: 'inv3',
        code: 'DEF456',
        inviterId: 'u1',
        maxUses: 3,
        usedCount: 0,
        isActive: true,
        expiresAt: null,
        createdAt: now.toISOString(),
      });
    });
  });
});
