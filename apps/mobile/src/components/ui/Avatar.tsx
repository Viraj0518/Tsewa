import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fontWeight } from '../../theme/typography';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnline?: boolean;
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 80,
  xl: 120,
};

const fontSizeMap: Record<AvatarSize, number> = {
  sm: 12,
  md: 18,
  lg: 28,
  xl: 40,
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ uri, name, size = 'md', showOnline = false }: AvatarProps) {
  const dimension = sizeMap[size];
  const initFontSize = fontSizeMap[size];
  const onlineDotSize = Math.max(8, dimension * 0.2);

  return (
    <View style={[styles.wrapper, { width: dimension, height: dimension }]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize: initFontSize }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: onlineDotSize,
              height: onlineDotSize,
              borderRadius: onlineDotSize / 2,
              borderWidth: Math.max(1.5, onlineDotSize * 0.15),
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
  },
  fallback: {
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.success,
    borderColor: colors.white,
  },
});
