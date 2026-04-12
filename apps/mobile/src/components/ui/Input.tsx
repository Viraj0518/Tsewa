import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  icon,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.lavender
    : colors.gray200;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrapper, { borderColor }]}>
        {icon && <Text style={styles.icon}>{icon}</Text>}
        <TextInput
          style={[
            styles.input,
            icon ? styles.inputWithIcon : null,
            style,
          ]}
          placeholderTextColor={colors.gray400}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray600,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  icon: {
    fontSize: fontSize.lg,
    marginRight: 8,
    color: colors.gray400,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.black,
    paddingVertical: 14,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  error: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginTop: 4,
    marginLeft: 4,
  },
});
