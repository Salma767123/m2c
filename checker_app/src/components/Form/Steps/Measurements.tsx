import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, Plus, Trash2, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions } from '@/utils/imagePicker';

interface MeasurementsProps {
  formData?: {
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
    measurementPhotos: string[];
  };
  setFormData?: (data: any) => void;
}

export function Measurements({ formData, setFormData }: MeasurementsProps) {
  const [localFormData, setLocalFormData] = useState({
    measurements: formData?.measurements || [],
    measurementPhotos: formData?.measurementPhotos || [],
  });

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  const handleMeasurementPhotoUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        measurementPhotos: [...localFormData.measurementPhotos, ...photoNames] 
      });
    }, true);
  };

  const removeMeasurementPhoto = (photoIndex: number) => {
    const updatedPhotos = localFormData.measurementPhotos.filter((_, i) => i !== photoIndex);
    updateFormData({ measurementPhotos: updatedPhotos });
  };

  const updateMeasurement = (id: number, field: string, value: number) => {
    const updatedMeasurements = localFormData.measurements.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    );
    updateFormData({ measurements: updatedMeasurements });
  };

  const addSample = () => {
    const newSample = {
      id: Date.now(),
      sampleName: `Sample ${localFormData.measurements.length + 1}`,
      cartonLength: 0,
      cartonWidth: 0,
      cartonHeight: 0,
      productLength: 0,
      productWidth: 0,
      retailWeight: 0,
      cartonGrossWeight: 0
    };
    updateFormData({
      measurements: [...localFormData.measurements, newSample]
    });
  };

  const removeSample = (id: number) => {
    updateFormData({
      measurements: localFormData.measurements.filter(m => m.id !== id)
    });
  };

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">Spec Verification & Physical Measurement</Text>
        <Text className="text-sm text-slate-600">
          Verify product matches tech file specifications (S1 level - 8 samples)
        </Text>
      </View>

      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-base font-semibold text-slate-900">Measurement Samples</Text>
        <TouchableOpacity
          onPress={addSample}
          className="flex-row items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg"
        >
          <Plus size={16} color="#ffffff" />
          <Text className="text-white font-medium text-sm">Add Sample</Text>
        </TouchableOpacity>
      </View>

      {localFormData.measurements.length === 0 ? (
        <View className="py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 mb-6">
          <Text className="text-slate-600 text-center">No samples added yet. Click "Add Sample" to get started.</Text>
        </View>
      ) : (
        <View className="mb-6">
          {localFormData.measurements.map((m) => (
            <View key={m.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="font-semibold text-slate-900">{m.sampleName}</Text>
                <TouchableOpacity
                  onPress={() => removeSample(m.id)}
                  className="p-2 rounded-lg"
                >
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>

              <View className="mb-3">
                <Text className="text-slate-700 font-medium mb-2 text-sm">Carton Dimensions (L/W/H cm):</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    value={String(m.cartonLength)}
                    onChangeText={(text) => updateMeasurement(m.id, 'cartonLength', parseFloat(text) || 0)}
                    placeholder="L"
                    keyboardType="decimal-pad"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-center"
                    placeholderTextColor="#94a3b8"
                  />
                  <TextInput
                    value={String(m.cartonWidth)}
                    onChangeText={(text) => updateMeasurement(m.id, 'cartonWidth', parseFloat(text) || 0)}
                    placeholder="W"
                    keyboardType="decimal-pad"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-center"
                    placeholderTextColor="#94a3b8"
                  />
                  <TextInput
                    value={String(m.cartonHeight)}
                    onChangeText={(text) => updateMeasurement(m.id, 'cartonHeight', parseFloat(text) || 0)}
                    placeholder="H"
                    keyboardType="decimal-pad"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-center"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-slate-700 font-medium mb-2 text-sm">Product Dimensions (L/W cm):</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    value={String(m.productLength)}
                    onChangeText={(text) => updateMeasurement(m.id, 'productLength', parseFloat(text) || 0)}
                    placeholder="Length"
                    keyboardType="decimal-pad"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-center"
                    placeholderTextColor="#94a3b8"
                  />
                  <TextInput
                    value={String(m.productWidth)}
                    onChangeText={(text) => updateMeasurement(m.id, 'productWidth', parseFloat(text) || 0)}
                    placeholder="Width"
                    keyboardType="decimal-pad"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg bg-white text-center"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View className="mb-3">
                <Text className="text-slate-700 font-medium mb-2 text-sm">Retail Weight (kg):</Text>
                <TextInput
                  value={String(m.retailWeight)}
                  onChangeText={(text) => updateMeasurement(m.id, 'retailWeight', parseFloat(text) || 0)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-3">
                <Text className="text-slate-700 font-medium mb-2 text-sm">Carton Gross Weight (kg):</Text>
                <TextInput
                  value={String(m.cartonGrossWeight)}
                  onChangeText={(text) => updateMeasurement(m.id, 'cartonGrossWeight', parseFloat(text) || 0)}
                  placeholder="0.0"
                  keyboardType="decimal-pad"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">Photo Evidence:</Text>
        <Text className="text-slate-600 text-sm mb-4">
          Carton dimensions, product measurements, weight verification
        </Text>
        
        <TouchableOpacity
          onPress={handleMeasurementPhotoUpload}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50"
        >
          <View className="items-center">
            <Upload size={48} color="#94a3b8" />
            <Text className="text-slate-700 font-medium mt-3">Upload measurement photos</Text>
            <Text className="text-slate-500 text-sm mt-1">Tap to browse</Text>
          </View>
        </TouchableOpacity>

        {/* Uploaded Photos List */}
        {localFormData.measurementPhotos && localFormData.measurementPhotos.length > 0 && (
          <View className="mt-4">
            {localFormData.measurementPhotos.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#94a3b8" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeMeasurementPhoto(index)}
                  className="p-1"
                >
                  <X size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
