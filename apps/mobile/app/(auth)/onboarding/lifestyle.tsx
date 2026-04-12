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

const LANGUAGE_OPTIONS = [
  'Tibetan',
  'English',
  'Mandarin',
  'Hindi',
  'Nepali',
  'French',
  'German',
  'Other',
] as const;

const DIET_OPTIONS = ['Vegetarian', 'Vegan', 'Non-Vegetarian', 'Flexible'] as const;

const FAMILY_OPTIONS = [
  'Want Children',
  'Open to Children',
  "Don't Want",
  'Have Children',
  'Undecided',
] as const;

const lifestyleSchema = z.object({
  education: z.string().optional().or(z.literal('')),
  profession: z.string().optional().or(z.literal('')),
  languages: z.array(z.string()).min(1, 'Select at least one language'),
  diet: z.string().optional().or(z.literal('')),
  familyViews: z.string().optional().or(z.literal('')),
});

type LifestyleForm = z.infer<typeof lifestyleSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lifestyleResolver = zodResolver(lifestyleSchema as any);

export default function LifestyleScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LifestyleForm>({
    resolver: lifestyleResolver,
    defaultValues: {
      education: '',
      profession: '',
      languages: [],
      diet: '',
      familyViews: '',
    },
  });

  const onSubmit = (data: LifestyleForm) => {
    updateProfile.mutate(
      {
        education: data.education || undefined,
        profession: data.profession || undefined,
        languages: data.languages,
        diet: data.diet || undefined,
        familyViews: data.familyViews || undefined,
      },
      {
        onSuccess: () => {
          router.push('/(auth)/onboarding/photos');
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
        <Text style={styles.title}>Lifestyle</Text>
        <Text style={styles.subtitle}>Share your interests and values</Text>
      </View>

      {updateProfile.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {updateProfile.error?.message || 'Something went wrong. Please try again.'}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Controller
          control={control}
          name="education"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Education (optional)"
              placeholder="e.g. University of Delhi, BA Tibetan Studies"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.education?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="profession"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Profession (optional)"
              placeholder="What do you do?"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.profession?.message}
            />
          )}
        />

        {/* Languages Multi-Select */}
        <Controller
          control={control}
          name="languages"
          render={({ field: { onChange, value } }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages</Text>
              <View style={styles.chipGrid}>
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = value.includes(lang);
                  return (
                    <Pressable
                      key={lang}
                      onPress={() => {
                        if (isSelected) {
                          onChange(value.filter((l: string) => l !== lang));
                        } else {
                          onChange([...value, lang]);
                        }
                      }}
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
                        {lang}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {errors.languages?.message && (
                <Text style={styles.errorText}>{errors.languages.message}</Text>
              )}
            </View>
          )}
        />

        {/* Diet */}
        <Controller
          control={control}
          name="diet"
          render={({ field: { onChange, value } }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Diet</Text>
              <View style={styles.chipGrid}>
                {DIET_OPTIONS.map((diet) => {
                  const isSelected = value === diet;
                  return (
                    <Pressable
                      key={diet}
                      onPress={() => onChange(isSelected ? '' : diet)}
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
                        {diet}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        />

        {/* Family Views */}
        <Controller
          control={control}
          name="familyViews"
          render={({ field: { onChange, value } }) => (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Family Views</Text>
              <View style={styles.chipGrid}>
                {FAMILY_OPTIONS.map((option) => {
                  const isSelected = value === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => onChange(isSelected ? '' : option)}
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
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
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
  form: {
    gap: scale(4),
  },
  section: {
    marginBottom: scale(20),
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.lavender,
    marginBottom: scale(12),
  },
  chipGrid: {
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
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: scale(4),
    marginLeft: scale(4),
  },
  footer: {
    marginTop: scale(16),
  },
});
