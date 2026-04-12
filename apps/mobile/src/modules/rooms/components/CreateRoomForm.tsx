import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { useCreateRoom } from '../hooks';

type RoomTypeOption = 'OPEN' | 'SCHEDULED';

export function CreateRoomForm() {
  const router = useRouter();
  const createRoom = useCreateRoom();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topicTag, setTopicTag] = useState('');
  const [roomType, setRoomType] = useState<RoomTypeOption>('OPEN');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isWatchParty, setIsWatchParty] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');

  const handleCreate = async () => {
    if (!title.trim()) return;

    try {
      const room = await createRoom.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        type: roomType,
        topicTag: topicTag.trim() || undefined,
        scheduledAt: roomType === 'SCHEDULED' && scheduledAt ? scheduledAt : undefined,
        isWatchParty,
        videoUrl: isWatchParty && videoUrl.trim() ? videoUrl.trim() : undefined,
      });

      router.replace(`/room/${room.id}`);
    } catch (err) {
      // Error is handled by mutation state
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Create Room</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What's the conversation about?"
              placeholderTextColor={colors.gray400}
              maxLength={100}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add more details..."
              placeholderTextColor={colors.gray400}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>

          {/* Topic Tag */}
          <View style={styles.field}>
            <Text style={styles.label}>Topic Tag</Text>
            <TextInput
              style={styles.input}
              value={topicTag}
              onChangeText={setTopicTag}
              placeholder="e.g. dharma, culture, dating"
              placeholderTextColor={colors.gray400}
              maxLength={30}
              autoCapitalize="none"
            />
          </View>

          {/* Room Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Room Type</Text>
            <View style={styles.typeRow}>
              <Pressable
                onPress={() => setRoomType('OPEN')}
                style={[
                  styles.typeButton,
                  roomType === 'OPEN' && styles.typeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    roomType === 'OPEN' && styles.typeButtonTextActive,
                  ]}
                >
                  Open Now
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRoomType('SCHEDULED')}
                style={[
                  styles.typeButton,
                  roomType === 'SCHEDULED' && styles.typeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    roomType === 'SCHEDULED' && styles.typeButtonTextActive,
                  ]}
                >
                  Scheduled
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Scheduled Date/Time */}
          {roomType === 'SCHEDULED' && (
            <View style={styles.field}>
              <Text style={styles.label}>Schedule Date & Time</Text>
              <TextInput
                style={styles.input}
                value={scheduledAt}
                onChangeText={setScheduledAt}
                placeholder="YYYY-MM-DD HH:MM (e.g. 2026-04-15 19:00)"
                placeholderTextColor={colors.gray400}
              />
              <Text style={styles.hint}>
                Enter in ISO format or YYYY-MM-DD HH:MM
              </Text>
            </View>
          )}

          {/* Watch Party Toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>Watch Party</Text>
              <Text style={styles.hint}>Watch a video together while chatting</Text>
            </View>
            <Switch
              value={isWatchParty}
              onValueChange={setIsWatchParty}
              trackColor={{ false: colors.gray300, true: colors.lavenderLight }}
              thumbColor={isWatchParty ? colors.lavender : colors.gray400}
            />
          </View>

          {/* Video URL */}
          {isWatchParty && (
            <View style={styles.field}>
              <Text style={styles.label}>Video URL</Text>
              <TextInput
                style={styles.input}
                value={videoUrl}
                onChangeText={setVideoUrl}
                placeholder="https://youtube.com/..."
                placeholderTextColor={colors.gray400}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          )}

          {/* Error */}
          {createRoom.isError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                Failed to create room. Please try again.
              </Text>
            </View>
          )}

          {/* Submit */}
          <View style={styles.submitArea}>
            <Button
              title="Create Room"
              onPress={handleCreate}
              variant="secondary"
              size="lg"
              fullWidth
              loading={createRoom.isPending}
              disabled={!title.trim()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.softWhite,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.black,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: fontSize.md,
    color: colors.lavender,
    fontWeight: fontWeight.medium,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  field: {
    marginBottom: scale(20),
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray600,
    marginBottom: scale(6),
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: colors.gray200,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: fontSize.md,
    color: colors.black,
  },
  textArea: {
    height: scale(80),
    paddingTop: scale(12),
  },
  hint: {
    fontSize: fontSize.xs,
    color: colors.gray400,
    marginTop: scale(4),
  },
  typeRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  typeButton: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: colors.gray200,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.lavender,
    backgroundColor: colors.lavender + '15',
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.gray500,
  },
  typeButtonTextActive: {
    color: colors.lavender,
    fontWeight: fontWeight.semibold,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
    backgroundColor: colors.white,
    borderRadius: scale(12),
    padding: scale(16),
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  switchLabel: {
    flex: 1,
    marginRight: scale(12),
  },
  errorBox: {
    backgroundColor: colors.error + '15',
    borderRadius: scale(12),
    padding: scale(12),
    marginBottom: scale(16),
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  submitArea: {
    marginTop: scale(8),
  },
});
