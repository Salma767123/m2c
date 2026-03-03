import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { CheckCircle, AlertTriangle } from 'lucide-react-native';

interface ReviewProps {
  formData?: {
    client: string;
    vendor: string;
    factory: string;
    serviceLocation: string;
    serviceStartDate: string;
    serviceType: string;
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
  };
}

export function Review({ formData }: ReviewProps) {
  const data = formData || {
    client: '',
    vendor: '',
    factory: '',
    serviceLocation: '',
    serviceStartDate: '',
    serviceType: 'Pre-Shipment Inspection',
    poNumber: '',
    items: [],
    packedQuantity: 0,
    cartonCount: 0,
    shipperCartonRemark: '',
    innerCartonRemark: '',
    retailPackagingRemark: '',
    productTypeRemark: '',
    aqlWorkmanshipRemark: '',
    onSiteTestsRemark: '',
    criticalDefects: 0,
    majorDefects: 0,
    minorDefects: 0,
    maxAllowedCritical: 0,
    maxAllowedMajor: 5,
    maxAllowedMinor: 10,
  };

  const getRemarkAnalysis = () => {
    const remarkCodes: number[] = [];
    const remarkDetails: Array<{category: string, code: string}> = [];
    
    const categories = [
      { key: 'shipperCartonRemark', label: 'Shipper Carton' },
      { key: 'innerCartonRemark', label: 'Inner Carton' },
      { key: 'retailPackagingRemark', label: 'Retail Packaging' },
      { key: 'productTypeRemark', label: 'Product Type' },
      { key: 'aqlWorkmanshipRemark', label: 'AQL Workmanship' },
      { key: 'onSiteTestsRemark', label: 'On-site Tests' }
    ];
    
    categories.forEach(category => {
      const remarkValue = data[category.key as keyof typeof data] as string;
      if (remarkValue && remarkValue.trim()) {
        const code = parseInt(remarkValue.trim());
        if (!isNaN(code) && code >= 1 && code <= 10) {
          remarkCodes.push(code);
          remarkDetails.push({ category: category.label, code: remarkValue.trim() });
        }
      }
    });
    
    const average = remarkCodes.length > 0 ? remarkCodes.reduce((sum, code) => sum + code, 0) / remarkCodes.length : 0;
    
    return { codes: remarkCodes, details: remarkDetails, average, count: remarkCodes.length };
  };

  const calculateOverallResult = () => {
    const remarkAnalysis = getRemarkAnalysis();
    const effectiveAverage = remarkAnalysis.count === 0 ? 10 : remarkAnalysis.average;
    
    let status: string;
    let description: string;
    
    if (effectiveAverage >= 8) {
      status = 'PASS';
      description = 'Quality standards met successfully';
    } else if (effectiveAverage >= 6) {
      status = 'RE-INSPECTION';
      description = 'Re-inspection required';
    } else {
      status = 'REJECTED';
      description = 'Quality standards not met';
    }
    
    return { status, description, average: effectiveAverage, remarkDetails: remarkAnalysis.details, totalRemarks: remarkAnalysis.count };
  };

  const overallResult = calculateOverallResult();
  const isAQLPass = data.criticalDefects <= data.maxAllowedCritical &&
    data.majorDefects <= data.maxAllowedMajor &&
    data.minorDefects <= data.maxAllowedMinor;

  return (
    <ScrollView className="flex-1">
      <View className="mb-6 border-b border-slate-200 pb-4">
        <Text className="text-xl font-bold text-slate-900 mb-2">Review & Submit Inspection Report</Text>
        <Text className="text-sm text-slate-600">Final review of all inspection data before submission</Text>
      </View>

      {/* General Information */}
      <View className="bg-slate-50 rounded-xl p-4 mb-4">
        <Text className="text-slate-900 font-semibold mb-3">General Information</Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-600">Client:</Text>
            <Text className="text-slate-900 font-medium">{data.client || "Not specified"}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-600">Vendor:</Text>
            <Text className="text-slate-900 font-medium">{data.vendor || "Not specified"}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-600">Factory:</Text>
            <Text className="text-slate-900 font-medium">{data.factory || "Not specified"}</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-slate-600">Service Type:</Text>
            <Text className="text-slate-900 font-medium">{data.serviceType}</Text>
          </View>
        </View>
      </View>

      {/* Order Information */}
      <View className="bg-slate-50 rounded-xl p-4 mb-4">
        <Text className="text-slate-900 font-semibold mb-3">Order Information</Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-600">PO Number:</Text>
            <Text className="text-slate-900 font-medium">{data.poNumber || "N/A"}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-600">Total Items:</Text>
            <Text className="text-slate-900">{data.items.length}</Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-600">Total Quantity:</Text>
            <Text className="text-slate-900">{data.packedQuantity} units</Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-slate-600">Cartons:</Text>
            <Text className="text-slate-900">{data.cartonCount} cartons</Text>
          </View>
        </View>
      </View>

      {/* Inspection Result Summary */}
      <View className="bg-white rounded-xl p-4 border-2 border-slate-300 mb-4">
        <Text className="text-base font-bold text-slate-900 mb-3">Inspection Result Summary</Text>
        <View className="space-y-2">
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-700 text-sm">Shipper Carton</Text>
            <Text className="text-blue-600 font-medium text-sm">
              {data.shipperCartonRemark ? `Code ${data.shipperCartonRemark}` : 'No remark'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-700 text-sm">Inner Carton</Text>
            <Text className="text-blue-600 font-medium text-sm">
              {data.innerCartonRemark ? `Code ${data.innerCartonRemark}` : 'No remark'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-700 text-sm">Retail Packaging</Text>
            <Text className="text-blue-600 font-medium text-sm">
              {data.retailPackagingRemark ? `Code ${data.retailPackagingRemark}` : 'No remark'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-700 text-sm">Product Type</Text>
            <Text className="text-blue-600 font-medium text-sm">
              {data.productTypeRemark ? `Code ${data.productTypeRemark}` : 'No remark'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2 border-b border-slate-200">
            <Text className="text-slate-700 text-sm">AQL Workmanship</Text>
            <Text className="text-blue-600 font-medium text-sm">
              {data.aqlWorkmanshipRemark ? `Code ${data.aqlWorkmanshipRemark}` : 'No remark'}
            </Text>
          </View>
          <View className="flex-row justify-between py-2">
            <Text className="text-slate-700 text-sm">On-site Tests</Text>
            <Text className="text-blue-600 font-medium text-sm">
              {data.onSiteTestsRemark ? `Code ${data.onSiteTestsRemark}` : 'No remark'}
            </Text>
          </View>
        </View>

        {/* Remark Analysis */}
        <View className="bg-slate-50 rounded-lg p-3 mt-4">
          <Text className="font-semibold text-slate-900 mb-3 text-sm">Remark Analysis:</Text>
          <View className="flex-row justify-between">
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-slate-900">{overallResult.totalRemarks}</Text>
              <Text className="text-xs text-slate-600">Total</Text>
            </View>
            <View className="items-center flex-1">
              <Text className="text-xl font-bold text-slate-900">{overallResult.average.toFixed(1)}</Text>
              <Text className="text-xs text-slate-600">Average</Text>
            </View>
            <View className="items-center flex-1">
              <Text className={`text-xl font-bold ${
                overallResult.status === 'PASS' ? 'text-emerald-600' : 
                overallResult.status === 'RE-INSPECTION' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {overallResult.status}
              </Text>
              <Text className="text-xs text-slate-600">Result</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quality Metrics */}
      <View className="bg-slate-50 rounded-xl p-4 mb-4">
        <Text className="text-slate-900 font-semibold mb-3">Quality Metrics (AQL)</Text>
        <View className="flex-row justify-between">
          <View className="items-center flex-1">
            <Text className="text-xl font-bold text-slate-900">{data.criticalDefects}/{data.maxAllowedCritical}</Text>
            <Text className="text-xs text-slate-600">Critical</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-xl font-bold text-slate-900">{data.majorDefects}/{data.maxAllowedMajor}</Text>
            <Text className="text-xs text-slate-600">Major</Text>
          </View>
          <View className="items-center flex-1">
            <Text className="text-xl font-bold text-slate-900">{data.minorDefects}/{data.maxAllowedMinor}</Text>
            <Text className="text-xs text-slate-600">Minor</Text>
          </View>
          <View className="items-center flex-1">
            <Text className={`text-xl font-bold ${isAQLPass ? 'text-emerald-600' : 'text-red-600'}`}>
              {isAQLPass ? "PASS" : "FAIL"}
            </Text>
            <Text className="text-xs text-slate-600">AQL</Text>
          </View>
        </View>
      </View>

      {/* Final Status */}
      <View className={`p-4 rounded-xl items-center border-2 mb-6 ${
        overallResult.status === 'PASS' ? 'bg-emerald-50 border-emerald-200' :
        overallResult.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
        'bg-amber-50 border-amber-200'
      }`}>
        <View className="flex-row items-center gap-3 mb-2">
          {overallResult.status === 'PASS' ? (
            <CheckCircle size={32} color="#059669" />
          ) : (
            <AlertTriangle size={32} color={overallResult.status === 'REJECTED' ? '#dc2626' : '#d97706'} />
          )}
          <Text className={`font-bold text-xl ${
            overallResult.status === 'PASS' ? 'text-emerald-800' :
            overallResult.status === 'REJECTED' ? 'text-red-800' : 'text-amber-800'
          }`}>
            {overallResult.status === 'PASS' ? 'INSPECTION PASSED ✓' :
             overallResult.status === 'REJECTED' ? 'INSPECTION REJECTED ✗' :
             'RE-INSPECTION REQUIRED ⚠️'}
          </Text>
        </View>
        <Text className="text-slate-600 text-center text-sm mb-1">{overallResult.description}</Text>
        <Text className="text-xs text-slate-500">
          Average Score: {overallResult.average.toFixed(1)}/10
          {overallResult.totalRemarks > 0 && ` (${overallResult.totalRemarks} remarks)`}
        </Text>
      </View>
    </ScrollView>
  );
}
