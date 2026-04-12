import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallStore } from '../../../src/modules/calling/store';
import { useCallSocket } from '../../../src/modules/calling/hooks';
import { CallScreen } from '../../../src/modules/calling/components/CallScreen';

export default function CallRoute() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const activeCall = useCallStore((s) => s.activeCall);
  const { endCall } = useCallSocket();

  // Navigate back when call ends
  useEffect(() => {
    if (!activeCall) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(app)/(tabs)/matches' as any);
      }
    }
  }, [activeCall, router]);

  if (!activeCall) return null;

  return <CallScreen />;
}
