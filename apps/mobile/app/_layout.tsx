import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '../src/lib/queryClient';
import { useAuthStore } from '../src/modules/auth/store';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { colors } from '../src/theme/colors';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const rootNavigationState = useRootNavigationState();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!isHydrated) return;
    if (!rootNavigationState?.key) return;

    // Defer navigation to next tick to ensure layout is fully mounted
    const timeout = setTimeout(() => {
      try {
        const firstSegment = segments[0] as string | undefined;
        const inAuthGroup = firstSegment === '(auth)';

        if (!isAuthenticated && !inAuthGroup) {
          router.replace('/(auth)/welcome');
        } else if (isAuthenticated && user && !user.isActive) {
          const allSegments = segments as string[];
          if (allSegments[0] !== '(auth)' || allSegments[1] !== 'waitlist') {
            router.replace('/(auth)/waitlist');
          }
        } else if (isAuthenticated && user?.isActive && inAuthGroup) {
          router.replace('/(app)/(tabs)/discover');
        }
      } catch (e) {
        console.warn('Navigation deferred:', e);
      }
    }, 0);
    return () => clearTimeout(timeout);
  }, [isAuthenticated, isHydrated, user, segments, rootNavigationState?.key]);

  // On web, trap browser back button so authenticated-but-inactive users
  // can't navigate away from the waitlist page to welcome/register.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!isAuthenticated || !user || user.isActive) return;

    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, user?.isActive]);

  if (!isHydrated || !rootNavigationState?.key) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <AuthGate />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.softWhite,
  },
});
