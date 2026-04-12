import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { typography } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';

interface InviteShareProps {
  code: string;
}

export function InviteShare({ code }: InviteShareProps) {
  const handleCopy = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(code);
    } catch (err) {
      console.warn('Failed to copy:', err);
    }
  }, [code]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Join me on Tsewa! Use my invite code: ${code}\n\nDownload Tsewa and connect with the Tibetan community worldwide.`,
        ...(Platform.OS === 'ios' ? { url: 'https://tsewa.app' } : {}),
      });
    } catch (err) {
      console.warn('Failed to share:', err);
    }
  }, [code]);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Your Invite Code</Text>

      <View style={styles.codeContainer}>
        <Text style={styles.code}>{code}</Text>
      </View>

      <Text style={styles.hint}>Share this code with friends to let them skip the waitlist</Text>

      <View style={styles.actions}>
        <Pressable style={styles.copyButton} onPress={handleCopy}>
          <Text style={styles.copyText}>Copy</Text>
        </Pressable>

        <Pressable style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareText}>Share</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeContainer: {
    backgroundColor: colors.lavenderLight,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 12,
  },
  code: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.lavenderDark,
    letterSpacing: 4,
    textAlign: 'center',
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: fontSize.sm * 1.5,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  copyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: 'center',
  },
  copyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  shareButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.lavender,
    alignItems: 'center',
  },
  shareText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
