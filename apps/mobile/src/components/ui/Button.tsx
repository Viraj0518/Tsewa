import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MotiView } from 'moti';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.lavender, text: colors.white },
  secondary: { bg: colors.peach, text: colors.white },
  ghost: { bg: 'transparent', text: colors.lavender },
  outline: { bg: 'transparent', text: colors.lavender, border: colors.lavender },
};

const sizeStyles: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { paddingVertical: 8, paddingHorizontal: 16, fontSize: fontSize.sm },
  md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: fontSize.md },
  lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: fontSize.lg },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable onPress={onPress} disabled={isDisabled}>
      {({ pressed }) => (
        <MotiView
          animate={{
            scale: pressed ? 0.97 : 1,
            opacity: isDisabled ? 0.6 : 1,
          }}
          transition={{ type: 'timing', duration: 150 }}
          style={[
            styles.container,
            {
              backgroundColor: variantStyle.bg,
              paddingVertical: sizeStyle.paddingVertical,
              paddingHorizontal: sizeStyle.paddingHorizontal,
              borderWidth: variantStyle.border ? 1.5 : 0,
              borderColor: variantStyle.border || 'transparent',
            },
            fullWidth && styles.fullWidth,
            style,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={variantStyle.text} size="small" />
          ) : (
            <Text
              style={[
                styles.text,
                {
                  color: variantStyle.text,
                  fontSize: sizeStyle.fontSize,
                },
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </MotiView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
