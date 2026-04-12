import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Stack, useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../../src/theme/colors';
import { scale } from '../../../src/theme/responsive';
import { fontSize, fontWeight } from '../../../src/theme/typography';

const STEPS = [
  'basics',
  'cultural',
  'lifestyle',
  'photos',
  'prompts',
  'location',
  'categories',
] as const;

function getStepIndex(pathname: string): number {
  const segment = pathname.split('/').pop() || '';
  const idx = STEPS.indexOf(segment as (typeof STEPS)[number]);
  return idx >= 0 ? idx : 0;
}

function OnboardingHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const currentStep = getStepIndex(pathname) + 1;
  const totalSteps = STEPS.length;
  const progress = currentStep / totalSteps;

  return (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'<'} Back</Text>
          </Pressable>
          <Text style={styles.stepText}>
            Step {currentStep} of {totalSteps}
          </Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function OnboardingLayout() {
  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.softWhite },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  headerSafeArea: {
    backgroundColor: colors.white,
  },
  headerContainer: {
    paddingHorizontal: scale(20),
    paddingTop: scale(8),
    paddingBottom: scale(12),
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(12),
  },
  backButton: {
    minWidth: scale(60),
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  stepText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  progressTrack: {
    height: scale(4),
    backgroundColor: colors.gray200,
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.lavender,
    borderRadius: scale(2),
  },
});
