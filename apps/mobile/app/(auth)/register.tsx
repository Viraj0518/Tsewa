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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useRegister } from '../../src/modules/auth/hooks';
import { colors } from '../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../src/theme/typography';

const registerSchema = z
  .object({
    email: z.string().min(1, 'Email is required').email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    inviteCode: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registerResolver = zodResolver(registerSchema as any);

export default function RegisterScreen() {
  const router = useRouter();
  const registerMutation = useRegister();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: registerResolver,
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
    },
  });

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      inviteCode: data.inviteCode || undefined,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Join the Tsewa community</Text>
          </View>

          {registerMutation.isError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>
                {registerMutation.error?.message || 'Registration failed. Please try again.'}
              </Text>
            </View>
          )}

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                  icon="@"
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Password"
                  placeholder="At least 8 characters"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  icon="*"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                  icon="*"
                />
              )}
            />

            <Controller
              control={control}
              name="inviteCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Invite Code (optional)"
                  placeholder="Enter invite code"
                  autoCapitalize="characters"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.inviteCode?.message}
                />
              )}
            />

            <Button
              title="Create Account"
              variant="secondary"
              size="lg"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              loading={registerMutation.isPending}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  backButton: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    ...typography.h1,
    color: colors.black,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.gray500,
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  form: {
    gap: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: fontSize.md,
    color: colors.gray500,
  },
  footerLink: {
    fontSize: fontSize.md,
    color: colors.peach,
    fontWeight: fontWeight.semibold,
  },
});
