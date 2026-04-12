import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { colors } from '../../../theme/colors';
import { fontSize, fontWeight } from '../../../theme/typography';
import { scale } from '../../../theme/responsive';

interface VoiceNoteRecorderProps {
  onRecordingComplete: (uri: string, durationMs: number) => void;
  onCancel: () => void;
}

interface VoiceNotePlayerProps {
  uri: string;
  duration: number;
  isSent: boolean;
}

// --- Waveform Bars ---

function WaveformBars({ isRecording }: { isRecording: boolean }) {
  const barCount = 12;
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  useEffect(() => {
    if (!isRecording) {
      animatedValues.forEach((v) => v.setValue(0.3));
      return;
    }

    const animations = animatedValues.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: Math.random() * 0.7 + 0.3,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
            delay: i * 40,
          }),
          Animated.timing(val, {
            toValue: 0.2,
            duration: 200 + Math.random() * 300,
            useNativeDriver: false,
          }),
        ])
      )
    );

    animations.forEach((a) => a.start());

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [isRecording, animatedValues]);

  return (
    <View style={waveStyles.container}>
      {animatedValues.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            waveStyles.bar,
            {
              height: val.interpolate({
                inputRange: [0, 1],
                outputRange: [4, 24],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const waveStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 28,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.lavender,
  },
});

// --- Recorder ---

function formatRecordingTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function VoiceNoteRecorder({
  onRecordingComplete,
  onCancel,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, [cleanup]);

  const startRecording = useCallback(async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = recording;
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      intervalRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - startTimeRef.current);
      }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    cleanup();

    if (!recordingRef.current) return;

    try {
      setIsRecording(false);
      await recordingRef.current.stopAndUnloadAsync();

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recordingRef.current.getURI();
      const durationMs = Date.now() - startTimeRef.current;
      recordingRef.current = null;

      if (uri) {
        onRecordingComplete(uri, durationMs);
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      recordingRef.current = null;
    }
  }, [cleanup, onRecordingComplete]);

  const handleCancel = useCallback(async () => {
    cleanup();

    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch {}
      recordingRef.current = null;
    }

    setIsRecording(false);
    setRecordingDuration(0);
    onCancel();
  }, [cleanup, onCancel]);

  return (
    <View style={recorderStyles.container}>
      {isRecording ? (
        <View style={recorderStyles.recordingRow}>
          <View style={recorderStyles.recordingIndicator} />
          <Text style={recorderStyles.timer}>
            {formatRecordingTime(recordingDuration)}
          </Text>
          <WaveformBars isRecording={isRecording} />
          <View style={recorderStyles.actions}>
            <Pressable
              style={recorderStyles.cancelButton}
              onPress={handleCancel}
              hitSlop={8}
            >
              <Text style={recorderStyles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={recorderStyles.stopButton}
              onPress={stopRecording}
              hitSlop={8}
            >
              <View style={recorderStyles.stopIcon} />
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={recorderStyles.recordButton}
          onLongPress={startRecording}
          onPressOut={stopRecording}
          onPress={startRecording}
          hitSlop={8}
        >
          <View style={recorderStyles.micIcon}>
            <Text style={recorderStyles.micText}>🎤</Text>
          </View>
          <Text style={recorderStyles.holdHint}>
            Hold to record, release to send
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const recorderStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  micIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: colors.lavenderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micText: {
    fontSize: 18,
  },
  holdHint: {
    fontSize: fontSize.sm,
    color: colors.gray400,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
  },
  timer: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.black,
    minWidth: 48,
  },
  actions: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: fontSize.sm,
    color: colors.gray500,
    fontWeight: fontWeight.medium,
  },
  stopButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.white,
  },
});

// --- Player ---

export function VoiceNotePlayer({ uri, duration, isSent }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    try {
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(status.positionMillis);
          if (status.durationMillis) {
            setTotalDuration(status.durationMillis);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
            soundRef.current?.setPositionAsync(0).catch(() => {});
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
    }
  }, [isPlaying, uri]);

  const progress = totalDuration > 0 ? position / totalDuration : 0;

  const containerStyle = isSent
    ? playerStyles.containerSent
    : playerStyles.containerReceived;

  const textColor = isSent ? colors.white : colors.black;
  const trackBg = isSent ? 'rgba(255,255,255,0.3)' : colors.gray200;
  const trackFill = isSent ? colors.white : colors.lavender;

  return (
    <View style={[playerStyles.container, containerStyle]}>
      <Pressable
        style={[
          playerStyles.playButton,
          { backgroundColor: isSent ? 'rgba(255,255,255,0.2)' : colors.lavenderLight },
        ]}
        onPress={handlePlayPause}
        hitSlop={8}
      >
        <Text style={[playerStyles.playIcon, { color: textColor }]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </Pressable>

      <View style={playerStyles.progressContainer}>
        <View style={[playerStyles.track, { backgroundColor: trackBg }]}>
          <View
            style={[
              playerStyles.trackFill,
              {
                backgroundColor: trackFill,
                width: `${Math.min(progress * 100, 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={[playerStyles.duration, { color: textColor }]}>
          {formatRecordingTime(isPlaying ? position : totalDuration)}
        </Text>
      </View>
    </View>
  );
}

const playerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(18),
    minWidth: scale(180),
  },
  containerSent: {
    backgroundColor: colors.lavender,
  },
  containerReceived: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  playButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 14,
  },
  progressContainer: {
    flex: 1,
    gap: 4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
  },
  duration: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
