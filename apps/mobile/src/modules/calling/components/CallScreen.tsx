import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { useCallStore } from '../store';
import { useCallSocket } from '../hooks';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function AvatarDisplay({
  uri,
  name,
  size,
}: {
  uri: string | null;
  name: string;
  size: number;
}) {
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

interface ControlButtonProps {
  icon: string;
  onPress: () => void;
  isActive?: boolean;
  isDestructive?: boolean;
  size?: number;
}

function ControlButton({
  icon,
  onPress,
  isActive = false,
  isDestructive = false,
  size = 56,
}: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isDestructive
            ? colors.error
            : isActive
              ? 'rgba(229, 57, 53, 0.25)'
              : 'rgba(255, 255, 255, 0.15)',
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.controlIcon,
          {
            fontSize: size * 0.43,
            color: isActive ? colors.error : colors.white,
          },
        ]}
      >
        {icon}
      </Text>
    </Pressable>
  );
}

export function CallScreen() {
  const insets = useSafeAreaInsets();
  const activeCall = useCallStore((s) => s.activeCall);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const isSpeakerOn = useCallStore((s) => s.isSpeakerOn);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleCamera = useCallStore((s) => s.toggleCamera);
  const toggleSpeaker = useCallStore((s) => s.toggleSpeaker);
  const { endCall } = useCallSocket();

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeCall) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall]);

  const handleEndCall = useCallback(() => {
    endCall();
  }, [endCall]);

  if (!activeCall) return null;

  const { otherName, otherAvatar, isVideo } = activeCall;

  if (isVideo) {
    return (
      <View style={styles.container}>
        {/* Remote video placeholder -- full screen dark gradient with avatar */}
        <View style={styles.videoRemote}>
          {isCameraOff ? (
            <View style={styles.cameraOffContainer}>
              <AvatarDisplay uri={otherAvatar} name={otherName} size={140} />
              <Text style={styles.cameraOffText}>Camera Off</Text>
            </View>
          ) : (
            <View style={styles.cameraOffContainer}>
              <AvatarDisplay uri={otherAvatar} name={otherName} size={160} />
            </View>
          )}
        </View>

        {/* Name and timer at top */}
        <View style={[styles.topOverlay, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.videoName}>{otherName}</Text>
          <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
        </View>

        {/* Local video preview (top right) */}
        <View
          style={[
            styles.localPreview,
            { top: insets.top + 70 },
          ]}
        >
          <View style={styles.localPreviewInner}>
            <AvatarDisplay uri={null} name="You" size={48} />
          </View>
        </View>

        {/* Bottom controls */}
        <View style={[styles.controlBar, { paddingBottom: insets.bottom + 24 }]}>
          <ControlButton
            icon={isMuted ? '\uD83D\uDD07' : '\uD83C\uDF99\uFE0F'}
            onPress={toggleMute}
            isActive={isMuted}
          />
          <ControlButton
            icon={isCameraOff ? '\uD83D\uDEAB' : '\uD83D\uDCF7'}
            onPress={toggleCamera}
            isActive={isCameraOff}
          />
          <ControlButton
            icon={isSpeakerOn ? '\uD83D\uDD0A' : '\uD83D\uDD08'}
            onPress={toggleSpeaker}
            isActive={isSpeakerOn}
          />
          <ControlButton
            icon={'\uD83D\uDCF5'}
            onPress={handleEndCall}
            isDestructive
          />
        </View>
      </View>
    );
  }

  // Audio call
  return (
    <View style={styles.container}>
      <View style={[styles.audioContent, { paddingTop: insets.top + 60 }]}>
        {/* Pulsing avatar ring */}
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
          <AvatarDisplay uri={otherAvatar} name={otherName} size={140} />
        </View>

        <Text style={styles.audioName}>{otherName}</Text>
        <Text style={styles.audioStatus}>
          {elapsed < 2 ? 'Connecting...' : 'Connected'}
        </Text>
        <Text style={styles.timer}>{formatDuration(elapsed)}</Text>
      </View>

      {/* Bottom controls */}
      <View style={[styles.controlBar, { paddingBottom: insets.bottom + 24 }]}>
        <ControlButton
          icon={isMuted ? '\uD83D\uDD07' : '\uD83C\uDF99\uFE0F'}
          onPress={toggleMute}
          isActive={isMuted}
        />
        <ControlButton
          icon={isSpeakerOn ? '\uD83D\uDD0A' : '\uD83D\uDD08'}
          onPress={toggleSpeaker}
          isActive={isSpeakerOn}
        />
        <ControlButton
          icon={'\uD83D\uDCF5'}
          onPress={handleEndCall}
          isDestructive
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  // --- Video Call ---
  videoRemote: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOffContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  cameraOffText: {
    color: colors.gray400,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  videoName: {
    color: colors.white,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    marginBottom: 4,
  },
  localPreview: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  localPreviewInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // --- Audio Call ---
  audioContent: {
    flex: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pulseRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 3,
    borderColor: colors.lavender,
  },
  audioName: {
    color: colors.white,
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.semibold,
    marginBottom: 8,
  },
  audioStatus: {
    color: colors.gray400,
    fontSize: fontSize.md,
    fontWeight: fontWeight.regular,
    marginBottom: 12,
  },
  timer: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  // --- Controls ---
  controlBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlIcon: {
    textAlign: 'center',
  },
});
