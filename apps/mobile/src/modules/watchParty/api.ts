import { api } from '../../lib/api';

// ========================
// Types
// ========================

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  videoUrl: string;
}

export interface UpdatePlaybackData {
  isPlaying?: boolean;
  currentTime?: number;
  videoUrl?: string;
}

// ========================
// API functions
// ========================

export async function updatePlaybackState(
  roomId: string,
  data: UpdatePlaybackData
): Promise<PlaybackState> {
  const { data: state } = await api.post<PlaybackState>(
    `/rooms/${roomId}/watch-party`,
    data
  );
  return state;
}

// Playback state is included in the room details from getRoom()
// so there is no separate getPlaybackState endpoint needed.
// Access it via room.videoUrl and the socket's room:state event
// which returns watchPartyState: { videoUrl, isPlaying, currentTime }
