import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other'] as const;

const basicsSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be under 50 characters'),
  birthDate: z
    .string()
    .min(1, 'Birth date is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
  gender: z.enum(GENDER_OPTIONS, {
    errorMap: () => ({ message: 'Please select a gender' }),
  }),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().or(z.literal('')),
  height: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? val : undefined))
    .pipe(
      z
        .string()
        .regex(/^\d+$/, 'Must be a number')
        .optional()
        .or(z.undefined())
    ),
});

type BasicsForm = z.infer<typeof basicsSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const basicsResolver = zodResolver(basicsSchema as any);

export default function BasicsScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BasicsForm>({
    resolver: basicsResolver,
    defaultValues: {
      displayName: '',
      birthDate: '',
      gender: undefined,
      bio: '',
      height: '',
    },
  });

  const bioValue = watch('bio') || '';

  const onSubmit = (data: BasicsForm) => {
    updateProfile.mutate(
      {
        displayName: data.displayName,
        birthDate: data.birthDate,
        gender: data.gender,
        bio: data.bio || undefined,
        height: data.height ? parseInt(data.height, 10) : undefined,
      },
      {
        onSuccess: () => {
          router.push('/(auth)/onboarding/cultural');
        },
      }
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>The basics</Text>
          <Text style={styles.subtitle}>Tell us a little about yourself</Text>
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
            name="displayName"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Display Name"
                placeholder="What should people call you?"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.displayName?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="birthDate"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Birth Date"
                placeholder="YYYY-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.birthDate?.message}
                keyboardType="numbers-and-punctuation"
              />
            )}
          />

          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Gender</Text>
                <View style={styles.radioGroup}>
                  {GENDER_OPTIONS.map((option) => {
                    const isSelected = value === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => onChange(option)}
                        style={[
                          styles.radioButton,
                          isSelected && styles.radioButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.radioText,
                            isSelected && styles.radioTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {errors.gender?.message && (
                  <Text style={styles.errorText}>{errors.gender.message}</Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="bio"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Bio (optional)</Text>
                  <Text style={styles.charCount}>{bioValue.length}/500</Text>
                </View>
                <View
                  style={[
                    styles.textAreaWrapper,
                    errors.bio ? styles.textAreaError : null,
                  ]}
                >
                  <Input
                    placeholder="Share something about yourself..."
                    multiline
                    numberOfLines={4}
                    maxLength={500}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.bio?.message}
                    style={styles.textArea}
                    containerStyle={styles.textAreaContainer}
                  />
                </View>
              </View>
            )}
          />

          <Controller
            control={control}
            name="height"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Height in cm (optional)"
                placeholder="e.g. 170"
                keyboardType="numeric"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.height?.message}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  fieldContainer: {
    marginBottom: scale(16),
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray600,
    marginBottom: scale(6),
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.gray400,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  radioButton: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(18),
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: colors.gray300,
    backgroundColor: colors.white,
  },
  radioButtonSelected: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
  },
  radioText: {
    fontSize: fontSize.md,
    color: colors.gray600,
    fontWeight: fontWeight.medium,
  },
  radioTextSelected: {
    color: colors.white,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: scale(4),
    marginLeft: scale(4),
  },
  textAreaWrapper: {
    borderRadius: scale(12),
  },
  textAreaError: {},
  textArea: {
    minHeight: scale(100),
    textAlignVertical: 'top',
  },
  textAreaContainer: {
    marginBottom: 0,
  },
  footer: {
    marginTop: scale(24),
  },
});
