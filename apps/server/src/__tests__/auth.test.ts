import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../index';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { env } from '../config/env';
import {
  registerUser,
  loginUser,
  testEmail,
  authHeader,
  cleanupTestUsers,
  createTestInvite,
  TEST_PASSWORD,
} from './helpers';

describe('Auth E2E', () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  // ─── Registration ────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('registers a new user with valid email and password', async () => {
      const email = testEmail('register_ok');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({ email, isActive: false });
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.id).toBeDefined();

      // Verify user in DB
      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser).toBeTruthy();
      expect(dbUser!.isActive).toBe(false);

      // Verify waitlist entry created as PENDING
      const waitlist = await prisma.waitlistEntry.findUnique({ where: { userId: dbUser!.id } });
      expect(waitlist).toBeTruthy();
      expect(waitlist!.status).toBe('PENDING');

      // Verify refresh token stored in Redis
      const stored = await redis.get(`refresh:${dbUser!.id}`);
      expect(stored).toBe(res.body.refreshToken);
    });

    it('registers with valid invite code and activates immediately', async () => {
      // First register an inviter
      const inviter = await registerUser(testEmail('inviter'));
      expect(inviter.status).toBe(201);

      // Create invite code
      const invite = await createTestInvite(inviter.user.id);

      // Register with invite
      const email = testEmail('invited');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: TEST_PASSWORD, inviteCode: invite.code });

      expect(res.status).toBe(201);
      expect(res.body.user.isActive).toBe(true);

      // Verify waitlist entry is APPROVED
      const waitlist = await prisma.waitlistEntry.findUnique({ where: { userId: res.body.user.id } });
      expect(waitlist!.status).toBe('APPROVED');
      expect(waitlist!.approvedAt).toBeTruthy();

      // Verify invite usage incremented
      const updatedInvite = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
      expect(updatedInvite!.usedCount).toBe(1);
    });

    it('registers with expired invite code — stays pending', async () => {
      const inviter = await registerUser(testEmail('inviter_expired'));
      const invite = await createTestInvite(inviter.user.id, {
        expiresAt: new Date('2020-01-01'),
      });

      const email = testEmail('expired_invite');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: TEST_PASSWORD, inviteCode: invite.code });

      expect(res.status).toBe(201);
      expect(res.body.user.isActive).toBe(false);
    });

    it('registers with maxed-out invite code — stays pending', async () => {
      const inviter = await registerUser(testEmail('inviter_maxed'));
      const invite = await createTestInvite(inviter.user.id, { maxUses: 1 });

      // Use the invite once
      await registerUser(testEmail('use_once'), TEST_PASSWORD, invite.code);

      // Try again — should be pending
      const email = testEmail('maxed_invite');
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: TEST_PASSWORD, inviteCode: invite.code });

      expect(res.status).toBe(201);
      expect(res.body.user.isActive).toBe(false);
    });

    it('rejects duplicate email', async () => {
      const email = testEmail('dupe');
      await registerUser(email);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email, password: TEST_PASSWORD });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email already registered');
    });

    it('rejects invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'notanemail', password: TEST_PASSWORD });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects password shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail('short_pw'), password: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({});

      expect(res.status).toBe(400);
    });

    it('sets httpOnly refresh token cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail('cookie'), password: TEST_PASSWORD });

      expect(res.status).toBe(201);
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = Array.isArray(cookies)
        ? cookies.find((c: string) => c.includes('refreshToken'))
        : cookies;
      expect(refreshCookie).toContain('HttpOnly');
      expect(refreshCookie).toContain('Path=/api/auth');
    });
  });

  // ─── Login ───────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    const loginEmail = testEmail('login_user');

    beforeAll(async () => {
      await registerUser(loginEmail);
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: TEST_PASSWORD });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(loginEmail);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('updates lastActiveAt on login', async () => {
      const before = await prisma.user.findUnique({ where: { email: loginEmail } });
      const beforeActive = before!.lastActiveAt;

      await new Promise((r) => setTimeout(r, 50));

      await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: TEST_PASSWORD });

      const after = await prisma.user.findUnique({ where: { email: loginEmail } });
      expect(after!.lastActiveAt!.getTime()).toBeGreaterThan(beforeActive?.getTime() || 0);
    });

    it('rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: 'wrong_password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('rejects non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'doesnt_exist@tsewa.test', password: TEST_PASSWORD });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('rejects empty password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: loginEmail, password: '' });

      expect(res.status).toBe(400);
    });

    it('returns valid JWT access token', async () => {
      const res = await loginUser(loginEmail);
      const decoded = jwt.verify(res.accessToken, env.JWT_SECRET) as any;
      expect(decoded.email).toBe(loginEmail);
      expect(decoded.userId).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('stores refresh token in Redis', async () => {
      const res = await loginUser(loginEmail);
      const stored = await redis.get(`refresh:${res.user.id}`);
      expect(stored).toBe(res.refreshToken);
    });
  });

  // ─── Token Refresh ───────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let userId: string;

    beforeAll(async () => {
      const reg = await registerUser(testEmail('refresh_user'));
      refreshToken = reg.refreshToken;
      userId = reg.user.id;
    });

    it('returns new access token with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();

      // Verify the new access token is valid
      const decoded = jwt.verify(res.body.accessToken, env.JWT_SECRET) as any;
      expect(decoded.userId).toBe(userId);
    });

    it('accepts refresh token from cookie', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `refreshToken=${refreshToken}`);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' });

      expect(res.status).toBe(401);
    });

    it('rejects expired refresh token', async () => {
      const expired = jwt.sign(
        { userId: 'fake', email: 'fake@test.com' },
        env.JWT_REFRESH_SECRET,
        { expiresIn: '0s' }
      );

      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expired });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Refresh token expired');
    });

    it('rejects when refresh token not in Redis (logged out)', async () => {
      const email = testEmail('refresh_redis');
      const reg = await registerUser(email);

      // Delete from Redis (simulating logout)
      await redis.del(`refresh:${reg.user.id}`);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: reg.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid refresh token');
    });

    it('rejects missing refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Refresh token required');
    });
  });

  // ─── Logout ──────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('logs out successfully and clears Redis token', async () => {
      const email = testEmail('logout_user');
      const reg = await registerUser(email);

      // Verify token is in Redis
      const before = await redis.get(`refresh:${reg.user.id}`);
      expect(before).toBeTruthy();

      // Logout
      const res = await request(app)
        .post('/api/auth/logout')
        .set(authHeader(reg.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');

      // Verify token removed from Redis
      const after = await redis.get(`refresh:${reg.user.id}`);
      expect(after).toBeNull();
    });

    it('rejects unauthenticated logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });

    it('rejects logout with expired access token', async () => {
      const expired = jwt.sign(
        { userId: 'fake', email: 'fake@test.com' },
        env.JWT_SECRET,
        { expiresIn: '0s' }
      );
      await new Promise((r) => setTimeout(r, 100));

      const res = await request(app)
        .post('/api/auth/logout')
        .set(authHeader(expired));

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token expired');
    });

    it('rejects logout with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set(authHeader('completely.bogus.token'));

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid token');
    });
  });

  // ─── Auth Middleware ─────────────────────────────────────

  describe('Auth Middleware (protected routes)', () => {
    it('allows access with valid token', async () => {
      const reg = await registerUser(testEmail('mw_ok'));

      const res = await request(app)
        .get('/api/profile')
        .set(authHeader(reg.accessToken));

      // Should not be 401 — could be 404 if no profile, but auth passes
      expect(res.status).not.toBe(401);
    });

    it('rejects requests without auth header', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('rejects malformed auth header', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set('Authorization', 'NotBearer something');

      expect(res.status).toBe(401);
    });
  });

  // ─── Health Check ────────────────────────────────────────

  describe('GET /api/health', () => {
    it('returns ok status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ─── 404 ─────────────────────────────────────────────────

  describe('Unknown routes', () => {
    it('returns 404 for undefined routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
    });
  });
});
