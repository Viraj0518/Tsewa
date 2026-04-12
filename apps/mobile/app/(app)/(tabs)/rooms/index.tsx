import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MotiView } from 'moti';
import { colors } from '../../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../../src/theme/typography';
import { scale } from '../../../../src/theme/responsive';
import { RoomList } from '../../../../src/modules/rooms/components/RoomList';

export default function RoomsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Rooms</Text>
          <Text style={styles.headerSubtitle}>Join live conversations</Text>
        </View>
        <Pressable
          onPress={() => router.push('/room/create')}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {/* Room List */}
      <RoomList />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/room/create')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        {({ pressed }) => (
          <MotiView
            animate={{
              scale: pressed ? 0.9 : 1,
            }}
            transition={{ type: 'timing', duration: 150 }}
            style={styles.fabInner}
          >
            <Text style={styles.fabText}>+</Text>
          </MotiView>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.black,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.gray500,
    marginTop: 4,
  },
  addButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.lavender,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: fontWeight.bold,
    marginTop: -2,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fabPressed: {
    opacity: 0.95,
  },
  fabInner: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: colors.peach,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.peachDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontWeight: fontWeight.bold,
    marginTop: -2,
  },
});
