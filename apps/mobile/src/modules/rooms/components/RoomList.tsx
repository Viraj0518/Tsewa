import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { Avatar } from '../../../components/ui/Avatar';
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { useRooms, useScheduledRooms, useChannels } from '../hooks';
import type { Room, TopicChannel } from '../api';

// ========================
// Live Room Card
// ========================

function LiveRoomCard({ room }: { room: Room }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/room/${room.id}`)}
      style={({ pressed }) => [styles.roomCard, pressed && styles.roomCardPressed]}
    >
      <View style={styles.roomCardHeader}>
        <View style={styles.roomCardLeft}>
          <View style={styles.liveDotRow}>
            <MotiView
              from={{ opacity: 0.4, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              transition={{ type: 'timing', duration: 800, loop: true }}
              style={styles.liveDot}
            />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          {room.isWatchParty && (
            <View style={styles.watchPartyBadge}>
              <Text style={styles.watchPartyText}>🎬 Watch Party</Text>
            </View>
          )}
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{room.type}</Text>
        </View>
      </View>

      <Text style={styles.roomTitle} numberOfLines={2}>
        {room.title}
      </Text>

      {room.topicTag && (
        <Text style={styles.topicTag}>#{room.topicTag}</Text>
      )}

      <View style={styles.roomFooter}>
        <View style={styles.hostRow}>
          <Avatar uri={room.hostPhoto} name={room.hostName} size="sm" />
          <Text style={styles.hostName} numberOfLines={1}>
            {room.hostName}
          </Text>
        </View>
        <View style={styles.participantBadge}>
          <Text style={styles.participantIcon}>👥</Text>
          <Text style={styles.participantCount}>{room.participantCount}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ========================
// Scheduled Room Card
// ========================

function ScheduledRoomCard({ room }: { room: Room }) {
  const router = useRouter();

  const scheduledDate = room.scheduledAt
    ? new Date(room.scheduledAt)
    : null;

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <Pressable
      onPress={() => router.push(`/room/${room.id}`)}
      style={({ pressed }) => [styles.roomCard, pressed && styles.roomCardPressed]}
    >
      <View style={styles.scheduledHeader}>
        <Text style={styles.scheduledIcon}>📅</Text>
        {scheduledDate && (
          <Text style={styles.scheduledTime}>{formatTime(scheduledDate)}</Text>
        )}
      </View>

      <Text style={styles.roomTitle} numberOfLines={2}>
        {room.title}
      </Text>

      {room.topicTag && (
        <Text style={styles.topicTag}>#{room.topicTag}</Text>
      )}

      <View style={styles.roomFooter}>
        <Text style={styles.hostName} numberOfLines={1}>
          {room.hostName}
        </Text>
        <View style={styles.participantBadge}>
          <Text style={styles.participantIcon}>🔔</Text>
          <Text style={styles.participantCount}>{room.rsvpCount ?? 0} RSVP</Text>
        </View>
      </View>
    </Pressable>
  );
}

// ========================
// Channel Card
// ========================

function ChannelCard({ channel }: { channel: TopicChannel }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => {
        if (channel.roomId) {
          router.push(`/room/${channel.roomId}`);
        }
      }}
      style={({ pressed }) => [styles.channelCard, pressed && styles.roomCardPressed]}
    >
      <Text style={styles.channelIcon}>{channel.iconEmoji || '💬'}</Text>
      <View style={styles.channelInfo}>
        <Text style={styles.channelName}>{channel.name}</Text>
        {channel.nameTib && (
          <Text style={styles.channelNameTib}>{channel.nameTib}</Text>
        )}
        {channel.description && (
          <Text style={styles.channelDesc} numberOfLines={1}>
            {channel.description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ========================
// Section Component
// ========================

function Section({
  title,
  emptyText,
  emptyIcon,
  loading,
  children,
}: {
  title: string;
  emptyText: string;
  emptyIcon: string;
  loading?: boolean;
  children?: React.ReactNode;
}) {
  const hasContent = React.Children.count(children) > 0;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {loading ? (
        <View style={styles.emptyCard}>
          <ActivityIndicator color={colors.lavender} />
        </View>
      ) : hasContent ? (
        children
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>{emptyIcon}</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

// ========================
// Main RoomList
// ========================

export function RoomList() {
  const { data: liveData, isLoading: liveLoading } = useRooms('LIVE');
  const { data: scheduledData, isLoading: scheduledLoading } = useScheduledRooms();
  const { data: channelsData, isLoading: channelsLoading } = useChannels();

  const liveRooms = liveData?.rooms ?? [];
  const scheduledRooms = scheduledData?.rooms ?? [];
  const channels = channelsData?.channels ?? [];

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Live Now */}
      <Section
        title="Live Now"
        emptyText="No live rooms at the moment. Start one!"
        emptyIcon="🎙"
        loading={liveLoading}
      >
        {liveRooms.map((room) => (
          <LiveRoomCard key={room.id} room={room} />
        ))}
      </Section>

      {/* Scheduled */}
      <Section
        title="Scheduled"
        emptyText="No upcoming rooms scheduled. Stay tuned!"
        emptyIcon="📅"
        loading={scheduledLoading}
      >
        {scheduledRooms.map((room) => (
          <ScheduledRoomCard key={room.id} room={room} />
        ))}
      </Section>

      {/* Topic Channels */}
      <Section
        title="Topic Channels"
        emptyText="Topic channels are coming soon. Share your interests with the community."
        emptyIcon="💭"
        loading={channelsLoading}
      >
        {channels.map((ch) => (
          <ChannelCard key={ch.id} channel={ch} />
        ))}
      </Section>
    </ScrollView>
  );
}

// ========================
// Styles
// ========================

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.black,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: 24,
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  emptyText: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Room card
  roomCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  roomCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  roomCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  liveDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.success,
    letterSpacing: 0.5,
  },
  watchPartyBadge: {
    backgroundColor: colors.peachLight,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  watchPartyText: {
    fontSize: fontSize.xs,
    color: colors.peachDark,
    fontWeight: fontWeight.medium,
  },
  typeBadge: {
    backgroundColor: colors.lavenderLight + '30',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  typeBadgeText: {
    fontSize: fontSize.xs,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  roomTitle: {
    ...typography.h3,
    color: colors.black,
    marginBottom: scale(4),
  },
  topicTag: {
    fontSize: fontSize.sm,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
    marginBottom: scale(8),
  },
  roomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: scale(8),
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 1,
  },
  hostName: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  participantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  participantIcon: {
    fontSize: fontSize.sm,
  },
  participantCount: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontWeight: fontWeight.semibold,
  },

  // Scheduled
  scheduledHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(8),
  },
  scheduledIcon: {
    fontSize: fontSize.md,
  },
  scheduledTime: {
    fontSize: fontSize.sm,
    color: colors.lavender,
    fontWeight: fontWeight.semibold,
  },

  // Channels
  channelCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(8),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  channelIcon: {
    fontSize: 28,
  },
  channelInfo: {
    flex: 1,
  },
  channelName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  channelNameTib: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    marginTop: 2,
  },
  channelDesc: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    marginTop: 2,
  },
});
