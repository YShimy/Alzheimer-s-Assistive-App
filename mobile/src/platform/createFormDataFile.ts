import { Platform } from 'react-native';

/**
 * Convert a file URI into a value suitable for FormData.append().
 *
 * On native: returns the React Native blob shape { uri, name, type }.
 * On web: fetches blob/data URIs and returns a proper File/Blob object
 *          that works with standard browser FormData.
 */
export async function createFormDataFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<any> {
  if (Platform.OS === 'web') {
    // Web fetch FormData expects a Blob/File, not an RN blob descriptor
    if (fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
      const res = await fetch(fileUri);
      const blob = await res.blob();
      return new File([blob], fileName, { type: mimeType });
    }
    // If it's already a plain path or string, return as-is and let fetch handle it
    return fileUri;
  }

  return {
    uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
    name: fileName,
    type: mimeType,
  };
}
