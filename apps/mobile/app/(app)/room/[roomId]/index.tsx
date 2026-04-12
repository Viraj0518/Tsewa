import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { RoomScreen } from '../../../../src/modules/rooms/components/RoomScreen';
import { useRoom } from '../../../../src/modules/rooms/hooks';
import { useRoomStore } from '../../../../src/modules/rooms/store';
import { WatchPartyScreen } from '../../../../src/modules/watchParty/components/WatchPartyScreen';
import { colors } from '../../../../src/theme/colors';

export default function RoomDetailScreen() {
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

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </View>
    );
  }

  // If the room is a watch party, render WatchPartyScreen directly
  if (room?.isWatchParty) {
    return <WatchPartyScreen roomId={roomId} />;
  }

  return <RoomScreen roomId={roomId} />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.softWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
