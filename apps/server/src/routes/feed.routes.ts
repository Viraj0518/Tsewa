import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as feedService from '../services/feed.service';

const router = Router();

router.use(authMiddleware);

// POST /api/feed — create post
router.post('/', async (req: Request, res: Response) => {
  try {
    const { content, type, imageUrl, linkUrl } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const post = await feedService.createPost(req.user!.id, {
      content: content.trim(),
      type,
      imageUrl,
      linkUrl,
    });

    res.status(201).json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create post';
    res.status(500).json({ error: message });
  }
});

// GET /api/feed — paginated feed
router.get('/', async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const feed = await feedService.getFeed(req.user!.id, cursor, limit);
    res.json(feed);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get feed';
    res.status(500).json({ error: message });
  }
});

// GET /api/feed/:id — get post with comments
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await feedService.getPost(req.params.id, req.user!.id);
    res.json(post);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get post';
    const status = message === 'Post not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/feed/:id — delete post
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await feedService.deletePost(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete post';
    let status = 500;
    if (message === 'Post not found') status = 404;
    if (message === 'Only the author can delete this post') status = 403;
    res.status(status).json({ error: message });
  }
});

// POST /api/feed/:id/like — toggle like
router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const result = await feedService.likePost(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle like';
    const status = message === 'Post not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// POST /api/feed/:id/comment — add comment
router.post('/:id/comment', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const comment = await feedService.commentOnPost(
      req.params.id,
      req.user!.id,
      content.trim()
    );

    res.status(201).json(comment);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add comment';
    const status = message === 'Post not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
