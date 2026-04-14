import { Alert, ToastAndroid, Platform } from 'react-native';

export const showSuccessToast = (title: string, message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${title}: ${message}`, ToastAndroid.SHORT);
  } else {
    Alert.alert(title, message);
  }
};

export const showErrorToast = (title: string, message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${title}: ${message}`, ToastAndroid.LONG);
  } else {
    Alert.alert(title, message);
  }
};

export const showInfoToast = (title: string, message: string) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`${title}: ${message}`, ToastAndroid.SHORT);
  } else {
    Alert.alert(title, message);
  }
};
