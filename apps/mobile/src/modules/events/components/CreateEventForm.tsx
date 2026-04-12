import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors } from '../../../theme/colors';
import { typography, fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';
import { Button } from '../../../components/ui/Button';
import { useCreateEvent } from '../hooks';
import type { EventType } from '../api';

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: 'LOSAR', label: 'Losar' },
  { value: 'TEACHING', label: 'Teaching' },
  { value: 'COMMUNITY', label: 'Community' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'CULTURAL', label: 'Cultural' },
  { value: 'OTHER', label: 'Other' },
];

export function CreateEventForm() {
  const router = useRouter();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('COMMUNITY');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [link, setLink] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an event title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Required', 'Please enter an event description');
      return;
    }
    if (!startDate.trim()) {
      Alert.alert('Required', 'Please enter a start date (YYYY-MM-DD HH:MM)');
      return;
    }

    createEvent.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        type,
        location: location.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || undefined,
        startDate: new Date(startDate.trim()).toISOString(),
        endDate: endDate.trim()
          ? new Date(endDate.trim()).toISOString()
          : undefined,
        isOnline,
        link: link.trim() || undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err: Error) => {
          Alert.alert('Error', err.message || 'Failed to create event');
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
        <Text style={styles.headerTitle}>New Event</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Event title"
            placeholderTextColor={colors.gray300}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What is this event about?"
            placeholderTextColor={colors.gray300}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Type</Text>
          <View style={styles.typeRow}>
            {EVENT_TYPES.map((et) => (
              <Pressable
                key={et.value}
                style={[
                  styles.typeChip,
                  type === et.value && styles.typeChipActive,
                ]}
                onPress={() => setType(et.value)}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    type === et.value && styles.typeChipTextActive,
                  ]}
                >
                  {et.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Start date */}
        <View style={styles.field}>
          <Text style={styles.label}>Start Date & Time *</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-05-01 14:00"
            placeholderTextColor={colors.gray300}
            value={startDate}
            onChangeText={setStartDate}
          />
        </View>

        {/* End date */}
        <View style={styles.field}>
          <Text style={styles.label}>End Date & Time (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-05-01 18:00"
            placeholderTextColor={colors.gray300}
            value={endDate}
            onChangeText={setEndDate}
          />
        </View>

        {/* Online toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Online Event</Text>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{
              false: colors.gray200,
              true: colors.lavenderLight,
            }}
            thumbColor={isOnline ? colors.lavender : colors.gray400}
          />
        </View>

        {isOnline && (
          <View style={styles.field}>
            <Text style={styles.label}>Link</Text>
            <TextInput
              style={styles.input}
              placeholder="https://zoom.us/..."
              placeholderTextColor={colors.gray300}
              value={link}
              onChangeText={setLink}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        )}

        {!isOnline && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Venue name or address"
                placeholderTextColor={colors.gray300}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  placeholderTextColor={colors.gray300}
                  value={city}
                  onChangeText={setCity}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Country</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Country"
                  placeholderTextColor={colors.gray300}
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>
          </>
        )}

        {/* Submit */}
        <View style={styles.submitSection}>
          <Button
            title="Create Event"
            variant="primary"
            size="lg"
            fullWidth
            loading={createEvent.isPending}
            onPress={handleSubmit}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  typeChipActive: {
    backgroundColor: colors.lavender,
    borderColor: colors.lavender,
  },
  typeChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray500,
  },
  typeChipTextActive: {
    color: colors.white,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  submitSection: {
    marginTop: 12,
  },
});
