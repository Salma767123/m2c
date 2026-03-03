import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions } from '@/utils/imagePicker';

interface TestingProps {
  formData?: {
    tests: Array<{
      id: string;
      label: string;
      detail: string;
      pass: boolean;
      fail: boolean;
      rightPhotos: string[];
      wrongPhotos: string[];
    }>;
    testingPhotos: string[];
  };
  setFormData?: (data: any) => void;
}

export function Testing({ formData, setFormData }: TestingProps) {
  const defaultTests = [
    { id: "dropTestResult", label: "Carton Drop Test", detail: "Action and result views" },
    { id: "colorFastnessDry", label: "Color Fastness (Dry)", detail: "Dry cloth rubbing test" },
    { id: "colorFastnessWet", label: "Color Fastness (Wet)", detail: "Wet cloth rubbing test" },
    { id: "seamStrengthResult", label: "Seam Strength Test", detail: "Pull gauge testing" },
    { id: "smellCheck", label: "Smell Check", detail: "Unusual odor detection" },
  ];

  const [localFormData, setLocalFormData] = useState({
    tests: formData?.tests || defaultTests.map(test => ({
      ...test,
      pass: false,
      fail: false,
      rightPhotos: [],
      wrongPhotos: []
    })),
    testingPhotos: formData?.testingPhotos || [],
  });

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  const updateTest = (testId: string, field: string, value: any) => {
    const updatedTests = localFormData.tests.map(t =>
      t.id === testId ? { ...t, [field]: value } : t
    );
    updateFormData({ tests: updatedTests });
  };

  const handleRightPhotoUpload = (testId: string) => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      const test = localFormData.tests.find(t => t.id === testId);
      if (test) {
        updateTest(testId, 'rightPhotos', [...test.rightPhotos, ...photoNames]);
      }
    }, true);
  };

  const handleWrongPhotoUpload = (testId: string) => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      const test = localFormData.tests.find(t => t.id === testId);
      if (test) {
        updateTest(testId, 'wrongPhotos', [...test.wrongPhotos, ...photoNames]);
      }
    }, true);
  };

  const handleGeneralTestingPhotoUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        testingPhotos: [...localFormData.testingPhotos, ...photoNames] 
      });
    }, true);
  };

  const removeRightPhoto = (testId: string, photoIndex: number) => {
    const test = localFormData.tests.find(t => t.id === testId);
    if (test) {
      const updatedPhotos = test.rightPhotos.filter((_, i) => i !== photoIndex);
      updateTest(testId, 'rightPhotos', updatedPhotos);
    }
  };

  const removeWrongPhoto = (testId: string, photoIndex: number) => {
    const test = localFormData.tests.find(t => t.id === testId);
    if (test) {
      const updatedPhotos = test.wrongPhotos.filter((_, i) => i !== photoIndex);
      updateTest(testId, 'wrongPhotos', updatedPhotos);
    }
  };

  const removeGeneralTestingPhoto = (photoIndex: number) => {
    const updatedPhotos = localFormData.testingPhotos.filter((_, i) => i !== photoIndex);
    updateFormData({ testingPhotos: updatedPhotos });
  };

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">6. On-site Tests</Text>
        <Text className="text-sm text-slate-600">
          Functional tests for durability and color integrity (Section C - Item 6)
        </Text>
      </View>

      {localFormData.tests.map((test) => (
        <View key={test.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
          <View className="mb-4">
            <Text className="text-slate-900 font-semibold mb-2">{test.label}</Text>
            <Text className="text-slate-600 text-sm mb-4">{test.detail}</Text>
            
            {/* Pass/Fail Checkboxes */}
            <View className="flex-row gap-6 mb-4">
              <TouchableOpacity
                onPress={() => {
                  updateTest(test.id, 'pass', !test.pass);
                  if (!test.pass && test.fail) {
                    updateTest(test.id, 'fail', false);
                  }
                }}
                className="flex-row items-center gap-2"
              >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                  test.pass ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white'
                }`}>
                  {test.pass && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-slate-700 font-medium">Pass</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  updateTest(test.id, 'fail', !test.fail);
                  if (!test.fail && test.pass) {
                    updateTest(test.id, 'pass', false);
                  }
                }}
                className="flex-row items-center gap-2"
              >
                <View className={`w-5 h-5 rounded border-2 items-center justify-center ${
                  test.fail ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white'
                }`}>
                  {test.fail && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-slate-700 font-medium">Fail</Text>
              </TouchableOpacity>
            </View>

            {/* Photo Upload Section */}
            <View className="mb-4">
              <Text className="text-slate-700 font-medium mb-3 text-sm">Test Photos:</Text>
              
              {/* Right Photos */}
              <View className="mb-4">
                <Text className="text-slate-600 font-medium mb-2 text-sm">✓ Right/Correct Photo</Text>
                <TouchableOpacity
                  onPress={() => handleRightPhotoUpload(test.id)}
                  className="border-2 border-dashed border-green-300 rounded-lg p-4 bg-green-50"
                >
                  <View className="items-center">
                    <Upload size={24} color="#4ade80" />
                    <Text className="text-slate-600 text-sm font-medium mt-2">Upload right photos</Text>
                    <Text className="text-slate-500 text-xs mt-1">Tap to browse</Text>
                  </View>
                </TouchableOpacity>

                {/* Right Photos List */}
                {test.rightPhotos && test.rightPhotos.length > 0 && (
                  <View className="mt-3">
                    {test.rightPhotos.map((photo, index) => (
                      <View key={index} className="flex-row items-center justify-between bg-white p-2 rounded-lg border border-green-200 mb-2">
                        <View className="flex-row items-center gap-2 flex-1">
                          <Camera size={14} color="#4ade80" />
                          <Text className="text-xs text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeRightPhoto(test.id, index)}
                          className="p-1"
                        >
                          <X size={14} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Wrong Photos */}
              <View>
                <Text className="text-slate-600 font-medium mb-2 text-sm">✗ Wrong/Incorrect Photo</Text>
                <TouchableOpacity
                  onPress={() => handleWrongPhotoUpload(test.id)}
                  className="border-2 border-dashed border-red-300 rounded-lg p-4 bg-red-50"
                >
                  <View className="items-center">
                    <Upload size={24} color="#f87171" />
                    <Text className="text-slate-600 text-sm font-medium mt-2">Upload wrong photos</Text>
                    <Text className="text-slate-500 text-xs mt-1">Tap to browse</Text>
                  </View>
                </TouchableOpacity>

                {/* Wrong Photos List */}
                {test.wrongPhotos && test.wrongPhotos.length > 0 && (
                  <View className="mt-3">
                    {test.wrongPhotos.map((photo, index) => (
                      <View key={index} className="flex-row items-center justify-between bg-white p-2 rounded-lg border border-red-200 mb-2">
                        <View className="flex-row items-center gap-2 flex-1">
                          <Camera size={14} color="#f87171" />
                          <Text className="text-xs text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => removeWrongPhoto(test.id, index)}
                          className="p-1"
                        >
                          <X size={14} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      ))}

      {/* General Testing Photos */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">General Testing Photos:</Text>
        <Text className="text-slate-600 text-sm mb-4">
          Drop test, color rubbing, seam strength, factory reference samples
        </Text>
        
        <TouchableOpacity
          onPress={handleGeneralTestingPhotoUpload}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50"
        >
          <View className="items-center">
            <Upload size={48} color="#94a3b8" />
            <Text className="text-slate-700 font-medium mt-3">Upload test photos</Text>
            <Text className="text-slate-500 text-sm mt-1">Tap to browse</Text>
          </View>
        </TouchableOpacity>

        {/* Uploaded Photos List */}
        {localFormData.testingPhotos && localFormData.testingPhotos.length > 0 && (
          <View className="mt-4">
            {localFormData.testingPhotos.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#94a3b8" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeGeneralTestingPhoto(index)}
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
