import { Alert } from 'react-native';
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
      'Photo library permission is required to upload photos.',
      [{ text: 'OK' }]
    );
    return false;
  }
  return true;
};

const toResult = (assets: ImagePicker.ImagePickerAsset[]): ImagePickerResult[] =>
  assets.map((asset, index) => ({
    uri: asset.uri,
    name: `photo_${Date.now()}_${index}.jpg`,
    type: 'image/jpeg',
    data: toDataUrl(asset.base64, 'image/jpeg'),
  }));

export const pickFromGallery = async (
  onImageSelected: (images: ImagePickerResult[]) => void,
  allowsEditing: boolean = true,
  allowMultiple: boolean = false
) => {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return;

  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing, // when false the checker decides on the crop screen
      allowsMultipleSelection: allowMultiple,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(toResult(result.assets));
    }
  } catch (error: any) {
    console.error('Error picking photo:', error);
    Alert.alert('Gallery Error', error?.message || 'Failed to open gallery.');
  }
};

export const showImagePickerOptions = (
  onImageSelected: (images: ImagePickerResult[]) => void,
  allowMultiple: boolean = true,
  options?: { allowsEditing?: boolean; allowGallery?: boolean }
) => {
  const allowsEditing = options?.allowsEditing ?? true;
  const choose = (fromGallery: boolean) =>
    fromGallery
      ? pickFromGallery(onImageSelected, allowsEditing, allowMultiple)
      : takePhoto(onImageSelected, allowsEditing);

  // Virtual inspections may upload photos from the gallery as well as take
  // them live; physical inspections are camera-only so photos can't be sourced
  // from an old or third-party image. `allowMultiple` is only honoured by the
  // gallery — the camera produces a single shot at a time.
  if (options?.allowGallery) {
    Alert.alert('Add Photo', 'Choose a source for the photo', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => choose(false) },
      { text: 'Upload from Gallery', onPress: () => choose(true) },
    ]);
    return;
  }

  takePhoto(onImageSelected, allowsEditing);
};

export const takePhoto = async (
  onImageSelected: (images: ImagePickerResult[]) => void,
  allowsEditing: boolean = true
) => {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return;

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing, // when false the checker decides on the crop screen
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      onImageSelected(toResult(result.assets));
    }
  } catch (error: any) {
    console.error('Error taking photo:', error);
    Alert.alert('Camera Error', error?.message || 'Failed to open camera.');
  }
};
