import { create } from 'zustand';

export interface IncomingCall {
  matchId: string;
  callerName: string;
  callerAvatar: string | null;
  isVideo: boolean;
}

export interface ActiveCall {
  matchId: string;
  otherName: string;
  otherAvatar: string | null;
  isVideo: boolean;
  startedAt: number;
}

interface CallState {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;

  setIncomingCall: (call: IncomingCall | null) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
}

export const useCallStore = create<CallState>()((set, get) => ({
  incomingCall: null,
  activeCall: null,
  isMuted: false,
  isCameraOff: false,
  isSpeakerOn: false,

  setIncomingCall: (call) => set({ incomingCall: call }),

  acceptCall: () => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    set({
      activeCall: {
        matchId: incomingCall.matchId,
        otherName: incomingCall.callerName,
        otherAvatar: incomingCall.callerAvatar,
        isVideo: incomingCall.isVideo,
        startedAt: Date.now(),
      },
      incomingCall: null,
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: false,
    });
  },

  rejectCall: () => set({ incomingCall: null }),

  endCall: () =>
    set({
      activeCall: null,
      incomingCall: null,
      isMuted: false,
      isCameraOff: false,
      isSpeakerOn: false,
    }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  toggleCamera: () => set((s) => ({ isCameraOff: !s.isCameraOff })),
  toggleSpeaker: () => set((s) => ({ isSpeakerOn: !s.isSpeakerOn })),
}));
