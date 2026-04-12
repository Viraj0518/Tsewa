import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../../src/theme/typography';
import { scale } from '../../../../src/theme/responsive';
import { useDiscoveryStore } from '../../../../src/modules/discovery/store';
import { useDeck, useDailyPicks, useSwipe } from '../../../../src/modules/discovery/hooks';
import { useAuthStore } from '../../../../src/modules/auth/store';
import { CategoryChips } from '../../../../src/modules/discovery/components/CategoryChips';
import {
  SwipeDeck,
  type SwipeDeckRef,
} from '../../../../src/modules/discovery/components/SwipeDeck';
import { ActionButtons } from '../../../../src/modules/discovery/components/ActionButtons';
import { DailyPickGrid } from '../../../../src/modules/discovery/components/DailyPickGrid';
import { MatchModal } from '../../../../src/modules/discovery/components/MatchModal';
import { Button } from '../../../../src/components/ui/Button';
import type { SwipeAction } from '../../../../src/modules/discovery/api';

export default function DiscoverScreen() {
  const router = useRouter();
  const deckRef = useRef<SwipeDeckRef>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matchInfo, setMatchInfo] = useState<{
    visible: boolean;
    matchId?: string;
    matchedUserName: string;
    matchedUserPhoto?: string;
  }>({
    visible: false,
    matchedUserName: '',
  });

  const viewMode = useDiscoveryStore((s) => s.viewMode);
  const setViewMode = useDiscoveryStore((s) => s.setViewMode);
  const selectedCategory = useDiscoveryStore((s) => s.selectedCategory);

  const user = useAuthStore((s) => s.user);

  const {
    data: deckData,
    isLoading: deckLoading,
    isError: deckError,
    refetch: refetchDeck,
  } = useDeck(selectedCategory);

  const {
    data: dailyPicksData,
    isLoading: picksLoading,
    isError: picksError,
    refetch: refetchPicks,
  } = useDailyPicks();

  const swipeMutation = useSwipe();

  const handleSwipe = useCallback(
    (userId: string, action: SwipeAction) => {
      swipeMutation.mutate(
        { targetUserId: userId, action },
        {
          onSuccess: (result) => {
            if (result.matched && result.matchedUser) {
              setMatchInfo({
                visible: true,
                matchId: result.matchId,
                matchedUserName: result.matchedUser.displayName,
                matchedUserPhoto: result.matchedUser.mainPhoto,
              });
            }
          },
        }
      );
      setCurrentIndex((prev) => prev + 1);
    },
    [swipeMutation]
  );

  const handleEmpty = useCallback(() => {
    setCurrentIndex(0);
    refetchDeck();
  }, [refetchDeck]);

  const handleSendMessage = (matchId: string) => {
    setMatchInfo((prev) => ({ ...prev, visible: false }));
    // Navigate to chat with the match
    router.push(`/rooms/${matchId}` as never);
  };

  const handleKeepSwiping = () => {
    setMatchInfo((prev) => ({ ...prev, visible: false }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
      </View>

      {/* Category Chips */}
      <CategoryChips />

      {/* View toggle */}
      <View style={styles.toggleRow}>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === 'deck' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('deck')}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === 'deck' && styles.toggleTextActive,
            ]}
          >
            Deck
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.toggleButton,
            viewMode === 'daily-picks' && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode('daily-picks')}
        >
          <Text
            style={[
              styles.toggleText,
              viewMode === 'daily-picks' && styles.toggleTextActive,
            ]}
          >
            Daily Picks
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {viewMode === 'deck' ? (
        <View style={styles.deckContainer}>
          {deckLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={colors.lavender} />
              <Text style={styles.stateText}>Finding profiles...</Text>
            </View>
          ) : deckError ? (
            <View style={styles.centeredState}>
              <Text style={styles.stateText}>Something went wrong</Text>
              <Button
                title="Try again"
                onPress={() => refetchDeck()}
                variant="outline"
              />
            </View>
          ) : (
            <>
              <SwipeDeck
                ref={deckRef}
                profiles={deckData?.profiles ?? []}
                currentIndex={currentIndex}
                onSwipe={handleSwipe}
                onEmpty={handleEmpty}
              />
              <ActionButtons
                deckRef={deckRef}
                disabled={
                  !deckData?.profiles ||
                  currentIndex >= deckData.profiles.length
                }
              />
            </>
          )}
        </View>
      ) : (
        <View style={styles.picksContainer}>
          {picksLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={colors.lavender} />
              <Text style={styles.stateText}>Loading picks...</Text>
            </View>
          ) : picksError ? (
            <View style={styles.centeredState}>
              <Text style={styles.stateText}>Something went wrong</Text>
              <Button
                title="Try again"
                onPress={() => refetchPicks()}
                variant="outline"
              />
            </View>
          ) : dailyPicksData ? (
            <DailyPickGrid
              picks={dailyPicksData.picks}
              refreshesAt={dailyPicksData.refreshesAt}
            />
          ) : null}
        </View>
      )}

      {/* Match Modal */}
      <MatchModal
        visible={matchInfo.visible}
        currentUserPhoto={null}
        currentUserName={user?.email?.split('@')[0] ?? 'You'}
        matchedUserPhoto={matchInfo.matchedUserPhoto}
        matchedUserName={matchInfo.matchedUserName}
        matchId={matchInfo.matchId}
        onSendMessage={handleSendMessage}
        onKeepSwiping={handleKeepSwiping}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(12),
  },
  headerTitle: {
    ...typography.h1,
    color: colors.black,
  },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(8),
    marginBottom: scale(12),
    backgroundColor: colors.gray100,
    borderRadius: scale(12),
    padding: scale(3),
  },
  toggleButton: {
    flex: 1,
    paddingVertical: scale(8),
    borderRadius: scale(10),
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray400,
  },
  toggleTextActive: {
    color: colors.black,
    fontWeight: fontWeight.semibold,
  },
  deckContainer: {
    flex: 1,
  },
  picksContainer: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(12),
  },
  stateText: {
    ...typography.body,
    color: colors.gray500,
  },
});
