import React, { useState, useCallback } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import { fontSize, fontWeight } from '../../../theme/typography';

// ========================
// Types
// ========================

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '🙏'] as const;
type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

interface FloatingReaction {
  id: string;
  emoji: ReactionEmoji;
  x: number;
}

interface ReactionBurstProps {
  onReaction?: (emoji: string) => void;
}

// ========================
// Floating emoji component
// ========================

function FloatingEmoji({
  emoji,
  x,
  onComplete,
}: {
  emoji: string;
  x: number;
  onComplete: () => void;
}) {
  return (
    <MotiView
      from={{
        translateY: 0,
        opacity: 1,
        scale: 1,
      }}
      animate={{
        translateY: -200,
        opacity: 0,
        scale: 1.3,
      }}
      transition={{
        type: 'timing',
        duration: 2000,
      }}
      onDidAnimate={(property) => {
        if (property === 'opacity') {
          onComplete();
        }
      }}
      style={[styles.floatingEmoji, { left: x }]}
    >
      <Text style={styles.floatingEmojiText}>{emoji}</Text>
    </MotiView>
  );
}

// ========================
// Main component
// ========================

export function ReactionBurst({ onReaction }: ReactionBurstProps) {
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);

  const handleReaction = useCallback(
    (emoji: ReactionEmoji) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      // Random horizontal offset within the reaction bar area
      const x = Math.random() * 200 + 20;

      setReactions((prev) => [...prev, { id, emoji, x }]);
      onReaction?.(emoji);
    },
    [onReaction]
  );

  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return (
    <View style={styles.container}>
      {/* Floating reactions overlay */}
      <View style={styles.floatingContainer} pointerEvents="none">
        {reactions.map((reaction) => (
          <FloatingEmoji
            key={reaction.id}
            emoji={reaction.emoji}
            x={reaction.x}
            onComplete={() => removeReaction(reaction.id)}
          />
        ))}
      </View>

      {/* Reaction buttons row */}
      <View style={styles.buttonRow}>
        {REACTION_EMOJIS.map((emoji) => (
          <Pressable
            key={emoji}
            onPress={() => handleReaction(emoji)}
            style={({ pressed }) => [
              styles.reactionButton,
              pressed && styles.reactionButtonPressed,
            ]}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ========================
// Styles
// ========================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  floatingContainer: {
    position: 'absolute',
    bottom: scale(48),
    left: 0,
    right: 0,
    height: 220,
    overflow: 'hidden',
  },
  floatingEmoji: {
    position: 'absolute',
    bottom: 0,
  },
  floatingEmojiText: {
    fontSize: scale(32),
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(12),
    paddingVertical: scale(8),
    paddingHorizontal: scale(16),
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    borderRadius: scale(24),
    alignSelf: 'center',
  },
  reactionButton: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ scale: 1.15 }],
  },
  reactionEmoji: {
    fontSize: scale(20),
  },
});
