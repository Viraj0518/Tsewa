import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { useResponsive } from '../../../theme/responsive';
import { PLACEHOLDER_IMAGES } from '../../../constants/images';
import type { DeckProfile } from '../api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DailyPickGridProps {
  picks: DeckProfile[];
  refreshesAt: string;
}

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

function CountdownTimer({ refreshesAt }: { refreshesAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(refreshesAt).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Refreshing...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [refreshesAt]);

  return (
    <View style={styles.timerContainer}>
      <Text style={styles.timerLabel}>New picks in</Text>
      <Text style={styles.timerValue}>{timeLeft}</Text>
    </View>
  );
}

function PickCard({ profile, cardWidth }: { profile: DeckProfile; cardWidth: number }) {
  const router = useRouter();
  const age = calculateAge(profile.birthDate);
  const mainPhoto = profile.photos.find((p) => p.isMain) || profile.photos[0];
  const regionColor = REGION_COLORS[profile.region] || colors.lavenderLight;

  return (
    <Pressable
      style={[styles.pickCard, { width: cardWidth }]}
      onPress={() => router.push(`/profile-view/${profile.userId}`)}
    >
      <Image
        source={{ uri: mainPhoto?.url || PLACEHOLDER_IMAGES.avatar }}
        style={[styles.pickPhoto, { width: cardWidth, height: cardWidth * 1.3 }]}
        resizeMode="cover"
      />
      <View style={styles.pickOverlay}>
        <Text style={styles.pickName}>
          {profile.displayName}, {age}
        </Text>
        {profile.region && (
          <View style={[styles.pickRegionBadge, { backgroundColor: regionColor }]}>
            <Text style={styles.pickRegionText}>{profile.region}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

export function DailyPickGrid({ picks, refreshesAt }: DailyPickGridProps) {
  const { isMobile } = useResponsive();
  const numColumns = isMobile ? 2 : 3;
  const gap = scale(12);
  const horizontalPadding = scale(16);
  const cardWidth =
    (SCREEN_WIDTH - horizontalPadding * 2 - gap * (numColumns - 1)) / numColumns;

  return (
    <View style={styles.container}>
      <CountdownTimer refreshesAt={refreshesAt} />
      <FlatList
        data={picks}
        numColumns={numColumns}
        key={numColumns}
        keyExtractor={(item) => item.userId}
        contentContainerStyle={[styles.gridContent, { paddingHorizontal: horizontalPadding }]}
        columnWrapperStyle={{ gap }}
        ItemSeparatorComponent={() => <View style={{ height: gap }} />}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PickCard profile={item} cardWidth={cardWidth} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
  },
  timerLabel: {
    ...typography.caption,
    color: colors.gray500,
  },
  timerValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.lavender,
  },
  gridContent: {
    paddingBottom: scale(24),
  },
  pickCard: {
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pickPhoto: {
    borderTopLeftRadius: scale(16),
    borderTopRightRadius: scale(16),
  },
  pickOverlay: {
    padding: scale(10),
    gap: scale(4),
  },
  pickName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  pickRegionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  pickRegionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.white,
  },
});
