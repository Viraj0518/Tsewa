import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';
import {
  registerUser,
  testEmail,
  authHeader,
  cleanupTestUsers,
  TEST_PASSWORD,
} from './helpers';

/*
 * E2E tests for Room routes (/api/rooms).
 *
 * Users:
 *   hostUser  — creates rooms, exercises host-only actions
 *   userA     — joins rooms, acts as participant
 *   userB     — secondary participant for edge cases
 */

let hostToken: string;
let hostUserId: string;

let userAToken: string;
let userAUserId: string;

let userBToken: string;
let userBUserId: string;

// Shared room IDs created during tests
let openRoomId: string;
let scheduledRoomId: string;

beforeAll(async () => {
  await cleanupTestUsers();

  const [host, a, b] = await Promise.all([
    registerUser(testEmail('rooms_host')),
    registerUser(testEmail('rooms_a')),
    registerUser(testEmail('rooms_b')),
  ]);

  expect(host.status).toBe(201);
  expect(a.status).toBe(201);
  expect(b.status).toBe(201);

  hostToken = host.accessToken;
  hostUserId = host.user.id;

  userAToken = a.accessToken;
  userAUserId = a.user.id;

  userBToken = b.accessToken;
  userBUserId = b.user.id;
});

afterAll(async () => {
  await cleanupTestUsers();
});

// ────────────────────────────────────────────
// 17. Unauthenticated access rejection
// ────────────────────────────────────────────

describe('Unauthenticated access', () => {
  it('rejects requests without a token', async () => {
    const endpoints = [
      () => request(app).get('/api/rooms'),
      () => request(app).get('/api/rooms/channels'),
      () => request(app).get('/api/rooms/scheduled'),
      () => request(app).post('/api/rooms').send({ title: 'x', type: 'OPEN' }),
    ];

    const results = await Promise.all(endpoints.map((fn) => fn()));

    for (const res of results) {
      expect(res.status).toBe(401);
    }
  });
});

// ────────────────────────────────────────────
// 1. Create OPEN room
// ────────────────────────────────────────────

describe('Create room', () => {
  it('creates an OPEN room', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set(authHeader(hostToken))
      .send({ title: 'Open Room Test', type: 'OPEN' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Open Room Test',
      type: 'OPEN',
      status: 'LIVE',
      hostId: hostUserId,
      isWatchParty: false,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.participantCount).toBe(1);

    openRoomId = res.body.id;
  });

  // ────────────────────────────────────────
  // 2. Create SCHEDULED room
  // ────────────────────────────────────────

  it('creates a SCHEDULED room', async () => {
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const res = await request(app)
      .post('/api/rooms')
      .set(authHeader(hostToken))
      .send({
        title: 'Scheduled Room Test',
        type: 'SCHEDULED',
        scheduledAt,
        description: 'A future event',
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Scheduled Room Test',
      type: 'SCHEDULED',
      status: 'WAITING',
      hostId: hostUserId,
    });
    expect(res.body.scheduledAt).toBeDefined();

    scheduledRoomId = res.body.id;
  });

  it('rejects room creation without a title', async () => {
    const res = await request(app)
      .post('/api/rooms')
      .set(authHeader(hostToken))
      .send({ type: 'OPEN' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

// ────────────────────────────────────────────
// 3. List rooms (with status filter)
// ────────────────────────────────────────────

describe('List rooms', () => {
  it('lists all rooms', async () => {
    const res = await request(app)
      .get('/api/rooms')
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rooms)).toBe(true);
    // Should contain at least the two rooms we created
    const ids = res.body.rooms.map((r: { id: string }) => r.id);
    expect(ids).toContain(openRoomId);
    expect(ids).toContain(scheduledRoomId);
  });

  it('filters rooms by status=LIVE', async () => {
    const res = await request(app)
      .get('/api/rooms?status=LIVE')
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    const ids = res.body.rooms.map((r: { id: string }) => r.id);
    expect(ids).toContain(openRoomId);
    expect(ids).not.toContain(scheduledRoomId);
  });

  it('filters rooms by type=SCHEDULED', async () => {
    const res = await request(app)
      .get('/api/rooms?type=SCHEDULED')
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    for (const room of res.body.rooms) {
      expect(room.type).toBe('SCHEDULED');
    }
  });
});

// ────────────────────────────────────────────
// 4. Get room details
// ────────────────────────────────────────────

describe('Get room details', () => {
  it('returns room with participants', async () => {
    const res = await request(app)
      .get(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(openRoomId);
    expect(res.body.title).toBe('Open Room Test');
    expect(Array.isArray(res.body.participants)).toBe(true);
    // Host should be a participant
    const hostParticipant = res.body.participants.find(
      (p: { userId: string }) => p.userId === hostUserId
    );
    expect(hostParticipant).toBeDefined();
    expect(hostParticipant.role).toBe('HOST');
  });

  it('returns 404 for non-existent room', async () => {
    const res = await request(app)
      .get('/api/rooms/00000000-0000-0000-0000-000000000000')
      .set(authHeader(hostToken));

    expect(res.status).toBe(404);
  });
});

// ────────────────────────────────────────────
// 5. Join room
// ────────────────────────────────────────────

describe('Join room', () => {
  it('joins user as LISTENER', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/join`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(200);
    // Response is the full room detail from getRoom
    const participant = res.body.participants.find(
      (p: { userId: string }) => p.userId === userAUserId
    );
    expect(participant).toBeDefined();
    expect(participant.role).toBe('LISTENER');
  });

  it('second user can also join', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/join`)
      .set(authHeader(userBToken));

    expect(res.status).toBe(200);
    const participant = res.body.participants.find(
      (p: { userId: string }) => p.userId === userBUserId
    );
    expect(participant).toBeDefined();
    expect(participant.role).toBe('LISTENER');
  });
});

// ────────────────────────────────────────────
// 9. Raise hand
// ────────────────────────────────────────────

describe('Raise hand', () => {
  it('toggles handRaised on', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/raise-hand`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(200);
    expect(res.body.handRaised).toBe(true);
  });

  it('toggles handRaised off', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/raise-hand`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(200);
    expect(res.body.handRaised).toBe(false);
  });
});

// ────────────────────────────────────────────
// 10. Host invites speaker
// ────────────────────────────────────────────

describe('Host speaker management', () => {
  it('host invites a listener to become SPEAKER', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/invite-speaker`)
      .set(authHeader(hostToken))
      .send({ userId: userAUserId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the participant role changed
    const roomRes = await request(app)
      .get(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    const participant = roomRes.body.participants.find(
      (p: { userId: string }) => p.userId === userAUserId
    );
    expect(participant.role).toBe('SPEAKER');
  });

  // ────────────────────────────────────────
  // 11. Host mutes speaker
  // ────────────────────────────────────────

  it('host mutes a speaker', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/mute-speaker`)
      .set(authHeader(hostToken))
      .send({ userId: userAUserId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify isMuted
    const roomRes = await request(app)
      .get(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    const participant = roomRes.body.participants.find(
      (p: { userId: string }) => p.userId === userAUserId
    );
    expect(participant.isMuted).toBe(true);
  });

  // ────────────────────────────────────────
  // 12. Host removes speaker (back to LISTENER)
  // ────────────────────────────────────────

  it('host removes speaker (demotes to LISTENER)', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/remove-speaker`)
      .set(authHeader(hostToken))
      .send({ userId: userAUserId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify role reverted
    const roomRes = await request(app)
      .get(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    const participant = roomRes.body.participants.find(
      (p: { userId: string }) => p.userId === userAUserId
    );
    expect(participant.role).toBe('LISTENER');
  });

  it('non-host cannot invite speaker', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/invite-speaker`)
      .set(authHeader(userAToken))
      .send({ userId: userBUserId });

    expect(res.status).toBe(403);
  });

  it('non-host cannot mute speaker', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/mute-speaker`)
      .set(authHeader(userAToken))
      .send({ userId: userBUserId });

    expect(res.status).toBe(403);
  });

  it('non-host cannot remove speaker', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/remove-speaker`)
      .set(authHeader(userAToken))
      .send({ userId: userBUserId });

    expect(res.status).toBe(403);
  });
});

// ────────────────────────────────────────────
// 13 & 14. Room messages
// ────────────────────────────────────────────

describe('Room messages', () => {
  it('participant sends a message', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/messages`)
      .set(authHeader(userAToken))
      .send({ content: 'Hello from userA' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      roomId: openRoomId,
      userId: userAUserId,
      content: 'Hello from userA',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it('host sends a message', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/messages`)
      .set(authHeader(hostToken))
      .send({ content: 'Hello from host' });

    expect(res.status).toBe(201);
    expect(res.body.content).toBe('Hello from host');
  });

  it('retrieves room messages', async () => {
    const res = await request(app)
      .get(`/api/rooms/${openRoomId}/messages`)
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.messages)).toBe(true);
    expect(res.body.messages.length).toBeGreaterThanOrEqual(2);

    // Messages should be in chronological order (oldest first)
    const contents = res.body.messages.map((m: { content: string }) => m.content);
    expect(contents).toContain('Hello from userA');
    expect(contents).toContain('Hello from host');
  });

  it('respects limit parameter', async () => {
    const res = await request(app)
      .get(`/api/rooms/${openRoomId}/messages?limit=1`)
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(res.body.messages.length).toBe(1);
  });

  it('rejects empty content', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/messages`)
      .set(authHeader(hostToken))
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  it('non-participant cannot send a message', async () => {
    // Create a fresh user not in the room
    const outsider = await registerUser(testEmail('rooms_outsider'));
    expect(outsider.status).toBe(201);

    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/messages`)
      .set(authHeader(outsider.accessToken))
      .send({ content: 'should fail' });

    expect(res.status).toBe(403);
  });
});

// ────────────────────────────────────────────
// 6. Leave room
// ────────────────────────────────────────────

describe('Leave room', () => {
  it('user leaves the room', async () => {
    const res = await request(app)
      .post(`/api/rooms/${openRoomId}/leave`)
      .set(authHeader(userBToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify participant is gone
    const roomRes = await request(app)
      .get(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    const participant = roomRes.body.participants.find(
      (p: { userId: string }) => p.userId === userBUserId
    );
    expect(participant).toBeUndefined();
  });
});

// ────────────────────────────────────────────
// 8. Non-host cannot end room
// ────────────────────────────────────────────

describe('End room', () => {
  it('non-host cannot end the room', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${openRoomId}`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/host/i);
  });

  // ────────────────────────────────────────
  // 7. Host ends room
  // ────────────────────────────────────────

  it('host ends the room', async () => {
    const res = await request(app)
      .delete(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Room status should be ENDED
    const roomRes = await request(app)
      .get(`/api/rooms/${openRoomId}`)
      .set(authHeader(hostToken));

    expect(roomRes.status).toBe(200);
    expect(roomRes.body.status).toBe('ENDED');
  });
});

// ────────────────────────────────────────────
// 15. RSVP for scheduled room
// ────────────────────────────────────────────

describe('RSVP for scheduled room', () => {
  it('user RSVPs for a scheduled room', async () => {
    const res = await request(app)
      .post(`/api/rooms/${scheduledRoomId}/rsvp`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(200);
    expect(res.body.rsvped).toBe(true);
  });

  it('toggling RSVP removes it', async () => {
    const res = await request(app)
      .post(`/api/rooms/${scheduledRoomId}/rsvp`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(200);
    expect(res.body.rsvped).toBe(false);
  });

  it('rejects RSVP for a non-scheduled (LIVE) room', async () => {
    // Create a LIVE room to test against
    const liveRes = await request(app)
      .post('/api/rooms')
      .set(authHeader(hostToken))
      .send({ title: 'Live RSVP Test', type: 'OPEN' });

    const liveRoomId = liveRes.body.id;

    const res = await request(app)
      .post(`/api/rooms/${liveRoomId}/rsvp`)
      .set(authHeader(userAToken));

    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────
// 16. Get topic channels
// ────────────────────────────────────────────

describe('Topic channels', () => {
  it('returns channels list', async () => {
    const res = await request(app)
      .get('/api/rooms/channels')
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('channels');
    expect(Array.isArray(res.body.channels)).toBe(true);
  });
});

// ────────────────────────────────────────────
// Scheduled rooms endpoint
// ────────────────────────────────────────────

describe('Scheduled rooms list', () => {
  it('returns scheduled rooms', async () => {
    const res = await request(app)
      .get('/api/rooms/scheduled')
      .set(authHeader(hostToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.rooms)).toBe(true);
  });
});
