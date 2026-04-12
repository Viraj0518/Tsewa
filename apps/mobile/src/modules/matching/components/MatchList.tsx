import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { Avatar } from '../../../components/ui/Avatar';
import { useMatches } from '../hooks';
import { useChatStore } from '../../chat/store';
import { Match } from '../api';
import { formatDistanceToNow } from 'date-fns';

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

function timeAgo(dateString: string): string {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: false });
  } catch {
    return '';
  }
}

// --- New Match Avatar (horizontal row) ---

function NewMatchAvatar({ match }: { match: Match }) {
  const router = useRouter();

  const handlePress = () => {
    router.push(`/chat/${match.id}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.newMatchItem}>
      <View style={styles.avatarRing}>
        <Avatar
          uri={match.otherUser.photoUrl}
          name={match.otherUser.displayName}
          size="lg"
        />
      </View>
      <Text style={styles.newMatchName} numberOfLines={1}>
        {match.otherUser.displayName.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

// --- Conversation Row (vertical list) ---

function ConversationRow({ match }: { match: Match }) {
  const router = useRouter();
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const unread = unreadCounts[match.id] ?? match.unreadCount;

  const handlePress = () => {
    router.push(`/chat/${match.id}`);
  };

  return (
    <Pressable onPress={handlePress}>
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.98 : 1, opacity: pressed ? 0.8 : 1 }}
          transition={{ type: 'timing', duration: 100 }}
          style={styles.conversationRow}
        >
          <Avatar
            uri={match.otherUser.photoUrl}
            name={match.otherUser.displayName}
            size="md"
          />
          <View style={styles.conversationContent}>
            <View style={styles.conversationTop}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {match.otherUser.displayName}
              </Text>
              {match.lastMessage && (
                <Text style={styles.conversationTime}>
                  {timeAgo(match.lastMessage.createdAt)}
                </Text>
              )}
            </View>
            <View style={styles.conversationBottom}>
              <Text
                style={[
                  styles.conversationPreview,
                  unread > 0 && styles.conversationPreviewUnread,
                ]}
                numberOfLines={1}
              >
                {match.lastMessage
                  ? truncate(match.lastMessage.text, 45)
                  : 'Tap to say hello!'}
              </Text>
              {unread > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {unread > 99 ? '99+' : unread}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </MotiView>
      )}
    </Pressable>
  );
}

// --- Empty State ---

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyHeart}>{'\u2661'}</Text>
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptySubtitle}>
        Start swiping to make connections!
      </Text>
    </View>
  );
}

// --- Main MatchList ---

export function MatchList() {
  const { data: matches, isLoading, refetch, isRefetching } = useMatches();

  const { newMatches, conversations } = useMemo(() => {
    if (!matches) return { newMatches: [] as Match[], conversations: [] as Match[] };
    const nm: Match[] = [];
    const conv: Match[] = [];
    for (const m of matches) {
      if (m.lastMessage) {
        conv.push(m);
      } else {
        nm.push(m);
      }
    }
    return { newMatches: nm, conversations: conv };
  }, [matches]);

  const renderConversation = useCallback(
    ({ item }: ListRenderItemInfo<Match>) => <ConversationRow match={item} />,
    []
  );

  const keyExtractor = useCallback((item: Match) => item.id, []);

  const hasAnyMatches = (matches?.length ?? 0) > 0;

  const ListHeader = useMemo(
    () => (
      <View>
        {newMatches.length > 0 && (
          <View style={styles.newMatchesSection}>
            <Text style={styles.sectionTitle}>New Matches</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newMatchesScroll}
            >
              {newMatches.map((m) => (
                <NewMatchAvatar key={m.id} match={m} />
              ))}
            </ScrollView>
          </View>
        )}

        {conversations.length > 0 && (
          <View style={styles.messagesSectionHeader}>
            <Text style={styles.sectionTitle}>Messages</Text>
          </View>
        )}
      </View>
    ),
    [newMatches, conversations.length]
  );

  if (!isLoading && !hasAnyMatches) {
    return (
      <View style={styles.container}>
        <EmptyState />
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      renderItem={renderConversation}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        newMatches.length > 0 ? (
          <View style={styles.noMessagesYet}>
            <Text style={styles.noMessagesText}>
              No conversations yet. Say hi to your matches!
            </Text>
          </View>
        ) : null
      }
      contentContainerStyle={styles.listContent}
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.lavender}
          colors={[colors.lavender]}
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

const AVATAR_RING_SIZE = scale(84);
const AVATAR_INNER_SIZE = 80; // matches 'lg' size in Avatar component

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  listContent: {
    flexGrow: 1,
  },
  // --- New Matches Section ---
  newMatchesSection: {
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.black,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  newMatchesScroll: {
    paddingHorizontal: 16,
    gap: 16,
  },
  newMatchItem: {
    alignItems: 'center',
    width: AVATAR_RING_SIZE + 4,
  },
  avatarRing: {
    width: AVATAR_RING_SIZE,
    height: AVATAR_RING_SIZE,
    borderRadius: AVATAR_RING_SIZE / 2,
    borderWidth: 2.5,
    borderColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMatchName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.black,
    marginTop: 6,
    textAlign: 'center',
  },
  // --- Messages Section ---
  messagesSectionHeader: {
    paddingTop: 16,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  conversationName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    flex: 1,
    marginRight: 8,
  },
  conversationTime: {
    fontSize: fontSize.xs,
    color: colors.gray400,
  },
  conversationBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conversationPreview: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    flex: 1,
    marginRight: 8,
  },
  conversationPreviewUnread: {
    color: colors.black,
    fontWeight: fontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: colors.peach,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  // --- Empty State ---
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    paddingHorizontal: 40,
  },
  emptyHeart: {
    fontSize: 64,
    color: colors.peachLight,
    marginBottom: 16,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.black,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    lineHeight: 22,
  },
  // --- No Messages Yet (but has new matches) ---
  noMessagesYet: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  noMessagesText: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
  },
});
