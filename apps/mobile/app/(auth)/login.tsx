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
import { useLogin } from '../../src/modules/auth/hooks';
import { colors } from '../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../src/theme/typography';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const loginResolver = zodResolver(loginSchema as any);

export default function LoginScreen() {
  const router = useRouter();
  const loginMutation = useLogin();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: loginResolver,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
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
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to your Tsewa account</Text>
          </View>

          {loginMutation.isError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>
                {loginMutation.error?.message || 'Login failed. Please try again.'}
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
                  placeholder="Enter your password"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                  icon="*"
                />
              )}
            />

            <Button
              title="Log In"
              variant="primary"
              size="lg"
              fullWidth
              onPress={handleSubmit(onSubmit)}
              loading={loginMutation.isPending}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
            </Text>
            <Pressable onPress={() => router.replace('/(auth)/register')}>
              <Text style={styles.footerLink}>Sign up</Text>
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
    color: colors.lavender,
    fontWeight: fontWeight.semibold,
  },
});
