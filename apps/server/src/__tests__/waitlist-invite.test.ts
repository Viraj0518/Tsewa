import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../config/prisma';
import {
  registerUser,
  testEmail,
  authHeader,
  cleanupTestUsers,
  createTestInvite,
  TEST_PASSWORD,
} from './helpers';

// Short invite code for redeem tests (must be <= 20 chars to pass route validation)
async function createShortInvite(
  inviterId: string,
  opts: { maxUses?: number; expiresAt?: Date; isActive?: boolean } = {},
) {
  const code = `TST${Date.now().toString(36).toUpperCase()}`;
  return prisma.inviteCode.create({
    data: {
      code,
      inviterId,
      maxUses: opts.maxUses ?? 5,
      usedCount: 0,
      isActive: opts.isActive ?? true,
      expiresAt: opts.expiresAt ?? null,
    },
  });
}

describe('Waitlist & Invite E2E', () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  // ─── 1. New user has PENDING waitlist status ─────────────

  describe('New user waitlist status', () => {
    it('new user without invite code has PENDING status and isActive=false', async () => {
      const email = testEmail('wl_pending');
      const reg = await registerUser(email);
      expect(reg.status).toBe(201);
      expect(reg.user.isActive).toBe(false);

      const entry = await prisma.waitlistEntry.findUnique({
        where: { userId: reg.user.id },
      });
      expect(entry).toBeTruthy();
      expect(entry!.status).toBe('PENDING');
      expect(entry!.approvedAt).toBeNull();
    });
  });

  // ─── 2. User with valid invite has APPROVED status ───────

  describe('Registration with valid invite', () => {
    it('user who registers with a valid invite code is APPROVED and active', async () => {
      const inviter = await registerUser(testEmail('wl_inviter'));
      const invite = await createTestInvite(inviter.user.id);

      const email = testEmail('wl_invited');
      const reg = await registerUser(email, TEST_PASSWORD, invite.code);
      expect(reg.status).toBe(201);
      expect(reg.user.isActive).toBe(true);

      const entry = await prisma.waitlistEntry.findUnique({
        where: { userId: reg.user.id },
      });
      expect(entry!.status).toBe('APPROVED');
      expect(entry!.approvedAt).toBeTruthy();
    });
  });

  // ─── 3. GET /api/waitlist/status ─────────────────────────

  describe('GET /api/waitlist/status', () => {
    it('returns PENDING status with position for a new user', async () => {
      const reg = await registerUser(testEmail('wl_status_pending'));

      const res = await request(app)
        .get('/api/waitlist/status')
        .set(authHeader(reg.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.userId).toBe(reg.user.id);
      expect(typeof res.body.position).toBe('number');
      expect(res.body.position).toBeGreaterThanOrEqual(1);
      expect(res.body.approvedAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
    });

    it('returns APPROVED status with no position for an invited user', async () => {
      const inviter = await registerUser(testEmail('wl_status_inviter'));
      const invite = await createTestInvite(inviter.user.id);

      const invitee = await registerUser(testEmail('wl_status_approved'), TEST_PASSWORD, invite.code);

      const res = await request(app)
        .get('/api/waitlist/status')
        .set(authHeader(invitee.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('APPROVED');
      expect(res.body.position).toBeNull();
      expect(res.body.approvedAt).toBeTruthy();
    });
  });

  // ─── 4. POST /api/invite/redeem — valid code ─────────────

  describe('POST /api/invite/redeem', () => {
    it('redeems a valid invite code — activates user, updates waitlist to APPROVED', async () => {
      // Register inviter and create a short invite
      const inviter = await registerUser(testEmail('wl_redeem_inviter'));
      const invite = await createShortInvite(inviter.user.id);

      // Register a pending user
      const pending = await registerUser(testEmail('wl_redeem_user'));
      expect(pending.user.isActive).toBe(false);

      // Redeem the invite code
      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(pending.accessToken))
        .send({ code: invite.code });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Invite code redeemed successfully');

      // Verify user is now active
      const dbUser = await prisma.user.findUnique({ where: { id: pending.user.id } });
      expect(dbUser!.isActive).toBe(true);

      // Verify waitlist entry updated to APPROVED
      const entry = await prisma.waitlistEntry.findUnique({ where: { userId: pending.user.id } });
      expect(entry!.status).toBe('APPROVED');
      expect(entry!.approvedAt).toBeTruthy();
      expect(entry!.inviteCode).toBe(invite.code.toUpperCase());
      expect(entry!.referredBy).toBe(inviter.user.id);

      // Verify invite usedCount incremented
      const updatedInvite = await prisma.inviteCode.findUnique({ where: { id: invite.id } });
      expect(updatedInvite!.usedCount).toBe(1);
    });

    // ─── 5. Redeem invalid/expired invite code — fails ──────

    it('rejects an invalid invite code', async () => {
      const user = await registerUser(testEmail('wl_redeem_invalid'));

      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: 'DOESNTEXIST' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Invalid invite code');
    });

    it('rejects an expired invite code', async () => {
      const inviter = await registerUser(testEmail('wl_redeem_exp_inv'));
      const invite = await createShortInvite(inviter.user.id, {
        expiresAt: new Date('2020-01-01'),
      });

      const user = await registerUser(testEmail('wl_redeem_expired'));

      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: invite.code });

      expect(res.status).toBe(410);
      expect(res.body.error).toBe('This invite code has expired');
    });

    it('rejects a deactivated invite code', async () => {
      const inviter = await registerUser(testEmail('wl_redeem_deact_inv'));
      const invite = await createShortInvite(inviter.user.id, { isActive: false });

      const user = await registerUser(testEmail('wl_redeem_deact'));

      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: invite.code });

      expect(res.status).toBe(410);
      expect(res.body.error).toBe('This invite code is no longer active');
    });

    // ─── 6. Redeem already-used invite code (maxed out) ─────

    it('rejects a maxed-out invite code', async () => {
      const inviter = await registerUser(testEmail('wl_redeem_max_inv'));
      const invite = await createShortInvite(inviter.user.id, { maxUses: 1 });

      // Use it once via a pending user redeeming
      const firstUser = await registerUser(testEmail('wl_redeem_max1'));
      await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(firstUser.accessToken))
        .send({ code: invite.code });

      // Second user tries to redeem same code
      const secondUser = await registerUser(testEmail('wl_redeem_max2'));
      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(secondUser.accessToken))
        .send({ code: invite.code });

      expect(res.status).toBe(410);
      expect(res.body.error).toBe('This invite code has been fully used');
    });

    it('rejects redeeming when already approved', async () => {
      const inviter = await registerUser(testEmail('wl_redeem_dup_inv'));
      const invite1 = await createShortInvite(inviter.user.id);
      const invite2 = await createShortInvite(inviter.user.id);

      const user = await registerUser(testEmail('wl_redeem_dup'));

      // Redeem first code
      await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: invite1.code });

      // Try to redeem second code — already approved
      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: invite2.code });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('You are already approved');
    });

    it('rejects redeeming your own invite code', async () => {
      const user = await registerUser(testEmail('wl_redeem_self'));
      const invite = await createShortInvite(user.user.id);

      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: invite.code });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('You cannot use your own invite code');
    });

    it('rejects empty code in body', async () => {
      const user = await registerUser(testEmail('wl_redeem_empty'));

      const res = await request(app)
        .post('/api/invite/redeem')
        .set(authHeader(user.accessToken))
        .send({ code: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  // ─── 7. POST /api/invite/generate ────────────────────────

  describe('POST /api/invite/generate', () => {
    it('generates an invite code for the user', async () => {
      const user = await registerUser(testEmail('wl_gen'));

      const res = await request(app)
        .post('/api/invite/generate')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(201);
      expect(res.body.code).toBeDefined();
      expect(typeof res.body.code).toBe('string');
      expect(res.body.code.length).toBe(6);
      expect(res.body.inviterId).toBe(user.user.id);

      // Verify it exists in DB
      const dbCode = await prisma.inviteCode.findUnique({ where: { code: res.body.code } });
      expect(dbCode).toBeTruthy();
      expect(dbCode!.inviterId).toBe(user.user.id);
    });

    // ─── 9. Generated invite code has correct defaults ──────

    it('generated invite code has correct defaults (maxUses=3, isActive=true, no expiry)', async () => {
      const user = await registerUser(testEmail('wl_gen_defaults'));

      const res = await request(app)
        .post('/api/invite/generate')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(201);
      expect(res.body.maxUses).toBe(3);
      expect(res.body.usedCount).toBe(0);
      expect(res.body.isActive).toBe(true);
      expect(res.body.expiresAt).toBeNull();
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.id).toBeDefined();
    });

    // ─── 8. Generate invite code limit (max 5) ──────────────

    it('enforces maximum invite code limit — 6th generation fails', async () => {
      const user = await registerUser(testEmail('wl_gen_limit'));

      // Generate 5 codes (the server limit)
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/invite/generate')
          .set(authHeader(user.accessToken));
        expect(res.status).toBe(201);
      }

      // 6th should fail
      const res = await request(app)
        .post('/api/invite/generate')
        .set(authHeader(user.accessToken));

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('maximum');
    });
  });

  // ─── 10. Another user can register with a generated code ─

  describe('Cross-user invite flow', () => {
    it('user A generates a code, user B registers with it and gets approved', async () => {
      // User A registers and generates an invite code
      const userA = await registerUser(testEmail('wl_cross_a'));
      const genRes = await request(app)
        .post('/api/invite/generate')
        .set(authHeader(userA.accessToken));
      expect(genRes.status).toBe(201);

      const generatedCode = genRes.body.code;

      // User B registers with the generated code
      const emailB = testEmail('wl_cross_b');
      const userB = await registerUser(emailB, TEST_PASSWORD, generatedCode);

      expect(userB.status).toBe(201);
      expect(userB.user.isActive).toBe(true);

      // Verify user B's waitlist entry
      const entry = await prisma.waitlistEntry.findUnique({ where: { userId: userB.user.id } });
      expect(entry!.status).toBe('APPROVED');
      expect(entry!.approvedAt).toBeTruthy();

      // Verify the generated code's usedCount incremented
      const updatedCode = await prisma.inviteCode.findUnique({ where: { code: generatedCode } });
      expect(updatedCode!.usedCount).toBe(1);
    });

    it('generated code respects maxUses=3 across multiple registrations', async () => {
      const inviter = await registerUser(testEmail('wl_cross_multi'));
      const genRes = await request(app)
        .post('/api/invite/generate')
        .set(authHeader(inviter.accessToken));
      const code = genRes.body.code;

      // Register 3 users with the same code (maxUses=3)
      for (let i = 0; i < 3; i++) {
        const reg = await registerUser(testEmail(`wl_cross_m${i}`), TEST_PASSWORD, code);
        expect(reg.status).toBe(201);
        expect(reg.user.isActive).toBe(true);
      }

      // 4th registration with same code — user should be created but stay pending
      const reg4 = await registerUser(testEmail('wl_cross_m3'), TEST_PASSWORD, code);
      expect(reg4.status).toBe(201);
      expect(reg4.user.isActive).toBe(false);

      const entry = await prisma.waitlistEntry.findUnique({ where: { userId: reg4.user.id } });
      expect(entry!.status).toBe('PENDING');
    });
  });

  // ─── 11. Unauthenticated access rejection ────────────────

  describe('Unauthenticated access', () => {
    it('GET /api/waitlist/status rejects without auth', async () => {
      const res = await request(app).get('/api/waitlist/status');
      expect(res.status).toBe(401);
    });

    it('POST /api/invite/redeem rejects without auth', async () => {
      const res = await request(app)
        .post('/api/invite/redeem')
        .send({ code: 'ABCDEF' });
      expect(res.status).toBe(401);
    });

    it('POST /api/invite/generate rejects without auth', async () => {
      const res = await request(app).post('/api/invite/generate');
      expect(res.status).toBe(401);
    });

    it('rejects with an invalid bearer token', async () => {
      const res = await request(app)
        .get('/api/waitlist/status')
        .set(authHeader('totally.bogus.token'));
      expect(res.status).toBe(401);
    });
  });
});
