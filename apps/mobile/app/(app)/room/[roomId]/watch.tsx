import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { WatchPartyScreen } from '../../../../src/modules/watchParty/components/WatchPartyScreen';
import { useRoom } from '../../../../src/modules/rooms/hooks';
import { useRoomStore } from '../../../../src/modules/rooms/store';
import { colors } from '../../../../src/theme/colors';

export default function WatchPartyRoute() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const { data: room, isLoading } = useRoom(roomId ?? '');
  const setActiveRoom = useRoomStore((s) => s.setActiveRoom);
  const reset = useRoomStore((s) => s.reset);

  useEffect(() => {
    if (roomId) {
      setActiveRoom(roomId);
    }
    return () => {
      reset();
    };
  }, [roomId]);

  if (!roomId) {
    router.back();
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  // If room loaded but is not a watch party, redirect to regular room
  if (room && !room.isWatchParty) {
    router.replace(`/room/${roomId}`);
    return null;
  }

  return <WatchPartyScreen roomId={roomId} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
