import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';
import { scale } from '../../../src/theme/responsive';
import { Button } from '../../../src/components/ui/Button';
import { useProfile, useUpdateProfile } from '../../../src/modules/profile/hooks';
import type { ProfileData } from '../../../src/modules/profile/api';

export default function EditProfileScreen() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [hometown, setHometown] = useState('');
  const [education, setEducation] = useState('');
  const [profession, setProfession] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  const [currentCountry, setCurrentCountry] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setBio(profile.bio || '');
      setHometown(profile.hometown || '');
      setEducation(profile.education || '');
      setProfession(profile.profession || '');
      setCurrentCity(profile.currentCity || '');
      setCurrentCountry(profile.currentCountry || '');
    }
  }, [profile]);

  const handleSave = () => {
    const data: Partial<ProfileData> = {};
    if (displayName.trim()) data.displayName = displayName.trim();
    if (bio !== (profile?.bio || '')) data.bio = bio.trim();
    if (hometown !== (profile?.hometown || '')) data.hometown = hometown.trim();
    if (education !== (profile?.education || '')) data.education = education.trim();
    if (profession !== (profile?.profession || '')) data.profession = profession.trim();
    if (currentCity !== (profile?.currentCity || '')) data.currentCity = currentCity.trim();
    if (currentCountry !== (profile?.currentCountry || '')) data.currentCountry = currentCountry.trim();

    updateProfile.mutate(data, {
      onSuccess: () => {
        router.back();
      },
      onError: (err: Error) => {
        Alert.alert('Error', err.message || 'Failed to update profile');
      },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.lavender} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo grid */}
        <View style={styles.photosSection}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photoGrid}>
            {profile?.photos?.map((photo, index) => (
              <View key={photo.id} style={styles.photoCell}>
                <Image source={{ uri: photo.url }} style={styles.photoImage} />
                {photo.isMain && (
                  <View style={styles.mainBadge}>
                    <Text style={styles.mainBadgeText}>Main</Text>
                  </View>
                )}
              </View>
            ))}
            {/* Empty slots */}
            {Array.from({
              length: Math.max(0, 6 - (profile?.photos?.length || 0)),
            }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.photoCellEmpty}>
                <Text style={styles.addPhotoText}>+</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Fields */}
        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.gray300}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself..."
            placeholderTextColor={colors.gray300}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Hometown</Text>
          <TextInput
            style={styles.input}
            value={hometown}
            onChangeText={setHometown}
            placeholder="Where are you from?"
            placeholderTextColor={colors.gray300}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Education</Text>
          <TextInput
            style={styles.input}
            value={education}
            onChangeText={setEducation}
            placeholder="Where did you study?"
            placeholderTextColor={colors.gray300}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Profession</Text>
          <TextInput
            style={styles.input}
            value={profession}
            onChangeText={setProfession}
            placeholder="What do you do?"
            placeholderTextColor={colors.gray300}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Current City</Text>
            <TextInput
              style={styles.input}
              value={currentCity}
              onChangeText={setCurrentCity}
              placeholder="City"
              placeholderTextColor={colors.gray300}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={currentCountry}
              onChangeText={setCurrentCountry}
              placeholder="Country"
              placeholderTextColor={colors.gray300}
            />
          </View>
        </View>

        {/* Region, dialect, practice - read only display */}
        {profile?.region && (
          <View style={styles.readOnlySection}>
            <Text style={styles.readOnlyLabel}>Region</Text>
            <Text style={styles.readOnlyValue}>
              {profile.region.replace('_', '-')}
            </Text>
          </View>
        )}

        {profile?.dialect && (
          <View style={styles.readOnlySection}>
            <Text style={styles.readOnlyLabel}>Dialect</Text>
            <Text style={styles.readOnlyValue}>{profile.dialect}</Text>
          </View>
        )}

        <View style={styles.saveSection}>
          <Button
            title="Save Changes"
            variant="primary"
            size="lg"
            fullWidth
            loading={updateProfile.isPending}
            onPress={handleSave}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.softWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  cancelText: {
    ...typography.body,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.black,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  photosSection: {
    marginBottom: 24,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoCell: {
    width: (scale(342) - 16) / 3,
    height: (scale(342) - 16) / 3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mainBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.lavender,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  mainBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  photoCellEmpty: {
    width: (scale(342) - 16) / 3,
    height: (scale(342) - 16) / 3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    fontSize: 28,
    color: colors.gray300,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    ...typography.caption,
    color: colors.gray500,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  readOnlySection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
  },
  readOnlyLabel: {
    ...typography.body,
    color: colors.gray500,
  },
  readOnlyValue: {
    ...typography.body,
    color: colors.black,
    fontWeight: fontWeight.medium,
  },
  saveSection: {
    marginTop: 24,
  },
});
