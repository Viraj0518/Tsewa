import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import { prisma } from '../config/prisma';
import {
  registerUser,
  testEmail,
  authHeader,
  cleanupTestUsers,
  TEST_PASSWORD,
} from './helpers';

describe('Swipe & Matching E2E', () => {
  // Shared test users
  let userA: { id: string; token: string };
  let userB: { id: string; token: string };
  let userC: { id: string; token: string };

  beforeAll(async () => {
    await cleanupTestUsers();

    const [regA, regB, regC] = await Promise.all([
      registerUser(testEmail('swipe_a')),
      registerUser(testEmail('swipe_b')),
      registerUser(testEmail('swipe_c')),
    ]);

    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);
    expect(regC.status).toBe(201);

    userA = { id: regA.user.id, token: regA.accessToken };
    userB = { id: regB.user.id, token: regB.accessToken };
    userC = { id: regC.user.id, token: regC.accessToken };
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  // ─── Swiping ────────────────────────────────────────────

  describe('POST /api/swipe', () => {
    it('creates a LIKE swipe on another user', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: userC.id, action: 'LIKE' });

      expect(res.status).toBe(200);
      expect(res.body.matched).toBe(false);

      // Verify swipe in DB
      const swipe = await prisma.swipe.findUnique({
        where: { swiperId_swipedId: { swiperId: userA.id, swipedId: userC.id } },
      });
      expect(swipe).toBeTruthy();
      expect(swipe!.action).toBe('LIKE');
    });

    it('creates a PASS swipe on another user', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userB.token))
        .send({ targetUserId: userC.id, action: 'PASS' });

      expect(res.status).toBe(200);
      expect(res.body.matched).toBe(false);

      const swipe = await prisma.swipe.findUnique({
        where: { swiperId_swipedId: { swiperId: userB.id, swipedId: userC.id } },
      });
      expect(swipe).toBeTruthy();
      expect(swipe!.action).toBe('PASS');
    });

    it('creates a SUPER_LIKE swipe on another user', async () => {
      // Need a fresh pair for this test
      const regD = await registerUser(testEmail('swipe_d'));
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: regD.user.id, action: 'SUPER_LIKE' });

      expect(res.status).toBe(200);

      const swipe = await prisma.swipe.findUnique({
        where: { swiperId_swipedId: { swiperId: userA.id, swipedId: regD.user.id } },
      });
      expect(swipe).toBeTruthy();
      expect(swipe!.action).toBe('SUPER_LIKE');
    });

    it('returns matched:false for a one-sided LIKE', async () => {
      // userA liked userC above, but userC has not liked userA
      // Verify no match exists
      const [idSmall, idBig] =
        userA.id < userC.id ? [userA.id, userC.id] : [userC.id, userA.id];

      const match = await prisma.match.findUnique({
        where: { userAId_userBId: { userAId: idSmall, userBId: idBig } },
      });
      expect(match).toBeNull();
    });

    it('cannot swipe on yourself', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: userA.id, action: 'LIKE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Cannot swipe on yourself');
    });

    it('cannot swipe on the same user twice (unique constraint)', async () => {
      // userA already swiped on userC
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: userC.id, action: 'LIKE' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Already swiped on this user');
    });

    it('returns 404 when swiping on a non-existent user', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: 'nonexistent-id-12345', action: 'LIKE' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('User not found');
    });

    it('rejects invalid action value', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: userB.id, action: 'LOVE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects missing targetUserId', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ action: 'LIKE' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects missing action', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: userB.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .send({ targetUserId: userB.id, action: 'LIKE' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Mutual Match ───────────────────────────────────────

  describe('Mutual LIKE creates a Match', () => {
    let matchId: string;

    it('user A likes user B — no match yet', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userA.token))
        .send({ targetUserId: userB.id, action: 'LIKE' });

      expect(res.status).toBe(200);
      expect(res.body.matched).toBe(false);
      expect(res.body.matchId).toBeUndefined();
    });

    it('user B likes user A — match created', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userB.token))
        .send({ targetUserId: userA.id, action: 'LIKE' });

      expect(res.status).toBe(200);
      expect(res.body.matched).toBe(true);
      expect(res.body.matchId).toBeDefined();

      matchId = res.body.matchId;

      // Verify match in DB
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      expect(match).toBeTruthy();
      expect(match!.isActive).toBe(true);
      // Match should have both users (ordering is alphabetical by ID)
      const ids = [match!.userAId, match!.userBId].sort();
      const expected = [userA.id, userB.id].sort();
      expect(ids).toEqual(expected);
    });

    it('match has a unique chatRoom string', async () => {
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      expect(match!.chatRoom).toBeDefined();
      expect(typeof match!.chatRoom).toBe('string');
      expect(match!.chatRoom.length).toBeGreaterThan(0);
    });
  });

  describe('SUPER_LIKE also creates a match when reciprocated', () => {
    it('user C super-likes user A, user A already liked user C — match created', async () => {
      // userA already liked userC earlier in the test suite
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(userC.token))
        .send({ targetUserId: userA.id, action: 'SUPER_LIKE' });

      expect(res.status).toBe(200);
      expect(res.body.matched).toBe(true);
      expect(res.body.matchId).toBeDefined();

      const match = await prisma.match.findUnique({ where: { id: res.body.matchId } });
      expect(match).toBeTruthy();
      expect(match!.isActive).toBe(true);
    });
  });

  // ─── Match Listing ──────────────────────────────────────

  describe('GET /api/matches', () => {
    it('lists matches for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/matches')
        .set(authHeader(userA.token));

      expect(res.status).toBe(200);
      expect(res.body.matches).toBeInstanceOf(Array);
      expect(res.body.count).toBeGreaterThanOrEqual(2); // A-B and A-C

      // Each match should have expected shape
      const match = res.body.matches[0];
      expect(match.matchId).toBeDefined();
      expect(match.chatRoom).toBeDefined();
      expect(match.otherUser).toBeDefined();
      expect(match.otherUser.id).toBeDefined();
      expect(match).toHaveProperty('latestMessage');
      expect(match).toHaveProperty('unreadCount');
    });

    it('user B sees only their matches', async () => {
      const res = await request(app)
        .get('/api/matches')
        .set(authHeader(userB.token));

      expect(res.status).toBe(200);
      // B has one match (with A)
      expect(res.body.count).toBeGreaterThanOrEqual(1);

      const matchIds = res.body.matches.map((m: any) => m.otherUser.id);
      expect(matchIds).toContain(userA.id);
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get('/api/matches');
      expect(res.status).toBe(401);
    });
  });

  // ─── Unmatch ────────────────────────────────────────────

  describe('DELETE /api/matches/:id', () => {
    let unmatchTargetId: string;

    beforeAll(async () => {
      // Create a fresh match between B and C for unmatch testing
      // First clean any existing swipe between C and B
      const regE = await registerUser(testEmail('swipe_e'));
      const regF = await registerUser(testEmail('swipe_f'));

      // E likes F
      await request(app)
        .post('/api/swipe')
        .set(authHeader(regE.accessToken))
        .send({ targetUserId: regF.user.id, action: 'LIKE' });

      // F likes E — match created
      const res = await request(app)
        .post('/api/swipe')
        .set(authHeader(regF.accessToken))
        .send({ targetUserId: regE.user.id, action: 'LIKE' });

      expect(res.body.matched).toBe(true);
      unmatchTargetId = res.body.matchId;
    });

    it('unmatches successfully and sets isActive to false', async () => {
      // Use userE (swipe_e) to unmatch
      const regE = await prisma.user.findFirst({
        where: { email: testEmail('swipe_e') },
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail('swipe_e'), password: TEST_PASSWORD });

      const res = await request(app)
        .delete(`/api/matches/${unmatchTargetId}`)
        .set(authHeader(loginRes.body.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.unmatched).toBe(true);

      // Verify in DB
      const match = await prisma.match.findUnique({ where: { id: unmatchTargetId } });
      expect(match!.isActive).toBe(false);
    });

    it('unmatched entries do not appear in GET /api/matches', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail('swipe_e'), password: TEST_PASSWORD });

      const res = await request(app)
        .get('/api/matches')
        .set(authHeader(loginRes.body.accessToken));

      expect(res.status).toBe(200);
      const matchIds = res.body.matches.map((m: any) => m.matchId);
      expect(matchIds).not.toContain(unmatchTargetId);
    });

    it('returns 404 for a non-existent match id', async () => {
      const res = await request(app)
        .delete('/api/matches/nonexistent-match-id')
        .set(authHeader(userA.token));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Match not found');
    });

    it('returns 403 when trying to unmatch someone else\'s match', async () => {
      // Get a match that belongs to A-B
      const matchesRes = await request(app)
        .get('/api/matches')
        .set(authHeader(userA.token));

      const abMatch = matchesRes.body.matches.find(
        (m: any) => m.otherUser.id === userB.id
      );
      expect(abMatch).toBeDefined();

      // userC tries to unmatch it
      const res = await request(app)
        .delete(`/api/matches/${abMatch.matchId}`)
        .set(authHeader(userC.token));

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not your match');
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).delete('/api/matches/some-id');
      expect(res.status).toBe(401);
    });
  });

  // ─── Messages ───────────────────────────────────────────

  describe('GET /api/messages/:matchId', () => {
    let abMatchId: string;

    beforeAll(async () => {
      // Get the A-B match ID
      const matchesRes = await request(app)
        .get('/api/matches')
        .set(authHeader(userA.token));

      const abMatch = matchesRes.body.matches.find(
        (m: any) => m.otherUser.id === userB.id
      );
      abMatchId = abMatch.matchId;
    });

    it('returns empty messages array for a new match', async () => {
      const res = await request(app)
        .get(`/api/messages/${abMatchId}`)
        .set(authHeader(userA.token));

      expect(res.status).toBe(200);
      expect(res.body.messages).toBeInstanceOf(Array);
      expect(res.body.messages.length).toBe(0);
      expect(res.body.hasMore).toBe(false);
      expect(res.body.nextCursor).toBeNull();
    });

    it('both matched users can access the same messages', async () => {
      const resA = await request(app)
        .get(`/api/messages/${abMatchId}`)
        .set(authHeader(userA.token));

      const resB = await request(app)
        .get(`/api/messages/${abMatchId}`)
        .set(authHeader(userB.token));

      expect(resA.status).toBe(200);
      expect(resB.status).toBe(200);
    });

    it('returns 403 when accessing messages for someone else\'s match', async () => {
      const res = await request(app)
        .get(`/api/messages/${abMatchId}`)
        .set(authHeader(userC.token));

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized to view these messages');
    });

    it('returns 404 for a non-existent matchId', async () => {
      const res = await request(app)
        .get('/api/messages/nonexistent-match-id')
        .set(authHeader(userA.token));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Match not found');
    });

    it('rejects unauthenticated request', async () => {
      const res = await request(app).get(`/api/messages/${abMatchId}`);
      expect(res.status).toBe(401);
    });

    it('rejects invalid limit parameter', async () => {
      const res = await request(app)
        .get(`/api/messages/${abMatchId}?limit=0`)
        .set(authHeader(userA.token));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Limit must be between 1 and 100');
    });

    it('rejects limit > 100', async () => {
      const res = await request(app)
        .get(`/api/messages/${abMatchId}?limit=101`)
        .set(authHeader(userA.token));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Limit must be between 1 and 100');
    });
  });

  // ─── Message Pagination ─────────────────────────────────

  describe('Message cursor pagination', () => {
    let paginationMatchId: string;
    let paginationUserToken: string;

    beforeAll(async () => {
      // Create two fresh users and match them
      const regG = await registerUser(testEmail('swipe_g'));
      const regH = await registerUser(testEmail('swipe_h'));

      await request(app)
        .post('/api/swipe')
        .set(authHeader(regG.accessToken))
        .send({ targetUserId: regH.user.id, action: 'LIKE' });

      const matchRes = await request(app)
        .post('/api/swipe')
        .set(authHeader(regH.accessToken))
        .send({ targetUserId: regG.user.id, action: 'LIKE' });

      paginationMatchId = matchRes.body.matchId;
      paginationUserToken = regG.accessToken;

      // Seed 5 messages directly in DB for pagination testing
      for (let i = 0; i < 5; i++) {
        await prisma.message.create({
          data: {
            matchId: paginationMatchId,
            senderId: regG.user.id,
            type: 'TEXT',
            content: `Pagination message ${i + 1}`,
          },
        });
        // Small delay to ensure distinct createdAt ordering
        await new Promise((r) => setTimeout(r, 20));
      }
    });

    it('returns all messages when limit exceeds count', async () => {
      const res = await request(app)
        .get(`/api/messages/${paginationMatchId}?limit=50`)
        .set(authHeader(paginationUserToken));

      expect(res.status).toBe(200);
      expect(res.body.messages.length).toBe(5);
      expect(res.body.hasMore).toBe(false);
      expect(res.body.nextCursor).toBeNull();
    });

    it('paginates correctly with a small limit', async () => {
      // First page: get 2 messages
      const page1 = await request(app)
        .get(`/api/messages/${paginationMatchId}?limit=2`)
        .set(authHeader(paginationUserToken));

      expect(page1.status).toBe(200);
      expect(page1.body.messages.length).toBe(2);
      expect(page1.body.hasMore).toBe(true);
      expect(page1.body.nextCursor).toBeDefined();

      // Messages are ordered desc, so first page has the newest
      expect(page1.body.messages[0].content).toBe('Pagination message 5');
      expect(page1.body.messages[1].content).toBe('Pagination message 4');

      // Second page
      const page2 = await request(app)
        .get(`/api/messages/${paginationMatchId}?limit=2&cursor=${page1.body.nextCursor}`)
        .set(authHeader(paginationUserToken));

      expect(page2.status).toBe(200);
      expect(page2.body.messages.length).toBe(2);
      expect(page2.body.hasMore).toBe(true);

      expect(page2.body.messages[0].content).toBe('Pagination message 3');
      expect(page2.body.messages[1].content).toBe('Pagination message 2');

      // Third page — only 1 left
      const page3 = await request(app)
        .get(`/api/messages/${paginationMatchId}?limit=2&cursor=${page2.body.nextCursor}`)
        .set(authHeader(paginationUserToken));

      expect(page3.status).toBe(200);
      expect(page3.body.messages.length).toBe(1);
      expect(page3.body.hasMore).toBe(false);
      expect(page3.body.nextCursor).toBeNull();
      expect(page3.body.messages[0].content).toBe('Pagination message 1');
    });

    it('returns messages with correct shape', async () => {
      const res = await request(app)
        .get(`/api/messages/${paginationMatchId}?limit=1`)
        .set(authHeader(paginationUserToken));

      expect(res.status).toBe(200);
      const msg = res.body.messages[0];
      expect(msg).toHaveProperty('id');
      expect(msg).toHaveProperty('matchId', paginationMatchId);
      expect(msg).toHaveProperty('senderId');
      expect(msg).toHaveProperty('senderName');
      expect(msg).toHaveProperty('type', 'TEXT');
      expect(msg).toHaveProperty('content');
      expect(msg).toHaveProperty('isRead');
      expect(msg).toHaveProperty('createdAt');
    });
  });

  // ─── Unauthenticated Access ─────────────────────────────

  describe('Unauthenticated access is rejected on all endpoints', () => {
    it('POST /api/swipe', async () => {
      const res = await request(app)
        .post('/api/swipe')
        .send({ targetUserId: 'x', action: 'LIKE' });
      expect(res.status).toBe(401);
    });

    it('GET /api/matches', async () => {
      const res = await request(app).get('/api/matches');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/matches/:id', async () => {
      const res = await request(app).delete('/api/matches/some-id');
      expect(res.status).toBe(401);
    });

    it('GET /api/messages/:matchId', async () => {
      const res = await request(app).get('/api/messages/some-id');
      expect(res.status).toBe(401);
    });

    it('POST /api/messages/:matchId/upload', async () => {
      const res = await request(app).post('/api/messages/some-id/upload');
      expect(res.status).toBe(401);
    });
  });
});
