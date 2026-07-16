import React, { useState } from 'react';
import {
  View,
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
import { AppText } from '@/components/UI/AppText';
import { colors } from '@/constants/design';

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
          <View className="w-16 h-16 rounded-full bg-brand-500 items-center justify-center mb-4">
            <UserCheck size={30} color={colors.white} />
          </View>
          <AppText variant="headlineMd" color={colors.white} style={{ textAlign: 'center', marginBottom: 8 }}>
            {title}
          </AppText>
          <AppText variant="bodyMd" color="#94a3b8" style={{ textAlign: 'center' }}>
            {description}
          </AppText>
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
              <AppText variant="bodyMd" color="#64748b" style={{ marginTop: 16, textAlign: 'center', paddingHorizontal: 32 }}>
                Tap the button below to open{'\n'}your front camera
              </AppText>
            </View>
          )}
        </View>

        {/* GPS Status Badge */}
        {preview && (
          <View className="mx-6 mt-3 flex-row items-center justify-center" style={{ columnGap: 6 }}>
            <MapPin size={14} color={coords ? '#10b981' : '#ef4444'} />
            <AppText variant="labelMd" color={coords ? '#34d399' : '#f87171'}>
              {coords
                ? `GPS Captured (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
                : 'GPS not available — location verification may fail'}
            </AppText>
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
              className="bg-brand-500 rounded-2xl py-4 items-center justify-center flex-row"
              style={{ opacity: capturing ? 0.7 : 1 }}
            >
              {capturing ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Camera size={20} color={colors.white} />
                  <AppText variant="titleMd" color={colors.white} style={{ marginLeft: 8 }}>
                    Take Selfie
                  </AppText>
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
                <AppText variant="titleMd" color="#e2e8f0" style={{ marginLeft: 8 }}>
                  Retake
                </AppText>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirm}
                activeOpacity={0.85}
                className="flex-1 bg-emerald-600 rounded-2xl py-4 items-center justify-center flex-row"
              >
                <CheckCircle size={18} color={colors.white} />
                <AppText variant="titleMd" color={colors.white} style={{ marginLeft: 8 }}>
                  Use Photo
                </AppText>
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
              <AppText variant="bodyMd" color="#64748b">Cancel inspection</AppText>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
