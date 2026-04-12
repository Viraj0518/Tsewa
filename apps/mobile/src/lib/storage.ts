import * as SecureStore from 'expo-secure-store';

const TOKEN_KEYS = {
  accessToken: 'tsewa_access_token',
  refreshToken: 'tsewa_refresh_token',
} as const;

type TokenKey = keyof typeof TOKEN_KEYS;

export async function getToken(key: TokenKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEYS[key]);
  } catch {
    return null;
  }
}

export async function setToken(key: TokenKey, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEYS[key], value);
  } catch (error) {
    console.error(`Failed to save ${key}:`, error);
  }
}

export async function deleteToken(key: TokenKey): Promise<void> {
  try {
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

// Zustand persist storage adapter for expo-secure-store
export const secureStoreAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch (error) {
      console.error(`SecureStore setItem error for ${name}:`, error);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch (error) {
      console.error(`SecureStore removeItem error for ${name}:`, error);
    }
  },
};
