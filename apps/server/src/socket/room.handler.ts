import type { Server, Socket } from 'socket.io';
import { prisma } from '../config/prisma';

export function registerRoomHandlers(io: Server, socket: Socket) {
  const userId = socket.user.id;

  // ========================
  // Room lifecycle
  // ========================

  socket.on('room:join', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      if (!room || room.status === 'ENDED') {
        socket.emit('error', { message: 'Room not found or has ended' });
        return;
      }

      // Upsert participant
      await prisma.roomParticipant.upsert({
        where: { roomId_userId: { roomId, userId } },
        update: { joinedAt: new Date() },
        create: {
          roomId,
          userId,
          role: room.hostId === userId ? 'HOST' : 'LISTENER',
        },
      });

      socket.join(`room:${roomId}`);

      // Notify the room
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: { select: { displayName: true } } },
      });

      io.to(`room:${roomId}`).emit('room:user_joined', {
        roomId,
        userId,
        displayName: user?.profile?.displayName || 'Unknown',
        role: room.hostId === userId ? 'HOST' : 'LISTENER',
      });

      // Send current room state to the joining user
      const participants = await prisma.roomParticipant.findMany({
        where: { roomId },
        include: {
          user: {
            include: { profile: { select: { displayName: true } } },
          },
        },
      });

      const watchPartyState = room.isWatchParty
        ? await prisma.watchPartyState.findUnique({ where: { roomId } })
        : null;

      socket.emit('room:state', {
        room: {
          id: room.id,
          title: room.title,
          description: room.description,
          type: room.type,
          status: room.status,
          hostId: room.hostId,
          isWatchParty: room.isWatchParty,
          maxSpeakers: room.maxSpeakers,
        },
        participants: participants.map((p) => ({
          userId: p.userId,
          displayName: p.user.profile?.displayName || 'Unknown',
          role: p.role,
          handRaised: p.handRaised,
          isMuted: p.isMuted,
        })),
        watchPartyState: watchPartyState
          ? {
              videoUrl: watchPartyState.videoUrl,
              isPlaying: watchPartyState.isPlaying,
              currentTime: watchPartyState.currentTime,
            }
          : null,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

  socket.on('room:leave', async (data: { roomId: string }) => {
    try {
      const { roomId } = data;

      await prisma.roomParticipant.deleteMany({
        where: { roomId, userId },
      });

      socket.leave(`room:${roomId}`);

      io.to(`room:${roomId}`).emit('room:user_left', { roomId, userId });
    } catch (err) {
      socket.emit('error', { message: 'Failed to leave room' });
    }
  });

  // ========================
  // Hand raising
  // ========================

  socket.on('room:raise_hand', async (data: { roomId: string }) => {
    try {
      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: data.roomId, userId } },
        data: { handRaised: true },
      });

      io.to(`room:${data.roomId}`).emit('room:hand_raised', {
        roomId: data.roomId,
        userId,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to raise hand' });
    }
  });

  socket.on('room:lower_hand', async (data: { roomId: string }) => {
    try {
      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: data.roomId, userId } },
        data: { handRaised: false },
      });

      io.to(`room:${data.roomId}`).emit('room:hand_lowered', {
        roomId: data.roomId,
        userId,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to lower hand' });
    }
  });

  // ========================
  // Room messages (text chat within room)
  // ========================

  socket.on('room:send_message', async (data: { roomId: string; content: string }) => {
    try {
      const message = await prisma.roomMessage.create({
        data: {
          roomId: data.roomId,
          userId,
          content: data.content,
        },
        include: {
          user: {
            include: { profile: { select: { displayName: true } } },
          },
        },
      });

      io.to(`room:${data.roomId}`).emit('room:new_message', {
        id: message.id,
        roomId: message.roomId,
        userId: message.userId,
        displayName: message.user.profile?.displayName || 'Unknown',
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to send room message' });
    }
  });

  // ========================
  // Mute toggle
  // ========================

  socket.on('room:toggle_mute', async (data: { roomId: string }) => {
    try {
      const participant = await prisma.roomParticipant.findUnique({
        where: { roomId_userId: { roomId: data.roomId, userId } },
      });

      if (!participant) return;

      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: data.roomId, userId } },
        data: { isMuted: !participant.isMuted },
      });

      io.to(`room:${data.roomId}`).emit('room:mute_toggled', {
        roomId: data.roomId,
        userId,
        isMuted: !participant.isMuted,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to toggle mute' });
    }
  });

  // ========================
  // Host actions
  // ========================

  async function verifyHost(roomId: string): Promise<boolean> {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    return room?.hostId === userId;
  }

  socket.on('room:invite_speaker', async (data: { roomId: string; targetUserId: string }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can invite speakers' });
        return;
      }

      // Check speaker count
      const speakerCount = await prisma.roomParticipant.count({
        where: { roomId: data.roomId, role: { in: ['SPEAKER', 'HOST'] } },
      });

      const room = await prisma.room.findUnique({ where: { id: data.roomId } });
      if (room && speakerCount >= room.maxSpeakers) {
        socket.emit('error', { message: 'Maximum speakers reached' });
        return;
      }

      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: data.roomId, userId: data.targetUserId } },
        data: { role: 'SPEAKER', handRaised: false },
      });

      io.to(`room:${data.roomId}`).emit('room:speaker_added', {
        roomId: data.roomId,
        userId: data.targetUserId,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to invite speaker' });
    }
  });

  socket.on('room:remove_speaker', async (data: { roomId: string; targetUserId: string }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can remove speakers' });
        return;
      }

      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: data.roomId, userId: data.targetUserId } },
        data: { role: 'LISTENER' },
      });

      io.to(`room:${data.roomId}`).emit('room:speaker_removed', {
        roomId: data.roomId,
        userId: data.targetUserId,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to remove speaker' });
    }
  });

  socket.on('room:mute_speaker', async (data: { roomId: string; targetUserId: string }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can mute speakers' });
        return;
      }

      await prisma.roomParticipant.update({
        where: { roomId_userId: { roomId: data.roomId, userId: data.targetUserId } },
        data: { isMuted: true },
      });

      io.to(`room:${data.roomId}`).emit('room:speaker_muted', {
        roomId: data.roomId,
        userId: data.targetUserId,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to mute speaker' });
    }
  });

  socket.on('room:end_room', async (data: { roomId: string }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can end the room' });
        return;
      }

      await prisma.room.update({
        where: { id: data.roomId },
        data: { status: 'ENDED' },
      });

      // Remove all participants
      await prisma.roomParticipant.deleteMany({
        where: { roomId: data.roomId },
      });

      io.to(`room:${data.roomId}`).emit('room:ended', { roomId: data.roomId });

      // Disconnect all sockets from the room
      io.in(`room:${data.roomId}`).socketsLeave(`room:${data.roomId}`);
    } catch (err) {
      socket.emit('error', { message: 'Failed to end room' });
    }
  });

  // ========================
  // Watch Party controls
  // ========================

  socket.on('room:wp_play', async (data: { roomId: string; currentTime: number }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can control playback' });
        return;
      }

      await prisma.watchPartyState.upsert({
        where: { roomId: data.roomId },
        update: { isPlaying: true, currentTime: data.currentTime },
        create: {
          roomId: data.roomId,
          videoUrl: '',
          isPlaying: true,
          currentTime: data.currentTime,
        },
      });

      io.to(`room:${data.roomId}`).emit('room:wp_play', {
        roomId: data.roomId,
        currentTime: data.currentTime,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to play' });
    }
  });

  socket.on('room:wp_pause', async (data: { roomId: string; currentTime: number }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can control playback' });
        return;
      }

      await prisma.watchPartyState.upsert({
        where: { roomId: data.roomId },
        update: { isPlaying: false, currentTime: data.currentTime },
        create: {
          roomId: data.roomId,
          videoUrl: '',
          isPlaying: false,
          currentTime: data.currentTime,
        },
      });

      io.to(`room:${data.roomId}`).emit('room:wp_pause', {
        roomId: data.roomId,
        currentTime: data.currentTime,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to pause' });
    }
  });

  socket.on('room:wp_seek', async (data: { roomId: string; currentTime: number }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can control playback' });
        return;
      }

      await prisma.watchPartyState.update({
        where: { roomId: data.roomId },
        data: { currentTime: data.currentTime },
      });

      io.to(`room:${data.roomId}`).emit('room:wp_seek', {
        roomId: data.roomId,
        currentTime: data.currentTime,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to seek' });
    }
  });

  socket.on('room:wp_change_video', async (data: { roomId: string; videoUrl: string }) => {
    try {
      if (!(await verifyHost(data.roomId))) {
        socket.emit('error', { message: 'Only the host can change video' });
        return;
      }

      await prisma.watchPartyState.upsert({
        where: { roomId: data.roomId },
        update: { videoUrl: data.videoUrl, currentTime: 0, isPlaying: false },
        create: {
          roomId: data.roomId,
          videoUrl: data.videoUrl,
          isPlaying: false,
          currentTime: 0,
        },
      });

      // Also update the room's videoUrl
      await prisma.room.update({
        where: { id: data.roomId },
        data: { videoUrl: data.videoUrl },
      });

      io.to(`room:${data.roomId}`).emit('room:wp_video_changed', {
        roomId: data.roomId,
        videoUrl: data.videoUrl,
      });
    } catch (err) {
      socket.emit('error', { message: 'Failed to change video' });
    }
  });

  // ========================
  // Audio signaling (WebRTC)
  // ========================

  socket.on(
    'room:audio_offer',
    (data: { roomId: string; targetUserId: string; offer: Record<string, unknown> }) => {
      io.to(`user:${data.targetUserId}`).emit('room:audio_offer', {
        roomId: data.roomId,
        fromUserId: userId,
        offer: data.offer,
      });
    }
  );

  socket.on(
    'room:audio_answer',
    (data: { roomId: string; targetUserId: string; answer: Record<string, unknown> }) => {
      io.to(`user:${data.targetUserId}`).emit('room:audio_answer', {
        roomId: data.roomId,
        fromUserId: userId,
        answer: data.answer,
      });
    }
  );

  socket.on(
    'room:audio_ice_candidate',
    (data: { roomId: string; targetUserId: string; candidate: Record<string, unknown> }) => {
      io.to(`user:${data.targetUserId}`).emit('room:audio_ice_candidate', {
        roomId: data.roomId,
        fromUserId: userId,
        candidate: data.candidate,
      });
    }
  );
}
