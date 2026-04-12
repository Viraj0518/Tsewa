import React, {
  useCallback,
  useImperativeHandle,
  forwardRef,
  useMemo,
} from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { ProfileCard } from './ProfileCard';
import { Button } from '../../../components/ui/Button';
import type { DeckProfile, SwipeAction } from '../api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_X_THRESHOLD = 120;
const SWIPE_Y_THRESHOLD = 100;
const ROTATION_FACTOR = 0.1;
const EXIT_X = SCREEN_WIDTH * 1.5;
const EXIT_Y = -SCREEN_HEIGHT;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

export interface SwipeDeckRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeUp: () => void;
}

interface SwipeDeckProps {
  profiles: DeckProfile[];
  currentIndex: number;
  onSwipe: (userId: string, action: SwipeAction) => void;
  onEmpty: () => void;
}

export const SwipeDeck = forwardRef<SwipeDeckRef, SwipeDeckProps>(
  function SwipeDeck({ profiles, currentIndex, onSwipe, onEmpty }, ref) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const isAnimating = useSharedValue(false);

    const currentProfile = profiles[currentIndex];

    const handleSwipeComplete = useCallback(
      (action: SwipeAction) => {
        if (currentProfile) {
          onSwipe(currentProfile.userId, action);
        }
      },
      [currentProfile, onSwipe]
    );

    const animateSwipe = useCallback(
      (action: SwipeAction) => {
        if (!currentProfile || isAnimating.value) return;

        isAnimating.value = true;

        const targetX =
          action === 'LIKE' ? EXIT_X : action === 'PASS' ? -EXIT_X : 0;
        const targetY = action === 'SUPER_LIKE' ? EXIT_Y : 0;

        translateX.value = withTiming(targetX, { duration: 300 }, (finished) => {
          if (finished) {
            isAnimating.value = false;
            translateX.value = 0;
            translateY.value = 0;
            runOnJS(handleSwipeComplete)(action);
          }
        });
        translateY.value = withTiming(targetY, { duration: 300 });
      },
      [currentProfile, handleSwipeComplete, translateX, translateY, isAnimating]
    );

    useImperativeHandle(
      ref,
      () => ({
        swipeLeft: () => animateSwipe('PASS'),
        swipeRight: () => animateSwipe('LIKE'),
        swipeUp: () => animateSwipe('SUPER_LIKE'),
      }),
      [animateSwipe]
    );

    const panGesture = Gesture.Pan()
      .onUpdate((event) => {
        if (isAnimating.value) return;
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      })
      .onEnd((event) => {
        if (isAnimating.value) return;

        const absX = Math.abs(event.translationX);
        const absY = Math.abs(event.translationY);

        // Check vertical swipe first (super like = swipe up)
        if (event.translationY < -SWIPE_Y_THRESHOLD && absY > absX) {
          runOnJS(animateSwipe)('SUPER_LIKE');
          return;
        }

        // Check horizontal swipe
        if (event.translationX > SWIPE_X_THRESHOLD) {
          runOnJS(animateSwipe)('LIKE');
          return;
        }

        if (event.translationX < -SWIPE_X_THRESHOLD) {
          runOnJS(animateSwipe)('PASS');
          return;
        }

        // Snap back
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
      });

    // Animated style for the top card
    const topCardStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${translateX.value * ROTATION_FACTOR}deg` },
      ],
    }));

    // "LIKE" overlay (right swipe)
    const likeOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_X_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      ),
    }));

    // "PASS" overlay (left swipe)
    const passOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_X_THRESHOLD, 0],
        [1, 0],
        Extrapolation.CLAMP
      ),
    }));

    // "SUPER" overlay (up swipe)
    const superOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateY.value,
        [-SWIPE_Y_THRESHOLD, 0],
        [1, 0],
        Extrapolation.CLAMP
      ),
    }));

    // Behind cards scale / offset
    const secondCardStyle = useAnimatedStyle(() => {
      const progress = interpolate(
        Math.max(Math.abs(translateX.value), Math.abs(translateY.value)),
        [0, SWIPE_X_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      );
      return {
        transform: [
          { scale: interpolate(progress, [0, 1], [0.95, 1]) },
          { translateY: interpolate(progress, [0, 1], [scale(10), 0]) },
        ],
      };
    });

    const thirdCardStyle = useAnimatedStyle(() => {
      const progress = interpolate(
        Math.max(Math.abs(translateX.value), Math.abs(translateY.value)),
        [0, SWIPE_X_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      );
      return {
        transform: [
          { scale: interpolate(progress, [0, 1], [0.9, 0.95]) },
          { translateY: interpolate(progress, [0, 1], [scale(20), scale(10)]) },
        ],
      };
    });

    // Visible stack: up to 3 cards
    const visibleProfiles = useMemo(() => {
      return profiles.slice(currentIndex, currentIndex + 3);
    }, [profiles, currentIndex]);

    if (visibleProfiles.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{'\uD83D\uDE4F'}</Text>
          <Text style={styles.emptyTitle}>No more profiles</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon for new connections
          </Text>
          <Button title="Refresh" onPress={onEmpty} variant="outline" />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Render cards in reverse order so the first card is on top */}
        {visibleProfiles.length >= 3 && (
          <Animated.View
            style={[styles.cardWrapper, styles.behindCard, thirdCardStyle]}
            pointerEvents="none"
          >
            <ProfileCard
              profile={visibleProfiles[2]}
              isInteractive={false}
            />
          </Animated.View>
        )}

        {visibleProfiles.length >= 2 && (
          <Animated.View
            style={[styles.cardWrapper, styles.behindCard, secondCardStyle]}
            pointerEvents="none"
          >
            <ProfileCard
              profile={visibleProfiles[1]}
              isInteractive={false}
            />
          </Animated.View>
        )}

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.cardWrapper, topCardStyle]}>
            <ProfileCard profile={visibleProfiles[0]} />

            {/* Swipe overlays */}
            <Animated.View style={[styles.overlay, styles.likeOverlay, likeOverlayStyle]}>
              <Text style={[styles.overlayLabel, styles.likeLabel]}>LIKE</Text>
            </Animated.View>

            <Animated.View style={[styles.overlay, styles.passOverlay, passOverlayStyle]}>
              <Text style={[styles.overlayLabel, styles.passLabel]}>PASS</Text>
            </Animated.View>

            <Animated.View style={[styles.overlay, styles.superOverlay, superOverlayStyle]}>
              <Text style={[styles.overlayLabel, styles.superLabel]}>SUPER</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardWrapper: {
    position: 'absolute',
    alignSelf: 'center',
  },
  behindCard: {
    zIndex: -1,
  },
  overlay: {
    position: 'absolute',
    top: scale(40),
    zIndex: 10,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(8),
    borderWidth: 3,
  },
  likeOverlay: {
    right: scale(20),
    borderColor: colors.success,
    transform: [{ rotateZ: '-15deg' }],
  },
  passOverlay: {
    left: scale(20),
    borderColor: colors.error,
    transform: [{ rotateZ: '15deg' }],
  },
  superOverlay: {
    alignSelf: 'center',
    left: '30%',
    borderColor: colors.lavender,
  },
  overlayLabel: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
  },
  likeLabel: {
    color: colors.success,
  },
  passLabel: {
    color: colors.error,
  },
  superLabel: {
    color: colors.lavender,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(32),
  },
  emptyIcon: {
    fontSize: scale(48),
    marginBottom: scale(8),
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.black,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: scale(8),
  },
});
