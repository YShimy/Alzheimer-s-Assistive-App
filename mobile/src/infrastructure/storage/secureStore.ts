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
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  /** Retrieve the stored JWT token. */
  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  /** Remove the stored JWT token. */
  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },

  /** Store a refresh token (if implementing refresh flow). */
  async saveRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_KEY, token);
  },

  /** Retrieve the stored refresh token. */
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },

  /** Remove the stored refresh token. */
  async removeRefreshToken(): Promise<void> {
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },

  /** Clear all auth-related stored data. */
  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
  },
};
