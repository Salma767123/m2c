import React from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { CheckCircle, AlertTriangle } from 'lucide-react-native';

interface ReviewProps {
  formData: {
    client: string;
    vendor: string;
    factory: string;
    serviceLocation: string;
    serviceStartDate: string;
    serviceType: string;
    items: Array<{
      id: number;
      itemName: string;
      itemDescription: string;
      totalQuantity: number;
      inspectionQuantity: number;
      status: string;
    }>;
    shipperCartonRemark: string;
    innerCartonRemark: string;
    retailPackagingRemark: string;
    productTypeRemark: string;
    aqlWorkmanshipRemark: string;
    onSiteTestsRemark: string;
    criticalDefects: number;
    majorDefects: number;
    minorDefects: number;
    maxAllowedCritical: number;
    maxAllowedMajor: number;
    maxAllowedMinor: number;
    warehousePhotoEvidences: any[];
    measurementPhotos: any[];
    packagingPhotos: any[];
    defectPhotos: any[];
  };
}

export default function Review({ formData }: ReviewProps) {
  const getRemarkAnalysis = () => {
    const remarks = [
      formData.shipperCartonRemark,
      formData.innerCartonRemark,
      formData.retailPackagingRemark,
      formData.productTypeRemark,
      formData.aqlWorkmanshipRemark,
      formData.onSiteTestsRemark,
    ]
      .filter((r) => r && !isNaN(Number(r)))
      .map(Number);

    if (remarks.length === 0) return { count: 0, average: 0, result: 'N/A' };
    const avg = remarks.reduce((a, b) => a + b, 0) / remarks.length;
    let result = 'REJECTED';
    if (avg >= 8) result = 'PASS';
    else if (avg >= 6) result = 'RE-INSPECTION';
    return { count: remarks.length, average: avg, result };
  };

  const remarkAnalysis = getRemarkAnalysis();

  const aqlPassing =
    formData.criticalDefects <= formData.maxAllowedCritical &&
    formData.majorDefects <= formData.maxAllowedMajor &&
    formData.minorDefects <= formData.maxAllowedMinor;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return { bg: 'bg-amber-100', text: 'text-amber-800' };
      case 'Ready': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      case 'In Progress': return { bg: 'bg-blue-100', text: 'text-blue-800' };
      case 'Completed': return { bg: 'bg-gray-100', text: 'text-gray-800' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  const getResultColor = () => {
    if (remarkAnalysis.result === 'PASS') return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
    if (remarkAnalysis.result === 'RE-INSPECTION') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
    return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' };
  };

  const resultColor = getResultColor();

  const renderInfoRow = (label: string, value: string) => (
    <View className="flex-row justify-between py-2 border-b border-gray-100">
      <Text className="text-xs text-gray-500 font-medium">{label}</Text>
      <Text className="text-sm text-gray-900 font-semibold">{value || '—'}</Text>
    </View>
  );

  const renderPhotoGallery = (title: string, photos: any[]) => {
    if (!photos || photos.length === 0) return null;
    return (
      <View className="mb-3">
        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{title}</Text>
        <View className="flex-row flex-wrap gap-2">
          {photos.map((p, i) => (
            <View key={i} className="w-16 h-16 rounded-md overflow-hidden border border-gray-200">
              <Image source={{ uri: p.uri || p.data || p.url }} className="w-full h-full" />
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 mb-1">Review & Sign-Off</Text>
        <Text className="text-sm text-gray-500">Review all inspection data before submission</Text>
      </View>

      {/* General Info */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <Text className="text-sm font-bold text-gray-900 mb-2">General Information</Text>
        {renderInfoRow('Client', formData.client)}
        {renderInfoRow('Vendor', formData.vendor)}
        {renderInfoRow('Factory', formData.factory)}
        {renderInfoRow('Location', formData.serviceLocation)}
        {renderInfoRow('Start Date', formData.serviceStartDate)}
        {renderInfoRow('Service Type', formData.serviceType)}
      </View>

      {/* Items */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <Text className="text-sm font-bold text-gray-900 mb-2">
          Order Items ({formData.items.length})
        </Text>
        {formData.items.map((item, idx) => {
          const sc = getStatusColor(item.status);
          return (
            <View key={item.id} className="border-b border-gray-200 py-2 last:border-b-0">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-gray-900 font-medium flex-1" numberOfLines={1}>
                  {item.itemName}
                </Text>
                <View className={`px-2 py-0.5 rounded-full ${sc.bg}`}>
                  <Text className={`text-[10px] font-bold ${sc.text}`}>{item.status}</Text>
                </View>
              </View>
              <Text className="text-xs text-gray-500 mt-0.5">
                Total: {item.totalQuantity} | Inspection: {item.inspectionQuantity}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Remark Analysis */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <Text className="text-sm font-bold text-gray-900 mb-2">Remark Analysis</Text>
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-500">Remarks</Text>
            <Text className="text-xl font-bold text-gray-900">{remarkAnalysis.count}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-500">Average</Text>
            <Text className="text-xl font-bold text-gray-900">{remarkAnalysis.average.toFixed(1)}</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-xs text-gray-500">Result</Text>
            <Text className={`text-sm font-bold ${resultColor.text}`}>{remarkAnalysis.result}</Text>
          </View>
        </View>
      </View>

      {/* AQL Summary */}
      <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <Text className="text-sm font-bold text-gray-900 mb-2">Quality Metrics (AQL)</Text>
        <View className="flex-row gap-3 mb-3">
          <View className="flex-1 bg-purple-50 rounded-lg p-2 items-center border border-purple-200">
            <Text className="text-xs text-purple-600 font-semibold">Critical</Text>
            <Text className="text-lg font-bold text-purple-800">
              {formData.criticalDefects}/{formData.maxAllowedCritical}
            </Text>
          </View>
          <View className="flex-1 bg-red-50 rounded-lg p-2 items-center border border-red-200">
            <Text className="text-xs text-red-600 font-semibold">Major</Text>
            <Text className="text-lg font-bold text-red-800">
              {formData.majorDefects}/{formData.maxAllowedMajor}
            </Text>
          </View>
          <View className="flex-1 bg-amber-50 rounded-lg p-2 items-center border border-amber-200">
            <Text className="text-xs text-amber-600 font-semibold">Minor</Text>
            <Text className="text-lg font-bold text-amber-800">
              {formData.minorDefects}/{formData.maxAllowedMinor}
            </Text>
          </View>
        </View>

        <View className={`rounded-lg p-3 flex-row items-center ${aqlPassing ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {aqlPassing ? (
            <CheckCircle size={18} color="#16a34a" />
          ) : (
            <AlertTriangle size={18} color="#dc2626" />
          )}
          <Text className={`text-sm font-bold ml-2 ${aqlPassing ? 'text-green-700' : 'text-red-700'}`}>
            AQL Result: {aqlPassing ? 'PASS' : 'FAIL'}
          </Text>
        </View>
      </View>

      {/* Overall Result */}
      <View className={`rounded-xl p-4 mb-4 border ${resultColor.border} ${resultColor.bg}`}>
        <Text className={`text-sm font-bold ${resultColor.text} mb-1`}>Overall Result</Text>
        <Text className={`text-2xl font-bold ${resultColor.text}`}>{remarkAnalysis.result}</Text>
        <Text className="text-xs text-gray-500 mt-1">
          Based on remark average: {remarkAnalysis.average.toFixed(1)} (8-10: PASS, 6-8: RE-INSPECTION, {'<'}6: REJECTED)
        </Text>
      </View>

      {/* Photo Evidence */}
      <View className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
        <Text className="text-sm font-bold text-gray-900 mb-3">Photo Evidence</Text>
        {renderPhotoGallery('Preparation', formData.warehousePhotoEvidences)}
        {renderPhotoGallery('Measurements', formData.measurementPhotos)}
        {renderPhotoGallery('Packaging', formData.packagingPhotos)}
        {renderPhotoGallery('Defects', formData.defectPhotos)}
        {!formData.warehousePhotoEvidences?.length &&
          !formData.measurementPhotos?.length &&
          !formData.packagingPhotos?.length &&
          !formData.defectPhotos?.length && (
            <Text className="text-sm text-gray-400 text-center py-4">No photos uploaded</Text>
          )}
      </View>
    </ScrollView>
  );
}
