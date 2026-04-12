import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
let YoutubePlayer: any = null;
try { YoutubePlayer = require('react-native-youtube-iframe').default; } catch {}
import { colors } from '../../../theme/colors';
import { scale } from '../../../theme/responsive';
import { fontSize, fontWeight } from '../../../theme/typography';

// ========================
// Video ID extraction
// ========================

export function extractVideoId(url: string): string | null {
  if (!url) return null;

  // Handle youtu.be/VIDEO_ID format
  const shortMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/
  );
  if (shortMatch) return shortMatch[1];

  // Handle youtube.com/watch?v=VIDEO_ID format
  const longMatch = url.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtube-nocookie\.com)\/(?:watch\?.*v=|embed\/|v\/|shorts\/)([a-zA-Z0-9_-]{11})/
  );
  if (longMatch) return longMatch[1];

  // Handle bare video ID (11 chars)
  const bareMatch = url.match(/^[a-zA-Z0-9_-]{11}$/);
  if (bareMatch) return bareMatch[0];

  return null;
}

// ========================
// Props
// ========================

interface VideoPlayerProps {
  videoUrl: string;
  isPlaying: boolean;
  currentTime: number;
  isHost: boolean;
  onPlay: (currentTime: number) => void;
  onPause: (currentTime: number) => void;
  onSeek: (currentTime: number) => void;
  height: number;
}

// ========================
// Component
// ========================

export function VideoPlayer({
  videoUrl,
  isPlaying,
  currentTime,
  isHost,
  onPlay,
  onPause,
  onSeek,
  height,
}: VideoPlayerProps) {
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const lastSyncedTime = useRef(currentTime);

  const videoId = extractVideoId(videoUrl);

  // Sync non-host player to host's time when it changes
  useEffect(() => {
    if (!isHost && isReady && playerRef.current) {
      const timeDiff = Math.abs(currentTime - lastSyncedTime.current);
      // Only seek if difference is > 2 seconds to avoid constant seeking
      if (timeDiff > 2) {
        playerRef.current.seekTo(currentTime, true);
        lastSyncedTime.current = currentTime;
      }
    }
  }, [currentTime, isHost, isReady]);

  const handleReady = useCallback(() => {
    setIsReady(true);
    setIsLoading(false);
    // Seek to current time on initial load
    if (playerRef.current && currentTime > 0) {
      playerRef.current.seekTo(currentTime, true);
    }
  }, [currentTime]);

  const handleStateChange = useCallback(
    (state: string) => {
      if (!isHost) return;

      if (state === 'playing') {
        playerRef.current?.getCurrentTime().then((time) => {
          onPlay(time);
        });
      } else if (state === 'paused') {
        playerRef.current?.getCurrentTime().then((time) => {
          onPause(time);
        });
      }
    },
    [isHost, onPlay, onPause]
  );

  if (!videoId) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>🎬</Text>
          <Text style={styles.placeholderText}>No video selected</Text>
          {isHost && (
            <Text style={styles.placeholderHint}>
              Paste a YouTube URL to get started
            </Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.lavender} />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      <YoutubePlayer
        ref={playerRef}
        height={height}
        videoId={videoId}
        play={isPlaying}
        onReady={handleReady}
        onChangeState={handleStateChange}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
          allowsFullscreenVideo: true,
        }}
        initialPlayerParams={{
          controls: isHost,
          modestbranding: true,
          rel: false,
          preventFullScreen: false,
        }}
      />

      {/* Non-host badge */}
      {!isHost && isReady && (
        <View style={styles.hostBadge}>
          <Text style={styles.hostBadgeText}>Host is controlling playback</Text>
        </View>
      )}
    </View>
  );
}

// ========================
// Styles
// ========================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  placeholderIcon: {
    fontSize: scale(48),
  },
  placeholderText: {
    color: colors.gray400,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  placeholderHint: {
    color: colors.gray500,
    fontSize: fontSize.sm,
    marginTop: scale(4),
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: scale(12),
  },
  loadingText: {
    color: colors.gray400,
    fontSize: fontSize.sm,
  },
  hostBadge: {
    position: 'absolute',
    top: scale(8),
    alignSelf: 'center',
    backgroundColor: colors.lavender + '99',
    paddingHorizontal: scale(14),
    paddingVertical: scale(6),
    borderRadius: scale(16),
  },
  hostBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
