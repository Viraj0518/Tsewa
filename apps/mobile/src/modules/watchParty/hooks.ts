import { useEffect, useCallback, useState, useRef } from 'react';
import { getSocket } from '../../lib/socket';
import { useAuthStore } from '../auth/store';
import { useRoom } from '../rooms/hooks';

// ========================
// Types
// ========================

export interface WatchPartyPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  videoUrl: string;
}

interface WatchPartySocketReturn {
  playbackState: WatchPartyPlaybackState;
  play: (currentTime: number) => void;
  pause: (currentTime: number) => void;
  seek: (currentTime: number) => void;
  changeVideo: (videoUrl: string) => void;
  isHost: boolean;
}

// ========================
// Hook
// ========================

export function useWatchPartySocket(roomId: string): WatchPartySocketReturn {
  const currentUser = useAuthStore((s) => s.user);
  const { data: room } = useRoom(roomId);

  const isHost = room?.hostId === currentUser?.id;

  const [playbackState, setPlaybackState] = useState<WatchPartyPlaybackState>({
    isPlaying: false,
    currentTime: 0,
    videoUrl: room?.videoUrl ?? '',
  });

  const playbackRef = useRef(playbackState);
  playbackRef.current = playbackState;

  // Sync initial video URL from room data when it loads
  useEffect(() => {
    if (room?.videoUrl && !playbackRef.current.videoUrl) {
      setPlaybackState((prev) => ({
        ...prev,
        videoUrl: room.videoUrl!,
      }));
    }
  }, [room?.videoUrl]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !roomId) return;

    // Listen for full state update (sent on join)
    const handleRoomState = (data: {
      watchPartyState?: {
        videoUrl: string;
        isPlaying: boolean;
        currentTime: number;
      } | null;
    }) => {
      if (data.watchPartyState) {
        setPlaybackState({
          videoUrl: data.watchPartyState.videoUrl,
          isPlaying: data.watchPartyState.isPlaying,
          currentTime: data.watchPartyState.currentTime,
        });
      }
    };

    // Host pressed play
    const handlePlay = (data: { currentTime: number }) => {
      setPlaybackState((prev) => ({
        ...prev,
        isPlaying: true,
        currentTime: data.currentTime,
      }));
    };

    // Host pressed pause
    const handlePause = (data: { currentTime: number }) => {
      setPlaybackState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: data.currentTime,
      }));
    };

    // Host seeked
    const handleSeek = (data: { currentTime: number }) => {
      setPlaybackState((prev) => ({
        ...prev,
        currentTime: data.currentTime,
      }));
    };

    // Host changed video
    const handleVideoChanged = (data: { videoUrl: string }) => {
      setPlaybackState({
        videoUrl: data.videoUrl,
        isPlaying: false,
        currentTime: 0,
      });
    };

    // Full state broadcast (from REST endpoint)
    const handleStateUpdate = (data: {
      isPlaying: boolean;
      currentTime: number;
      videoUrl: string;
    }) => {
      setPlaybackState({
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        videoUrl: data.videoUrl,
      });
    };

    socket.on('room:state', handleRoomState);
    socket.on('room:wp_play', handlePlay);
    socket.on('room:wp_pause', handlePause);
    socket.on('room:wp_seek', handleSeek);
    socket.on('room:wp_video_changed', handleVideoChanged);
    socket.on('room:wp_state_update', handleStateUpdate);

    return () => {
      socket.off('room:state', handleRoomState);
      socket.off('room:wp_play', handlePlay);
      socket.off('room:wp_pause', handlePause);
      socket.off('room:wp_seek', handleSeek);
      socket.off('room:wp_video_changed', handleVideoChanged);
      socket.off('room:wp_state_update', handleStateUpdate);
    };
  }, [roomId]);

  const play = useCallback(
    (currentTime: number) => {
      const socket = getSocket();
      if (!socket || !isHost) return;
      socket.emit('room:wp_play', { roomId, currentTime });
    },
    [roomId, isHost]
  );

  const pause = useCallback(
    (currentTime: number) => {
      const socket = getSocket();
      if (!socket || !isHost) return;
      socket.emit('room:wp_pause', { roomId, currentTime });
    },
    [roomId, isHost]
  );

  const seek = useCallback(
    (currentTime: number) => {
      const socket = getSocket();
      if (!socket || !isHost) return;
      socket.emit('room:wp_seek', { roomId, currentTime });
    },
    [roomId, isHost]
  );

  const changeVideo = useCallback(
    (videoUrl: string) => {
      const socket = getSocket();
      if (!socket || !isHost) return;
      socket.emit('room:wp_change_video', { roomId, videoUrl });
    },
    [roomId, isHost]
  );

  return {
    playbackState,
    play,
    pause,
    seek,
    changeVideo,
    isHost,
  };
}
