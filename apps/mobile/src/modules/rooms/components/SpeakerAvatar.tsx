import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Avatar } from '../../../components/ui/Avatar';
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import { fontSize, fontWeight } from '../../../theme/typography';

interface SpeakerAvatarProps {
  uri?: string | null;
  name: string;
  isHost?: boolean;
  isSpeaking?: boolean;
  isMuted?: boolean;
  handRaised?: boolean;
  size?: 'speaker' | 'listener';
}

export function SpeakerAvatar({
  uri,
  name,
  isHost = false,
  isSpeaking = false,
  isMuted = false,
  handRaised = false,
  size = 'speaker',
}: SpeakerAvatarProps) {
  const dimension = size === 'speaker' ? scale(72) : scale(48);
  const avatarSize = size === 'speaker' ? 'lg' : 'md';
  const borderWidth = size === 'speaker' ? 3 : 2;

  return (
    <View style={styles.container}>
      <View style={[styles.avatarWrapper, { width: dimension + 8, height: dimension + 8 }]}>
        {isSpeaking ? (
          <MotiView
            from={{ borderColor: colors.lavenderLight, scale: 1 }}
            animate={{ borderColor: colors.lavender, scale: 1.04 }}
            transition={{
              type: 'timing',
              duration: 800,
              loop: true,
            }}
            style={[
              styles.speakingBorder,
              {
                width: dimension + 8,
                height: dimension + 8,
                borderRadius: (dimension + 8) / 2,
                borderWidth,
              },
            ]}
          >
            <Avatar uri={uri} name={name} size={avatarSize} />
          </MotiView>
        ) : (
          <View
            style={[
              styles.staticBorder,
              {
                width: dimension + 8,
                height: dimension + 8,
                borderRadius: (dimension + 8) / 2,
              },
            ]}
          >
            <Avatar uri={uri} name={name} size={avatarSize} />
          </View>
        )}

        {/* Mute overlay */}
        {isMuted && (
          <View
            style={[
              styles.badge,
              styles.muteBadge,
              {
                right: size === 'speaker' ? -2 : -4,
                bottom: size === 'speaker' ? -2 : -4,
              },
            ]}
          >
            <Text style={styles.badgeText}>🔇</Text>
          </View>
        )}

        {/* Host crown */}
        {isHost && (
          <View
            style={[
              styles.badge,
              styles.hostBadge,
              {
                left: size === 'speaker' ? -2 : -4,
                top: size === 'speaker' ? -2 : -4,
              },
            ]}
          >
            <Text style={styles.badgeText}>👑</Text>
          </View>
        )}

        {/* Hand raised */}
        {handRaised && (
          <View
            style={[
              styles.badge,
              styles.handBadge,
              {
                right: size === 'speaker' ? -2 : -4,
                top: size === 'speaker' ? -2 : -4,
              },
            ]}
          >
            <Text style={styles.badgeText}>✋</Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.name,
          size === 'listener' && styles.nameSmall,
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: scale(88),
    marginBottom: scale(8),
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakingBorder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.lavender,
  },
  staticBorder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  muteBadge: {},
  hostBadge: {},
  handBadge: {},
  badgeText: {
    fontSize: scale(12),
  },
  name: {
    marginTop: scale(4),
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: scale(80),
  },
  nameSmall: {
    fontSize: fontSize.xs,
  },
});
