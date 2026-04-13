import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

const TOKEN_KEYS = {
  accessToken: 'tsewa_access_token',
  refreshToken: 'tsewa_refresh_token',
} as const;

type TokenKey = keyof typeof TOKEN_KEYS;

export async function getToken(key: TokenKey): Promise<string | null> {
  try {
    if (isWeb) return localStorage.getItem(TOKEN_KEYS[key]);
    return await SecureStore.getItemAsync(TOKEN_KEYS[key]);
  } catch {
    return null;
  }
}

export async function setToken(key: TokenKey, value: string): Promise<void> {
  try {
    if (isWeb) { localStorage.setItem(TOKEN_KEYS[key], value); return; }
    await SecureStore.setItemAsync(TOKEN_KEYS[key], value);
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

export async function deleteToken(key: TokenKey): Promise<void> {
  try {
    if (isWeb) { localStorage.removeItem(TOKEN_KEYS[key]); return; }
    await SecureStore.deleteItemAsync(TOKEN_KEYS[key]);
  } catch (error) {
    console.error(`Failed to delete ${key}:`, error);
  }
}

export async function clearAllTokens(): Promise<void> {
  await Promise.all([
    deleteToken('accessToken'),
    deleteToken('refreshToken'),
  ]);
}

// Zustand persist storage adapter
export const secureStoreAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      let raw: string | null = null;
      if (isWeb) {
        raw = localStorage.getItem(name);
      } else {
        raw = await SecureStore.getItemAsync(name);
      }

      // Validate that stored value is parseable JSON before returning.
      // Zustand's createJSONStorage will JSON.parse this — if it's malformed,
      // the middleware crashes and the app white-screens.
      if (raw !== null) {
        try {
          JSON.parse(raw);
        } catch {
          console.warn(`Corrupted data in storage key "${name}", clearing it.`);
          if (isWeb) {
            localStorage.removeItem(name);
          } else {
            await SecureStore.deleteItemAsync(name);
          }
          return null;
        }
      }

      return raw;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (isWeb) { localStorage.setItem(name, value); return; }
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error(`SecureStore setItem error for ${name}:`, error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (isWeb) { localStorage.removeItem(name); return; }
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error(`SecureStore removeItem error for ${name}:`, error);
    }
  },
};
