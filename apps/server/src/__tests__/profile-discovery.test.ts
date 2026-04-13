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

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/** Minimal required profile fields for creation. */
function baseProfile(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Tenzin',
    birthDate: '2000-06-15T00:00:00.000Z',
    gender: 'male',
    region: 'KHAM',
    ...overrides,
  };
}

/**
 * Register a user with a valid invite code so isActive = true.
 * Discovery only returns active users, so every test user that
 * needs to appear in the deck must go through this path.
 */
async function registerActiveUser(suffix: string) {
  // We need an inviter to generate a valid invite code
  const inviter = await registerUser(testEmail(`inviter_${suffix}`));
  const invite = await createTestInvite(inviter.user.id);
  const result = await registerUser(testEmail(suffix), TEST_PASSWORD, invite.code);
  expect(result.status).toBe(201);
  expect(result.user.isActive).toBe(true);
  return result;
}

/**
 * Creates a tiny valid JPEG buffer (1x1 red pixel).
 * Good enough for Multer's image/jpeg filter.
 */
function tinyJpeg(): Buffer {
  // Minimal valid JPEG (1x1 red pixel, ~285 bytes)
  return Buffer.from(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP' +
      '//////////////////////////////////////////////////////////////////////////////////////' +
      '2wBDAf//////////////////////////////////////////////////////////////////////////////////////' +
      'wAARCAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAU' +
      'AQEAAAAAAAAAAAAAAAAAAAAB/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AKwB//9k=',
    'base64',
  );
}

// ────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────

describe('Profile & Discovery E2E', () => {
  beforeAll(async () => {
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  // ─── Unauthenticated Access ─────────────────────────────

  describe('Unauthenticated access rejection', () => {
    it('GET /api/profile — 401 without token', async () => {
      const res = await request(app).get('/api/profile');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Authentication required');
    });

    it('PUT /api/profile — 401 without token', async () => {
      const res = await request(app)
        .put('/api/profile')
        .send(baseProfile());
      expect(res.status).toBe(401);
    });

    it('POST /api/profile/photos — 401 without token', async () => {
      const res = await request(app)
        .post('/api/profile/photos')
        .attach('photo', tinyJpeg(), 'photo.jpg');
      expect(res.status).toBe(401);
    });

    it('DELETE /api/profile/photos/:id — 401 without token', async () => {
      const res = await request(app).delete('/api/profile/photos/fake-id');
      expect(res.status).toBe(401);
    });

    it('POST /api/profile/prompts — 401 without token', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .send({ question: 'test', answer: 'test' });
      expect(res.status).toBe(401);
    });

    it('PUT /api/profile/categories — 401 without token', async () => {
      const res = await request(app)
        .put('/api/profile/categories')
        .send({ categories: ['dating'] });
      expect(res.status).toBe(401);
    });

    it('GET /api/discovery/deck — 401 without token', async () => {
      const res = await request(app).get('/api/discovery/deck');
      expect(res.status).toBe(401);
    });

    it('GET /api/discovery/daily-picks — 401 without token', async () => {
      const res = await request(app).get('/api/discovery/daily-picks');
      expect(res.status).toBe(401);
    });
  });

  // ─── Profile CRUD ───────────────────────────────────────

  describe('Profile CRUD', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
      const reg = await registerActiveUser('profile_crud');
      token = reg.accessToken;
      userId = reg.user.id;
    });

    it('GET /api/profile — returns user without profile initially', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(userId);
      expect(res.body.profile).toBeNull();
      expect(res.body.photos).toEqual([]);
      expect(res.body.prompts).toEqual([]);
    });

    it('PUT /api/profile — creates profile with required fields', async () => {
      const data = baseProfile({
        bio: 'Love hiking in the mountains',
        hometown: 'Lhasa',
      });

      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send(data);

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe('Tenzin');
      expect(res.body.gender).toBe('male');
      expect(res.body.region).toBe('KHAM');
      expect(res.body.bio).toBe('Love hiking in the mountains');
      expect(res.body.hometown).toBe('Lhasa');
      expect(res.body.userId).toBe(userId);
    });

    it('GET /api/profile — returns profile after creation', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.profile).toBeTruthy();
      expect(res.body.profile.displayName).toBe('Tenzin');
      expect(res.body.profile.region).toBe('KHAM');
    });

    it('PUT /api/profile — updates individual fields', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ bio: 'Updated bio text' });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBe('Updated bio text');
      // Other fields should remain unchanged
      expect(res.body.displayName).toBe('Tenzin');
    });

    it('PUT /api/profile — updates dialect', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ dialect: 'KHAM' });

      expect(res.status).toBe(200);
      expect(res.body.dialect).toBe('KHAM');
    });

    it('PUT /api/profile — updates buddhaPractice', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ buddhaPractice: 'KAGYU' });

      expect(res.status).toBe(200);
      expect(res.body.buddhaPractice).toBe('KAGYU');
    });

    it('PUT /api/profile — updates lifestyle fields', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({
          diet: 'VEGETARIAN',
          smoking: false,
          drinking: true,
          familyViews: 'OPEN_TO_CHILDREN',
        });

      expect(res.status).toBe(200);
      expect(res.body.diet).toBe('VEGETARIAN');
      expect(res.body.smoking).toBe(false);
      expect(res.body.drinking).toBe(true);
      expect(res.body.familyViews).toBe('OPEN_TO_CHILDREN');
    });

    it('PUT /api/profile — updates location fields', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({
          currentCity: 'Seattle',
          currentCountry: 'US',
          latitude: 47.6062,
          longitude: -122.3321,
        });

      expect(res.status).toBe(200);
      expect(res.body.currentCity).toBe('Seattle');
      expect(res.body.currentCountry).toBe('US');
      expect(res.body.latitude).toBeCloseTo(47.6062);
      expect(res.body.longitude).toBeCloseTo(-122.3321);
    });

    it('PUT /api/profile — updates preference fields', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({
          lookingForGender: ['female'],
          ageMin: 22,
          ageMax: 35,
          maxDistance: 200,
          regionFilter: ['KHAM', 'AMDO'],
        });

      expect(res.status).toBe(200);
      expect(res.body.lookingForGender).toEqual(['female']);
      expect(res.body.ageMin).toBe(22);
      expect(res.body.ageMax).toBe(35);
      expect(res.body.maxDistance).toBe(200);
      expect(res.body.regionFilter).toEqual(expect.arrayContaining(['KHAM', 'AMDO']));
    });

    it('PUT /api/profile — updates languages array', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ languages: ['Tibetan', 'English', 'Mandarin'] });

      expect(res.status).toBe(200);
      expect(res.body.languages).toEqual(['Tibetan', 'English', 'Mandarin']);
    });

    it('PUT /api/profile — updates education and profession', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ education: 'Tibetan University', profession: 'Software Engineer' });

      expect(res.status).toBe(200);
      expect(res.body.education).toBe('Tibetan University');
      expect(res.body.profession).toBe('Software Engineer');
    });

    it('PUT /api/profile — rejects invalid region enum', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ region: 'INVALID_REGION' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('PUT /api/profile — rejects height out of range', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ height: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('PUT /api/profile — rejects bio over 500 chars', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ bio: 'x'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('PUT /api/profile — accepts nullable fields as null', async () => {
      const res = await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send({ bio: null, height: null, dialect: null });

      expect(res.status).toBe(200);
      expect(res.body.bio).toBeNull();
      expect(res.body.height).toBeNull();
      expect(res.body.dialect).toBeNull();
    });
  });

  // ─── Categories ─────────────────────────────────────────

  describe('PUT /api/profile/categories', () => {
    let token: string;

    beforeAll(async () => {
      const reg = await registerActiveUser('categories');
      token = reg.accessToken;
      // Create profile first (required for categories)
      await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send(baseProfile());
    });

    it('sets active categories', async () => {
      const res = await request(app)
        .put('/api/profile/categories')
        .set(authHeader(token))
        .send({ categories: ['dating', 'networking', 'community'] });

      expect(res.status).toBe(200);
      expect(res.body.activeCategories).toEqual(['dating', 'networking', 'community']);
    });

    it('replaces categories on subsequent update', async () => {
      const res = await request(app)
        .put('/api/profile/categories')
        .set(authHeader(token))
        .send({ categories: ['friendship'] });

      expect(res.status).toBe(200);
      expect(res.body.activeCategories).toEqual(['friendship']);
    });

    it('rejects missing categories field', async () => {
      const res = await request(app)
        .put('/api/profile/categories')
        .set(authHeader(token))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('rejects categories with empty string', async () => {
      const res = await request(app)
        .put('/api/profile/categories')
        .set(authHeader(token))
        .send({ categories: [''] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  // ─── Photos ─────────────────────────────────────────────

  describe('Photo upload and deletion', () => {
    let token: string;
    let userId: string;
    let firstPhotoId: string;

    beforeAll(async () => {
      const reg = await registerActiveUser('photos');
      token = reg.accessToken;
      userId = reg.user.id;
    });

    it('POST /api/profile/photos — uploads a photo', async () => {
      const res = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token))
        .attach('photo', tinyJpeg(), 'test.jpg');

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.url).toContain('/uploads/photos/');
      expect(res.body.position).toBe(0);
      expect(res.body.isMain).toBe(true); // First photo is always main
      expect(res.body.userId).toBe(userId);

      firstPhotoId = res.body.id;
    });

    it('POST /api/profile/photos — second photo is not main by default', async () => {
      const res = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token))
        .attach('photo', tinyJpeg(), 'test2.jpg');

      expect(res.status).toBe(201);
      expect(res.body.position).toBe(1);
      expect(res.body.isMain).toBe(false);
    });

    it('POST /api/profile/photos — sets isMain when requested', async () => {
      const res = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token))
        .field('isMain', 'true')
        .attach('photo', tinyJpeg(), 'main.jpg');

      expect(res.status).toBe(201);
      expect(res.body.isMain).toBe(true);

      // Verify previous main photo was unset
      const prevMain = await prisma.photo.findUnique({ where: { id: firstPhotoId } });
      expect(prevMain!.isMain).toBe(false);
    });

    it('GET /api/profile — includes photos ordered by position', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.photos.length).toBe(3);
      // Verify position ordering
      for (let i = 0; i < res.body.photos.length - 1; i++) {
        expect(res.body.photos[i].position).toBeLessThanOrEqual(res.body.photos[i + 1].position);
      }
    });

    it('POST /api/profile/photos — rejects without file', async () => {
      const res = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No photo file provided');
    });

    it('POST /api/profile/photos — enforces max 6 photos', async () => {
      // Already have 3 photos; upload 3 more to reach the limit
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/profile/photos')
          .set(authHeader(token))
          .attach('photo', tinyJpeg(), `fill_${i}.jpg`);
        expect(res.status).toBe(201);
      }

      // Verify we have 6 photos
      const profileRes = await request(app)
        .get('/api/profile')
        .set(authHeader(token));
      expect(profileRes.body.photos.length).toBe(6);

      // 7th should fail
      const res = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token))
        .attach('photo', tinyJpeg(), 'overflow.jpg');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Maximum 6 photos allowed');
    });

    it('DELETE /api/profile/photos/:id — deletes a photo', async () => {
      const res = await request(app)
        .delete(`/api/profile/photos/${firstPhotoId}`)
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      // Verify photo gone from DB
      const deleted = await prisma.photo.findUnique({ where: { id: firstPhotoId } });
      expect(deleted).toBeNull();
    });

    it('DELETE /api/profile/photos/:id — re-orders remaining photos', async () => {
      const photos = await prisma.photo.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      });

      // Positions should be consecutive: 0,1,2,...
      photos.forEach((p, i) => {
        expect(p.position).toBe(i);
      });
    });

    it('DELETE /api/profile/photos/:id — 404 for non-existent photo', async () => {
      const res = await request(app)
        .delete('/api/profile/photos/nonexistent-id')
        .set(authHeader(token));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Photo not found');
    });

    it('DELETE /api/profile/photos/:id — cannot delete another user\'s photo', async () => {
      // Register another user and upload a photo
      const other = await registerActiveUser('photos_other');
      const uploadRes = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(other.accessToken))
        .attach('photo', tinyJpeg(), 'other.jpg');
      expect(uploadRes.status).toBe(201);

      // Try to delete it with the first user's token
      const res = await request(app)
        .delete(`/api/profile/photos/${uploadRes.body.id}`)
        .set(authHeader(token));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Photo not found');
    });
  });

  // ─── Conversation Prompts ───────────────────────────────

  describe('Conversation Prompts', () => {
    let token: string;
    let promptIds: string[] = [];

    beforeAll(async () => {
      const reg = await registerActiveUser('prompts');
      token = reg.accessToken;
    });

    it('POST /api/profile/prompts — creates a prompt', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: 'Favorite Tibetan dish?', answer: 'Momos, always momos.' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.question).toBe('Favorite Tibetan dish?');
      expect(res.body.answer).toBe('Momos, always momos.');
      expect(res.body.position).toBe(0);

      promptIds.push(res.body.id);
    });

    it('POST /api/profile/prompts — second prompt gets position 1', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: 'Dream travel destination?', answer: 'Mount Kailash pilgrimage' });

      expect(res.status).toBe(201);
      expect(res.body.position).toBe(1);

      promptIds.push(res.body.id);
    });

    it('GET /api/profile — includes prompts ordered by position', async () => {
      const res = await request(app)
        .get('/api/profile')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.prompts.length).toBe(2);
      expect(res.body.prompts[0].position).toBe(0);
      expect(res.body.prompts[1].position).toBe(1);
    });

    it('POST /api/profile/prompts — enforces max 5 prompts', async () => {
      // Add 3 more to reach 5
      for (let i = 0; i < 3; i++) {
        const res = await request(app)
          .post('/api/profile/prompts')
          .set(authHeader(token))
          .send({ question: `Question ${i + 3}?`, answer: `Answer ${i + 3}` });
        expect(res.status).toBe(201);
        promptIds.push(res.body.id);
      }

      // 6th should fail
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: 'One too many?', answer: 'Should fail' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Maximum 5 conversation prompts allowed');
    });

    it('POST /api/profile/prompts — rejects missing question', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ answer: 'No question here' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('POST /api/profile/prompts — rejects missing answer', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: 'No answer here?' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('POST /api/profile/prompts — rejects empty question', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: '', answer: 'Something' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('POST /api/profile/prompts — rejects question over 200 chars', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: 'Q'.repeat(201), answer: 'Something' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('POST /api/profile/prompts — rejects answer over 500 chars', async () => {
      const res = await request(app)
        .post('/api/profile/prompts')
        .set(authHeader(token))
        .send({ question: 'Valid question?', answer: 'A'.repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  // ─── Discovery Deck ─────────────────────────────────────

  describe('Discovery Deck', () => {
    let userAToken: string;
    let userAId: string;
    let userBId: string;

    beforeAll(async () => {
      // User A: the one browsing the deck
      const regA = await registerActiveUser('disc_a');
      userAToken = regA.accessToken;
      userAId = regA.user.id;

      // Create profile for user A (male, looking for female, KHAM region)
      await request(app)
        .put('/api/profile')
        .set(authHeader(userAToken))
        .send(
          baseProfile({
            displayName: 'User A',
            gender: 'male',
            region: 'KHAM',
            lookingForGender: ['female'],
            ageMin: 18,
            ageMax: 50,
            regionFilter: [],
            activeCategories: ['dating'],
          }),
        );

      // User B: female in KHAM (should appear in A's deck)
      const regB = await registerActiveUser('disc_b');
      userBId = regB.user.id;
      await request(app)
        .put('/api/profile')
        .set(authHeader(regB.accessToken))
        .send(
          baseProfile({
            displayName: 'User B',
            gender: 'female',
            region: 'KHAM',
            birthDate: '1998-01-01T00:00:00.000Z',
            activeCategories: ['dating'],
          }),
        );

      // User C: male in KHAM (should NOT appear — A is looking for female)
      const regC = await registerActiveUser('disc_c');
      await request(app)
        .put('/api/profile')
        .set(authHeader(regC.accessToken))
        .send(
          baseProfile({
            displayName: 'User C',
            gender: 'male',
            region: 'KHAM',
            birthDate: '1995-03-15T00:00:00.000Z',
          }),
        );

      // User D: female in AMDO (should appear when no region filter set)
      const regD = await registerActiveUser('disc_d');
      await request(app)
        .put('/api/profile')
        .set(authHeader(regD.accessToken))
        .send(
          baseProfile({
            displayName: 'User D',
            gender: 'female',
            region: 'AMDO',
            birthDate: '1999-07-20T00:00:00.000Z',
            activeCategories: ['networking'],
          }),
        );
    });

    it('GET /api/discovery/deck — returns profiles matching preferences', async () => {
      const res = await request(app)
        .get('/api/discovery/deck')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      expect(res.body.profiles).toBeDefined();
      expect(Array.isArray(res.body.profiles)).toBe(true);
      expect(res.body.count).toBe(res.body.profiles.length);

      // Should only contain females (A is looking for female)
      for (const p of res.body.profiles) {
        expect(p.gender).toBe('female');
      }

      // Should not contain user A's own profile
      const selfInDeck = res.body.profiles.find((p: any) => p.userId === userAId);
      expect(selfInDeck).toBeUndefined();
    });

    it('GET /api/discovery/deck — respects limit parameter', async () => {
      const res = await request(app)
        .get('/api/discovery/deck?limit=1')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      expect(res.body.profiles.length).toBeLessThanOrEqual(1);
    });

    it('GET /api/discovery/deck — rejects limit below 1', async () => {
      const res = await request(app)
        .get('/api/discovery/deck?limit=0')
        .set(authHeader(userAToken));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Limit must be between 1 and 100');
    });

    it('GET /api/discovery/deck — rejects limit above 100', async () => {
      const res = await request(app)
        .get('/api/discovery/deck?limit=101')
        .set(authHeader(userAToken));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Limit must be between 1 and 100');
    });

    it('GET /api/discovery/deck — filters by category', async () => {
      const res = await request(app)
        .get('/api/discovery/deck?category=dating')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      // Only profiles with 'dating' category should appear
      for (const p of res.body.profiles) {
        expect(p.activeCategories).toContain('dating');
      }
    });

    it('GET /api/discovery/deck — category filter excludes non-matching', async () => {
      const res = await request(app)
        .get('/api/discovery/deck?category=networking')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      // User B has 'dating' only, User D has 'networking'
      for (const p of res.body.profiles) {
        expect(p.activeCategories).toContain('networking');
      }
    });

    it('GET /api/discovery/deck — profile includes expected fields', async () => {
      const res = await request(app)
        .get('/api/discovery/deck?limit=10')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      if (res.body.profiles.length > 0) {
        const profile = res.body.profiles[0];
        expect(profile).toHaveProperty('userId');
        expect(profile).toHaveProperty('displayName');
        expect(profile).toHaveProperty('birthDate');
        expect(profile).toHaveProperty('gender');
        expect(profile).toHaveProperty('region');
        expect(profile).toHaveProperty('photos');
        expect(profile).toHaveProperty('prompts');
      }
    });

    it('GET /api/discovery/deck — excludes already-swiped users', async () => {
      // Swipe on user B
      await prisma.swipe.create({
        data: {
          swiperId: userAId,
          swipedId: userBId,
          action: 'LIKE',
        },
      });

      const res = await request(app)
        .get('/api/discovery/deck')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      const swipedInDeck = res.body.profiles.find((p: any) => p.userId === userBId);
      expect(swipedInDeck).toBeUndefined();
    });

    it('GET /api/discovery/deck — requires profile to browse', async () => {
      // Register user without profile
      const noProfile = await registerActiveUser('disc_noprofile');

      const res = await request(app)
        .get('/api/discovery/deck')
        .set(authHeader(noProfile.accessToken));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Profile required to browse');
    });

    it('GET /api/discovery/deck — region filter narrows results', async () => {
      // Update user A to filter by KHAM only
      await request(app)
        .put('/api/profile')
        .set(authHeader(userAToken))
        .send({ regionFilter: ['KHAM'] });

      const res = await request(app)
        .get('/api/discovery/deck')
        .set(authHeader(userAToken));

      expect(res.status).toBe(200);
      for (const p of res.body.profiles) {
        expect(p.region).toBe('KHAM');
      }

      // Reset region filter for other tests
      await request(app)
        .put('/api/profile')
        .set(authHeader(userAToken))
        .send({ regionFilter: [] });
    });
  });

  // ─── Daily Picks ────────────────────────────────────────

  describe('Discovery Daily Picks', () => {
    let token: string;

    beforeAll(async () => {
      const reg = await registerActiveUser('daily');
      token = reg.accessToken;

      // Create profile for this user
      await request(app)
        .put('/api/profile')
        .set(authHeader(token))
        .send(
          baseProfile({
            displayName: 'Daily User',
            gender: 'male',
            region: 'AMDO',
          }),
        );
    });

    it('GET /api/discovery/daily-picks — returns picks array', async () => {
      const res = await request(app)
        .get('/api/discovery/daily-picks')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.picks).toBeDefined();
      expect(Array.isArray(res.body.picks)).toBe(true);
      expect(res.body.count).toBe(res.body.picks.length);
    });

    it('GET /api/discovery/daily-picks — returns same picks on second call (idempotent)', async () => {
      const first = await request(app)
        .get('/api/discovery/daily-picks')
        .set(authHeader(token));

      const second = await request(app)
        .get('/api/discovery/daily-picks')
        .set(authHeader(token));

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.count).toBe(second.body.count);

      // Same pick IDs in both responses
      const firstIds = first.body.picks.map((p: any) => p.pickId).sort();
      const secondIds = second.body.picks.map((p: any) => p.pickId).sort();
      expect(firstIds).toEqual(secondIds);
    });

    it('GET /api/discovery/daily-picks — requires profile', async () => {
      const noProfile = await registerActiveUser('daily_noprofile');

      const res = await request(app)
        .get('/api/discovery/daily-picks')
        .set(authHeader(noProfile.accessToken));

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Profile required for daily picks');
    });

    it('GET /api/discovery/daily-picks — each pick has expected structure', async () => {
      const res = await request(app)
        .get('/api/discovery/daily-picks')
        .set(authHeader(token));

      expect(res.status).toBe(200);
      for (const pick of res.body.picks) {
        expect(pick).toHaveProperty('pickId');
        expect(pick).toHaveProperty('userId');
        expect(pick).toHaveProperty('profile');
        expect(pick).toHaveProperty('photos');
        expect(pick).toHaveProperty('prompts');
      }
    });
  });

  // ─── Photo: main photo promotion on delete ──────────────

  describe('Photo main promotion on delete', () => {
    let token: string;

    beforeAll(async () => {
      const reg = await registerActiveUser('main_promo');
      token = reg.accessToken;
    });

    it('promotes next photo to main when main photo is deleted', async () => {
      // Upload two photos
      const first = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token))
        .attach('photo', tinyJpeg(), 'first.jpg');
      expect(first.body.isMain).toBe(true);

      const second = await request(app)
        .post('/api/profile/photos')
        .set(authHeader(token))
        .attach('photo', tinyJpeg(), 'second.jpg');
      expect(second.body.isMain).toBe(false);

      // Delete the main photo
      await request(app)
        .delete(`/api/profile/photos/${first.body.id}`)
        .set(authHeader(token));

      // Second photo should now be main
      const promoted = await prisma.photo.findUnique({ where: { id: second.body.id } });
      expect(promoted!.isMain).toBe(true);
      expect(promoted!.position).toBe(0);
    });
  });

  // ─── Categories without profile ─────────────────────────

  describe('Categories without profile', () => {
    it('PUT /api/profile/categories — fails when no profile exists', async () => {
      const reg = await registerActiveUser('no_profile_cats');

      const res = await request(app)
        .put('/api/profile/categories')
        .set(authHeader(reg.accessToken))
        .send({ categories: ['dating'] });

      expect(res.status).toBe(500);
      expect(res.body.error).toContain('Profile not found');
    });
  });
});
