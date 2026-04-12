import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { useDiscoveryStore } from '../store';

interface Category {
  key: string;
  label: string;
}

const CATEGORIES: Category[] = [
  { key: 'all', label: 'All' },
  { key: 'going-out', label: 'Going Out Tonight \uD83C\uDF19' },
  { key: 'brunch', label: 'Brunch Date \uD83E\uDD42' },
  { key: 'coffee', label: 'Coffee Date \u2615' },
  { key: 'study', label: 'Study Buddy \uD83D\uDCDA' },
  { key: 'adventure', label: 'Adventure Partner \uD83C\uDFD4\uFE0F' },
  { key: 'festival', label: 'Festival Companion \uD83C\uDF89' },
  { key: 'losar', label: 'Losar Celebration \uD83C\uDF8A' },
  { key: 'teaching', label: 'Teaching Companion \uD83D\uDE4F' },
  { key: 'language', label: 'Language Exchange \uD83D\uDDE3\uFE0F' },
  { key: 'diaspora', label: 'Diaspora Connect \uD83C\uDF0D' },
  { key: 'homecoming', label: 'Homecoming \uD83C\uDFE0' },
  { key: 'cultural-event', label: 'Cultural Event Buddy \uD83C\uDFAD' },
];

export function CategoryChips() {
  const selectedCategory = useDiscoveryStore((s) => s.selectedCategory);
  const setSelectedCategory = useDiscoveryStore((s) => s.setSelectedCategory);

  const handleSelect = (key: string) => {
    if (key === 'all') {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(key === selectedCategory ? null : key);
    }
  };

  const isSelected = (key: string) => {
    if (key === 'all') return selectedCategory === null;
    return selectedCategory === key;
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const selected = isSelected(cat.key);
        return (
          <Pressable key={cat.key} onPress={() => handleSelect(cat.key)}>
            <MotiView
              animate={{
                backgroundColor: selected ? colors.lavender : colors.softWhite,
                scale: selected ? 1.02 : 1,
              }}
              transition={{ type: 'timing', duration: 200 }}
              style={styles.chip}
            >
              <Text
                style={[
                  styles.chipText,
                  selected ? styles.chipTextSelected : styles.chipTextUnselected,
                ]}
              >
                {cat.label}
              </Text>
            </MotiView>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    gap: scale(8),
    paddingVertical: scale(4),
  },
  chip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chipTextSelected: {
    color: colors.white,
  },
  chipTextUnselected: {
    color: colors.gray600,
  },
});
