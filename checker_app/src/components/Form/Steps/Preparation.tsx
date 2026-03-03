import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Camera, Plus, Trash2, ChevronDown, Upload, X } from 'lucide-react-native';
import { showImagePickerOptions } from '@/utils/imagePicker';

interface PreparationProps {
  formData?: {
    poNumber: string;
    items: Array<{
      id: number;
      itemName: string;
      itemDescription: string;
      poQuantity: number;
      bookedInspectionQuantity: number;
      status: string;
    }>;
    packedQuantity: number;
    cartonCount: number;
    warehousePhotoEvidences: string[];
  };
  setFormData?: (data: any) => void;
}

export function Preparation({ formData, setFormData }: PreparationProps) {
  const [openDropdowns, setOpenDropdowns] = useState<{ [key: number]: boolean }>({});
  
  const [localFormData, setLocalFormData] = useState({
    poNumber: formData?.poNumber || '',
    items: formData?.items || [],
    packedQuantity: formData?.packedQuantity || 0,
    cartonCount: formData?.cartonCount || 0,
    warehousePhotoEvidences: formData?.warehousePhotoEvidences || [],
  });

  const statusOptions = ["Pending", "Ready", "In Progress", "Completed"];

  const updateFormData = (updates: any) => {
    const newData = { ...localFormData, ...updates };
    setLocalFormData(newData);
    if (setFormData) {
      setFormData(newData);
    }
  };

  const addItem = () => {
    const newItem = {
      id: Date.now(),
      itemName: "",
      itemDescription: "",
      poQuantity: 0,
      bookedInspectionQuantity: 0,
      status: "Pending"
    };
    updateFormData({
      items: [...localFormData.items, newItem]
    });
  };

  const removeItem = (id: number) => {
    updateFormData({
      items: localFormData.items.filter(item => item.id !== id)
    });
  };

  const updateItem = (id: number, field: string, value: string | number) => {
    updateFormData({
      items: localFormData.items.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const handleWarehousePhotoUpload = () => {
    showImagePickerOptions((images) => {
      const photoNames = images.map(img => img.name);
      updateFormData({ 
        warehousePhotoEvidences: [...localFormData.warehousePhotoEvidences, ...photoNames] 
      });
    }, true);
  };

  const removeWarehousePhoto = (photoIndex: number) => {
    const updatedPhotos = localFormData.warehousePhotoEvidences.filter((_, i) => i !== photoIndex);
    updateFormData({ warehousePhotoEvidences: updatedPhotos });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "Pending": "bg-amber-100 text-amber-800 border-amber-200",
      "Ready": "bg-emerald-100 text-emerald-800 border-emerald-200",
      "In Progress": "bg-blue-100 text-blue-800 border-blue-200",
      "Completed": "bg-slate-100 text-slate-800 border-slate-200",
    };
    return colors[status as keyof typeof colors] || colors["Pending"];
  };

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">B. Order Status</Text>
        <Text className="text-sm text-slate-600">
          Purchase order information and order items status
        </Text>
      </View>

      {/* PO Information */}
      <View className="bg-slate-50 rounded-xl p-4 mb-6">
        <Text className="text-base font-semibold text-slate-900 mb-4">Purchase Order Information</Text>
        
        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">PO Number:</Text>
          <TextInput
            value={localFormData.poNumber}
            onChangeText={(text) => updateFormData({ poNumber: text })}
            placeholder="Enter PO number"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Total Packed Quantity:</Text>
          <TextInput
            value={String(localFormData.packedQuantity)}
            onChangeText={(text) => updateFormData({ packedQuantity: parseInt(text) || 0 })}
            placeholder="0"
            keyboardType="numeric"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-700 font-semibold mb-2 text-sm">Carton Count (100% packing):</Text>
          <TextInput
            value={String(localFormData.cartonCount)}
            onChangeText={(text) => updateFormData({ cartonCount: parseInt(text) || 0 })}
            placeholder="0"
            keyboardType="numeric"
            className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Items Section */}
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base font-semibold text-slate-900">Order Items</Text>
          <TouchableOpacity
            onPress={addItem}
            className="flex-row items-center gap-2 px-4 py-2 bg-gray-900 rounded-lg"
          >
            <Plus size={16} color="#ffffff" />
            <Text className="text-white font-medium text-sm">Add Item</Text>
          </TouchableOpacity>
        </View>

        {localFormData.items.length === 0 ? (
          <View className="py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <Text className="text-slate-600 text-center">No items added yet. Click "Add Item" to get started.</Text>
          </View>
        ) : (
          <View>
            {localFormData.items.map((item, index) => (
              <View key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="font-semibold text-slate-900">Item #{index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeItem(item.id)}
                    className="p-2 rounded-lg"
                  >
                    <Trash2 size={16} color="#dc2626" />
                  </TouchableOpacity>
                </View>
                
                <View className="mb-3">
                  <Text className="text-slate-700 font-medium mb-2 text-sm">Item Name:</Text>
                  <TextInput
                    value={item.itemName}
                    onChangeText={(text) => updateItem(item.id, 'itemName', text)}
                    placeholder="Enter item name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View className="mb-3">
                  <Text className="text-slate-700 font-medium mb-2 text-sm">Item Description:</Text>
                  <TextInput
                    value={item.itemDescription}
                    onChangeText={(text) => updateItem(item.id, 'itemDescription', text)}
                    placeholder="Enter item description"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View className="mb-3">
                  <Text className="text-slate-700 font-medium mb-2 text-sm">PO Quantity:</Text>
                  <TextInput
                    value={String(item.poQuantity)}
                    onChangeText={(text) => updateItem(item.id, 'poQuantity', parseInt(text) || 0)}
                    placeholder="0"
                    keyboardType="numeric"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View className="mb-3">
                  <Text className="text-slate-700 font-medium mb-2 text-sm">Booked Inspection Quantity:</Text>
                  <TextInput
                    value={String(item.bookedInspectionQuantity)}
                    onChangeText={(text) => updateItem(item.id, 'bookedInspectionQuantity', parseInt(text) || 0)}
                    placeholder="0"
                    keyboardType="numeric"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View className="mb-3">
                  <Text className="text-slate-700 font-medium mb-2 text-sm">Status:</Text>
                  <TouchableOpacity
                    onPress={() => setOpenDropdowns({ ...openDropdowns, [item.id]: !openDropdowns[item.id] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white flex-row items-center justify-between"
                  >
                    <Text className="text-slate-900">{item.status}</Text>
                    <ChevronDown 
                      size={16} 
                      color="#475569"
                      style={{ transform: [{ rotate: openDropdowns[item.id] ? '180deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>
                  
                  {openDropdowns[item.id] && (
                    <View className="mt-2 bg-white border border-slate-300 rounded-lg">
                      {statusOptions.map((status) => (
                        <TouchableOpacity
                          key={status}
                          onPress={() => {
                            updateItem(item.id, "status", status);
                            setOpenDropdowns({ ...openDropdowns, [item.id]: false });
                          }}
                          className={`px-4 py-2 ${
                            item.status === status
                              ? 'bg-blue-50 border-l-2 border-blue-600'
                              : 'bg-white'
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              item.status === status
                                ? 'text-blue-600 font-medium'
                                : 'text-slate-700'
                            }`}
                          >
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                
                <View className="flex-row justify-end mt-2">
                  <View className={`px-3 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                    <Text className="text-sm font-medium">{item.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Photo Evidence */}
      <View className="mb-6">
        <Text className="text-slate-700 font-semibold mb-2">Photo Evidence:</Text>
        <Text className="text-slate-600 text-sm mb-4">Warehouse, cartons, factory overview, name board</Text>
        
        <TouchableOpacity
          onPress={handleWarehousePhotoUpload}
          className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50"
        >
          <View className="items-center">
            <Upload size={48} color="#94a3b8" />
            <Text className="text-slate-700 font-medium mt-3">Upload warehouse photos</Text>
            <Text className="text-slate-500 text-sm mt-1">Tap to browse</Text>
          </View>
        </TouchableOpacity>

        {/* Uploaded Photos List */}
        {localFormData.warehousePhotoEvidences && localFormData.warehousePhotoEvidences.length > 0 && (
          <View className="mt-4">
            {localFormData.warehousePhotoEvidences.map((photo, index) => (
              <View key={index} className="flex-row items-center justify-between bg-white p-3 rounded-lg border border-slate-200 mb-2">
                <View className="flex-row items-center gap-2 flex-1">
                  <Camera size={16} color="#94a3b8" />
                  <Text className="text-sm text-slate-700 flex-1" numberOfLines={1}>{photo}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeWarehousePhoto(index)}
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
