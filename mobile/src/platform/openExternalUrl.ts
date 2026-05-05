import { Linking, Platform } from 'react-native';

/**
 * Open an external URL safely on both native and web.
 * On web, opens in a new tab with security attributes.
 * On native, uses Linking.openURL.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    await Linking.openURL(url);
  }
}
