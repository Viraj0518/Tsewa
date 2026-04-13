import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { PLACEHOLDER_IMAGES } from '../../../constants/images';
import type { DeckProfile } from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - scale(32);
const PHOTO_HEIGHT = CARD_WIDTH * 1.15;

interface ProfileCardProps {
  profile: DeckProfile;
  isInteractive?: boolean;
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const REGION_COLORS: Record<string, string> = {
  'India': colors.peach,
  'Nepal': '#6BBFA3',
  'North America': colors.lavender,
  'Europe': colors.lavenderDark,
  'Australia & NZ': '#5BA8C8',
  'East Asia': '#E8A87C',
  'Tibet': '#C4A35A',
};

function RegionBadge({ region }: { region: string }) {
  const bg = REGION_COLORS[region] || colors.lavenderLight;
  return (
    <View style={[styles.regionBadge, { backgroundColor: bg }]}>
      <Text style={styles.regionBadgeText}>{region}</Text>
    </View>
  );
}

export function ProfileCard({ profile, isInteractive = true }: ProfileCardProps) {
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const age = calculateAge(profile.birthDate);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActivePhotoIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handlePress = () => {
    if (isInteractive) {
      router.push(`/profile-view/${profile.userId}`);
    }
  };

  const firstPrompt = profile.prompts?.[0];

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      {/* Photo carousel */}
      <View style={styles.photoContainer}>
        <FlatList
          ref={flatListRef}
          data={profile.photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.url || PLACEHOLDER_IMAGES.avatar }}
              style={styles.photo}
              resizeMode="cover"
              defaultSource={{ uri: PLACEHOLDER_IMAGES.avatar }}
            />
          )}
        />

        {/* Dot indicators */}
        {profile.photos.length > 1 && (
          <View style={styles.dotsContainer}>
            {profile.photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activePhotoIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Bottom overlay */}
        <View style={styles.photoOverlay}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {profile.displayName}, {age}
            </Text>
            {profile.region && <RegionBadge region={profile.region} />}
          </View>
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        {profile.bio ? (
          <Text style={styles.bioText} numberOfLines={2}>
            {profile.bio}
          </Text>
        ) : null}

        {firstPrompt && (
          <View style={styles.promptCard}>
            <Text style={styles.promptQuestion}>{firstPrompt.question}</Text>
            <Text style={styles.promptAnswer} numberOfLines={2}>
              {firstPrompt.answer}
            </Text>
          </View>
        )}

        {/* Cultural badges */}
        <View style={styles.badgesRow}>
          {profile.dialect ? (
            <View style={styles.culturalBadge}>
              <Text style={styles.culturalBadgeText}>{profile.dialect}</Text>
            </View>
          ) : null}
          {profile.buddhistPractice ? (
            <View style={styles.culturalBadge}>
              <Text style={styles.culturalBadgeText}>{profile.buddhistPractice}</Text>
            </View>
          ) : null}
          {profile.hometown ? (
            <View style={styles.culturalBadge}>
              <Text style={styles.culturalBadgeText}>{profile.hometown}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.white,
    borderRadius: scale(20),
    overflow: 'hidden',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: scale(16),
    elevation: 6,
  },
  photoContainer: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
    position: 'relative',
  },
  photo: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
  },
  dotsContainer: {
    position: 'absolute',
    top: scale(12),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(6),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: scale(24),
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    paddingTop: scale(40),
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  nameText: {
    ...typography.h2,
    color: colors.white,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  regionBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(12),
  },
  regionBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  infoSection: {
    padding: scale(16),
    gap: scale(10),
  },
  bioText: {
    ...typography.body,
    color: colors.gray600,
  },
  promptCard: {
    backgroundColor: colors.softWhite,
    borderRadius: scale(12),
    padding: scale(12),
  },
  promptQuestion: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.lavender,
    marginBottom: scale(4),
  },
  promptAnswer: {
    ...typography.body,
    color: colors.black,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  culturalBadge: {
    backgroundColor: colors.lavenderLight,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(10),
  },
  culturalBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
