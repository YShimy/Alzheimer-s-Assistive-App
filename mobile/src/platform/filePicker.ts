import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export interface PickedFile {
  uri: string;
  mimeType: string;
  name: string;
  size?: number;
}

/**
 * Pick an image from the device library.
 * On web, falls back to a hidden <input type="file">.
 */
export async function pickImage(): Promise<PickedFile | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({
            uri: URL.createObjectURL(file),
            mimeType: file.type || 'image/jpeg',
            name: file.name,
            size: file.size,
          });
        } else {
          resolve(null);
        }
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    });
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      mimeType: asset.mimeType || 'image/jpeg',
      name: asset.fileName || 'image.jpg',
      size: asset.fileSize,
    };
  }
  return null;
}

/**
 * Pick media (image or video).
 * On web, falls back to a hidden <input type="file">.
 */
export async function pickMedia(type: 'image' | 'video' = 'image'): Promise<PickedFile | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = type === 'image' ? 'image/*' : 'video/*';
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({
            uri: URL.createObjectURL(file),
            mimeType: file.type || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
            name: file.name,
            size: file.size,
          });
        } else {
          resolve(null);
        }
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    });
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: type === 'image' ? ['images'] : ['videos'],
    allowsEditing: type === 'image',
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      mimeType: asset.mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
      name: asset.fileName || (type === 'image' ? 'image.jpg' : 'video.mp4'),
      size: asset.fileSize,
    };
  }
  return null;
}

/**
 * Pick a document (PDF, image, etc.).
 * On web, falls back to a hidden <input type="file">.
 */
export async function pickDocument(accept?: string): Promise<PickedFile | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || 'application/pdf,image/*';
      input.style.display = 'none';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          resolve({
            uri: URL.createObjectURL(file),
            mimeType: file.type || 'application/octet-stream',
            name: file.name,
            size: file.size,
          });
        } else {
          resolve(null);
        }
        input.remove();
      };
      document.body.appendChild(input);
      input.click();
    });
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: accept ? accept.split(',') : ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    copyToCacheDirectory: true,
  });

  if (!result.canceled && result.assets && result.assets.length > 0) {
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      mimeType: asset.mimeType || 'application/octet-stream',
      name: asset.name,
      size: asset.size,
    };
  }
  return null;
}
