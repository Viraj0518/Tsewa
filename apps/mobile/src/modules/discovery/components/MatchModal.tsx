import React, { useEffect, useMemo } from 'react';
import { View, Text, Modal, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MatchModalProps {
  visible: boolean;
  currentUserPhoto?: string | null;
  currentUserName: string;
  matchedUserPhoto?: string;
  matchedUserName: string;
  matchId?: string;
  onSendMessage: (matchId: string) => void;
  onKeepSwiping: () => void;
}

// Generate random confetti circle configurations at component level
function generateConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 12 + 6,
    color: [colors.lavender, colors.peach, colors.lavenderLight, colors.peachLight, '#FFD700', colors.success][
      Math.floor(Math.random() * 6)
    ],
    startX: SCREEN_WIDTH / 2,
    startY: SCREEN_HEIGHT / 2,
    endX: Math.random() * SCREEN_WIDTH,
    endY: Math.random() * SCREEN_HEIGHT * 0.6,
    delay: Math.random() * 400,
  }));
}

function ConfettiCircle({
  size,
  color,
  startX,
  startY,
  endX,
  endY,
  delay,
}: {
  size: number;
  color: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
}) {
  return (
    <MotiView
      from={{
        translateX: startX - SCREEN_WIDTH / 2,
        translateY: startY - SCREEN_HEIGHT / 2,
        opacity: 1,
        scale: 0,
      }}
      animate={{
        translateX: endX - SCREEN_WIDTH / 2,
        translateY: endY - SCREEN_HEIGHT / 2,
        opacity: 0,
        scale: 1,
      }}
      transition={{
        type: 'timing',
        duration: 1200,
        delay,
      }}
      style={[
        styles.confettiCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export function MatchModal({
  visible,
  currentUserPhoto,
  currentUserName,
  matchedUserPhoto,
  matchedUserName,
  matchId,
  onSendMessage,
  onKeepSwiping,
}: MatchModalProps) {
  const confetti = useMemo(() => generateConfetti(20), [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        {/* Confetti layer */}
        <View style={styles.confettiContainer}>
          {visible &&
            confetti.map((c) => (
              <ConfettiCircle
                key={c.id}
                size={c.size}
                color={c.color}
                startX={c.startX}
                startY={c.startY}
                endX={c.endX}
                endY={c.endY}
                delay={c.delay}
              />
            ))}
        </View>

        {/* Main content */}
        <MotiView
          from={{ scale: 0, opacity: 0 }}
          animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
          transition={{
            type: 'spring',
            damping: 15,
            stiffness: 150,
            delay: 100,
          }}
          style={styles.content}
        >
          <Text style={styles.matchTitle}>It's a Match!</Text>
          <Text style={styles.matchSubtitle}>
            You and {matchedUserName} liked each other
          </Text>

          {/* Avatars side by side */}
          <View style={styles.avatarsRow}>
            <View style={styles.avatarWrapper}>
              <Avatar
                uri={currentUserPhoto}
                name={currentUserName}
                size="xl"
              />
              <Text style={styles.avatarName}>{currentUserName}</Text>
            </View>

            <MotiView
              from={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 400 }}
              style={styles.heartBridge}
            >
              <Text style={styles.heartEmoji}>{'\u2764\uFE0F'}</Text>
            </MotiView>

            <View style={styles.avatarWrapper}>
              <Avatar
                uri={matchedUserPhoto}
                name={matchedUserName}
                size="xl"
              />
              <Text style={styles.avatarName}>{matchedUserName}</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.buttonsColumn}>
            <Button
              title="Send a message"
              onPress={() => matchId && onSendMessage(matchId)}
              variant="primary"
              size="lg"
              fullWidth
            />
            <Button
              title="Keep swiping"
              onPress={onKeepSwiping}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  confettiCircle: {
    position: 'absolute',
  },
  content: {
    width: SCREEN_WIDTH * 0.85,
    backgroundColor: colors.white,
    borderRadius: scale(24),
    padding: scale(32),
    alignItems: 'center',
    gap: scale(20),
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  matchTitle: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.bold,
    color: colors.lavender,
    textAlign: 'center',
  },
  matchSubtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
    marginVertical: scale(8),
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: scale(8),
  },
  avatarName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  heartBridge: {
    marginBottom: scale(24),
  },
  heartEmoji: {
    fontSize: scale(28),
  },
  buttonsColumn: {
    width: '100%',
    gap: scale(8),
    marginTop: scale(8),
  },
});
