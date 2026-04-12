import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import type { Event, EventType } from '../api';

// ========================
// Event type badge colors
// ========================

const EVENT_TYPE_COLORS: Record<EventType, { bg: string; text: string }> = {
  LOSAR: { bg: '#F5D06E', text: '#5C4813' },
  TEACHING: { bg: '#F4A54A', text: '#5C3A13' },
  COMMUNITY: { bg: colors.lavenderLight, text: colors.lavenderDark },
  SOCIAL: { bg: colors.peachLight, text: colors.peachDark },
  CULTURAL: { bg: '#C94C4C', text: '#FFFFFF' },
  OTHER: { bg: colors.gray200, text: colors.gray600 },
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  LOSAR: 'Losar',
  TEACHING: 'Teaching',
  COMMUNITY: 'Community',
  SOCIAL: 'Social',
  CULTURAL: 'Cultural',
  OTHER: 'Other',
};

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${month} ${day} at ${time}`;
}

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();
  const badgeColor = EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.OTHER;

  return (
    <Pressable
      onPress={() => router.push(`/event/${event.id}`)}
    >
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.98 : 1 }}
          transition={{ type: 'timing', duration: 120 }}
          style={styles.card}
        >
          {event.imageUrl ? (
            <Image source={{ uri: event.imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.placeholderEmoji}>
                {event.type === 'LOSAR' ? '🎊' :
                 event.type === 'TEACHING' ? '📿' :
                 event.type === 'CULTURAL' ? '🎭' :
                 event.type === 'SOCIAL' ? '🤝' : '📅'}
              </Text>
            </View>
          )}

          <View style={styles.content}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
                <Text style={[styles.badgeText, { color: badgeColor.text }]}>
                  {EVENT_TYPE_LABELS[event.type]}
                </Text>
              </View>
              {event.isOnline && (
                <View style={styles.onlineBadge}>
                  <Text style={styles.onlineBadgeText}>Online</Text>
                </View>
              )}
            </View>

            <Text style={styles.title} numberOfLines={2}>
              {event.title}
            </Text>

            <Text style={styles.dateText}>
              {formatEventDate(event.startDate)}
            </Text>

            {event.location && (
              <Text style={styles.locationText} numberOfLines={1}>
                {event.location}
                {event.city ? `, ${event.city}` : ''}
              </Text>
            )}

            <View style={styles.footer}>
              <Text style={styles.rsvpText}>
                {event.rsvpCount} {event.rsvpCount === 1 ? 'attending' : 'attending'}
              </Text>
            </View>
          </View>
        </MotiView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 40,
  },
  content: {
    padding: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  onlineBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.success + '20',
  },
  onlineBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  title: {
    ...typography.h3,
    color: colors.black,
    marginBottom: 6,
  },
  dateText: {
    ...typography.caption,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
    marginBottom: 4,
  },
  locationText: {
    ...typography.caption,
    color: colors.gray500,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rsvpText: {
    ...typography.small,
    color: colors.gray400,
  },
});
