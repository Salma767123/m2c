import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, CheckCircle, RotateCcw, UserCheck, MapPin } from 'lucide-react-native';

export type SelfieResult = {
  /** base64-encoded string (without data URI prefix) */
  base64: string;
  /** Full data URI — safe to display in <Image source={{ uri }}/> */
  dataUri: string;
  /** Timestamp when the photo was taken */
  takenAt: string;
  /** GPS latitude (null if permission denied) */
  latitude: number | null;
  /** GPS longitude (null if permission denied) */
  longitude: number | null;
};

interface SelfieCaptureModalProps {
  /** Is the modal visible? */
  visible: boolean;
  /**
   * Title shown at the top, e.g. "Before Inspection Selfie" / "After Inspection Selfie"
   */
  title: string;
  /** Short description shown under the title */
  description: string;
  /** Called when the user confirms the selfie. Modal MUST be hidden by the parent. */
  onConfirm: (result: SelfieResult) => void;
  /** Called when the user taps Cancel (optional — hide if selfie is mandatory) */
  onCancel?: () => void;
}

export default function SelfieCaptureModal({
  visible,
  title,
  description,
  onConfirm,
  onCancel,
}: SelfieCaptureModalProps) {
  const insets = useSafeAreaInsets();
  const [preview, setPreview] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const requestAndCapture = async () => {
    setCapturing(true);
    try {
      // Request camera + location permissions in parallel
      const [camPerm, locPerm] = await Promise.all([
        ImagePicker.requestCameraPermissionsAsync(),
        Location.requestForegroundPermissionsAsync(),
      ]);

      if (camPerm.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please allow camera access in your device settings to take a selfie.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (locPerm.status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Location access is mandatory for inspection verification. Please enable location services in your device settings.',
          [{ text: 'OK' }],
        );
        return;
      }

      // Capture selfie + GPS in parallel
      const [result, location] = await Promise.all([
        ImagePicker.launchCameraAsync({
          cameraType: ImagePicker.CameraType.front,
          quality: 0.6,
          base64: true,
          allowsEditing: false,
          mediaTypes: ['images'],
        }),
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        }).catch(() => null),
      ]);

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert('Error', 'Failed to capture selfie. Please try again.');
        return;
      }

      setRawBase64(asset.base64);
      setPreview(`data:image/jpeg;base64,${asset.base64}`);
      if (location) {
        setCoords({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      }
    } finally {
      setCapturing(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setRawBase64(null);
    setCoords(null);
  };

  const handleConfirm = () => {
    if (!rawBase64 || !preview) return;
    onConfirm({
      base64: rawBase64,
      dataUri: preview,
      takenAt: new Date().toISOString(),
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
    });
    // Reset for next use
    setPreview(null);
    setRawBase64(null);
    setCoords(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-slate-950">
        {/* Header */}
        <View className="pt-14 px-6 pb-6 items-center">
          <View className="w-16 h-16 rounded-full bg-blue-600 items-center justify-center mb-4">
            <UserCheck size={30} color="#ffffff" />
          </View>
          <Text className="text-xl font-extrabold text-white text-center mb-2">
            {title}
          </Text>
          <Text className="text-sm text-slate-400 text-center leading-5">
            {description}
          </Text>
        </View>

        {/* Preview or Placeholder */}
        <View className="flex-1 mx-6 rounded-3xl overflow-hidden bg-slate-800 items-center justify-center">
          {preview ? (
            <Image
              source={{ uri: preview }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="items-center">
              <Camera size={52} color="#475569" strokeWidth={1.5} />
              <Text className="text-slate-500 text-sm mt-4 text-center px-8">
                Tap the button below to open{'\n'}your front camera
              </Text>
            </View>
          )}
        </View>

        {/* GPS Status Badge */}
        {preview && (
          <View className="mx-6 mt-3 flex-row items-center justify-center" style={{ columnGap: 6 }}>
            <MapPin size={14} color={coords ? '#10b981' : '#ef4444'} />
            <Text className={`text-xs font-semibold ${coords ? 'text-emerald-400' : 'text-red-400'}`}>
              {coords
                ? `GPS Captured (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
                : 'GPS not available — location verification may fail'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View
          className="px-6 pt-5"
          style={{
            rowGap: 12,
            paddingBottom: Math.max(insets.bottom, 24) + 12,
          }}
        >
          {!preview ? (
            // Capture button
            <TouchableOpacity
              onPress={requestAndCapture}
              disabled={capturing}
              activeOpacity={0.85}
              className="bg-blue-600 rounded-2xl py-4 items-center justify-center flex-row"
              style={{ opacity: capturing ? 0.7 : 1 }}
            >
              {capturing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Camera size={20} color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">
                    Take Selfie
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            // Retake + Confirm row
            <View className="flex-row" style={{ columnGap: 12 }}>
              <TouchableOpacity
                onPress={handleRetake}
                activeOpacity={0.8}
                className="flex-1 bg-slate-700 rounded-2xl py-4 items-center justify-center flex-row"
              >
                <RotateCcw size={18} color="#cbd5e1" />
                <Text className="text-slate-200 font-semibold text-sm ml-2">
                  Retake
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                activeOpacity={0.85}
                className="flex-1 bg-emerald-600 rounded-2xl py-4 items-center justify-center flex-row"
              >
                <CheckCircle size={18} color="#ffffff" />
                <Text className="text-white font-bold text-sm ml-2">
                  Use Photo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Optional cancel link */}
          {onCancel ? (
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.7}
              className="items-center py-2"
            >
              <Text className="text-slate-500 text-sm">Cancel inspection</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
