import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import type { SwipeDeckRef } from './SwipeDeck';

interface ActionButtonsProps {
  deckRef: React.RefObject<SwipeDeckRef | null>;
  disabled?: boolean;
}

function ActionButton({
  emoji,
  color,
  filled,
  size,
  onPress,
  disabled,
}: {
  emoji: string;
  color: string;
  filled: boolean;
  size: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <MotiView
          animate={{
            scale: pressed ? 0.85 : 1,
            opacity: disabled ? 0.5 : 1,
          }}
          transition={{ type: 'spring', damping: 15, stiffness: 300 }}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: filled ? color : colors.white,
              borderWidth: filled ? 0 : 2,
              borderColor: color,
            },
          ]}
        >
          <Text style={[styles.emoji, { fontSize: size * 0.4, color: filled ? colors.white : color }]}>{emoji}</Text>
        </MotiView>
      )}
    </Pressable>
  );
}

export function ActionButtons({ deckRef, disabled = false }: ActionButtonsProps) {
  const handlePass = () => {
    deckRef.current?.swipeLeft();
  };

  const handleSuperLike = () => {
    deckRef.current?.swipeUp();
  };

  const handleLike = () => {
    deckRef.current?.swipeRight();
  };

  return (
    <View style={styles.container}>
      <ActionButton
        emoji="✕"
        color={colors.error}
        filled={false}
        size={scale(56)}
        onPress={handlePass}
        disabled={disabled}
      />
      <ActionButton
        emoji="★"
        color={colors.lavender}
        filled={false}
        size={scale(48)}
        onPress={handleSuperLike}
        disabled={disabled}
      />
      <ActionButton
        emoji="♥"
        color={colors.success}
        filled={true}
        size={scale(56)}
        onPress={handleLike}
        disabled={disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(24),
    paddingVertical: scale(16),
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    textAlign: 'center',
  },
});
