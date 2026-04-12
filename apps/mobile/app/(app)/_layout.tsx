import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { useAuthStore } from '../../src/modules/auth/store';
import { connectSocket, disconnectSocket } from '../../src/lib/socket';
import { IncomingCallOverlay } from '../../src/modules/calling/components/IncomingCallOverlay';
import { useCallSocket } from '../../src/modules/calling/hooks';

export default function AppLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!isAuthenticated || !user?.isActive) {
      router.replace('/(auth)/welcome');
      return;
    }

    // Connect socket when entering the app
    if (accessToken) {
      connectSocket(accessToken);
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, user, accessToken]);

  // Initialize call socket listeners
  useCallSocket();

  if (!isAuthenticated || !user?.isActive) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="profile-view/[userId]"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="chat"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="call/[matchId]"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="room/[roomId]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="room/create"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="event/[eventId]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="event/create"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="feed/[postId]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="feed/create"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="settings/edit-profile"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="settings/language"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <IncomingCallOverlay />
    </View>
  );
}
