import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import * as roomService from '../services/room.service';
import { getIO } from '../socket';
import { prisma } from '../config/prisma';

const router = Router();

router.use(authMiddleware);

// ========================
// Channels & Scheduled (before :id routes to avoid conflicts)
// ========================

// GET /api/rooms/channels
router.get('/channels', async (_req: Request, res: Response) => {
  try {
    const channels = await roomService.getChannels();
    res.json({ channels });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get channels';
    res.status(500).json({ error: message });
  }
});

// GET /api/rooms/scheduled
router.get('/scheduled', async (_req: Request, res: Response) => {
  try {
    const rooms = await roomService.getScheduledRooms();
    res.json({ rooms });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get scheduled rooms';
    res.status(500).json({ error: message });
  }
});

// ========================
// Room CRUD
// ========================

// POST /api/rooms — create room
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, type, topicTag, scheduledAt, isWatchParty, videoUrl } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const room = await roomService.createRoom(req.user!.id, {
      title: title.trim(),
      description,
      type,
      topicTag,
      scheduledAt,
      isWatchParty,
      videoUrl,
    });

    res.status(201).json(room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create room';
    res.status(500).json({ error: message });
  }
});

// GET /api/rooms — list rooms
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;

    const rooms = await roomService.getRooms({
      status: status as 'WAITING' | 'LIVE' | 'ENDED' | undefined,
      type: type as 'OPEN' | 'SCHEDULED' | 'TOPIC_CHANNEL' | 'EVENT_LINKED' | undefined,
    });

    res.json({ rooms });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get rooms';
    res.status(500).json({ error: message });
  }
});

// GET /api/rooms/:id — get room details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const room = await roomService.getRoom(req.params.id);
    res.json(room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get room';
    const status = message === 'Room not found' ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

// DELETE /api/rooms/:id — end room (host only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await roomService.endRoom(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to end room';
    let status = 500;
    if (message === 'Room not found') status = 404;
    if (message === 'Only the host can end the room') status = 403;
    res.status(status).json({ error: message });
  }
});

// ========================
// Join / Leave / Hand
// ========================

// POST /api/rooms/:id/join
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const room = await roomService.joinRoom(req.params.id, req.user!.id);
    res.json(room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join room';
    let status = 500;
    if (message === 'Room not found') status = 404;
    if (message === 'Room has ended') status = 410;
    res.status(status).json({ error: message });
  }
});

// POST /api/rooms/:id/leave
router.post('/:id/leave', async (req: Request, res: Response) => {
  try {
    const result = await roomService.leaveRoom(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to leave room';
    res.status(500).json({ error: message });
  }
});

// POST /api/rooms/:id/raise-hand
router.post('/:id/raise-hand', async (req: Request, res: Response) => {
  try {
    const result = await roomService.raiseHand(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to toggle hand';
    const status = message === 'Not a participant' ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

// ========================
// Host actions
// ========================

// POST /api/rooms/:id/invite-speaker
router.post('/:id/invite-speaker', async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await roomService.inviteSpeaker(req.params.id, req.user!.id, targetUserId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to invite speaker';
    let status = 500;
    if (message === 'Only the host can invite speakers') status = 403;
    if (message === 'Maximum speakers reached') status = 409;
    if (message === 'Room not found') status = 404;
    res.status(status).json({ error: message });
  }
});

// POST /api/rooms/:id/mute-speaker
router.post('/:id/mute-speaker', async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await roomService.muteSpeaker(req.params.id, req.user!.id, targetUserId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mute speaker';
    let status = 500;
    if (message === 'Only the host can mute speakers') status = 403;
    if (message === 'Room not found') status = 404;
    res.status(status).json({ error: message });
  }
});

// POST /api/rooms/:id/remove-speaker
router.post('/:id/remove-speaker', async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.body;
    if (!targetUserId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    const result = await roomService.removeSpeaker(req.params.id, req.user!.id, targetUserId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove speaker';
    let status = 500;
    if (message === 'Only the host can remove speakers') status = 403;
    if (message === 'Room not found') status = 404;
    res.status(status).json({ error: message });
  }
});

// ========================
// Room messages
// ========================

// GET /api/rooms/:id/messages
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const messages = await roomService.getRoomMessages(req.params.id, limit);
    res.json({ messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get messages';
    res.status(500).json({ error: message });
  }
});

// POST /api/rooms/:id/messages
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const msg = await roomService.sendRoomMessage(req.params.id, req.user!.id, content.trim());
    res.status(201).json(msg);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    const status = message === 'Must be a participant to send messages' ? 403 : 500;
    res.status(status).json({ error: message });
  }
});

// ========================
// Watch Party
// ========================

// POST /api/rooms/:id/watch-party — update watch party playback state (host only)
router.post('/:id/watch-party', async (req: Request, res: Response) => {
  try {
    const roomId = req.params.id as string;
    const userId = req.user!.id;
    const { isPlaying, currentTime, videoUrl } = req.body;

    // Verify room exists and user is host
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }
    if (room.hostId !== userId) {
      res.status(403).json({ error: 'Only the host can update playback state' });
      return;
    }
    if (!room.isWatchParty) {
      res.status(400).json({ error: 'Room is not a watch party' });
      return;
    }

    // Build the update data
    const updateData: Record<string, unknown> = {};
    if (typeof isPlaying === 'boolean') updateData.isPlaying = isPlaying;
    if (typeof currentTime === 'number') updateData.currentTime = currentTime;
    if (typeof videoUrl === 'string') updateData.videoUrl = videoUrl;

    // Upsert WatchPartyState
    const state = await prisma.watchPartyState.upsert({
      where: { roomId },
      update: updateData,
      create: {
        roomId,
        videoUrl: videoUrl ?? room.videoUrl ?? '',
        isPlaying: isPlaying ?? false,
        currentTime: currentTime ?? 0,
      },
    });

    // If video URL changed, also update the room record
    if (videoUrl) {
      await prisma.room.update({
        where: { id: roomId },
        data: { videoUrl },
      });
    }

    // Emit socket event to the room
    try {
      const io = getIO();
      io.to(`room:${roomId}`).emit('room:wp_state_update', {
        isPlaying: state.isPlaying,
        currentTime: state.currentTime,
        videoUrl: state.videoUrl,
      });
    } catch {
      // Socket may not be initialized in test environments
    }

    res.json({
      isPlaying: state.isPlaying,
      currentTime: state.currentTime,
      videoUrl: state.videoUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update playback state';
    res.status(500).json({ error: message });
  }
});

// ========================
// RSVP
// ========================

// POST /api/rooms/:id/rsvp
router.post('/:id/rsvp', async (req: Request, res: Response) => {
  try {
    const result = await roomService.rsvpRoom(req.params.id, req.user!.id);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to RSVP';
    let status = 500;
    if (message === 'Room not found') status = 404;
    if (message === 'Room is not scheduled') status = 400;
    res.status(status).json({ error: message });
  }
});

export default router;
