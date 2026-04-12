import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuthStore } from '../../src/modules/auth/store';
import { useLogout } from '../../src/modules/auth/hooks';
import { useWaitlistStatus, useRedeemInvite, useGenerateInvite } from '../../src/modules/waitlist/hooks';
import { InviteShare } from '../../src/modules/waitlist/components/InviteShare';
import { colors } from '../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../src/theme/typography';

export default function WaitlistScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logoutMutation = useLogout();

  // Queries and mutations
  const { data: waitlistStatus, isLoading: statusLoading } = useWaitlistStatus();
  const redeemMutation = useRedeemInvite();
  const generateMutation = useGenerateInvite();

  const position = waitlistStatus?.position ?? null;

  const handleSubmitCode = useCallback(async () => {
    if (!inviteCode.trim()) return;

    try {
      await redeemMutation.mutateAsync(inviteCode.trim().toUpperCase());

      // Update auth store: user is now active
      if (user) {
        setUser({ ...user, isActive: true });
      }

      // Navigate to the main app
      router.replace('/(app)/(tabs)/discovery');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to redeem invite code';
      Alert.alert('Invalid Code', message);
    }
  }, [inviteCode, redeemMutation, user, setUser, router]);

  const handleGenerateCode = useCallback(async () => {
    try {
      const result = await generateMutation.mutateAsync();
      setGeneratedCode(result.code);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate invite code';
      Alert.alert('Error', message);
    }
  }, [generateMutation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>&#x231B;</Text>
        </View>

        <Text style={styles.title}>You're on the waitlist!</Text>
        <Text style={styles.subtitle}>
          We're carefully growing our community.{'\n'}
          You'll be notified when it's your turn.
        </Text>

        {/* Position Card */}
        <View style={styles.positionCard}>
          <Text style={styles.positionLabel}>Your position</Text>
          <Text style={styles.positionNumber}>
            {statusLoading ? '...' : position ? `#${position}` : '#--'}
          </Text>
          <Text style={styles.positionHint}>
            Have an invite code? Skip the wait!
          </Text>
        </View>

        {/* Invite Code Redemption */}
        <View style={styles.inviteSection}>
          <Input
            label="Invite Code"
            placeholder="Enter your invite code"
            value={inviteCode}
            onChangeText={setInviteCode}
            autoCapitalize="characters"
          />
          <Button
            title="Submit Code"
            variant="primary"
            size="md"
            fullWidth
            onPress={handleSubmitCode}
            loading={redeemMutation.isPending}
            disabled={!inviteCode.trim()}
          />
        </View>

        {/* Share Tsewa Section */}
        <View style={styles.shareSection}>
          <Text style={styles.shareSectionTitle}>Share Tsewa</Text>
          <Text style={styles.shareSectionDesc}>
            Generate an invite code to share with friends
          </Text>

          {generatedCode ? (
            <InviteShare code={generatedCode} />
          ) : (
            <Button
              title="Generate Invite Code"
              variant="outline"
              size="md"
              fullWidth
              onPress={handleGenerateCode}
              loading={generateMutation.isPending}
            />
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.email}>{user?.email}</Text>
          <Button
            title="Log Out"
            variant="ghost"
            size="sm"
            onPress={() => logoutMutation.mutate()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...typography.h1,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  positionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  positionLabel: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  positionNumber: {
    ...typography.hero,
    color: colors.lavender,
    marginBottom: 8,
  },
  positionHint: {
    fontSize: fontSize.sm,
    color: colors.gray400,
  },
  inviteSection: {
    width: '100%',
    marginBottom: 32,
  },
  shareSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  shareSectionTitle: {
    ...typography.h3,
    color: colors.black,
    marginBottom: 8,
  },
  shareSectionDesc: {
    ...typography.body,
    color: colors.gray500,
    textAlign: 'center',
    marginBottom: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  email: {
    fontSize: fontSize.sm,
    color: colors.gray400,
    marginBottom: 8,
  },
});
