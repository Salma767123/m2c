import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions } from '@/utils/imagePicker';

interface DefectsProps {
  formData?: {
    inspectionLevel: string;
    sampleSize: number;
    aqlCritical: number;
    aqlMajor: number;
    aqlMinor: number;
    maxAllowedCritical: number;
    maxAllowedMajor: number;
    maxAllowedMinor: number;
    criticalDefects: number;
    majorDefects: number;
    minorDefects: number;
    criticalDefectDetails: string;
    majorDefectDetails: string;
    minorDefectDetails: string;
    defectPhotos: string[];
  };
  setFormData?: (data: any) => void;
}

export function Defects({ formData, setFormData }: DefectsProps) {
  const [localFormData, setLocalFormData] = useState({
    inspectionLevel: formData?.inspectionLevel || 'L-II',
    sampleSize: formData?.sampleSize || 200,
    aqlCritical: formData?.aqlCritical || 0,
    aqlMajor: formData?.aqlMajor || 1.0,
    aqlMinor: formData?.aqlMinor || 2.5,
    maxAllowedCritical: formData?.maxAllowedCritical || 0,
    maxAllowedMajor: formData?.maxAllowedMajor || 5,
    maxAllowedMinor: formData?.maxAllowedMinor || 10,
    criticalDefects: formData?.criticalDefects || 0,
    majorDefects: formData?.majorDefects || 0,
    minorDefects: formData?.minorDefects || 0,
    criticalDefectDetails: formData?.criticalDefectDetails || '',
    majorDefectDetails: formData?.majorDefectDetails || '',
    minorDefectDetails: formData?.minorDefectDetails || '',
    defectPhotos: formData?.defectPhotos || [],
  });

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  const handleDefectPhotoUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        defectPhotos: [...localFormData.defectPhotos, ...photoNames] 
      });
    }, true);
  };

  const removeDefectPhoto = (photoIndex: number) => {
    const updatedPhotos = localFormData.defectPhotos.filter((_, i) => i !== photoIndex);
    updateFormData({ defectPhotos: updatedPhotos });
  };

  const isAQLPass = 
    localFormData.criticalDefects <= localFormData.maxAllowedCritical &&
    localFormData.majorDefects <= localFormData.maxAllowedMajor &&
    localFormData.minorDefects <= localFormData.maxAllowedMinor;

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">
          AQL Summary (Workmanship, Appearance and Basic Function)
        </Text>
        <Text className="text-sm text-slate-600">
          Visual AQL check on {localFormData.sampleSize} randomly selected units for critical, major and minor defects
        </Text>
      </View>

      {/* AQL Configuration */}
      <View className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-200">
        <Text className="text-base font-semibold text-slate-900 mb-4">AQL Configuration</Text>
        
        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">Inspection Level</Text>
          <View className="flex-row gap-2">
            {['L-I', 'L-II', 'L-III'].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => updateFormData({ inspectionLevel: level })}
                className={`flex-1 px-3 py-2 border rounded-lg ${
                  localFormData.inspectionLevel === level
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-slate-300'
                }`}
              >
                <Text className={`text-center font-medium ${
                  localFormData.inspectionLevel === level ? 'text-white' : 'text-slate-700'
                }`}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">Sample Size</Text>
          <TextInput
            value={String(localFormData.sampleSize)}
            onChangeText={(text) => updateFormData({ sampleSize: parseInt(text) || 200 })}
            keyboardType="numeric"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-700 mb-2">AQL - Major</Text>
            <TextInput
              value={String(localFormData.aqlMajor)}
              onChangeText={(text) => updateFormData({ aqlMajor: parseFloat(text) || 1.0 })}
              keyboardType="decimal-pad"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              placeholderTextColor="#94a3b8"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-700 mb-2">AQL - Minor</Text>
            <TextInput
              value={String(localFormData.aqlMinor)}
              onChangeText={(text) => updateFormData({ aqlMinor: parseFloat(text) || 2.5 })}
              keyboardType="decimal-pad"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">Max Allowed - Critical</Text>
          <TextInput
            value={String(localFormData.maxAllowedCritical)}
            onChangeText={(text) => updateFormData({ maxAllowedCritical: parseInt(text) || 0 })}
            keyboardType="numeric"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">Max Allowed - Major</Text>
          <TextInput
            value={String(localFormData.maxAllowedMajor)}
            onChangeText={(text) => updateFormData({ maxAllowedMajor: parseInt(text) || 5 })}
            keyboardType="numeric"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-3">
          <Text className="text-sm font-medium text-slate-700 mb-2">Max Allowed - Minor</Text>
          <TextInput
            value={String(localFormData.maxAllowedMinor)}
            onChangeText={(text) => updateFormData({ maxAllowedMinor: parseInt(text) || 10 })}
            keyboardType="numeric"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Defect Counters */}
      <View className="mb-6">
        {/* Critical Defects */}
        <View className="bg-purple-50 border border-purple-200 p-4 rounded-xl mb-4">
          <Text className="text-purple-800 font-semibold mb-4">
            Critical Defects (Max: {localFormData.maxAllowedCritical})
          </Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => updateFormData({ criticalDefects: Math.max(0, localFormData.criticalDefects - 1) })}
              className="p-3 bg-white border border-purple-300 rounded-lg"
            >
              <ChevronDown size={20} color="#9333ea" />
            </TouchableOpacity>
            <Text className="text-5xl font-bold text-purple-700">{localFormData.criticalDefects}</Text>
            <TouchableOpacity
              onPress={() => updateFormData({ criticalDefects: localFormData.criticalDefects + 1 })}
              className="p-3 bg-white border border-purple-300 rounded-lg"
            >
              <ChevronUp size={20} color="#9333ea" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Major Defects */}
        <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4">
          <Text className="text-red-800 font-semibold mb-4">
            Major Defects (Weaving, cut holes - Max: {localFormData.maxAllowedMajor})
          </Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => updateFormData({ majorDefects: Math.max(0, localFormData.majorDefects - 1) })}
              className="p-3 bg-white border border-red-300 rounded-lg"
            >
              <ChevronDown size={20} color="#dc2626" />
            </TouchableOpacity>
            <Text className="text-5xl font-bold text-red-700">{localFormData.majorDefects}</Text>
            <TouchableOpacity
              onPress={() => updateFormData({ majorDefects: localFormData.majorDefects + 1 })}
              className="p-3 bg-white border border-red-300 rounded-lg"
            >
              <ChevronUp size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minor Defects */}
        <View className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-4">
          <Text className="text-amber-800 font-semibold mb-4">
            Minor Defects (Pulled yarns, threads - Max: {localFormData.maxAllowedMinor})
          </Text>
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => updateFormData({ minorDefects: Math.max(0, localFormData.minorDefects - 1) })}
              className="p-3 bg-white border border-amber-300 rounded-lg"
            >
              <ChevronDown size={20} color="#d97706" />
            </TouchableOpacity>
            <Text className="text-5xl font-bold text-amber-700">{localFormData.minorDefects}</Text>
            <TouchableOpacity
              onPress={() => updateFormData({ minorDefects: localFormData.minorDefects + 1 })}
              className="p-3 bg-white border border-amber-300 rounded-lg"
            >
              <ChevronUp size={20} color="#d97706" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Defect Details */}
      <View className="mb-6">
        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2">Critical Defect Details:</Text>
          <TextInput
            value={localFormData.criticalDefectDetails}
            onChangeText={(text) => updateFormData({ criticalDefectDetails: text })}
            placeholder="Describe critical defects found..."
            multiline
            numberOfLines={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2">Major Defect Details:</Text>
          <TextInput
            value={localFormData.majorDefectDetails}
            onChangeText={(text) => updateFormData({ majorDefectDetails: text })}
            placeholder="Describe major defects found..."
            multiline
            numberOfLines={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2">Minor Defect Details:</Text>
          <TextInput
            value={localFormData.minorDefectDetails}
            onChangeText={(text) => updateFormData({ minorDefectDetails: text })}
            placeholder="Describe minor defects found..."
            multiline
            numberOfLines={3}
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
          />
        </View>
      </View>

      {/* AQL Status Summary */}
      <View className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-6">
        <Text className="text-base font-semibold text-slate-900 mb-4">AQL Summary</Text>
        <View className="flex-row justify-between mb-4">
          <View className="items-center flex-1">
            <Text className="text-sm text-slate-600">Critical</Text>
            <Text className="text-2xl font-bold text-slate-900">
              {localFormData.criticalDefects}/{localFormData.maxAllowedCritical}
            </Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-sm text-slate-600">Major</Text>
            <Text className="text-2xl font-bold text-slate-900">
              {localFormData.majorDefects}/{localFormData.maxAllowedMajor}
            </Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-sm text-slate-600">Minor</Text>
            <Text className="text-2xl font-bold text-slate-900">
              {localFormData.minorDefects}/{localFormData.maxAllowedMinor}
            </Text>
          </View>
        </View>
        
        <View className={`p-4 rounded-lg border-2 ${
          isAQLPass ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
        }`}>
          <View className="flex-row items-center gap-3">
            {isAQLPass ? (
              <CheckCircle size={24} color="#059669" />
            ) : (
              <AlertTriangle size={24} color="#dc2626" />
            )}
            <Text className={`font-bold text-lg ${
              isAQLPass ? 'text-emerald-800' : 'text-red-800'
            }`}>
              AQL Status: {isAQLPass ? 'PASS' : 'FAIL'}
            </Text>
          </View>
        </View>
      </View>

      {/* Photo Evidence */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">Photo Evidence:</Text>
        <Text className="text-slate-600 text-sm mb-4">Major/minor defects, sealed samples with AQF tape</Text>
        
        <TouchableOpacity
          onPress={handleDefectPhotoUpload}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50"
        >
          <View className="items-center">
            <Upload size={48} color="#94a3b8" />
            <Text className="text-slate-700 font-medium mt-3">Upload defect photos</Text>
            <Text className="text-slate-500 text-sm mt-1">Tap to browse</Text>
          </View>
        </TouchableOpacity>

        {/* Uploaded Photos List */}
        {localFormData.defectPhotos && localFormData.defectPhotos.length > 0 && (
          <View className="mt-4">
            {localFormData.defectPhotos.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#94a3b8" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeDefectPhoto(index)}
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
