import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography, fontSize } from '../../src/theme/typography';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.topSection}>
        <View style={styles.brandContainer}>
          <Text style={styles.tibetanScript}>བརྩེ་བ</Text>
          <Text style={styles.title}>Tsewa</Text>
          <Text style={styles.tagline}>Find your person</Text>
        </View>

        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>

      <View style={styles.bottomSection}>
        <Text style={styles.subtitle}>
          Meaningful connections rooted in{'\n'}Tibetan values
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.push('/(auth)/register')}
          />

          <Button
            title="Already have an account? Log in"
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => router.push('/(auth)/login')}
            textStyle={styles.loginText}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lavender,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  brandContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  tibetanScript: {
    fontSize: fontSize.xxl,
    color: colors.peachLight,
    marginBottom: 8,
    opacity: 0.9,
  },
  title: {
    ...typography.hero,
    color: colors.white,
    letterSpacing: 2,
  },
  tagline: {
    ...typography.h3,
    color: colors.lavenderLight,
    marginTop: 12,
    fontWeight: '400',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.lavenderDark,
    opacity: 0.3,
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.lavenderLight,
    opacity: 0.2,
  },
  bottomSection: {
    backgroundColor: colors.softWhite,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 8,
  },
  loginText: {
    color: colors.lavender,
    fontWeight: '500',
  },
});
