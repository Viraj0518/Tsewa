import { create } from 'zustand';

interface ChatState {
  unreadCounts: Record<string, number>;
  typingUsers: Record<string, boolean>;

  setUnreadCount: (matchId: string, count: number) => void;
  incrementUnread: (matchId: string) => void;
  clearUnread: (matchId: string) => void;
  setTyping: (matchId: string, isTyping: boolean) => void;
  getTotalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  unreadCounts: {},
  typingUsers: {},

  setUnreadCount: (matchId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [matchId]: count },
    })),

  incrementUnread: (matchId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [matchId]: (state.unreadCounts[matchId] || 0) + 1,
      },
    })),

  clearUnread: (matchId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [matchId]: 0 },
    })),

  setTyping: (matchId, isTyping) =>
    set((state) => ({
      typingUsers: { ...state.typingUsers, [matchId]: isTyping },
    })),

  getTotalUnread: () => {
    const { unreadCounts } = get();
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  },
}));
