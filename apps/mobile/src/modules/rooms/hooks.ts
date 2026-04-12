import { useEffect, useCallback, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as roomApi from './api';
import type { RoomMessage, RoomParticipant } from './api';
import { getSocket } from '../../lib/socket';
import { useRoomStore } from './store';

// ========================
// Query keys
// ========================

const ROOMS_KEY = (status?: string, type?: string) => ['rooms', status ?? 'all', type ?? 'all'];
const ROOM_KEY = (roomId: string) => ['room', roomId];
const ROOM_MESSAGES_KEY = (roomId: string) => ['room-messages', roomId];
const CHANNELS_KEY = ['room-channels'];
const SCHEDULED_KEY = ['rooms-scheduled'];

// ========================
// Queries
// ========================

export function useRooms(status?: string, type?: string) {
  return useQuery({
    queryKey: ROOMS_KEY(status, type),
    queryFn: () => roomApi.getRooms(status, type),
    staleTime: 30 * 1000,
  });
}

export function useRoom(roomId: string) {
  return useQuery({
    queryKey: ROOM_KEY(roomId),
    queryFn: () => roomApi.getRoom(roomId),
    enabled: !!roomId,
    staleTime: 10 * 1000,
  });
}

export function useRoomMessages(roomId: string) {
  return useQuery({
    queryKey: ROOM_MESSAGES_KEY(roomId),
    queryFn: () => roomApi.getRoomMessages(roomId),
    enabled: !!roomId,
    staleTime: 5 * 1000,
  });
}

export function useChannels() {
  return useQuery({
    queryKey: CHANNELS_KEY,
    queryFn: roomApi.getChannels,
    staleTime: 5 * 60 * 1000,
  });
}

export function useScheduledRooms() {
  return useQuery({
    queryKey: SCHEDULED_KEY,
    queryFn: roomApi.getScheduledRooms,
    staleTime: 60 * 1000,
  });
}

// ========================
// Mutations
// ========================

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: roomApi.CreateRoomData) => roomApi.createRoom(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useJoinRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => roomApi.joinRoom(roomId),
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ROOM_KEY(roomId) });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useLeaveRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => roomApi.leaveRoom(roomId),
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ROOM_KEY(roomId) });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
  });
}

export function useRaiseHand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => roomApi.raiseHand(roomId),
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ROOM_KEY(roomId) });
    },
  });
}

// ========================
// Room socket hook
// ========================

interface RoomSocketReturn {
  sendMessage: (text: string) => void;
  participants: RoomParticipant[];
  messages: RoomMessage[];
  raisedHands: string[];
  isEnded: boolean;
}

export function useRoomSocket(roomId: string): RoomSocketReturn {
  const queryClient = useQueryClient();
  const store = useRoomStore();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isEnded, setIsEnded] = useState(false);
  const messagesRef = useRef<RoomMessage[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    // Join room via socket
    socket.emit('room:join', { roomId });

    // Room state (initial data from server)
    const handleRoomState = (data: {
      room: { hostId: string };
      participants: Array<{
        userId: string;
        displayName: string;
        role: 'HOST' | 'SPEAKER' | 'LISTENER';
        handRaised: boolean;
        isMuted: boolean;
      }>;
    }) => {
      const mapped = data.participants.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        photoUrl: null,
        role: p.role,
        handRaised: p.handRaised,
        isMuted: p.isMuted,
      }));
      store.setParticipants(mapped);
    };

    // Participant joined
    const handleUserJoined = (data: {
      userId: string;
      displayName: string;
      role: 'HOST' | 'SPEAKER' | 'LISTENER';
    }) => {
      store.addParticipant({
        userId: data.userId,
        displayName: data.displayName,
        photoUrl: null,
        role: data.role,
        handRaised: false,
        isMuted: false,
      });
    };

    // Participant left
    const handleUserLeft = (data: { userId: string }) => {
      store.removeParticipant(data.userId);
    };

    // Hand raised
    const handleHandRaised = (data: { userId: string }) => {
      store.updateParticipant(data.userId, { handRaised: true });
    };

    // Hand lowered
    const handleHandLowered = (data: { userId: string }) => {
      store.updateParticipant(data.userId, { handRaised: false });
    };

    // Speaker added
    const handleSpeakerAdded = (data: { userId: string }) => {
      store.updateParticipant(data.userId, { role: 'SPEAKER', handRaised: false });
    };

    // Speaker removed
    const handleSpeakerRemoved = (data: { userId: string }) => {
      store.updateParticipant(data.userId, { role: 'LISTENER' });
    };

    // Speaker muted
    const handleSpeakerMuted = (data: { userId: string }) => {
      store.updateParticipant(data.userId, { isMuted: true });
    };

    // Mute toggled
    const handleMuteToggled = (data: { userId: string; isMuted: boolean }) => {
      store.updateParticipant(data.userId, { isMuted: data.isMuted });
    };

    // New message
    const handleNewMessage = (message: RoomMessage) => {
      const exists = messagesRef.current.some((m) => m.id === message.id);
      if (!exists) {
        messagesRef.current = [...messagesRef.current, message];
        setMessages([...messagesRef.current]);
      }
    };

    // Room ended
    const handleEnded = () => {
      setIsEnded(true);
    };

    socket.on('room:state', handleRoomState);
    socket.on('room:user_joined', handleUserJoined);
    socket.on('room:user_left', handleUserLeft);
    socket.on('room:hand_raised', handleHandRaised);
    socket.on('room:hand_lowered', handleHandLowered);
    socket.on('room:speaker_added', handleSpeakerAdded);
    socket.on('room:speaker_removed', handleSpeakerRemoved);
    socket.on('room:speaker_muted', handleSpeakerMuted);
    socket.on('room:mute_toggled', handleMuteToggled);
    socket.on('room:new_message', handleNewMessage);
    socket.on('room:ended', handleEnded);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('room:state', handleRoomState);
      socket.off('room:user_joined', handleUserJoined);
      socket.off('room:user_left', handleUserLeft);
      socket.off('room:hand_raised', handleHandRaised);
      socket.off('room:hand_lowered', handleHandLowered);
      socket.off('room:speaker_added', handleSpeakerAdded);
      socket.off('room:speaker_removed', handleSpeakerRemoved);
      socket.off('room:speaker_muted', handleSpeakerMuted);
      socket.off('room:mute_toggled', handleMuteToggled);
      socket.off('room:new_message', handleNewMessage);
      socket.off('room:ended', handleEnded);

      messagesRef.current = [];
      setMessages([]);
      store.reset();

      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (text: string) => {
      const socket = getSocket();
      if (!socket || !text.trim()) return;

      socket.emit('room:send_message', {
        roomId,
        content: text.trim(),
      });
    },
    [roomId]
  );

  const raisedHands = store.participants
    .filter((p) => p.handRaised)
    .map((p) => p.userId);

  return {
    sendMessage,
    participants: store.participants,
    messages,
    raisedHands,
    isEnded,
  };
}
