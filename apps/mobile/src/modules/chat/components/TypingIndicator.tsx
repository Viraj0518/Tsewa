import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../../theme/colors';
import { fontSize } from '../../../theme/typography';

interface TypingIndicatorProps {
  name: string;
}

function AnimatedDot({ delay }: { delay: number }) {
  return (
    <MotiView
      from={{ translateY: 0 }}
      animate={{ translateY: -4 }}
      transition={{
        type: 'timing',
        duration: 400,
        delay,
        loop: true,
      }}
      style={styles.dot}
    />
  );
}

export function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{name} is typing</Text>
        <View style={styles.dotsRow}>
          <AnimatedDot delay={0} />
          <AnimatedDot delay={150} />
          <AnimatedDot delay={300} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.gray200,
    gap: 6,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.gray400,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.gray400,
  },
});
