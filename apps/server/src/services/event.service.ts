import { prisma } from '../config/prisma';
import type { EventType } from '@prisma/client';

// ========================
// Event CRUD
// ========================

export async function createEvent(
  creatorId: string,
  data: {
    title: string;
    titleTib?: string;
    description: string;
    descTib?: string;
    type: EventType;
    imageUrl?: string;
    location?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    startDate: string;
    endDate?: string;
    isOnline?: boolean;
    link?: string;
    maxAttendees?: number;
  }
) {
  const event = await prisma.event.create({
    data: {
      creatorId,
      title: data.title,
      titleTib: data.titleTib,
      description: data.description,
      descTib: data.descTib,
      type: data.type,
      imageUrl: data.imageUrl,
      location: data.location,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      isOnline: data.isOnline || false,
      link: data.link,
      maxAttendees: data.maxAttendees,
    },
    include: {
      creator: {
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
      _count: { select: { rsvps: true } },
    },
  });

  return {
    id: event.id,
    creatorId: event.creatorId,
    creatorName: event.creator.profile?.displayName || 'Unknown',
    creatorPhoto: event.creator.photos[0]?.url || null,
    title: event.title,
    titleTib: event.titleTib,
    description: event.description,
    descTib: event.descTib,
    type: event.type,
    imageUrl: event.imageUrl,
    location: event.location,
    city: event.city,
    country: event.country,
    latitude: event.latitude,
    longitude: event.longitude,
    startDate: event.startDate,
    endDate: event.endDate,
    isOnline: event.isOnline,
    link: event.link,
    maxAttendees: event.maxAttendees,
    rsvpCount: event._count.rsvps,
    createdAt: event.createdAt,
  };
}

export async function getEvents(filters?: { type?: EventType; city?: string }) {
  const where: Record<string, unknown> = {};
  if (filters?.type) where.type = filters.type;
  if (filters?.city) where.city = filters.city;

  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: 'asc' },
    include: {
      creator: {
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
      _count: { select: { rsvps: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    creatorId: event.creatorId,
    creatorName: event.creator.profile?.displayName || 'Unknown',
    creatorPhoto: event.creator.photos[0]?.url || null,
    title: event.title,
    titleTib: event.titleTib,
    description: event.description,
    descTib: event.descTib,
    type: event.type,
    imageUrl: event.imageUrl,
    location: event.location,
    city: event.city,
    country: event.country,
    startDate: event.startDate,
    endDate: event.endDate,
    isOnline: event.isOnline,
    link: event.link,
    maxAttendees: event.maxAttendees,
    rsvpCount: event._count.rsvps,
    createdAt: event.createdAt,
  }));
}

export async function getEvent(eventId: string, userId?: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      creator: {
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
      _count: { select: { rsvps: true } },
      linkedRoom: {
        select: { id: true, status: true },
      },
    },
  });

  if (!event) throw new Error('Event not found');

  let hasRsvped = false;
  if (userId) {
    const rsvp = await prisma.eventRsvp.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });
    hasRsvped = !!rsvp;
  }

  return {
    id: event.id,
    creatorId: event.creatorId,
    creatorName: event.creator.profile?.displayName || 'Unknown',
    creatorPhoto: event.creator.photos[0]?.url || null,
    title: event.title,
    titleTib: event.titleTib,
    description: event.description,
    descTib: event.descTib,
    type: event.type,
    imageUrl: event.imageUrl,
    location: event.location,
    city: event.city,
    country: event.country,
    latitude: event.latitude,
    longitude: event.longitude,
    startDate: event.startDate,
    endDate: event.endDate,
    isOnline: event.isOnline,
    link: event.link,
    maxAttendees: event.maxAttendees,
    rsvpCount: event._count.rsvps,
    hasRsvped,
    linkedRoomId: event.linkedRoom?.id || null,
    linkedRoomStatus: event.linkedRoom?.status || null,
    createdAt: event.createdAt,
  };
}

export async function updateEvent(
  eventId: string,
  creatorId: string,
  data: {
    title?: string;
    titleTib?: string;
    description?: string;
    descTib?: string;
    type?: EventType;
    imageUrl?: string;
    location?: string;
    city?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    startDate?: string;
    endDate?: string;
    isOnline?: boolean;
    link?: string;
    maxAttendees?: number;
  }
) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');
  if (event.creatorId !== creatorId) throw new Error('Only the creator can update this event');

  const updateData: Record<string, unknown> = { ...data };
  if (data.startDate) updateData.startDate = new Date(data.startDate);
  if (data.endDate) updateData.endDate = new Date(data.endDate);

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
    include: {
      creator: {
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
      _count: { select: { rsvps: true } },
    },
  });

  return {
    id: updated.id,
    creatorId: updated.creatorId,
    creatorName: updated.creator.profile?.displayName || 'Unknown',
    creatorPhoto: updated.creator.photos[0]?.url || null,
    title: updated.title,
    titleTib: updated.titleTib,
    description: updated.description,
    descTib: updated.descTib,
    type: updated.type,
    imageUrl: updated.imageUrl,
    location: updated.location,
    city: updated.city,
    country: updated.country,
    startDate: updated.startDate,
    endDate: updated.endDate,
    isOnline: updated.isOnline,
    link: updated.link,
    maxAttendees: updated.maxAttendees,
    rsvpCount: updated._count.rsvps,
    createdAt: updated.createdAt,
  };
}

export async function deleteEvent(eventId: string, creatorId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');
  if (event.creatorId !== creatorId) throw new Error('Only the creator can delete this event');

  await prisma.event.delete({ where: { id: eventId } });
  return { success: true };
}

export async function rsvpEvent(eventId: string, userId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Event not found');

  const existing = await prisma.eventRsvp.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });

  if (existing) {
    await prisma.eventRsvp.delete({
      where: { eventId_userId: { eventId, userId } },
    });
    return { rsvped: false };
  }

  // Check max attendees
  if (event.maxAttendees) {
    const count = await prisma.eventRsvp.count({ where: { eventId } });
    if (count >= event.maxAttendees) {
      throw new Error('Event is full');
    }
  }

  await prisma.eventRsvp.create({
    data: { eventId, userId },
  });

  return { rsvped: true };
}

export async function getUpcomingEvents() {
  const events = await prisma.event.findMany({
    where: {
      startDate: { gt: new Date() },
    },
    orderBy: { startDate: 'asc' },
    include: {
      creator: {
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
      _count: { select: { rsvps: true } },
    },
  });

  return events.map((event) => ({
    id: event.id,
    creatorId: event.creatorId,
    creatorName: event.creator.profile?.displayName || 'Unknown',
    creatorPhoto: event.creator.photos[0]?.url || null,
    title: event.title,
    titleTib: event.titleTib,
    description: event.description,
    type: event.type,
    imageUrl: event.imageUrl,
    location: event.location,
    city: event.city,
    country: event.country,
    startDate: event.startDate,
    endDate: event.endDate,
    isOnline: event.isOnline,
    link: event.link,
    rsvpCount: event._count.rsvps,
    createdAt: event.createdAt,
  }));
}
