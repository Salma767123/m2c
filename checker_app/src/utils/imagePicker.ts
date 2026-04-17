import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerResult {
  uri: string;
  name: string;
  type: string;
  /** base64 data URL (`data:image/jpeg;base64,...`) — ready to send to the API. */
  data: string;
}

const toDataUrl = (base64?: string | null, mime: string = 'image/jpeg') =>
  base64 ? `data:${mime};base64,${base64}` : '';

export const requestCameraPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Camera permission is required to take photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

export const requestMediaLibraryPermission = async (): Promise<boolean> => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Permission Required',
      'Media library permission is required to select photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

export const showImagePickerOptions = (
  onImageSelected: (images: ImagePickerResult[]) => void,
  allowMultiple: boolean = true
) => {
  // Defer the native picker launch until AFTER the Alert's dismiss animation.
  // Launching immediately inside onPress silently fails on both iOS + Android
  // because two native modals can't open on the same frame.
  const defer = (fn: () => void) => setTimeout(fn, 350);
  Alert.alert(
    'Select Photo',
    'Choose an option',
    [
      {
        text: 'Take Photo',
        onPress: () => defer(() => takePhoto(onImageSelected)),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => defer(() => pickFromGallery(onImageSelected, allowMultiple)),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ],
    { cancelable: true }
  );
};

export const takePhoto = async (
  onImageSelected: (images: ImagePickerResult[]) => void
) => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return;

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const images: ImagePickerResult[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: `photo_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
        data: toDataUrl(asset.base64, 'image/jpeg'),
      }));
      onImageSelected(images);
    }
  } catch (error: any) {
    console.error('Error taking photo:', error);
    Alert.alert('Camera Error', error?.message || 'Failed to open camera.');
  }
};

export const pickFromGallery = async (
  onImageSelected: (images: ImagePickerResult[]) => void,
  allowMultiple: boolean = true
) => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: allowMultiple,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const images: ImagePickerResult[] = result.assets.map((asset, index) => {
        const fileName = asset.uri.split('/').pop() || `image_${Date.now()}_${index}.jpg`;
        const mime = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
        return {
          uri: asset.uri,
          name: fileName,
          type: mime,
          data: toDataUrl(asset.base64, mime),
        };
      });
      onImageSelected(images);
    }
  } catch (error: any) {
    console.error('Error picking image:', error);
    Alert.alert('Gallery Error', error?.message || 'Failed to open gallery.');
  }
};
