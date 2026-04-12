import { create } from 'zustand';

interface RoomState {
  activeRoomId: string | null;
  participants: Array<{
    userId: string;
    displayName: string;
    photoUrl: string | null;
    role: 'HOST' | 'SPEAKER' | 'LISTENER';
    handRaised: boolean;
    isMuted: boolean;
  }>;
  isMuted: boolean;
  handRaised: boolean;

  setActiveRoom: (roomId: string | null) => void;
  setParticipants: (participants: RoomState['participants']) => void;
  addParticipant: (participant: RoomState['participants'][0]) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, updates: Partial<RoomState['participants'][0]>) => void;
  setMuted: (muted: boolean) => void;
  setHandRaised: (raised: boolean) => void;
  reset: () => void;
}

const initialState = {
  activeRoomId: null,
  participants: [],
  isMuted: false,
  handRaised: false,
};

export const useRoomStore = create<RoomState>((set) => ({
  ...initialState,

  setActiveRoom: (roomId) => set({ activeRoomId: roomId }),

  setParticipants: (participants) => set({ participants }),

  addParticipant: (participant) =>
    set((state) => {
      const exists = state.participants.some((p) => p.userId === participant.userId);
      if (exists) return state;
      return { participants: [...state.participants, participant] };
    }),

  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),

  updateParticipant: (userId, updates) =>
    set((state) => ({
      participants: state.participants.map((p) =>
        p.userId === userId ? { ...p, ...updates } : p
      ),
    })),

  setMuted: (muted) => set({ isMuted: muted }),

  setHandRaised: (raised) => set({ handRaised: raised }),

  reset: () => set(initialState),
}));
