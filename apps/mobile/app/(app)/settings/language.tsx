import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';
import { scale } from '../../../src/theme/responsive';

type Language = 'en' | 'bo';

interface LanguageOptionProps {
  value: Language;
  label: string;
  nativeLabel: string;
  preview: string;
  selected: boolean;
  onPress: () => void;
}

function LanguageOption({
  value,
  label,
  nativeLabel,
  preview,
  selected,
  onPress,
}: LanguageOptionProps) {
  return (
    <Pressable onPress={onPress}>
      <MotiView
        animate={{
          borderColor: selected ? colors.lavender : colors.gray200,
          backgroundColor: selected ? colors.lavender + '08' : colors.white,
        }}
        transition={{ type: 'timing', duration: 200 }}
        style={styles.languageCard}
      >
        <View style={styles.languageHeader}>
          <View style={styles.languageInfo}>
            <Text style={styles.languageName}>{label}</Text>
            <Text style={styles.languageNative}>{nativeLabel}</Text>
          </View>
          <View
            style={[
              styles.radio,
              selected && styles.radioSelected,
            ]}
          >
            {selected && <View style={styles.radioInner} />}
          </View>
        </View>
        <View style={styles.previewSection}>
          <Text style={styles.previewLabel}>Preview</Text>
          <Text style={styles.previewText}>{preview}</Text>
        </View>
      </MotiView>
    </Pressable>
  );
}

export default function LanguageScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Language</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>
          Choose your preferred language for the app interface.
        </Text>

        <LanguageOption
          value="en"
          label="English"
          nativeLabel="English"
          preview="Welcome to Tsewa - connecting Tibetan hearts worldwide."
          selected={language === 'en'}
          onPress={() => setLanguage('en')}
        />

        <LanguageOption
          value="bo"
          label="Tibetan"
          nativeLabel="བོད་སྐད"
          preview="ཚེ་བའི་ནང་དུ་བསུ་བ་ཞུ། བོད་མིའི་སེམས་ཅན་འཛམ་གླིང་ཡོངས་སུ་མཐུད་པ།"
          selected={language === 'bo'}
          onPress={() => setLanguage('bo')}
        />

        <Text style={styles.footnote}>
          More languages coming soon. Tibetan language support is in beta.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backText: {
    ...typography.body,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.black,
  },
  content: {
    padding: 24,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray500,
    marginBottom: 24,
    lineHeight: 22,
  },
  languageCard: {
    borderRadius: scale(16),
    borderWidth: 2,
    padding: 20,
    marginBottom: 16,
  },
  languageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    ...typography.h3,
    color: colors.black,
  },
  languageNative: {
    ...typography.body,
    color: colors.gray400,
    marginTop: 2,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.lavender,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.lavender,
  },
  previewSection: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: 14,
  },
  previewLabel: {
    ...typography.small,
    color: colors.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  previewText: {
    ...typography.body,
    color: colors.gray600,
    lineHeight: 22,
  },
  footnote: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'center',
    marginTop: 16,
  },
});
