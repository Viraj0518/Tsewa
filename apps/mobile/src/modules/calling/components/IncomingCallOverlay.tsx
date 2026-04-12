import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView, AnimatePresence } from 'moti';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { useCallStore } from '../store';
import { useCallSocket } from '../hooks';

function CallerAvatar({
  uri,
  name,
}: {
  uri: string | null;
  name: string;
}) {
  const size = 120;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.lavenderDark,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: colors.white,
          fontSize: size * 0.35,
          fontWeight: fontWeight.semibold,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

export function IncomingCallOverlay() {
  const insets = useSafeAreaInsets();
  const incomingCall = useCallStore((s) => s.incomingCall);
  const { answerCall, rejectCall } = useCallSocket();

  return (
    <AnimatePresence>
      {incomingCall && (
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 50 }}
          transition={{ type: 'timing', duration: 350 }}
          style={[StyleSheet.absoluteFill, styles.overlay]}
        >
          <View
            style={[
              styles.content,
              {
                paddingTop: insets.top + 80,
                paddingBottom: insets.bottom + 40,
              },
            ]}
          >
            {/* Pulsing avatar */}
            <View style={styles.avatarContainer}>
              <MotiView
                from={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.15, opacity: 0 }}
                transition={{
                  type: 'timing',
                  duration: 1500,
                  loop: true,
                }}
                style={styles.pulseRing}
              />
              <MotiView
                from={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 1.1, opacity: 0 }}
                transition={{
                  type: 'timing',
                  duration: 1500,
                  loop: true,
                  delay: 500,
                }}
                style={styles.pulseRing}
              />
              <CallerAvatar
                uri={incomingCall.callerAvatar}
                name={incomingCall.callerName}
              />
            </View>

            {/* Caller info */}
            <Text style={styles.callerName}>{incomingCall.callerName}</Text>
            <Text style={styles.callType}>
              {incomingCall.isVideo ? 'Video Call' : 'Audio Call'}
            </Text>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Action buttons */}
            <View style={styles.actions}>
              <View style={styles.actionItem}>
                <Pressable
                  onPress={rejectCall}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.rejectButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.actionIcon}>{'\uD83D\uDCF5'}</Text>
                </Pressable>
                <Text style={styles.actionLabel}>Decline</Text>
              </View>

              <View style={styles.actionItem}>
                <Pressable
                  onPress={answerCall}
                  style={({ pressed }) => [
                    styles.actionButton,
                    styles.acceptButton,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={styles.actionIcon}>{'\uD83D\uDCDE'}</Text>
                </Pressable>
                <Text style={styles.actionLabel}>Accept</Text>
              </View>
            </View>
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(15, 15, 15, 0.95)',
    zIndex: 9999,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  avatarContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: colors.lavender,
  },
  callerName: {
    color: colors.white,
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    color: colors.gray400,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 64,
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
  },
  actionButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  actionIcon: {
    fontSize: 28,
    color: colors.white,
    textAlign: 'center',
  },
  actionLabel: {
    color: colors.gray300,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
