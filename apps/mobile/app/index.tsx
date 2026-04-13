import { View, ActivityIndicator } from 'react-native';
import { Redirect, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '../src/modules/auth/store';
import { colors } from '../src/theme/colors';

export default function Index() {
  const rootNavigationState = useRootNavigationState();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!rootNavigationState?.key) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user && !user.isActive) {
    return <Redirect href="/(auth)/waitlist" />;
  }

  return <Redirect href="/(app)/(tabs)/discover" />;
}
