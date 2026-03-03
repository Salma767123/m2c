import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export interface ImagePickerResult {
  uri: string;
  name: string;
  type: string;
}

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
  Alert.alert(
    'Select Photo',
    'Choose an option',
    [
      {
        text: 'Take Photo',
        onPress: () => takePhoto(onImageSelected),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => pickFromGallery(onImageSelected, allowMultiple),
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const images: ImagePickerResult[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: `photo_${Date.now()}_${index}.jpg`,
        type: 'image/jpeg',
      }));
      onImageSelected(images);
    }
  } catch (error) {
    console.error('Error taking photo:', error);
    Alert.alert('Error', 'Failed to take photo. Please try again.');
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: allowMultiple,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const images: ImagePickerResult[] = result.assets.map((asset, index) => {
        const fileName = asset.uri.split('/').pop() || `image_${Date.now()}_${index}.jpg`;
        return {
          uri: asset.uri,
          name: fileName,
          type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
        };
      });
      onImageSelected(images);
    }
  } catch (error) {
    console.error('Error picking image:', error);
    Alert.alert('Error', 'Failed to select image. Please try again.');
  }
};
