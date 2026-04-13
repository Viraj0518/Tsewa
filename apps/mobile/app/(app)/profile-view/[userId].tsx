import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';
import { scale } from '../../../src/theme/responsive';
import { PLACEHOLDER_IMAGES } from '../../../src/constants/images';
import { api } from '../../../src/lib/api';
import { Button } from '../../../src/components/ui/Button';
import type { DeckProfile } from '../../../src/modules/discovery/api';
import { useSwipe } from '../../../src/modules/discovery/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = SCREEN_WIDTH * 1.1;

const REGION_COLORS: Record<string, string> = {
  'U-Tsang': colors.lavender,
  'Kham': colors.peach,
  'Amdo': '#6BBFA3',
  'Diaspora': colors.lavenderDark,
};

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

function RegionBadge({ region }: { region: string }) {
  const bg = REGION_COLORS[region] || colors.lavenderLight;
  return (
    <View style={[styles.regionBadge, { backgroundColor: bg }]}>
      <Text style={styles.regionBadgeText}>{region}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | string[] | null }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null;
  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{displayValue}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function ProfileViewScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const swipeMutation = useSwipe();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data } = await api.get<DeckProfile>(`/discovery/profile/${userId}`);
      return data;
    },
    enabled: !!userId,
  });

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActivePhotoIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleLike = () => {
    if (!userId) return;
    swipeMutation.mutate({ targetUserId: userId, action: 'LIKE' });
    router.back();
  };

  const handlePass = () => {
    if (!userId) return;
    swipeMutation.mutate({ targetUserId: userId, action: 'PASS' });
    router.back();
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  const age = calculateAge(profile.birthDate);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
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

          {/* Dots */}
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

          {/* Back button */}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </Pressable>
        </View>

        {/* Name and age */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>
              {profile.displayName}, {age}
            </Text>
            {profile.region && <RegionBadge region={profile.region} />}
          </View>
          {profile.currentCity && (
            <Text style={styles.locationText}>
              {profile.currentCity}
              {profile.currentCountry ? `, ${profile.currentCountry}` : ''}
            </Text>
          )}
        </View>

        {/* Bio */}
        {profile.bio && (
          <View style={styles.section}>
            <SectionHeader title="About" />
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        {/* Cultural details */}
        <View style={styles.section}>
          <SectionHeader title="Cultural Background" />
          <View style={styles.detailsCard}>
            <DetailRow label="Region" value={profile.region} />
            <DetailRow label="Dialect" value={profile.dialect} />
            <DetailRow label="Buddhist Practice" value={profile.buddhistPractice} />
            <DetailRow label="Hometown" value={profile.hometown} />
          </View>
        </View>

        {/* Lifestyle details */}
        <View style={styles.section}>
          <SectionHeader title="Lifestyle" />
          <View style={styles.detailsCard}>
            <DetailRow label="Education" value={profile.education} />
            <DetailRow label="Profession" value={profile.profession} />
            <DetailRow label="Languages" value={profile.languages} />
            <DetailRow label="Diet" value={profile.diet} />
            <DetailRow label="Family views" value={profile.familyViews} />
          </View>
        </View>

        {/* Conversation Prompts */}
        {profile.prompts && profile.prompts.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Conversation Starters" />
            {profile.prompts.slice(0, 3).map((prompt, index) => (
              <View key={index} style={styles.promptCard}>
                <Text style={styles.promptQuestion}>{prompt.question}</Text>
                <Text style={styles.promptAnswer}>{prompt.answer}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category badges */}
        {profile.categories && profile.categories.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Looking For" />
            <View style={styles.categoriesRow}>
              {profile.categories.map((cat) => (
                <View key={cat} style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Spacer for bottom buttons */}
        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Bottom action buttons */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        <View style={styles.bottomActions}>
          <Button
            title="Pass"
            onPress={handlePass}
            variant="outline"
            size="lg"
            style={styles.actionButton}
          />
          <Button
            title="Like"
            onPress={handleLike}
            variant="primary"
            size="lg"
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.softWhite,
  },
  loadingText: {
    ...typography.body,
    color: colors.gray500,
  },
  photoContainer: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
    position: 'relative',
  },
  photo: {
    width: SCREEN_WIDTH,
    height: PHOTO_HEIGHT,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: scale(16),
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
  backButton: {
    position: 'absolute',
    top: scale(48),
    left: scale(16),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: fontSize.xl,
    color: colors.white,
  },
  nameSection: {
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    paddingBottom: scale(8),
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  nameText: {
    ...typography.h1,
    color: colors.black,
  },
  regionBadge: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  regionBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
  locationText: {
    ...typography.body,
    color: colors.gray500,
    marginTop: scale(4),
  },
  section: {
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
  },
  sectionHeader: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginBottom: scale(10),
  },
  bioText: {
    ...typography.bodyLarge,
    color: colors.gray600,
    lineHeight: fontSize.lg * 1.6,
  },
  detailsCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    gap: scale(12),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...typography.body,
    color: colors.gray500,
  },
  detailValue: {
    ...typography.body,
    color: colors.black,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  promptCard: {
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(10),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  promptQuestion: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.lavender,
    marginBottom: scale(6),
  },
  promptAnswer: {
    ...typography.body,
    color: colors.black,
    lineHeight: fontSize.md * 1.5,
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  categoryBadge: {
    backgroundColor: colors.lavenderLight,
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(14),
  },
  categoryBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingTop: scale(12),
    paddingBottom: scale(8),
    gap: scale(12),
  },
  actionButton: {
    flex: 1,
  },
});
