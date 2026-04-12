import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '../../../src/components/ui/Button';
import { useUploadPhoto, useDeletePhoto } from '../../../src/modules/profile/hooks';
import { colors } from '../../../src/theme/colors';
import { scale } from '../../../src/theme/responsive';
import { typography, fontSize, fontWeight } from '../../../src/theme/typography';

interface PhotoSlot {
  id?: string;
  uri?: string;
  uploading?: boolean;
}

export default function PhotosScreen() {
  const router = useRouter();
  const uploadPhotoMutation = useUploadPhoto();
  const deletePhotoMutation = useDeletePhoto();
  const [photos, setPhotos] = useState<PhotoSlot[]>(
    Array(6).fill(null).map(() => ({}))
  );

  const filledCount = photos.filter((p) => p.uri).length;
  const canContinue = filledCount >= 2;

  const pickImage = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Please allow access to your photo library to upload photos.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const imageUri = result.assets[0].uri;

    // Mark slot as uploading
    setPhotos((prev) => {
      const next = [...prev];
      next[index] = { uri: imageUri, uploading: true };
      return next;
    });

    uploadPhotoMutation.mutate(imageUri, {
      onSuccess: (photo) => {
        setPhotos((prev) => {
          const next = [...prev];
          next[index] = { id: photo.id, uri: photo.url || imageUri, uploading: false };
          return next;
        });
      },
      onError: () => {
        setPhotos((prev) => {
          const next = [...prev];
          next[index] = {};
          return next;
        });
        Alert.alert('Upload failed', 'Could not upload the photo. Please try again.');
      },
    });
  };

  const handleSlotPress = (index: number) => {
    const slot = photos[index];
    if (slot.uri && !slot.uploading) {
      Alert.alert('Remove photo', 'Do you want to remove this photo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (slot.id) {
              deletePhotoMutation.mutate(slot.id);
            }
            setPhotos((prev) => {
              const next = [...prev];
              next[index] = {};
              return next;
            });
          },
        },
      ]);
    } else if (!slot.uploading) {
      pickImage(index);
    }
  };

  const onContinue = () => {
    router.push('/(auth)/onboarding/prompts');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Add photos</Text>
        <Text style={styles.subtitle}>
          Upload at least 2 photos. Your first photo will be your main profile picture.
        </Text>
      </View>

      <View style={styles.grid}>
        {photos.map((slot, index) => (
          <Pressable
            key={index}
            onPress={() => handleSlotPress(index)}
            style={[
              styles.photoSlot,
              index === 0 && styles.mainPhotoSlot,
            ]}
          >
            {slot.uri ? (
              <>
                <Image source={{ uri: slot.uri }} style={styles.photo} />
                {slot.uploading && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color={colors.white} size="small" />
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptySlot}>
                <Text style={styles.plusIcon}>+</Text>
                {index === 0 && (
                  <Text style={styles.mainLabel}>Main photo</Text>
                )}
              </View>
            )}
          </Pressable>
        ))}
      </View>

      <Text style={styles.photoCount}>
        {filledCount} / 6 photos{' '}
        {filledCount < 2 && (
          <Text style={styles.requiredNote}>(minimum 2 required)</Text>
        )}
      </Text>

      <View style={styles.footer}>
        <Button
          title="Continue"
          variant="primary"
          size="lg"
          fullWidth
          onPress={onContinue}
          disabled={!canContinue}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
    justifyContent: 'space-between',
  },
  photoSlot: {
    width: '47%',
    aspectRatio: 3 / 4,
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gray200,
    borderStyle: 'dashed',
  },
  mainPhotoSlot: {
    borderColor: colors.peach,
    borderStyle: 'solid',
  },
  photo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusIcon: {
    fontSize: scale(32),
    color: colors.gray400,
    fontWeight: '300',
  },
  mainLabel: {
    fontSize: fontSize.xs,
    color: colors.peach,
    fontWeight: fontWeight.medium,
    marginTop: scale(4),
  },
  photoCount: {
    fontSize: fontSize.md,
    color: colors.gray500,
    textAlign: 'center',
    marginTop: scale(16),
    fontWeight: fontWeight.medium,
  },
  requiredNote: {
    color: colors.peach,
    fontSize: fontSize.sm,
  },
  footer: {
    marginTop: scale(24),
  },
});
