import { api } from '../../lib/api';

// ========================
// Types
// ========================

export type EventType = 'LOSAR' | 'TEACHING' | 'COMMUNITY' | 'SOCIAL' | 'CULTURAL' | 'OTHER';

export interface Event {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorPhoto: string | null;
  title: string;
  titleTib?: string | null;
  description: string;
  descTib?: string | null;
  type: EventType;
  imageUrl: string | null;
  location: string | null;
  city: string | null;
  country: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startDate: string;
  endDate?: string | null;
  isOnline: boolean;
  link?: string | null;
  maxAttendees?: number | null;
  rsvpCount: number;
  hasRsvped?: boolean;
  linkedRoomId?: string | null;
  linkedRoomStatus?: string | null;
  createdAt: string;
}

export interface CreateEventData {
  title: string;
  titleTib?: string;
  description: string;
  descTib?: string;
  type: EventType;
  imageUrl?: string;
  location?: string;
  city?: string;
  country?: string;
  startDate: string;
  endDate?: string;
  isOnline?: boolean;
  link?: string;
  maxAttendees?: number;
}

// ========================
// API functions
// ========================

export async function getEvents(
  type?: EventType,
  city?: string
): Promise<{ events: Event[] }> {
  const params: Record<string, string> = {};
  if (type) params.type = type;
  if (city) params.city = city;
  const { data } = await api.get<{ events: Event[] }>('/events', { params });
  return data;
}

export async function getEvent(eventId: string): Promise<Event> {
  const { data } = await api.get<Event>(`/events/${eventId}`);
  return data;
}

export async function createEvent(eventData: CreateEventData): Promise<Event> {
  const { data } = await api.post<Event>('/events', eventData);
  return data;
}

export async function updateEvent(
  eventId: string,
  eventData: Partial<CreateEventData>
): Promise<Event> {
  const { data } = await api.put<Event>(`/events/${eventId}`, eventData);
  return data;
}

export async function deleteEvent(eventId: string): Promise<{ success: boolean }> {
  const { data } = await api.delete<{ success: boolean }>(`/events/${eventId}`);
  return data;
}

export async function rsvpEvent(eventId: string): Promise<{ rsvped: boolean }> {
  const { data } = await api.post<{ rsvped: boolean }>(`/events/${eventId}/rsvp`);
  return data;
}
