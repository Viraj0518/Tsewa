import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../../src/components/ui/Button';
import { useUpdateProfile, useUpdateCategories } from '../../../src/modules/profile/hooks';
import { colors } from '../../../src/theme/colors';
import { scale } from '../../../src/theme/responsive';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';

const DATING_CATEGORIES = [
  { id: 'going-out-tonight', label: 'Going Out Tonight', emoji: '\uD83C\uDF19' },
  { id: 'brunch-date', label: 'Brunch Date', emoji: '\uD83E\uDD42' },
  { id: 'coffee-date', label: 'Coffee Date', emoji: '\u2615' },
  { id: 'study-buddy', label: 'Study Buddy', emoji: '\uD83D\uDCDA' },
  { id: 'adventure-partner', label: 'Adventure Partner', emoji: '\uD83C\uDFD4\uFE0F' },
  { id: 'festival-companion', label: 'Festival Companion', emoji: '\uD83C\uDF89' },
] as const;

const CULTURAL_CATEGORIES = [
  { id: 'losar-celebration', label: 'Losar Celebration', emoji: '\uD83C\uDF8A' },
  { id: 'teaching-companion', label: 'Teaching Companion', emoji: '\uD83D\uDE4F' },
  { id: 'language-exchange', label: 'Language Exchange', emoji: '\uD83D\uDDE3\uFE0F' },
  { id: 'diaspora-connect', label: 'Diaspora Connect', emoji: '\uD83C\uDF0D' },
  { id: 'homecoming', label: 'Homecoming', emoji: '\uD83C\uDFE0' },
  { id: 'cultural-event-buddy', label: 'Cultural Event Buddy', emoji: '\uD83C\uDFAD' },
] as const;

const MAX_SELECTIONS = 3;

export default function CategoriesScreen() {
  const router = useRouter();
  const updateCategories = useUpdateCategories();
  const updateProfile = useUpdateProfile();

  const [selected, setSelected] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((s) => s !== id);
      }
      if (prev.length >= MAX_SELECTIONS) {
        return prev;
      }
      return [...prev, id];
    });
  };

  const onFinish = () => {
    updateCategories.mutate(selected, {
      onSuccess: () => {
        // Mark onboarding as complete
        updateProfile.mutate(
          { categories: selected },
          {
            onSuccess: () => {
              // Navigate to the main app
              router.replace('/(tabs)' as never);
            },
            onError: () => {
              // Even if final update fails, try navigating
              router.replace('/(tabs)' as never);
            },
          }
        );
      },
      onError: (error) => {
        Alert.alert(
          'Error',
          error?.message || 'Could not save categories. Please try again.'
        );
      },
    });
  };

  const renderCategoryCard = (
    item: { id: string; label: string; emoji: string },
  ) => {
    const isSelected = selected.includes(item.id);
    const isDisabled = !isSelected && selected.length >= MAX_SELECTIONS;

    return (
      <Pressable
        key={item.id}
        onPress={() => toggleCategory(item.id)}
        style={[
          styles.categoryCard,
          isSelected && styles.categoryCardSelected,
          isDisabled && styles.categoryCardDisabled,
        ]}
      >
        <Text style={styles.categoryEmoji}>{item.emoji}</Text>
        <Text
          style={[
            styles.categoryLabel,
            isSelected && styles.categoryLabelSelected,
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>What are you open to?</Text>
        <Text style={styles.subtitle}>
          Choose up to {MAX_SELECTIONS} categories that interest you
        </Text>
      </View>

      <View style={styles.counterBadge}>
        <Text style={styles.counterText}>
          {selected.length}/{MAX_SELECTIONS} selected
        </Text>
      </View>

      {/* Dating Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dating</Text>
        <View style={styles.categoryGrid}>
          {DATING_CATEGORIES.map(renderCategoryCard)}
        </View>
      </View>

      {/* Cultural Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cultural</Text>
        <View style={styles.categoryGrid}>
          {CULTURAL_CATEGORIES.map(renderCategoryCard)}
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Finish Setup"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={onFinish}
          disabled={selected.length === 0}
          loading={updateCategories.isPending || updateProfile.isPending}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(32),
  },
  header: {
    marginBottom: scale(16),
  },
  title: {
    ...typography.h1,
    color: colors.black,
    marginBottom: scale(8),
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.gray500,
  },
  counterBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.lavenderLight,
    paddingVertical: scale(6),
    paddingHorizontal: scale(14),
    borderRadius: scale(16),
    marginBottom: scale(20),
  },
  counterText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.lavenderDark,
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.lavender,
    marginBottom: scale(12),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  categoryCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    paddingVertical: scale(18),
    paddingHorizontal: scale(14),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  categoryCardSelected: {
    borderColor: colors.peach,
    backgroundColor: colors.lavender,
  },
  categoryCardDisabled: {
    opacity: 0.45,
  },
  categoryEmoji: {
    fontSize: scale(28),
    marginBottom: scale(8),
  },
  categoryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray600,
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: colors.white,
  },
  footer: {
    marginTop: scale(8),
  },
});
