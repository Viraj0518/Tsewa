import { api } from '../../lib/api';

// ========================
// Types
// ========================

export interface RoomParticipant {
  userId: string;
  displayName: string;
  photoUrl: string | null;
  role: 'HOST' | 'SPEAKER' | 'LISTENER';
  handRaised: boolean;
  isMuted: boolean;
  joinedAt: string;
}

export interface Room {
  id: string;
  title: string;
  description: string | null;
  type: 'OPEN' | 'SCHEDULED' | 'TOPIC_CHANNEL' | 'EVENT_LINKED';
  topicTag: string | null;
  status: 'WAITING' | 'LIVE' | 'ENDED';
  scheduledAt: string | null;
  isWatchParty: boolean;
  videoUrl: string | null;
  maxSpeakers: number;
  hostId: string;
  hostName: string;
  hostPhoto: string | null;
  createdAt: string;
  participantCount: number;
  rsvpCount?: number;
  participants?: RoomParticipant[];
}

export interface RoomMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
}

export interface TopicChannel {
  id: string;
  name: string;
  nameTib: string | null;
  description: string | null;
  iconEmoji: string | null;
  position: number;
  roomId: string | null;
}

export interface CreateRoomData {
  title: string;
  description?: string;
  type?: 'OPEN' | 'SCHEDULED';
  topicTag?: string;
  scheduledAt?: string;
  isWatchParty?: boolean;
  videoUrl?: string;
}

// ========================
// API functions
// ========================

export async function createRoom(data: CreateRoomData): Promise<Room> {
  const { data: room } = await api.post<Room>('/rooms', data);
  return room;
}

export async function getRooms(
  status?: string,
  type?: string
): Promise<{ rooms: Room[] }> {
  const params: Record<string, string> = {};
  if (status) params.status = status;
  if (type) params.type = type;
  const { data } = await api.get<{ rooms: Room[] }>('/rooms', { params });
  return data;
}

export async function getRoom(roomId: string): Promise<Room> {
  const { data } = await api.get<Room>(`/rooms/${roomId}`);
  return data;
}

export async function joinRoom(roomId: string): Promise<Room> {
  const { data } = await api.post<Room>(`/rooms/${roomId}/join`);
  return data;
}

export async function leaveRoom(roomId: string): Promise<{ success: boolean }> {
  const { data } = await api.post<{ success: boolean }>(`/rooms/${roomId}/leave`);
  return data;
}

export async function raiseHand(roomId: string): Promise<{ handRaised: boolean }> {
  const { data } = await api.post<{ handRaised: boolean }>(`/rooms/${roomId}/raise-hand`);
  return data;
}

export async function getRoomMessages(
  roomId: string
): Promise<{ messages: RoomMessage[] }> {
  const { data } = await api.get<{ messages: RoomMessage[] }>(`/rooms/${roomId}/messages`);
  return data;
}

export async function sendRoomMessage(
  roomId: string,
  content: string
): Promise<RoomMessage> {
  const { data } = await api.post<RoomMessage>(`/rooms/${roomId}/messages`, { content });
  return data;
}

export async function getChannels(): Promise<{ channels: TopicChannel[] }> {
  const { data } = await api.get<{ channels: TopicChannel[] }>('/rooms/channels');
  return data;
}

export async function getScheduledRooms(): Promise<{ rooms: Room[] }> {
  const { data } = await api.get<{ rooms: Room[] }>('/rooms/scheduled');
  return data;
}
