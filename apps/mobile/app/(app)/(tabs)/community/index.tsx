import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../../src/theme/typography';
import { scale } from '../../../../src/theme/responsive';
import { EventCard } from '../../../../src/modules/events/components/EventCard';
import { FeedCard } from '../../../../src/modules/feed/components/FeedCard';
import { useEvents } from '../../../../src/modules/events/hooks';
import { useFeed } from '../../../../src/modules/feed/hooks';

type CommunityTab = 'events' | 'feed';

function EventsList() {
  const { data, isLoading, refetch, isRefetching } = useEvents();
  const events = data?.events || [];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🎉</Text>
        <Text style={styles.emptyTitle}>No events yet</Text>
        <Text style={styles.emptySubtitle}>
          Community events and gatherings{'\n'}will be listed here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventCard event={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.lavender}
        />
      }
    />
  );
}

function FeedList() {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useFeed();

  const posts = data?.pages.flatMap((page) => page.posts) || [];

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={styles.emptyTitle}>Feed is empty</Text>
        <Text style={styles.emptySubtitle}>
          Community posts and updates{'\n'}will appear here
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FeedCard post={item} />}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor={colors.lavender}
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator
            size="small"
            color={colors.lavender}
            style={{ paddingVertical: 20 }}
          />
        ) : null
      }
    />
  );
}

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<CommunityTab>('events');
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'events' && styles.tabTextActive,
            ]}
          >
            Events
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'feed' && styles.tabActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'feed' && styles.tabTextActive,
            ]}
          >
            Feed
          </Text>
        </Pressable>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'events' ? <EventsList /> : <FeedList />}
      </View>

      {/* Floating create button */}
      <Pressable
        onPress={() =>
          router.push(
            activeTab === 'events' ? '/event/create' : '/feed/create'
          )
        }
      >
        {({ pressed }) => (
          <MotiView
            animate={{
              scale: pressed ? 0.92 : 1,
            }}
            transition={{ type: 'timing', duration: 100 }}
            style={styles.fab}
          >
            <Text style={styles.fabText}>+</Text>
          </MotiView>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.black,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.lavender,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray400,
  },
  tabTextActive: {
    color: colors.lavender,
  },
  contentArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 48,
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
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.lavenderDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: fontWeight.medium,
    marginTop: -2,
  },
});
