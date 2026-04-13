import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStoreAdapter } from '../../lib/storage';

const AUTH_STORE_KEY = 'tsewa-auth-store';

export interface AuthUser {
  id: string;
  email: string;
  isActive: boolean;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  login: (tokens: AuthTokens, user: AuthUser) => void;
  logout: () => void;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: AuthUser) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isHydrated: false,

      login: (tokens, user) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),

      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }),

      setUser: (user) => set({ user }),

      setHydrated: (hydrated) => set({ isHydrated: hydrated }),
    }),
    {
      name: AUTH_STORE_KEY,
      storage: createJSONStorage(() => secureStoreAdapter),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Auth store rehydration failed, clearing corrupted data:', error);
          // Clear the corrupted storage entry so the next load starts fresh
          secureStoreAdapter.removeItem(AUTH_STORE_KEY).catch(() => {});
          // Force hydrated so the app doesn't hang on the loading screen
          useAuthStore.setState({
            accessToken: null,
            refreshToken: null,
            user: null,
            isAuthenticated: false,
            isHydrated: true,
          });
          return;
        }
        state?.setHydrated(true);
      },
    }
  )
);
