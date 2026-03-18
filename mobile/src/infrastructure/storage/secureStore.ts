import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const REFRESH_KEY = 'refresh_token';

/**
 * Secure token storage wrapper.
 * Uses expo-secure-store for encrypted storage on device.
 */
export const secureStore = {
  /** Store the JWT token securely. */
  async saveToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  },

  /** Retrieve the stored JWT token. */
  async getToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    }
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  /** Remove the stored JWT token. */
  async removeToken(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  },

  /** Store a refresh token (if implementing refresh flow). */
  async saveRefreshToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_KEY, token);
    }
  },

  /** Retrieve the stored refresh token. */
  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_KEY);
    }
    return SecureStore.getItemAsync(REFRESH_KEY);
  },

  /** Remove the stored refresh token. */
  async removeRefreshToken(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(REFRESH_KEY);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  },

  /** Clear all auth-related stored data. */
  async clearAll(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } else {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_KEY),
      ]);
    }
  },
};
