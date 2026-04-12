import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { Button } from '../../../components/ui/Button';
import { useCreatePost } from '../hooks';
import type { FeedPostType } from '../api';

const POST_TYPES: { value: FeedPostType; label: string; icon: string }[] = [
  { value: 'TEXT', label: 'Text', icon: '✏️' },
  { value: 'PHOTO', label: 'Photo', icon: '📷' },
  { value: 'LINK', label: 'Link', icon: '🔗' },
];

export function CreatePost() {
  const router = useRouter();
  const createPost = useCreatePost();

  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedPostType>('TEXT');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState('');

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setType('PHOTO');
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please write something');
      return;
    }

    createPost.mutate(
      {
        content: content.trim(),
        type,
        imageUrl: imageUri || undefined,
        linkUrl: linkUrl.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err: Error) => {
          Alert.alert('Error', err.message || 'Failed to create post');
        },
      }
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New Post</Text>
        <Button
          title="Post"
          size="sm"
          variant="primary"
          loading={createPost.isPending}
          disabled={!content.trim()}
          onPress={handleSubmit}
        />
      </View>

      {/* Type selector */}
      <View style={styles.typeRow}>
        {POST_TYPES.map((pt) => (
          <Pressable
            key={pt.value}
            style={[
              styles.typeChip,
              type === pt.value && styles.typeChipActive,
            ]}
            onPress={() => setType(pt.value)}
          >
            <Text style={styles.typeIcon}>{pt.icon}</Text>
            <Text
              style={[
                styles.typeChipText,
                type === pt.value && styles.typeChipTextActive,
              ]}
            >
              {pt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={styles.contentArea}>
        <TextInput
          style={styles.textArea}
          placeholder="What's on your mind?"
          placeholderTextColor={colors.gray300}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
          maxLength={2000}
        />

        {/* Image preview */}
        {imageUri && (
          <View style={styles.imagePreview}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
            <Pressable
              style={styles.removeImage}
              onPress={() => {
                setImageUri(null);
                if (type === 'PHOTO') setType('TEXT');
              }}
            >
              <Text style={styles.removeImageText}>X</Text>
            </Pressable>
          </View>
        )}

        {/* Link input */}
        {type === 'LINK' && (
          <TextInput
            style={styles.linkInput}
            placeholder="https://..."
            placeholderTextColor={colors.gray300}
            value={linkUrl}
            onChangeText={setLinkUrl}
            autoCapitalize="none"
            keyboardType="url"
          />
        )}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomActions}>
        <Pressable style={styles.addImageButton} onPress={handlePickImage}>
          <Text style={styles.addImageIcon}>🖼</Text>
          <Text style={styles.addImageText}>Add Image</Text>
        </Pressable>

        <Text style={styles.charCount}>
          {content.length}/2000
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  typeRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  typeChipActive: {
    backgroundColor: colors.lavender + '15',
    borderColor: colors.lavender,
  },
  typeIcon: {
    fontSize: 14,
  },
  typeChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray500,
  },
  typeChipTextActive: {
    color: colors.lavender,
  },
  contentArea: {
    flex: 1,
    padding: 20,
  },
  textArea: {
    ...typography.bodyLarge,
    color: colors.black,
    lineHeight: 24,
    minHeight: 120,
  },
  imagePreview: {
    marginTop: 16,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.black + 'AA',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: colors.white,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  linkInput: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.black,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addImageIcon: {
    fontSize: 18,
  },
  addImageText: {
    ...typography.caption,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  charCount: {
    ...typography.small,
    color: colors.gray300,
  },
});
