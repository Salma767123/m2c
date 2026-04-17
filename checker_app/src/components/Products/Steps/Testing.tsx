import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Upload, X, Check } from 'lucide-react-native';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { FieldError } from '../FormFields';

interface TestingProps {
  formData: {
    tests: Array<{
      id: string;
      label: string;
      detail: string;
      pass: boolean;
      fail: boolean;
      photos: any[];
      rightPhotos: any[];
      wrongPhotos: any[];
    }>;
    testingPhotos: any[];
  };
  setFormData: (data: any) => void;
  errors?: Record<string, string>;
}

const DEFAULT_TESTS = [
  { id: 'dropTestResult', label: 'Carton Drop Test', detail: 'Action and result views' },
  { id: 'colorFastnessDry', label: 'Color Fastness (Dry)', detail: 'Dry cloth rubbing test' },
  { id: 'colorFastnessWet', label: 'Color Fastness (Wet)', detail: 'Wet cloth rubbing test' },
  { id: 'seamStrengthResult', label: 'Seam Strength Test', detail: 'Pull gauge testing' },
  { id: 'smellCheck', label: 'Smell Check', detail: 'Unusual odor detection' },
];

export default function Testing({ formData, setFormData, errors = {} }: TestingProps) {
  // Seed default tests on first mount. Must run in an effect, not during
  // render, otherwise React warns about updating a parent while rendering.
  useEffect(() => {
    if (formData.tests.length === 0) {
      const initialTests = DEFAULT_TESTS.map((t) => ({
        ...t,
        pass: false,
        fail: false,
        photos: [],
        rightPhotos: [],
        wrongPhotos: [],
      }));
      setFormData({ ...formData, tests: initialTests });
    }
    // Only seed once; subsequent renders shouldn't re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (formData.tests.length === 0) return null;

  const updateTest = (testId: string, field: string, value: any) => {
    const updated = formData.tests.map((t) => {
      if (t.id !== testId) return t;
      if (field === 'pass') return { ...t, pass: value, fail: value ? false : t.fail };
      if (field === 'fail') return { ...t, fail: value, pass: value ? false : t.pass };
      return { ...t, [field]: value };
    });
    setFormData({ ...formData, tests: updated });
  };

  const handleRightPhotos = (testId: string, images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.data || img.uri,
      id: Date.now() + Math.random(),
    }));
    const updated = formData.tests.map((t) =>
      t.id === testId ? { ...t, rightPhotos: [...t.rightPhotos, ...newPhotos] } : t
    );
    setFormData({ ...formData, tests: updated });
  };

  const handleWrongPhotos = (testId: string, images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.data || img.uri,
      id: Date.now() + Math.random(),
    }));
    const updated = formData.tests.map((t) =>
      t.id === testId ? { ...t, wrongPhotos: [...t.wrongPhotos, ...newPhotos] } : t
    );
    setFormData({ ...formData, tests: updated });
  };

  const removeRightPhoto = (testId: string, photoIdx: number) => {
    const updated = formData.tests.map((t) =>
      t.id === testId ? { ...t, rightPhotos: t.rightPhotos.filter((_, i) => i !== photoIdx) } : t
    );
    setFormData({ ...formData, tests: updated });
  };

  const removeWrongPhoto = (testId: string, photoIdx: number) => {
    const updated = formData.tests.map((t) =>
      t.id === testId ? { ...t, wrongPhotos: t.wrongPhotos.filter((_, i) => i !== photoIdx) } : t
    );
    setFormData({ ...formData, tests: updated });
  };

  const handleGeneralPhotos = (images: ImagePickerResult[]) => {
    const newPhotos = images.map((img) => ({
      name: img.name,
      uri: img.uri,
      data: img.data || img.uri,
      id: Date.now() + Math.random(),
    }));
    setFormData({ ...formData, testingPhotos: [...formData.testingPhotos, ...newPhotos] });
  };

  const removeGeneralPhoto = (index: number) => {
    setFormData({ ...formData, testingPhotos: formData.testingPhotos.filter((_, i) => i !== index) });
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">Testing</Text>
        <Text className="text-sm text-gray-500">Perform and document product tests</Text>
      </View>

      
      {errors.tests ? <FieldError msg={errors.tests} /> : null}

      {formData.tests.map((test, idx) => {
        const testErr = errors[`tests.${idx}.result`];
        return (
        <View
          key={test.id}
          className={`rounded-xl p-4 mb-4 border ${
            testErr ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
          }`}
        >
          <View className="flex-row items-center mb-1">
            <Text className="text-sm font-bold text-gray-900">{test.label}</Text>
            <Text className="text-red-500 ml-1">*</Text>
          </View>
          <Text className="text-xs text-gray-500 mb-3">{test.detail}</Text>

          {/* Pass / Fail toggles */}
          <View className="flex-row gap-3 mb-3">
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center py-2 rounded-lg border ${
                test.pass ? 'bg-green-100 border-green-400' : 'bg-white border-gray-300'
              }`}
              onPress={() => updateTest(test.id, 'pass', !test.pass)}
            >
              {test.pass && <Check size={14} color="#16a34a" />}
              <Text className={`text-sm font-semibold ml-1 ${test.pass ? 'text-green-700' : 'text-gray-600'}`}>Pass</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center py-2 rounded-lg border ${
                test.fail ? 'bg-red-100 border-red-400' : 'bg-white border-gray-300'
              }`}
              onPress={() => updateTest(test.id, 'fail', !test.fail)}
            >
              {test.fail && <X size={14} color="#dc2626" />}
              <Text className={`text-sm font-semibold ml-1 ${test.fail ? 'text-red-700' : 'text-gray-600'}`}>Fail</Text>
            </TouchableOpacity>
          </View>

          {/* Right / Wrong Photos */}
          <View className="flex-row gap-2">
            {/* Right Photos */}
            <View className="flex-1">
              <Text className="text-xs font-semibold text-green-700 mb-1">Correct Photos</Text>
              <TouchableOpacity
                className="border border-dashed border-green-300 rounded-lg py-3 items-center bg-green-50"
                onPress={() => showImagePickerOptions((imgs) => handleRightPhotos(test.id, imgs))}
              >
                <Upload size={16} color="#16a34a" />
                <Text className="text-xs text-green-600 mt-1">Add</Text>
              </TouchableOpacity>
              {test.rightPhotos.length > 0 && (
                <View className="flex-row flex-wrap mt-2 gap-1">
                  {test.rightPhotos.map((p, i) => (
                    <View key={i} className="w-14 h-14 rounded-md overflow-hidden relative">
                      <Image source={{ uri: p.uri || p.data }} className="w-full h-full" />
                      <TouchableOpacity
                        className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5"
                        onPress={() => removeRightPhoto(test.id, i)}
                      >
                        <X size={8} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Wrong Photos */}
            <View className="flex-1">
              <Text className="text-xs font-semibold text-red-700 mb-1">Incorrect Photos</Text>
              <TouchableOpacity
                className="border border-dashed border-red-300 rounded-lg py-3 items-center bg-red-50"
                onPress={() => showImagePickerOptions((imgs) => handleWrongPhotos(test.id, imgs))}
              >
                <Upload size={16} color="#dc2626" />
                <Text className="text-xs text-red-600 mt-1">Add</Text>
              </TouchableOpacity>
              {test.wrongPhotos.length > 0 && (
                <View className="flex-row flex-wrap mt-2 gap-1">
                  {test.wrongPhotos.map((p, i) => (
                    <View key={i} className="w-14 h-14 rounded-md overflow-hidden relative">
                      <Image source={{ uri: p.uri || p.data }} className="w-full h-full" />
                      <TouchableOpacity
                        className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5"
                        onPress={() => removeWrongPhoto(test.id, i)}
                      >
                        <X size={8} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
        );
      })}

      {/* General Testing Photos */}
      <View className="mt-2 mb-6">
        <Text className="text-sm font-bold text-gray-900 mb-3">
          General Testing Photos <Text className="text-red-500">*</Text>
        </Text>
        <FieldError msg={errors.testingPhotos} />
        <TouchableOpacity
          className="border-2 border-dashed border-gray-300 rounded-xl py-6 items-center bg-gray-50"
          onPress={() => showImagePickerOptions(handleGeneralPhotos)}
        >
          <Upload size={24} color="#9ca3af" />
          <Text className="text-sm text-gray-500 mt-2">Tap to add photos</Text>
        </TouchableOpacity>

        {formData.testingPhotos.length > 0 && (
          <View className="flex-row flex-wrap mt-3 gap-2">
            {formData.testingPhotos.map((photo, idx) => (
              <View key={idx} className="w-20 h-20 rounded-lg overflow-hidden relative">
                <Image source={{ uri: photo.uri || photo.data }} className="w-full h-full" />
                <TouchableOpacity
                  className="absolute top-0 right-0 bg-red-500 rounded-full p-0.5"
                  onPress={() => removeGeneralPhoto(idx)}
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
