import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import * as waitlistService from '../services/waitlist.service';

const router = Router();

const redeemSchema = z.object({
  code: z
    .string()
    .min(1, 'Invite code is required')
    .max(20, 'Invalid invite code'),
});

// GET /api/waitlist/status
router.get('/status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await waitlistService.getStatus(req.user!.id);

    if (!status) {
      res.status(404).json({ error: 'No waitlist entry found' });
      return;
    }

    res.json(status);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get waitlist status';
    res.status(500).json({ error: message });
  }
});

// POST /api/invite/redeem
router.post('/invite/redeem', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = redeemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const result = await waitlistService.redeemCode(req.user!.id, parsed.data.code);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to redeem invite code';
    const status =
      message === 'Invalid invite code' ? 404 :
      message === 'You are already approved' ? 409 :
      message.includes('no longer active') || message.includes('fully used') || message.includes('expired')
        ? 410
        : 400;
    res.status(status).json({ error: message });
  }
});

// POST /api/invite/generate
router.post('/invite/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const inviteCode = await waitlistService.generateCode(req.user!.id);
    res.status(201).json(inviteCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate invite code';
    const status = message.includes('maximum') ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
