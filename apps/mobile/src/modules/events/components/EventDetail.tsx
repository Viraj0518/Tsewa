import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { useEvent, useRsvpEvent } from '../hooks';
import type { EventType } from '../api';

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

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface EventDetailProps {
  eventId: string;
}

export function EventDetail({ eventId }: EventDetailProps) {
  const router = useRouter();
  const { data: event, isLoading, error } = useEvent(eventId);
  const rsvpMutation = useRsvpEvent();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </SafeAreaView>
    );
  }

  if (error || !event) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>Event not found</Text>
        <Button title="Go Back" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const badgeColor = EVENT_TYPE_COLORS[event.type] || EVENT_TYPE_COLORS.OTHER;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>

        {/* Hero image */}
        {event.imageUrl ? (
          <Image source={{ uri: event.imageUrl }} style={styles.heroImage} />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>
              {event.type === 'LOSAR' ? '🎊' :
               event.type === 'TEACHING' ? '📿' :
               event.type === 'CULTURAL' ? '🎭' :
               event.type === 'SOCIAL' ? '🤝' : '📅'}
            </Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Type badge */}
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

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>
          {event.titleTib && (
            <Text style={styles.titleTib}>{event.titleTib}</Text>
          )}

          {/* Date/Time */}
          <View style={styles.section}>
            <Text style={styles.sectionIcon}>📅</Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Date & Time</Text>
              <Text style={styles.sectionValue}>
                {formatFullDate(event.startDate)}
              </Text>
              <Text style={styles.sectionSubvalue}>
                {formatTime(event.startDate)}
                {event.endDate ? ` - ${formatTime(event.endDate)}` : ''}
              </Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionIcon}>
              {event.isOnline ? '🌐' : '📍'}
            </Text>
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>
                {event.isOnline ? 'Online Event' : 'Location'}
              </Text>
              {event.isOnline && event.link ? (
                <Pressable onPress={() => Linking.openURL(event.link!)}>
                  <Text style={styles.linkText}>Join Online</Text>
                </Pressable>
              ) : event.location ? (
                <Text style={styles.sectionValue}>
                  {event.location}
                  {event.city ? `, ${event.city}` : ''}
                  {event.country ? `, ${event.country}` : ''}
                </Text>
              ) : (
                <Text style={styles.sectionValue}>Location TBA</Text>
              )}
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>About</Text>
            <Text style={styles.descriptionText}>{event.description}</Text>
            {event.descTib && (
              <Text style={styles.descriptionTextTib}>{event.descTib}</Text>
            )}
          </View>

          {/* Creator */}
          <View style={styles.creatorSection}>
            <Avatar
              uri={event.creatorPhoto}
              name={event.creatorName}
              size="md"
            />
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorLabel}>Hosted by</Text>
              <Text style={styles.creatorName}>{event.creatorName}</Text>
            </View>
          </View>

          {/* Attendee count */}
          <View style={styles.attendeeSection}>
            <Text style={styles.attendeeCount}>{event.rsvpCount}</Text>
            <Text style={styles.attendeeLabel}>
              {event.rsvpCount === 1 ? 'person attending' : 'people attending'}
            </Text>
          </View>

          {/* RSVP button */}
          <MotiView
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <Button
              title={event.hasRsvped ? 'Cancel RSVP' : 'RSVP'}
              variant={event.hasRsvped ? 'outline' : 'primary'}
              size="lg"
              fullWidth
              loading={rsvpMutation.isPending}
              onPress={() => rsvpMutation.mutate(eventId)}
            />
          </MotiView>

          {/* Join Room button if event has linked room */}
          {event.linkedRoomId && event.linkedRoomStatus === 'LIVE' && (
            <Button
              title="Join Room"
              variant="secondary"
              size="lg"
              fullWidth
              style={styles.joinRoomButton}
              onPress={() => router.push(`/room/${event.linkedRoomId}`)}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.softWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.h3,
    color: colors.gray500,
    marginBottom: 16,
  },
  backButton: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 10,
    backgroundColor: colors.white + 'CC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: {
    ...typography.body,
    color: colors.black,
    fontWeight: fontWeight.medium,
  },
  heroImage: {
    width: '100%',
    height: 240,
    resizeMode: 'cover',
  },
  heroPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: {
    fontSize: 64,
  },
  content: {
    padding: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  badgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  onlineBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: colors.success + '20',
  },
  onlineBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
  },
  title: {
    ...typography.h1,
    color: colors.black,
    marginBottom: 4,
  },
  titleTib: {
    ...typography.h3,
    color: colors.gray500,
    marginBottom: 20,
  },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 12,
  },
  sectionIcon: {
    fontSize: 22,
    marginTop: 2,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    ...typography.body,
    color: colors.black,
  },
  sectionSubvalue: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  linkText: {
    ...typography.body,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
    textDecorationLine: 'underline',
  },
  descriptionSection: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  descriptionTitle: {
    ...typography.h3,
    color: colors.black,
    marginBottom: 10,
  },
  descriptionText: {
    ...typography.body,
    color: colors.gray600,
    lineHeight: 22,
  },
  descriptionTextTib: {
    ...typography.body,
    color: colors.gray500,
    marginTop: 12,
    lineHeight: 24,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: 12,
  },
  creatorInfo: {
    flex: 1,
  },
  creatorLabel: {
    ...typography.small,
    color: colors.gray400,
  },
  creatorName: {
    ...typography.bodyLarge,
    color: colors.black,
    fontWeight: fontWeight.medium,
  },
  attendeeSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 24,
    marginBottom: 20,
  },
  attendeeCount: {
    ...typography.h2,
    color: colors.lavender,
  },
  attendeeLabel: {
    ...typography.body,
    color: colors.gray500,
  },
  joinRoomButton: {
    marginTop: 12,
  },
});
