import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions } from '@/utils/imagePicker';

interface PackagingProps {
  formData?: {
    shipperCartonRemark: string;
    innerCartonRemark: string;
    retailPackagingRemark: string;
    productTypeRemark: string;
    aqlWorkmanshipRemark: string;
    onSiteTestsRemark: string;
    packagingPhotos: string[];
  };
  setFormData?: (data: any) => void;
}

export function Packaging({ formData, setFormData }: PackagingProps) {
  const [localFormData, setLocalFormData] = useState({
    shipperCartonRemark: formData?.shipperCartonRemark || '',
    innerCartonRemark: formData?.innerCartonRemark || '',
    retailPackagingRemark: formData?.retailPackagingRemark || '',
    productTypeRemark: formData?.productTypeRemark || '',
    aqlWorkmanshipRemark: formData?.aqlWorkmanshipRemark || '',
    onSiteTestsRemark: formData?.onSiteTestsRemark || '',
    packagingPhotos: formData?.packagingPhotos || [],
  });

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  const handlePackagingPhotoUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        packagingPhotos: [...localFormData.packagingPhotos, ...photoNames] 
      });
    }, true);
  };

  const removePackagingPhoto = (photoIndex: number) => {
    const updatedPhotos = localFormData.packagingPhotos.filter((_, i) => i !== photoIndex);
    updateFormData({ packagingPhotos: updatedPhotos });
  };

  const handleRemarkNumberSelect = (remarkKey: string, number: string) => {
    updateFormData({ [remarkKey]: number });
  };

  const isRemarkNumberSelected = (remarkKey: string, number: string) => {
    const currentValue = (localFormData[remarkKey as keyof typeof localFormData] as string) || "";
    return currentValue === number;
  };

  const remarkSections = [
    { key: "shipperCartonQuality", label: "Shipper Carton Packaging", detail: "Front, side, top views", remarkKey: "shipperCartonRemark" },
    { key: "innerCartonPackaging", label: "Inner Carton Packaging", detail: "Inner packaging condition", remarkKey: "innerCartonRemark" },
    { key: "retailPackagingQuality", label: "Retail Packaging", detail: "Brand sticker, warning labels", remarkKey: "retailPackagingRemark" },
    { key: "productTypeConformity", label: "Product Type (style, size, color, construction, material, marking, labeling)", detail: "Matches approved specs", remarkKey: "productTypeRemark" },
    { key: "aqlWorkmanship", label: "AQL (Workmanship / Appearance / Function)", detail: "Visual and functional checks", remarkKey: "aqlWorkmanshipRemark" },
    { key: "onSiteTests", label: "On-site Tests", detail: "Drop test, color fastness, seam strength, etc.", remarkKey: "onSiteTestsRemark" },
  ];

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">C. Inspection Result Summary</Text>
        <Text className="text-sm text-slate-600">Select remark codes for packaging, product type, AQL, and on-site tests</Text>
      </View>

      {remarkSections.map((item) => (
        <View key={item.key} className="bg-slate-50 rounded-xl p-4 mb-4">
          <View className="mb-4">
            <Text className="text-slate-900 font-semibold mb-2">{item.label}</Text>
            <Text className="text-slate-600 text-sm">{item.detail}</Text>
          </View>
          
          <View className="mb-3">
            <Text className="text-sm font-medium text-slate-700 mb-3">Select Remark Code (1-10):</Text>
            <View className="flex-row flex-wrap gap-3">
              {Array.from({ length: 10 }, (_, idx) => `${idx + 1}`).map((num) => {
                const isSelected = isRemarkNumberSelected(item.remarkKey, num);
                return (
                  <TouchableOpacity
                    key={num}
                    onPress={() => handleRemarkNumberSelect(item.remarkKey, num)}
                    className={`w-12 h-12 rounded-full border-2 items-center justify-center ${
                      isSelected
                        ? "bg-gray-900 border-gray-600"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    <Text className={`font-semibold text-sm ${
                      isSelected ? "text-white" : "text-slate-700"
                    }`}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {localFormData[item.remarkKey as keyof typeof localFormData] && (
              <View className="mt-3 flex-row items-center">
                <Text className="text-sm text-slate-600">Selected: </Text>
                <Text className="text-sm font-semibold text-blue-600">
                  Code {localFormData[item.remarkKey as keyof typeof localFormData]}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemarkNumberSelect(item.remarkKey, "")}
                  className="ml-3"
                >
                  <Text className="text-xs text-red-600 underline">Clear Selection</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ))}

      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">Photo Evidence:</Text>
        <Text className="text-slate-600 text-sm mb-4">Carton quality, labels, internal protection details</Text>
        
        <TouchableOpacity
          onPress={handlePackagingPhotoUpload}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50"
        >
          <View className="items-center">
            <Upload size={48} color="#94a3b8" />
            <Text className="text-slate-700 font-medium mt-3">Upload packaging photos</Text>
            <Text className="text-slate-500 text-sm mt-1">Tap to browse</Text>
          </View>
        </TouchableOpacity>

        {/* Uploaded Photos List */}
        {localFormData.packagingPhotos && localFormData.packagingPhotos.length > 0 && (
          <View className="mt-4">
            {localFormData.packagingPhotos.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#94a3b8" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removePackagingPhoto(index)}
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
