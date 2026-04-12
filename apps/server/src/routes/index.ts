import { Router } from 'express';
import authRoutes from './auth.routes';
import profileRoutes from './profile.routes';
import discoveryRoutes from './discovery.routes';
import swipeRoutes from './swipe.routes';
import matchRoutes from './match.routes';
import messageRoutes from './message.routes';
import roomRoutes from './room.routes';
import waitlistRoutes from './waitlist.routes';
import eventRoutes from './event.routes';
import feedRoutes from './feed.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/discovery', discoveryRoutes);
router.use('/swipe', swipeRoutes);
router.use('/matches', matchRoutes);
router.use('/messages', messageRoutes);
router.use('/rooms', roomRoutes);
router.use('/waitlist', waitlistRoutes);
router.use('/events', eventRoutes);
router.use('/feed', feedRoutes);
router.use('/', waitlistRoutes); // For /invite/redeem and /invite/generate

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
