import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as matchService from '../services/match.service';

const router = Router();

router.use(authMiddleware);

// GET /api/matches
router.get('/', async (req: Request, res: Response) => {
  try {
    const matches = await matchService.getMatches(req.user!.id);
    res.json({ matches, count: matches.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get matches';
    res.status(500).json({ error: message });
  }
});

// DELETE /api/matches/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await matchService.unmatch(req.user!.id, req.params.id as string);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to unmatch';
    let status = 500;
    if (message === 'Match not found') status = 404;
    if (message === 'Not your match') status = 403;
    res.status(status).json({ error: message });
  }
});

export default router;
