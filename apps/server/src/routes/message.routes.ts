import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { voiceUpload } from '../middleware/upload.middleware';
import * as messageService from '../services/message.service';

const router = Router();

router.use(authMiddleware);

// GET /api/messages/:matchId
router.get('/:matchId', async (req: Request, res: Response) => {
  try {
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    if (limit < 1 || limit > 100) {
      res.status(400).json({ error: 'Limit must be between 1 and 100' });
      return;
    }

    const result = await messageService.getMessages(
      req.params.matchId as string,
      req.user!.id,
      cursor,
      limit
    );
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get messages';
    let status = 500;
    if (message === 'Match not found') status = 404;
    if (message === 'Not authorized to view these messages') status = 403;
    res.status(status).json({ error: message });
  }
});

// POST /api/messages/:matchId/upload
router.post('/:matchId/upload', voiceUpload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const url = `/uploads/voice/${req.file.filename}`;
    const type = req.body.type === 'IMAGE' ? 'IMAGE' : 'VOICE';

    const result = await messageService.createMessage(
      req.params.matchId as string,
      req.user!.id,
      type,
      url,
      { originalName: req.file.originalname, size: req.file.size, mimetype: req.file.mimetype }
    );

    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to upload file';
    let status = 500;
    if (message === 'Match not found or inactive') status = 404;
    if (message === 'Not authorized to send messages in this match') status = 403;
    res.status(status).json({ error: message });
  }
});

export default router;
