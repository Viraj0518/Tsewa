import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';

interface ChatInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onAttachPress?: () => void;
  onPhotoSelected?: (uri: string) => void;
  onVoiceNotePress?: () => void;
  onGifPress?: () => void;
}

export function ChatInput({
  onSend,
  onTyping,
  onAttachPress,
  onPhotoSelected,
  onVoiceNotePress,
  onGifPress,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();

  const handleChangeText = useCallback(
    (value: string) => {
      setText(value);
      if (value.length > 0) {
        onTyping();
      }
    },
    [onTyping]
  );

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  }, [text, onSend]);

  const handlePickPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission needed', 'Please grant photo library access to send images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        onPhotoSelected?.(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    }
  }, [onPhotoSelected]);

  const showAttachmentMenu = useCallback(() => {
    if (onAttachPress) {
      onAttachPress();
      return;
    }

    const options = ['Photo', 'Voice Note', 'GIF', 'Cancel'];
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Send attachment',
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handlePickPhoto();
          else if (buttonIndex === 1) onVoiceNotePress?.();
          else if (buttonIndex === 2) onGifPress?.();
        }
      );
    } else {
      // Android fallback using Alert
      Alert.alert('Send attachment', undefined, [
        { text: 'Photo', onPress: handlePickPhoto },
        { text: 'Voice Note', onPress: onVoiceNotePress },
        { text: 'GIF', onPress: onGifPress },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [onAttachPress, handlePickPhoto, onVoiceNotePress, onGifPress]);

  const canSend = text.trim().length > 0;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.inputRow}>
        <Pressable
          style={styles.attachButton}
          onPress={showAttachmentMenu}
          hitSlop={8}
        >
          <Text style={styles.attachIcon}>+</Text>
        </Pressable>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChangeText}
          placeholder="Type a message..."
          placeholderTextColor={colors.gray400}
          multiline
          maxLength={2000}
          textAlignVertical="center"
        />

        <Pressable
          style={[styles.sendButton, canSend && styles.sendButtonActive]}
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={8}
        >
          <Text
            style={[
              styles.sendIcon,
              canSend && styles.sendIconActive,
            ]}
          >
            {'\u2191'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 1 : 0,
  },
  attachIcon: {
    fontSize: fontSize.xl,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.xl + 2,
  },
  input: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: scale(20),
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    fontSize: fontSize.md,
    color: colors.black,
    maxHeight: scale(100),
    minHeight: scale(36),
  },
  sendButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 1 : 0,
  },
  sendButtonActive: {
    backgroundColor: colors.lavender,
  },
  sendIcon: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray400,
  },
  sendIconActive: {
    color: colors.white,
  },
});
