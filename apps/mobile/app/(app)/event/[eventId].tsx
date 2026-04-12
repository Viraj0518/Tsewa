import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { EventDetail } from '../../../src/modules/events/components/EventDetail';

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return <EventDetail eventId={eventId!} />;
}
