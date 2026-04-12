import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { useUpdateProfile } from '../../../src/modules/profile/hooks';
import { colors } from '../../../src/theme/colors';
import { scale } from '../../../src/theme/responsive';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';

const REGIONS = [
  { value: 'U-Tsang', label: 'U-Tsang', tibetan: '\u0F51\u0F56\u0F74\u0F66\u0F0B\u0F42\u0F59\u0F44' },
  { value: 'Kham', label: 'Kham', tibetan: '\u0F41\u0F58\u0F66' },
  { value: 'Amdo', label: 'Amdo', tibetan: '\u0F68\u0F0B\u0F58\u0F51\u0F7C' },
  { value: 'Diaspora', label: 'Diaspora', tibetan: '\u0F58\u0F50\u0F60\u0F0B\u0F60\u0F41\u0F7C\u0F62' },
] as const;

const DIALECTS = ['Lhasa', 'Kham', 'Amdo', 'Other'] as const;

const PRACTICES = ['Gelug', 'Kagyu', 'Nyingma', 'Sakya', 'Bon', 'Secular', 'Other'] as const;

const culturalSchema = z.object({
  region: z.string().min(1, 'Please select a region'),
  dialect: z.string().min(1, 'Please select a dialect'),
  buddhistPractice: z.string().min(1, 'Please select a practice'),
  hometown: z.string().optional().or(z.literal('')),
});

type CulturalForm = z.infer<typeof culturalSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const culturalResolver = zodResolver(culturalSchema as any);

export default function CulturalScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CulturalForm>({
    resolver: culturalResolver,
    defaultValues: {
      region: '',
      dialect: '',
      buddhistPractice: '',
      hometown: '',
    },
  });

  const onSubmit = (data: CulturalForm) => {
    updateProfile.mutate(
      {
        region: data.region,
        dialect: data.dialect,
        buddhistPractice: data.buddhistPractice,
        hometown: data.hometown || undefined,
      },
      {
        onSuccess: () => {
          router.push('/(auth)/onboarding/lifestyle');
        },
      }
    );
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cultural roots</Text>
        <Text style={styles.subtitle}>Where do you come from?</Text>
      </View>

      {updateProfile.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {updateProfile.error?.message || 'Something went wrong. Please try again.'}
          </Text>
        </View>
      )}

      {/* Region Selector */}
      <Controller
        control={control}
        name="region"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Region</Text>
            <View style={styles.regionGrid}>
              {REGIONS.map((region) => {
                const isSelected = value === region.value;
                return (
                  <Pressable
                    key={region.value}
                    onPress={() => onChange(region.value)}
                    style={[
                      styles.regionCard,
                      isSelected && styles.regionCardSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.regionTibetan,
                        isSelected && styles.regionTibetanSelected,
                      ]}
                    >
                      {region.tibetan}
                    </Text>
                    <Text
                      style={[
                        styles.regionLabel,
                        isSelected && styles.regionLabelSelected,
                      ]}
                    >
                      {region.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.region?.message && (
              <Text style={styles.errorText}>{errors.region.message}</Text>
            )}
          </View>
        )}
      />

      {/* Dialect Picker */}
      <Controller
        control={control}
        name="dialect"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dialect</Text>
            <View style={styles.chipRow}>
              {DIALECTS.map((dialect) => {
                const isSelected = value === dialect;
                return (
                  <Pressable
                    key={dialect}
                    onPress={() => onChange(dialect)}
                    style={[
                      styles.chip,
                      isSelected && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextSelected,
                      ]}
                    >
                      {dialect}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.dialect?.message && (
              <Text style={styles.errorText}>{errors.dialect.message}</Text>
            )}
          </View>
        )}
      />

      {/* Buddhist Practice */}
      <Controller
        control={control}
        name="buddhistPractice"
        render={({ field: { onChange, value } }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buddhist Practice</Text>
            <View style={styles.practiceGrid}>
              {PRACTICES.map((practice) => {
                const isSelected = value === practice;
                return (
                  <Pressable
                    key={practice}
                    onPress={() => onChange(practice)}
                    style={[
                      styles.practiceChip,
                      isSelected && styles.practiceChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.practiceText,
                        isSelected && styles.practiceTextSelected,
                      ]}
                    >
                      {practice}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.buddhistPractice?.message && (
              <Text style={styles.errorText}>{errors.buddhistPractice.message}</Text>
            )}
          </View>
        )}
      />

      {/* Hometown */}
      <View style={styles.section}>
        <Controller
          control={control}
          name="hometown"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Hometown (optional)"
              placeholder="Where are you originally from?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.hometown?.message}
            />
          )}
        />
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSubmit(onSubmit)}
          loading={updateProfile.isPending}
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
    marginBottom: scale(24),
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
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  section: {
    marginBottom: scale(24),
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.lavender,
    marginBottom: scale(12),
  },
  regionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  regionCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    paddingVertical: scale(20),
    paddingHorizontal: scale(16),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  regionCardSelected: {
    borderColor: colors.peach,
    backgroundColor: colors.lavender,
  },
  regionTibetan: {
    fontSize: fontSize.xl,
    color: colors.black,
    marginBottom: scale(6),
    textAlign: 'center',
  },
  regionTibetanSelected: {
    color: colors.white,
  },
  regionLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.gray600,
  },
  regionLabelSelected: {
    color: colors.white,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  chip: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(18),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  chipSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
  },
  chipText: {
    fontSize: fontSize.md,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  chipTextSelected: {
    color: colors.white,
  },
  practiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  practiceChip: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  practiceChipSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
  },
  practiceText: {
    fontSize: fontSize.md,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  practiceTextSelected: {
    color: colors.white,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: scale(4),
    marginLeft: scale(4),
  },
  footer: {
    marginTop: scale(8),
  },
});
