import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Plus, Trash2, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';

interface MeasurementsProps {
  formData: {
    measurements: Array<{
      id: number;
      sampleName: string;
      cartonLength: number;
      cartonWidth: number;
      cartonHeight: number;
      productLength: number;
      productWidth: number;
      retailWeight: number;
      cartonGrossWeight: number;
    }>;
    measurementPhotos: any[];
  };
  setFormData: (data: any) => void;
}

export default function Measurements({ formData, setFormData }: MeasurementsProps) {
  const updateMeasurement = (id: number, field: string, value: any) => {
    const updated = formData.measurements.map((m) =>
      m.id === id ? { ...m, [field]: value } : m
    );
    setFormData({ ...formData, measurements: updated });
  };

  const addSample = () => {
    const newSample = {
      id: Date.now(),
      sampleName: `Sample #${formData.measurements.length + 1}`,
      cartonLength: 0,
      cartonWidth: 0,
      cartonHeight: 0,
      productLength: 0,
      productWidth: 0,
      retailWeight: 0,
      cartonGrossWeight: 0,
    };
    setFormData({ ...formData, measurements: [...formData.measurements, newSample] });
  };

  const removeSample = (id: number) => {
    setFormData({ ...formData, measurements: formData.measurements.filter((m) => m.id !== id) });
  };

  const handlePhotos = (images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.uri,
    }));
    setFormData({ ...formData, measurementPhotos: [...formData.measurementPhotos, ...newPhotos] });
  };

  const removePhoto = (index: number) => {
    setFormData({ ...formData, measurementPhotos: formData.measurementPhotos.filter((_, i) => i !== index) });
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-4 flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-gray-900 mb-1">Measurements</Text>
          <Text className="text-sm text-gray-500">Record carton and product dimensions</Text>
        </View>
        <TouchableOpacity
          className="bg-gray-900 rounded-xl px-4 py-2 flex-row items-center"
          onPress={addSample}
        >
          <Plus size={16} color="#fff" />
          <Text className="text-white text-sm font-semibold ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      {formData.measurements.length === 0 && (
        <View className="bg-gray-50 rounded-xl p-8 items-center mb-4">
          <Text className="text-gray-400 text-sm">No samples added yet. Tap "Add" to begin.</Text>
        </View>
      )}

      {formData.measurements.map((m, idx) => (
        <View key={m.id} className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-bold text-gray-900">Sample #{idx + 1}</Text>
            <TouchableOpacity onPress={() => removeSample(m.id)}>
              <Trash2 size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Carton Dimensions (cm)</Text>
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Length</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.cartonLength || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'cartonLength', Number(v) || 0)}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Width</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.cartonWidth || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'cartonWidth', Number(v) || 0)}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Height</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.cartonHeight || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'cartonHeight', Number(v) || 0)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Product Dimensions (cm)</Text>
          <View className="flex-row gap-2 mb-3">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Length</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.productLength || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'productLength', Number(v) || 0)}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Width</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.productWidth || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'productWidth', Number(v) || 0)}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Weight (kg)</Text>
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Retail</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.retailWeight || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'retailWeight', Number(v) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Gross</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
                value={String(m.cartonGrossWeight || '')}
                onChangeText={(v) => updateMeasurement(m.id, 'cartonGrossWeight', Number(v) || 0)}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>
      ))}

      {/* Photos */}
      <View className="mt-2 mb-6">
        <Text className="text-sm font-bold text-gray-900 mb-3">Measurement Photos</Text>
        <TouchableOpacity
          className="border-2 border-dashed border-gray-300 rounded-xl py-6 items-center bg-gray-50"
          onPress={() => showImagePickerOptions(handlePhotos)}
        >
          <Upload size={24} color="#9ca3af" />
          <Text className="text-sm text-gray-500 mt-2">Tap to add photos</Text>
        </TouchableOpacity>

        {formData.measurementPhotos.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {formData.measurementPhotos.map((photo, idx) => (
              <View key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative">
                <Image source={{ uri: photo.uri || photo.data }} className="w-full h-full" />
                <TouchableOpacity
                  className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5"
                  onPress={() => removePhoto(idx)}
                >
                  <X size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
