import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/modules/auth/store';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (user && !user.isActive) {
    return <Redirect href="/(auth)/waitlist" />;
  }

  return <Redirect href="/(app)/(tabs)/discover" />;
}
