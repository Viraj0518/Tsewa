import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as eventService from '../services/event.service';

const router = Router();

router.use(authMiddleware);

// POST /api/events — create event
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, type, startDate, ...rest } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    if (!description || typeof description !== 'string') {
      res.status(400).json({ error: 'Description is required' });
      return;
    }
    if (!type) {
      res.status(400).json({ error: 'Event type is required' });
      return;
    }
    if (!startDate) {
      res.status(400).json({ error: 'Start date is required' });
      return;
    }

    const event = await eventService.createEvent(req.user!.id, {
      title: title.trim(),
      description: description.trim(),
      type,
      startDate,
      ...rest,
    });

    res.status(201).json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create event';
    res.status(500).json({ error: message });
  }
});

// GET /api/events — list events
router.get('/', async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const city = req.query.city as string | undefined;

    const events = await eventService.getEvents({
      type: type as 'LOSAR' | 'TEACHING' | 'COMMUNITY' | 'SOCIAL' | 'CULTURAL' | 'OTHER' | undefined,
      city,
    });

    res.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get events';
    res.status(500).json({ error: message });
  }
});

// GET /api/events/:id — get event
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEvent(req.params.id, req.user!.id);
    res.json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get event';
    const status = message === 'Event not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// PUT /api/events/:id — update event
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.user!.id, req.body);
    res.json(event);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update event';
    let status = 500;
    if (message === 'Event not found') status = 404;
    if (message === 'Only the creator can update this event') status = 403;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/events/:id — delete event
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await eventService.deleteEvent(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete event';
    let status = 500;
    if (message === 'Event not found') status = 404;
    if (message === 'Only the creator can delete this event') status = 403;
    res.status(status).json({ error: message });
  }
});

// POST /api/events/:id/rsvp — toggle RSVP
router.post('/:id/rsvp', async (req: Request, res: Response) => {
  try {
    const result = await eventService.rsvpEvent(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to RSVP';
    let status = 500;
    if (message === 'Event not found') status = 404;
    if (message === 'Event is full') status = 409;
    res.status(status).json({ error: message });
  }
});

export default router;
