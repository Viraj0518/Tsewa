import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as discoveryService from '../services/discovery.service';

const router = Router();

router.use(authMiddleware);

// GET /api/discovery/deck?category=&limit=
router.get('/deck', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    if (limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Limit must be between 1 and 100' });
      return;
    }

    const deck = await discoveryService.getDeck(req.user!.id, category, limit);
    res.json({ profiles: deck, count: deck.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get deck';
    const status = message === 'Profile required to browse' ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

// GET /api/discovery/daily-picks
router.get('/daily-picks', async (req: Request, res: Response) => {
  try {
    const picks = await discoveryService.getDailyPicks(req.user!.id);
    res.json({ picks, count: picks.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get daily picks';
    const status = message === 'Profile required for daily picks' ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
