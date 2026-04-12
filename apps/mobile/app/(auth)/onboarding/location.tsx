import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { useUpdateProfile } from '../../../src/modules/profile/hooks';
import { colors } from '../../../src/theme/colors';
import { scale } from '../../../src/theme/responsive';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';

const locationSchema = z.object({
  currentCity: z.string().optional().or(z.literal('')),
  currentCountry: z.string().optional().or(z.literal('')),
});

type LocationForm = z.infer<typeof locationSchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const locationResolver = zodResolver(locationSchema as any);

async function requestLocationPermission(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  try {
    // Dynamically import expo-location to avoid crashes if not installed
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission denied',
        'Location permission is needed to share your location.'
      );
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };
  } catch {
    Alert.alert(
      'Location unavailable',
      'Could not get your location. You can enter your city manually instead.'
    );
    return null;
  }
}

export default function LocationScreen() {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const [shareLocation, setShareLocation] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LocationForm>({
    resolver: locationResolver,
    defaultValues: {
      currentCity: '',
      currentCountry: '',
    },
  });

  const handleToggleLocation = async (enabled: boolean) => {
    setShareLocation(enabled);
    if (enabled) {
      setLoadingLocation(true);
      const location = await requestLocationPermission();
      setLoadingLocation(false);
      if (location) {
        setCoords(location);
      } else {
        setShareLocation(false);
      }
    } else {
      setCoords(null);
    }
  };

  const onSubmit = (data: LocationForm) => {
    updateProfile.mutate(
      {
        currentCity: data.currentCity || undefined,
        currentCountry: data.currentCountry || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      },
      {
        onSuccess: () => {
          router.push('/(auth)/onboarding/categories');
        },
      }
    );
  };

  const onSkip = () => {
    router.push('/(auth)/onboarding/categories');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Your location</Text>
        <Text style={styles.subtitle}>
          Help others find you nearby, or skip this step
        </Text>
      </View>

      {updateProfile.isError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            {updateProfile.error?.message || 'Something went wrong. Please try again.'}
          </Text>
        </View>
      )}

      <View style={styles.form}>
        <Controller
          control={control}
          name="currentCity"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Current City"
              placeholder="e.g. Dharamsala, New York, Toronto"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.currentCity?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="currentCountry"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Current Country"
              placeholder="e.g. India, United States, Canada"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.currentCountry?.message}
            />
          )}
        />

        <View style={styles.locationToggle}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Share my location</Text>
            <Text style={styles.toggleCaption}>
              {loadingLocation
                ? 'Getting your location...'
                : coords
                ? 'Location shared successfully'
                : 'Allow precise location for better matches'}
            </Text>
          </View>
          <Switch
            value={shareLocation}
            onValueChange={handleToggleLocation}
            trackColor={{ false: colors.gray300, true: colors.lavenderLight }}
            thumbColor={shareLocation ? colors.lavender : colors.gray400}
            ios_backgroundColor={colors.gray300}
            disabled={loadingLocation}
          />
        </View>

        {coords && (
          <View style={styles.coordsBadge}>
            <Text style={styles.coordsText}>
              Location captured ({coords.latitude.toFixed(2)}, {coords.longitude.toFixed(2)})
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="lg"
          fullWidth
          onPress={handleSubmit(onSubmit)}
          loading={updateProfile.isPending}
        />
        <Button
          title="Skip for now"
          variant="ghost"
          size="md"
          fullWidth
          onPress={onSkip}
          style={styles.skipButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(32),
  },
  header: {
    marginBottom: scale(24),
  },
  title: {
    ...typography.h1,
    color: colors.black,
    marginBottom: scale(8),
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.gray500,
  },
  errorBanner: {
    backgroundColor: '#FDE8E8',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(20),
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorBannerText: {
    color: colors.error,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  form: {
    gap: scale(4),
  },
  locationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: scale(16),
    padding: scale(16),
    marginTop: scale(8),
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  toggleInfo: {
    flex: 1,
    marginRight: scale(12),
  },
  toggleLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    marginBottom: scale(4),
  },
  toggleCaption: {
    fontSize: fontSize.sm,
    color: colors.gray500,
  },
  coordsBadge: {
    backgroundColor: colors.lavenderLight,
    paddingVertical: scale(8),
    paddingHorizontal: scale(14),
    borderRadius: scale(12),
    marginTop: scale(12),
    alignSelf: 'flex-start',
  },
  coordsText: {
    fontSize: fontSize.xs,
    color: colors.lavenderDark,
    fontWeight: fontWeight.medium,
  },
  footer: {
    marginTop: scale(32),
  },
  skipButton: {
    marginTop: scale(12),
  },
});
