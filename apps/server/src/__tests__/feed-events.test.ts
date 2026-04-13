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

describe('Feed & Events E2E', () => {
  // Shared state across tests
  let userA: { user: { id: string }; accessToken: string };
  let userB: { user: { id: string }; accessToken: string };

  beforeAll(async () => {
    await cleanupTestUsers();
    userA = await registerUser(testEmail('feed_userA'));
    userB = await registerUser(testEmail('feed_userB'));
    expect(userA.status).toBe(201);
    expect(userB.status).toBe(201);
  });

  afterAll(async () => {
    await cleanupTestUsers();
  });

  // ─── Feed Posts ──────────────────────────────────────────

  describe('POST /api/feed', () => {
    it('creates a text post', async () => {
      const res = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: 'Hello from test', type: 'TEXT' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.content).toBe('Hello from test');
      expect(res.body.type).toBe('TEXT');
      expect(res.body.authorId).toBe(userA.user.id);
      expect(res.body.likeCount).toBe(0);
      expect(res.body.commentCount).toBe(0);
      expect(res.body.isLiked).toBe(false);
      expect(res.body.createdAt).toBeDefined();
    });

    it('creates a photo post with imageUrl', async () => {
      const res = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({
          content: 'Check this out',
          type: 'PHOTO',
          imageUrl: 'https://example.com/photo.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('PHOTO');
      expect(res.body.imageUrl).toBe('https://example.com/photo.jpg');
      expect(res.body.content).toBe('Check this out');
    });

    it('rejects post with empty content', async () => {
      const res = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: '', type: 'TEXT' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content is required');
    });

    it('rejects post with missing content', async () => {
      const res = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ type: 'TEXT' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Content is required');
    });
  });

  // ─── Feed Retrieval ─────────────────────────────────────

  describe('GET /api/feed', () => {
    it('returns paginated feed', async () => {
      const res = await request(app)
        .get('/api/feed')
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBeGreaterThan(0);
      // Posts should be in reverse chronological order
      if (res.body.posts.length >= 2) {
        const first = new Date(res.body.posts[0].createdAt).getTime();
        const second = new Date(res.body.posts[1].createdAt).getTime();
        expect(first).toBeGreaterThanOrEqual(second);
      }
    });

    it('supports cursor-based pagination', async () => {
      // Create enough posts to paginate
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/feed')
          .set(authHeader(userA.accessToken))
          .send({ content: `Pagination post ${i}`, type: 'TEXT' });
      }

      // Fetch first page with small limit
      const page1 = await request(app)
        .get('/api/feed?limit=2')
        .set(authHeader(userA.accessToken));

      expect(page1.status).toBe(200);
      expect(page1.body.posts.length).toBe(2);
      expect(page1.body.nextCursor).toBeDefined();

      // Fetch second page using cursor
      const page2 = await request(app)
        .get(`/api/feed?limit=2&cursor=${page1.body.nextCursor}`)
        .set(authHeader(userA.accessToken));

      expect(page2.status).toBe(200);
      expect(page2.body.posts.length).toBeGreaterThan(0);
      // No overlap between pages
      const page1Ids = page1.body.posts.map((p: { id: string }) => p.id);
      const page2Ids = page2.body.posts.map((p: { id: string }) => p.id);
      for (const id of page2Ids) {
        expect(page1Ids).not.toContain(id);
      }
    });
  });

  describe('GET /api/feed/:id', () => {
    it('returns a single post with comments', async () => {
      // Create a post
      const create = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: 'Post for detail view', type: 'TEXT' });

      const postId = create.body.id;

      const res = await request(app)
        .get(`/api/feed/${postId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(postId);
      expect(res.body.content).toBe('Post for detail view');
      expect(res.body.comments).toBeDefined();
      expect(Array.isArray(res.body.comments)).toBe(true);
    });

    it('returns 404 for non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/feed/${fakeId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post not found');
    });
  });

  // ─── Delete Post ────────────────────────────────────────

  describe('DELETE /api/feed/:id', () => {
    it('deletes own post', async () => {
      const create = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: 'Post to delete', type: 'TEXT' });

      const postId = create.body.id;

      const res = await request(app)
        .delete(`/api/feed/${postId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const check = await request(app)
        .get(`/api/feed/${postId}`)
        .set(authHeader(userA.accessToken));

      expect(check.status).toBe(404);
    });

    it('cannot delete another user\'s post', async () => {
      const create = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: 'Protected post', type: 'TEXT' });

      const postId = create.body.id;

      const res = await request(app)
        .delete(`/api/feed/${postId}`)
        .set(authHeader(userB.accessToken));

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only the author can delete this post');
    });

    it('returns 404 when deleting non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/feed/${fakeId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post not found');
    });
  });

  // ─── Likes ──────────────────────────────────────────────

  describe('POST /api/feed/:id/like', () => {
    let likePostId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: 'Post to like', type: 'TEXT' });
      likePostId = create.body.id;
    });

    it('likes a post (toggle on)', async () => {
      const res = await request(app)
        .post(`/api/feed/${likePostId}/like`)
        .set(authHeader(userB.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(true);

      // Verify like count increased
      const post = await request(app)
        .get(`/api/feed/${likePostId}`)
        .set(authHeader(userB.accessToken));

      expect(post.body.likeCount).toBe(1);
      expect(post.body.isLiked).toBe(true);
    });

    it('unlikes a post (toggle off)', async () => {
      // Already liked from previous test
      const res = await request(app)
        .post(`/api/feed/${likePostId}/like`)
        .set(authHeader(userB.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.liked).toBe(false);

      // Verify like count decreased
      const post = await request(app)
        .get(`/api/feed/${likePostId}`)
        .set(authHeader(userB.accessToken));

      expect(post.body.likeCount).toBe(0);
      expect(post.body.isLiked).toBe(false);
    });

    it('returns 404 when liking non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/feed/${fakeId}/like`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post not found');
    });
  });

  // ─── Comments ───────────────────────────────────────────

  describe('POST /api/feed/:id/comment', () => {
    let commentPostId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/api/feed')
        .set(authHeader(userA.accessToken))
        .send({ content: 'Post to comment on', type: 'TEXT' });
      commentPostId = create.body.id;
    });

    it('adds a comment to a post', async () => {
      const res = await request(app)
        .post(`/api/feed/${commentPostId}/comment`)
        .set(authHeader(userB.accessToken))
        .send({ content: 'Great post!' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.content).toBe('Great post!');
      expect(res.body.authorId).toBe(userB.user.id);
      expect(res.body.createdAt).toBeDefined();

      // Verify comment shows up on the post
      const post = await request(app)
        .get(`/api/feed/${commentPostId}`)
        .set(authHeader(userA.accessToken));

      expect(post.body.commentCount).toBe(1);
      expect(post.body.comments).toHaveLength(1);
      expect(post.body.comments[0].content).toBe('Great post!');
    });

    it('rejects comment with empty content', async () => {
      const res = await request(app)
        .post(`/api/feed/${commentPostId}/comment`)
        .set(authHeader(userB.accessToken))
        .send({ content: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Comment content is required');
    });

    it('rejects comment with missing content', async () => {
      const res = await request(app)
        .post(`/api/feed/${commentPostId}/comment`)
        .set(authHeader(userB.accessToken))
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Comment content is required');
    });

    it('returns 404 when commenting on non-existent post', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/feed/${fakeId}/comment`)
        .set(authHeader(userA.accessToken))
        .send({ content: 'Comment on nothing' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Post not found');
    });
  });

  // ─── Events ─────────────────────────────────────────────

  describe('POST /api/events', () => {
    it('creates an event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Losar Celebration',
          description: 'Annual Tibetan New Year celebration',
          type: 'LOSAR',
          city: 'Seattle',
          country: 'US',
          startDate: '2026-06-01T10:00:00Z',
          endDate: '2026-06-01T18:00:00Z',
          maxAttendees: 50,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Losar Celebration');
      expect(res.body.description).toBe('Annual Tibetan New Year celebration');
      expect(res.body.type).toBe('LOSAR');
      expect(res.body.city).toBe('Seattle');
      expect(res.body.country).toBe('US');
      expect(res.body.creatorId).toBe(userA.user.id);
      expect(res.body.maxAttendees).toBe(50);
      expect(res.body.rsvpCount).toBe(0);
      expect(res.body.isOnline).toBe(false);
      expect(res.body.createdAt).toBeDefined();
    });

    it('creates an online event', async () => {
      const res = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Online Teaching',
          description: 'Virtual dharma session',
          type: 'TEACHING',
          startDate: '2026-07-01T15:00:00Z',
          isOnline: true,
          link: 'https://zoom.us/j/123456',
        });

      expect(res.status).toBe(201);
      expect(res.body.isOnline).toBe(true);
      expect(res.body.link).toBe('https://zoom.us/j/123456');
    });

    it('rejects event without title', async () => {
      const res = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          description: 'Missing title',
          type: 'SOCIAL',
          startDate: '2026-06-15T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Title is required');
    });

    it('rejects event without description', async () => {
      const res = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'No Description Event',
          type: 'SOCIAL',
          startDate: '2026-06-15T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Description is required');
    });

    it('rejects event without type', async () => {
      const res = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'No Type Event',
          description: 'Missing type',
          startDate: '2026-06-15T10:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Event type is required');
    });

    it('rejects event without startDate', async () => {
      const res = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'No Date Event',
          description: 'Missing start date',
          type: 'SOCIAL',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Start date is required');
    });
  });

  // ─── Event Listing & Filters ────────────────────────────

  describe('GET /api/events', () => {
    beforeAll(async () => {
      // Create events for filter tests
      await request(app)
        .post('/api/events')
        .set(authHeader(userB.accessToken))
        .send({
          title: 'Community Meetup Portland',
          description: 'Monthly gathering',
          type: 'COMMUNITY',
          city: 'Portland',
          country: 'US',
          startDate: '2026-08-01T10:00:00Z',
        });

      await request(app)
        .post('/api/events')
        .set(authHeader(userB.accessToken))
        .send({
          title: 'Social Night Portland',
          description: 'Dinner and drinks',
          type: 'SOCIAL',
          city: 'Portland',
          country: 'US',
          startDate: '2026-08-15T18:00:00Z',
        });
    });

    it('lists all events', async () => {
      const res = await request(app)
        .get('/api/events')
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.events).toBeDefined();
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThan(0);
    });

    it('filters events by type', async () => {
      const res = await request(app)
        .get('/api/events?type=COMMUNITY')
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      for (const event of res.body.events) {
        expect(event.type).toBe('COMMUNITY');
      }
    });

    it('filters events by city', async () => {
      const res = await request(app)
        .get('/api/events?city=Portland')
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.events.length).toBeGreaterThanOrEqual(2);
      for (const event of res.body.events) {
        expect(event.city).toBe('Portland');
      }
    });

    it('filters events by both type and city', async () => {
      const res = await request(app)
        .get('/api/events?type=SOCIAL&city=Portland')
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      for (const event of res.body.events) {
        expect(event.type).toBe('SOCIAL');
        expect(event.city).toBe('Portland');
      }
    });
  });

  // ─── Event Detail ───────────────────────────────────────

  describe('GET /api/events/:id', () => {
    it('returns event details with hasRsvped flag', async () => {
      const create = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Detail Test Event',
          description: 'For detail test',
          type: 'CULTURAL',
          city: 'Seattle',
          country: 'US',
          startDate: '2026-09-01T10:00:00Z',
        });

      const eventId = create.body.id;

      const res = await request(app)
        .get(`/api/events/${eventId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(eventId);
      expect(res.body.title).toBe('Detail Test Event');
      expect(res.body.hasRsvped).toBe(false);
      expect(res.body.rsvpCount).toBe(0);
      expect(res.body.creatorId).toBe(userA.user.id);
    });

    it('returns 404 for non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/events/${fakeId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Event not found');
    });
  });

  // ─── Update Event ───────────────────────────────────────

  describe('PUT /api/events/:id', () => {
    let updateEventId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Event To Update',
          description: 'Original description',
          type: 'SOCIAL',
          city: 'Seattle',
          country: 'US',
          startDate: '2026-10-01T10:00:00Z',
        });
      updateEventId = create.body.id;
    });

    it('updates own event', async () => {
      const res = await request(app)
        .put(`/api/events/${updateEventId}`)
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Updated Title',
          description: 'Updated description',
          city: 'Portland',
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Updated Title');
      expect(res.body.description).toBe('Updated description');
      expect(res.body.city).toBe('Portland');
      // type should remain unchanged
      expect(res.body.type).toBe('SOCIAL');
    });

    it('cannot update another user\'s event', async () => {
      const res = await request(app)
        .put(`/api/events/${updateEventId}`)
        .set(authHeader(userB.accessToken))
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only the creator can update this event');
    });

    it('returns 404 when updating non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .put(`/api/events/${fakeId}`)
        .set(authHeader(userA.accessToken))
        .send({ title: 'Ghost Event' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Event not found');
    });
  });

  // ─── Delete Event ───────────────────────────────────────

  describe('DELETE /api/events/:id', () => {
    it('deletes own event', async () => {
      const create = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Event To Delete',
          description: 'Will be removed',
          type: 'OTHER',
          startDate: '2026-11-01T10:00:00Z',
        });

      const eventId = create.body.id;

      const res = await request(app)
        .delete(`/api/events/${eventId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify it's gone
      const check = await request(app)
        .get(`/api/events/${eventId}`)
        .set(authHeader(userA.accessToken));

      expect(check.status).toBe(404);
    });

    it('cannot delete another user\'s event', async () => {
      const create = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'Protected Event',
          description: 'Cannot be deleted by others',
          type: 'COMMUNITY',
          startDate: '2026-12-01T10:00:00Z',
        });

      const eventId = create.body.id;

      const res = await request(app)
        .delete(`/api/events/${eventId}`)
        .set(authHeader(userB.accessToken));

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Only the creator can delete this event');
    });

    it('returns 404 when deleting non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/events/${fakeId}`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Event not found');
    });
  });

  // ─── RSVP ──────────────────────────────────────────────

  describe('POST /api/events/:id/rsvp', () => {
    let rsvpEventId: string;

    beforeAll(async () => {
      const create = await request(app)
        .post('/api/events')
        .set(authHeader(userA.accessToken))
        .send({
          title: 'RSVP Test Event',
          description: 'Testing RSVP toggle',
          type: 'SOCIAL',
          city: 'Seattle',
          country: 'US',
          startDate: '2026-12-15T10:00:00Z',
          maxAttendees: 2,
        });
      rsvpEventId = create.body.id;
    });

    it('RSVPs to an event (toggle on)', async () => {
      const res = await request(app)
        .post(`/api/events/${rsvpEventId}/rsvp`)
        .set(authHeader(userB.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.rsvped).toBe(true);

      // Verify RSVP reflected in event details
      const event = await request(app)
        .get(`/api/events/${rsvpEventId}`)
        .set(authHeader(userB.accessToken));

      expect(event.body.rsvpCount).toBe(1);
      expect(event.body.hasRsvped).toBe(true);
    });

    it('un-RSVPs from an event (toggle off)', async () => {
      // Already RSVP'd from previous test
      const res = await request(app)
        .post(`/api/events/${rsvpEventId}/rsvp`)
        .set(authHeader(userB.accessToken));

      expect(res.status).toBe(200);
      expect(res.body.rsvped).toBe(false);

      // Verify RSVP removed
      const event = await request(app)
        .get(`/api/events/${rsvpEventId}`)
        .set(authHeader(userB.accessToken));

      expect(event.body.rsvpCount).toBe(0);
      expect(event.body.hasRsvped).toBe(false);
    });

    it('rejects RSVP when event is full', async () => {
      // RSVP both users to fill the 2-slot event
      await request(app)
        .post(`/api/events/${rsvpEventId}/rsvp`)
        .set(authHeader(userA.accessToken));
      await request(app)
        .post(`/api/events/${rsvpEventId}/rsvp`)
        .set(authHeader(userB.accessToken));

      // Register a third user and try to RSVP
      const userC = await registerUser(testEmail('feed_userC'));
      const res = await request(app)
        .post(`/api/events/${rsvpEventId}/rsvp`)
        .set(authHeader(userC.accessToken));

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Event is full');
    });

    it('returns 404 when RSVPing to non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/events/${fakeId}/rsvp`)
        .set(authHeader(userA.accessToken));

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Event not found');
    });
  });

  // ─── Unauthenticated Access ─────────────────────────────

  describe('Unauthenticated access rejection', () => {
    it('rejects GET /api/feed without auth', async () => {
      const res = await request(app).get('/api/feed');
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/feed without auth', async () => {
      const res = await request(app)
        .post('/api/feed')
        .send({ content: 'No auth', type: 'TEXT' });
      expect(res.status).toBe(401);
    });

    it('rejects GET /api/events without auth', async () => {
      const res = await request(app).get('/api/events');
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/events without auth', async () => {
      const res = await request(app)
        .post('/api/events')
        .send({ title: 'No auth', description: 'Test', type: 'SOCIAL', startDate: '2026-06-01T10:00:00Z' });
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/feed/:id/like without auth', async () => {
      const res = await request(app).post('/api/feed/some-id/like');
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/feed/:id/comment without auth', async () => {
      const res = await request(app)
        .post('/api/feed/some-id/comment')
        .send({ content: 'Nope' });
      expect(res.status).toBe(401);
    });

    it('rejects POST /api/events/:id/rsvp without auth', async () => {
      const res = await request(app).post('/api/events/some-id/rsvp');
      expect(res.status).toBe(401);
    });

    it('rejects DELETE /api/feed/:id without auth', async () => {
      const res = await request(app).delete('/api/feed/some-id');
      expect(res.status).toBe(401);
    });

    it('rejects PUT /api/events/:id without auth', async () => {
      const res = await request(app)
        .put('/api/events/some-id')
        .send({ title: 'Nope' });
      expect(res.status).toBe(401);
    });

    it('rejects DELETE /api/events/:id without auth', async () => {
      const res = await request(app).delete('/api/events/some-id');
      expect(res.status).toBe(401);
    });
  });
});
