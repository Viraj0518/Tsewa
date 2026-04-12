import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as eventApi from './api';
import type { EventType, CreateEventData } from './api';

// ========================
// Query keys
// ========================

const EVENTS_KEY = (type?: EventType, city?: string) => [
  'events',
  type ?? 'all',
  city ?? 'all',
];
const EVENT_KEY = (eventId: string) => ['event', eventId];

// ========================
// Queries
// ========================

export function useEvents(type?: EventType, city?: string) {
  return useQuery({
    queryKey: EVENTS_KEY(type, city),
    queryFn: () => eventApi.getEvents(type, city),
    staleTime: 30 * 1000,
  });
}

export function useEvent(eventId: string) {
  return useQuery({
    queryKey: EVENT_KEY(eventId),
    queryFn: () => eventApi.getEvent(eventId),
    enabled: !!eventId,
    staleTime: 15 * 1000,
  });
}

// ========================
// Mutations
// ========================

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateEventData) => eventApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useRsvpEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventApi.rsvpEvent(eventId),
    onSuccess: (_data, eventId) => {
      queryClient.invalidateQueries({ queryKey: EVENT_KEY(eventId) });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
