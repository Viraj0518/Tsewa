import { prisma } from '../config/prisma';
import type { RoomType, RoomStatus } from '@prisma/client';

// ========================
// Room CRUD
// ========================

export async function createRoom(
  hostId: string,
  data: {
    title: string;
    description?: string;
    type?: RoomType;
    topicTag?: string;
    scheduledAt?: string;
    isWatchParty?: boolean;
    videoUrl?: string;
  }
) {
  const status = data.type === 'SCHEDULED' && data.scheduledAt ? 'WAITING' : 'LIVE';

  const room = await prisma.room.create({
    data: {
      hostId,
      title: data.title,
      description: data.description,
      type: data.type || 'OPEN',
      topicTag: data.topicTag,
      status,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      isWatchParty: data.isWatchParty || false,
      videoUrl: data.videoUrl,
    },
    include: {
      host: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
        },
      },
    },
  });

  // Add host as HOST participant
  await prisma.roomParticipant.create({
    data: {
      roomId: room.id,
      userId: hostId,
      role: 'HOST',
    },
  });

  // If watch party, create initial watch party state
  if (data.isWatchParty && data.videoUrl) {
    await prisma.watchPartyState.create({
      data: {
        roomId: room.id,
        videoUrl: data.videoUrl,
      },
    });
  }

  return {
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    topicTag: room.topicTag,
    status: room.status,
    scheduledAt: room.scheduledAt,
    isWatchParty: room.isWatchParty,
    videoUrl: room.videoUrl,
    hostId: room.hostId,
    hostName: room.host.profile?.displayName || 'Unknown',
    createdAt: room.createdAt,
    participantCount: 1,
  };
}

export async function getRooms(filters?: { status?: RoomStatus; type?: RoomType }) {
  const where: Record<string, unknown> = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;

  const rooms = await prisma.room.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      host: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      _count: {
        select: { participants: true, rsvps: true },
      },
    },
  });

  return rooms.map((room) => ({
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    topicTag: room.topicTag,
    status: room.status,
    scheduledAt: room.scheduledAt,
    isWatchParty: room.isWatchParty,
    videoUrl: room.videoUrl,
    hostId: room.hostId,
    hostName: room.host.profile?.displayName || 'Unknown',
    hostPhoto: room.host.photos[0]?.url || null,
    createdAt: room.createdAt,
    participantCount: room._count.participants,
    rsvpCount: room._count.rsvps,
  }));
}

export async function getRoom(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      host: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              profile: { select: { displayName: true } },
              photos: {
                where: { isMain: true },
                select: { url: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      _count: {
        select: { rsvps: true },
      },
    },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  return {
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    topicTag: room.topicTag,
    status: room.status,
    scheduledAt: room.scheduledAt,
    isWatchParty: room.isWatchParty,
    videoUrl: room.videoUrl,
    maxSpeakers: room.maxSpeakers,
    hostId: room.hostId,
    hostName: room.host.profile?.displayName || 'Unknown',
    hostPhoto: room.host.photos[0]?.url || null,
    createdAt: room.createdAt,
    rsvpCount: room._count.rsvps,
    participants: room.participants.map((p) => ({
      userId: p.userId,
      displayName: p.user.profile?.displayName || 'Unknown',
      photoUrl: p.user.photos[0]?.url || null,
      role: p.role,
      handRaised: p.handRaised,
      isMuted: p.isMuted,
      joinedAt: p.joinedAt,
    })),
  };
}

export async function endRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) throw new Error('Room not found');
  if (room.hostId !== userId) throw new Error('Only the host can end the room');

  await prisma.room.update({
    where: { id: roomId },
    data: { status: 'ENDED' },
  });

  await prisma.roomParticipant.deleteMany({ where: { roomId } });

  return { success: true };
}

// ========================
// Join / Leave
// ========================

export async function joinRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  if (!room) throw new Error('Room not found');
  if (room.status === 'ENDED') throw new Error('Room has ended');

  // If room is WAITING (scheduled) and user is host, set to LIVE
  if (room.status === 'WAITING' && room.hostId === userId) {
    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'LIVE' },
    });
  }

  await prisma.roomParticipant.upsert({
    where: { roomId_userId: { roomId, userId } },
    update: { joinedAt: new Date() },
    create: {
      roomId,
      userId,
      role: room.hostId === userId ? 'HOST' : 'LISTENER',
    },
  });

  return getRoom(roomId);
}

export async function leaveRoom(roomId: string, userId: string) {
  await prisma.roomParticipant.deleteMany({
    where: { roomId, userId },
  });

  return { success: true };
}

// ========================
// Speaker management
// ========================

export async function raiseHand(roomId: string, userId: string) {
  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!participant) throw new Error('Not a participant');

  const updated = await prisma.roomParticipant.update({
    where: { roomId_userId: { roomId, userId } },
    data: { handRaised: !participant.handRaised },
  });

  return { handRaised: updated.handRaised };
}

export async function inviteSpeaker(roomId: string, hostId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error('Room not found');
  if (room.hostId !== hostId) throw new Error('Only the host can invite speakers');

  // Check speaker count
  const speakerCount = await prisma.roomParticipant.count({
    where: { roomId, role: { in: ['SPEAKER', 'HOST'] } },
  });

  if (speakerCount >= room.maxSpeakers) {
    throw new Error('Maximum speakers reached');
  }

  await prisma.roomParticipant.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { role: 'SPEAKER', handRaised: false },
  });

  return { success: true };
}

export async function muteSpeaker(roomId: string, hostId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error('Room not found');
  if (room.hostId !== hostId) throw new Error('Only the host can mute speakers');

  await prisma.roomParticipant.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { isMuted: true },
  });

  return { success: true };
}

export async function removeSpeaker(roomId: string, hostId: string, targetUserId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error('Room not found');
  if (room.hostId !== hostId) throw new Error('Only the host can remove speakers');

  await prisma.roomParticipant.update({
    where: { roomId_userId: { roomId, userId: targetUserId } },
    data: { role: 'LISTENER' },
  });

  return { success: true };
}

// ========================
// Room messages
// ========================

export async function getRoomMessages(roomId: string, limit: number = 50) {
  const messages = await prisma.roomMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
        },
      },
    },
  });

  return messages
    .map((m) => ({
      id: m.id,
      roomId: m.roomId,
      userId: m.userId,
      displayName: m.user.profile?.displayName || 'Unknown',
      content: m.content,
      createdAt: m.createdAt,
    }))
    .reverse();
}

export async function sendRoomMessage(roomId: string, userId: string, content: string) {
  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (!participant) throw new Error('Must be a participant to send messages');

  const message = await prisma.roomMessage.create({
    data: { roomId, userId, content },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
        },
      },
    },
  });

  return {
    id: message.id,
    roomId: message.roomId,
    userId: message.userId,
    displayName: message.user.profile?.displayName || 'Unknown',
    content: message.content,
    createdAt: message.createdAt,
  };
}

// ========================
// Channels & Scheduled
// ========================

export async function getChannels() {
  const channels = await prisma.topicChannel.findMany({
    orderBy: { position: 'asc' },
  });

  return channels.map((ch) => ({
    id: ch.id,
    name: ch.name,
    nameTib: ch.nameTib,
    description: ch.description,
    iconEmoji: ch.iconEmoji,
    position: ch.position,
    roomId: ch.roomId,
  }));
}

export async function getScheduledRooms() {
  const rooms = await prisma.room.findMany({
    where: {
      status: 'WAITING',
      scheduledAt: { gt: new Date() },
    },
    orderBy: { scheduledAt: 'asc' },
    include: {
      host: {
        select: {
          id: true,
          profile: { select: { displayName: true } },
          photos: {
            where: { isMain: true },
            select: { url: true },
            take: 1,
          },
        },
      },
      _count: {
        select: { rsvps: true },
      },
    },
  });

  return rooms.map((room) => ({
    id: room.id,
    title: room.title,
    description: room.description,
    type: room.type,
    topicTag: room.topicTag,
    status: room.status,
    scheduledAt: room.scheduledAt,
    isWatchParty: room.isWatchParty,
    hostId: room.hostId,
    hostName: room.host.profile?.displayName || 'Unknown',
    hostPhoto: room.host.photos[0]?.url || null,
    createdAt: room.createdAt,
    rsvpCount: room._count.rsvps,
  }));
}

export async function rsvpRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error('Room not found');
  if (room.status !== 'WAITING') throw new Error('Room is not scheduled');

  const existing = await prisma.roomScheduleRsvp.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });

  if (existing) {
    // Toggle: remove RSVP
    await prisma.roomScheduleRsvp.delete({
      where: { roomId_userId: { roomId, userId } },
    });
    return { rsvped: false };
  }

  await prisma.roomScheduleRsvp.create({
    data: { roomId, userId },
  });

  return { rsvped: true };
}
