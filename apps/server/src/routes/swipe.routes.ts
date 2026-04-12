import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import * as swipeService from '../services/swipe.service';

const router = Router();

router.use(authMiddleware);

const swipeSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  action: z.enum(['LIKE', 'PASS', 'SUPER_LIKE']),
});

// POST /api/swipe
router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = swipeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const result = await swipeService.swipe(
      req.user!.id,
      parsed.data.targetUserId,
      parsed.data.action
    );

    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Swipe failed';
    let status = 500;
    if (message === 'Cannot swipe on yourself') status = 400;
    if (message === 'User not found') status = 404;
    if (message === 'Already swiped on this user') status = 409;
    if (message === 'Cannot swipe on blocked user') status = 403;
    res.status(status).json({ error: message });
  }
});

export default router;
