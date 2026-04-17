import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { ChevronUp, ChevronDown, Upload, X, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { FieldError, compactBorder } from '../FormFields';

interface DefectsProps {
  formData: {
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
    defectPhotos: any[];
  };
  setFormData: (data: any) => void;
  errors?: Record<string, string>;
}

const INSPECTION_LEVELS = ['L-I', 'L-II', 'L-III'];

export default function Defects({ formData, setFormData, errors = {} }: DefectsProps) {
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const errorCount = Object.keys(errors).length;

  const isPassing =
    formData.criticalDefects <= formData.maxAllowedCritical &&
    formData.majorDefects <= formData.maxAllowedMajor &&
    formData.minorDefects <= formData.maxAllowedMinor;

  const incrementDefect = (field: string) => {
    setFormData({ ...formData, [field]: (formData as any)[field] + 1 });
  };

  const decrementDefect = (field: string) => {
    const current = (formData as any)[field];
    if (current > 0) setFormData({ ...formData, [field]: current - 1 });
  };

  const handlePhotos = (images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.data || img.uri,
    }));
    setFormData({ ...formData, defectPhotos: [...formData.defectPhotos, ...newPhotos] });
  };

  const removePhoto = (index: number) => {
    setFormData({ ...formData, defectPhotos: formData.defectPhotos.filter((_, i) => i !== index) });
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">Defects</Text>
        <Text className="text-sm text-gray-500">Record AQL configuration and defect counts</Text>
      </View>

      

      {/* AQL Config */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <Text className="text-sm font-bold text-gray-900 mb-3">AQL Configuration</Text>

        {/* Inspection Level */}
        <View className="mb-3">
          <Text className="text-xs text-gray-500 font-semibold mb-1">
            Inspection Level <Text className="text-red-500">*</Text>
          </Text>
          <TouchableOpacity
            className={`${compactBorder(errors.inspectionLevel)} flex-row items-center justify-between`}
            onPress={() => setShowLevelDropdown(!showLevelDropdown)}
          >
            <Text className="text-sm text-gray-900">{formData.inspectionLevel}</Text>
            <ChevronDown size={16} color="#9ca3af" />
          </TouchableOpacity>
          {showLevelDropdown && (
            <View className="border border-gray-200 rounded-lg mt-1 bg-white overflow-hidden">
              {INSPECTION_LEVELS.map((lev) => (
                <TouchableOpacity
                  key={lev}
                  className="px-3 py-2 border-b border-gray-100"
                  onPress={() => {
                    setFormData({ ...formData, inspectionLevel: lev });
                    setShowLevelDropdown(false);
                  }}
                >
                  <Text className="text-sm text-gray-700">{lev}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 font-semibold mb-1">
              Sample Size <Text className="text-red-500">*</Text>
            </Text>
            <TextInput
              className={`${compactBorder(errors.sampleSize)} text-sm text-gray-900`}
              value={String(formData.sampleSize || '')}
              onChangeText={(v) => setFormData({ ...formData, sampleSize: Number(v) || 0 })}
              keyboardType="numeric"
            />
            <FieldError msg={errors.sampleSize} />
          </View>
        </View>

        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">AQL Levels</Text>
        <View className="flex-row gap-2 mb-3">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Critical</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
              value={String(formData.aqlCritical)}
              onChangeText={(v) => setFormData({ ...formData, aqlCritical: Number(v) || 0 })}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Major</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
              value={String(formData.aqlMajor)}
              onChangeText={(v) => setFormData({ ...formData, aqlMajor: Number(v) || 0 })}
              keyboardType="decimal-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Minor</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
              value={String(formData.aqlMinor)}
              onChangeText={(v) => setFormData({ ...formData, aqlMinor: Number(v) || 0 })}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Allowed</Text>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Critical</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
              value={String(formData.maxAllowedCritical)}
              onChangeText={(v) => setFormData({ ...formData, maxAllowedCritical: Number(v) || 0 })}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Major</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
              value={String(formData.maxAllowedMajor)}
              onChangeText={(v) => setFormData({ ...formData, maxAllowedMajor: Number(v) || 0 })}
              keyboardType="numeric"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-gray-500 mb-1">Minor</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-sm text-gray-900"
              value={String(formData.maxAllowedMinor)}
              onChangeText={(v) => setFormData({ ...formData, maxAllowedMinor: Number(v) || 0 })}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>

      {/* Defect Counters */}
      <View className="flex-row gap-3 mb-4">
        {/* Critical */}
        <View className="flex-1 bg-purple-50 rounded-xl p-3 border border-purple-200 items-center">
          <Text className="text-xs font-bold text-purple-700 mb-2">Critical</Text>
          <Text className="text-3xl font-bold text-purple-800 mb-2">{formData.criticalDefects}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-purple-200 rounded-lg px-2 py-1"
              onPress={() => decrementDefect('criticalDefects')}
            >
              <ChevronDown size={16} color="#7e22ce" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-purple-200 rounded-lg px-2 py-1"
              onPress={() => incrementDefect('criticalDefects')}
            >
              <ChevronUp size={16} color="#7e22ce" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Major */}
        <View className="flex-1 bg-red-50 rounded-xl p-3 border border-red-200 items-center">
          <Text className="text-xs font-bold text-red-700 mb-2">Major</Text>
          <Text className="text-3xl font-bold text-red-800 mb-2">{formData.majorDefects}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-red-200 rounded-lg px-2 py-1"
              onPress={() => decrementDefect('majorDefects')}
            >
              <ChevronDown size={16} color="#dc2626" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-red-200 rounded-lg px-2 py-1"
              onPress={() => incrementDefect('majorDefects')}
            >
              <ChevronUp size={16} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minor */}
        <View className="flex-1 bg-amber-50 rounded-xl p-3 border border-amber-200 items-center">
          <Text className="text-xs font-bold text-amber-700 mb-2">Minor</Text>
          <Text className="text-3xl font-bold text-amber-800 mb-2">{formData.minorDefects}</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="bg-amber-200 rounded-lg px-2 py-1"
              onPress={() => decrementDefect('minorDefects')}
            >
              <ChevronDown size={16} color="#d97706" />
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-amber-200 rounded-lg px-2 py-1"
              onPress={() => incrementDefect('minorDefects')}
            >
              <ChevronUp size={16} color="#d97706" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* AQL Status */}
      <View className={`rounded-xl p-4 mb-4 flex-row items-center ${isPassing ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        {isPassing ? (
          <CheckCircle size={20} color="#16a34a" />
        ) : (
          <AlertTriangle size={20} color="#dc2626" />
        )}
        <Text className={`text-sm font-bold ml-2 ${isPassing ? 'text-green-700' : 'text-red-700'}`}>
          AQL Result: {isPassing ? 'PASS' : 'FAIL'}
        </Text>
      </View>

      {/* Defect Details */}
      <View className="mb-4">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Critical Defect Details
          {formData.criticalDefects > 0 ? <Text className="text-red-500"> *</Text> : null}
        </Text>
        <TextInput
          className={`${compactBorder(errors.criticalDefectDetails)} text-sm text-gray-900 min-h-[60px]`}
          value={formData.criticalDefectDetails}
          onChangeText={(v) => setFormData({ ...formData, criticalDefectDetails: v })}
          placeholder="Describe critical defects found..."
          multiline
          textAlignVertical="top"
        />
        <FieldError msg={errors.criticalDefectDetails} />
      </View>

      <View className="mb-4">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Major Defect Details
          {formData.majorDefects > 0 ? <Text className="text-red-500"> *</Text> : null}
        </Text>
        <TextInput
          className={`${compactBorder(errors.majorDefectDetails)} text-sm text-gray-900 min-h-[60px]`}
          value={formData.majorDefectDetails}
          onChangeText={(v) => setFormData({ ...formData, majorDefectDetails: v })}
          placeholder="Describe major defects found..."
          multiline
          textAlignVertical="top"
        />
        <FieldError msg={errors.majorDefectDetails} />
      </View>

      <View className="mb-4">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Minor Defect Details
          {formData.minorDefects > 0 ? <Text className="text-red-500"> *</Text> : null}
        </Text>
        <TextInput
          className={`${compactBorder(errors.minorDefectDetails)} text-sm text-gray-900 min-h-[60px]`}
          value={formData.minorDefectDetails}
          onChangeText={(v) => setFormData({ ...formData, minorDefectDetails: v })}
          placeholder="Describe minor defects found..."
          multiline
          textAlignVertical="top"
        />
        <FieldError msg={errors.minorDefectDetails} />
      </View>

      {/* Photos */}
      <View className="mt-2 mb-6">
        <Text className="text-sm font-bold text-gray-900 mb-3">
          Defect Photos <Text className="text-red-500">*</Text>
        </Text>
        <TouchableOpacity
          className={`border-2 border-dashed rounded-xl py-6 items-center ${
            errors.defectPhotos ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-gray-50'
          }`}
          onPress={() => showImagePickerOptions(handlePhotos)}
        >
          <Upload size={24} color="#9ca3af" />
          <Text className="text-sm text-gray-500 mt-2">Tap to add photos</Text>
        </TouchableOpacity>
        <FieldError msg={errors.defectPhotos} />

        {formData.defectPhotos.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {formData.defectPhotos.map((photo, idx) => (
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
