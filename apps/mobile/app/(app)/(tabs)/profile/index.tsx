import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Avatar } from '../../../../src/components/ui/Avatar';
import { Button } from '../../../../src/components/ui/Button';
import { useAuthStore } from '../../../../src/modules/auth/store';
import { useLogout } from '../../../../src/modules/auth/hooks';
import { useProfile } from '../../../../src/modules/profile/hooks';
import { colors } from '../../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../../src/theme/typography';

interface SettingsItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingsItem({ icon, label, onPress, danger }: SettingsItemProps) {
  return (
    <Pressable style={styles.settingsItem} onPress={onPress}>
      <Text style={styles.settingsIcon}>{icon}</Text>
      <Text
        style={[
          styles.settingsLabel,
          danger && { color: colors.error },
        ]}
      >
        {label}
      </Text>
      <Text style={styles.settingsArrow}>›</Text>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogout();
  const { data: profile } = useProfile();

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User';
  const mainPhoto = profile?.photos?.find((p) => p.isMain)?.url || profile?.photos?.[0]?.url;
  const region = profile?.region;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileHeader}>
          <Avatar
            uri={mainPhoto}
            name={displayName}
            size="xl"
          />
          <Text style={styles.name}>{displayName}</Text>
          {region && (
            <View style={styles.regionBadge}>
              <Text style={styles.regionText}>
                {region.replace('_', '-')}
              </Text>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
          </View>
        </View>

        {/* Settings sections */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="✏️"
              label="Edit Profile"
              onPress={() => router.push('/settings/edit-profile')}
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="🎯"
              label="Discovery Preferences"
              onPress={() => {}}
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="💌"
              label="Invite Friends"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="🌐"
              label="Language (English / བོད་སྐད)"
              onPress={() => router.push('/settings/language')}
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="🔔"
              label="Notifications"
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="ℹ️"
              label="About Tsewa"
              onPress={() => {}}
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="📄"
              label="Terms of Service"
              onPress={() => {}}
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="🛡"
              label="Privacy Policy"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Log Out */}
        <View style={styles.settingsSection}>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="🚪"
              label="Log Out"
              danger
              onPress={() => logoutMutation.mutate()}
            />
          </View>
        </View>

        <Text style={styles.versionText}>Tsewa v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  name: {
    ...typography.h1,
    color: colors.black,
    marginTop: 16,
  },
  regionBadge: {
    marginTop: 8,
    backgroundColor: colors.lavenderLight + '40',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  regionText: {
    ...typography.caption,
    color: colors.lavender,
    fontWeight: fontWeight.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 0,
  },
  stat: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  statNumber: {
    ...typography.h2,
    color: colors.black,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray400,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.gray200,
  },
  settingsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsIcon: {
    fontSize: 18,
    width: 28,
  },
  settingsLabel: {
    ...typography.body,
    color: colors.black,
    flex: 1,
  },
  settingsArrow: {
    fontSize: 22,
    color: colors.gray300,
    fontWeight: '300',
  },
  settingsDivider: {
    height: 1,
    backgroundColor: colors.gray100,
    marginLeft: 44,
  },
  versionText: {
    ...typography.small,
    color: colors.gray300,
    textAlign: 'center',
    marginTop: 8,
  },
});
