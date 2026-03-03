import React from 'react';
import { ScrollView, Text, View, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Factory,
  MapPin,
  User,
  Share
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// For production, you would install and import these:
// import RNHTMLtoPDF from 'react-native-html-to-pdf';
// import Share from 'react-native-share';

type ReportStatus = 'PASSED' | 'FAILED' | 'PENDING';

type InspectionItem = {
  id: number;
  itemName: string;
  itemDescription: string;
  poQuantity: number;
  inspectedQuantity: number;
  status: ReportStatus;
};

type Measurement = {
  sampleName: string;
  cartonLength: number;
  cartonWidth: number;
  cartonHeight: number;
  productLength: number;
  productWidth: number;
  retailWeight: number;
  cartonGrossWeight: number;
  status: ReportStatus;
};

type ReportData = {
  id: string;
  vendor: string;
  po: string;
  inspectionDate: string;
  result: ReportStatus;
  cartons: number;
  inspector: string;
  client: string;
  factory: string;
  serviceLocation: string;
  serviceType: string;
  items: InspectionItem[];
  packaging: {
    shipperCartonQuality: string[];
    retailPackagingQuality: string[];
    internalProtection: string[];
    labelingComplete: string[];
  };
  measurements: Measurement[];
  defects: {
    majorDefects: number;
    minorDefects: number;
    majorDefectDetails: string;
    minorDefectDetails: string;
  };
  testing: {
    dropTestResult: string;
    colorFastnessDry: string;
    colorFastnessWet: string;
    seamStrengthResult: string;
    smellCheck: string;
  };
};

type ViewReportProps = {
  reportId: string;
  onBack: () => void;
};

export function ViewReport({ reportId, onBack }: ViewReportProps) {

  // Mock data - in real app, this would come from API based on reportId
  const reportData: ReportData = {
    id: reportId,
    vendor: "Nav Nit Group of Textiles",
    po: "PO-2024-001",
    inspectionDate: "2024-01-08",
    result: "PASSED",
    cartons: 50,
    inspector: "John Smith",
    client: "Fashion Forward Inc.",
    factory: "Nav Nit Manufacturing Unit 1",
    serviceLocation: "Chennai, Tamil Nadu",
    serviceType: "Pre-Shipment Inspection",
    
    items: [
      {
        id: 1,
        itemName: "Cotton T-Shirt",
        itemDescription: "100% Cotton Round Neck T-Shirt - Various Colors",
        poQuantity: 2500,
        inspectedQuantity: 200,
        status: "PASSED"
      },
      {
        id: 2,
        itemName: "Denim Jeans",
        itemDescription: "Blue Denim Straight Fit Jeans - Size 28-42",
        poQuantity: 2500,
        inspectedQuantity: 200,
        status: "PASSED"
      }
    ],

    packaging: {
      shipperCartonQuality: ["pass"],
      retailPackagingQuality: ["pass"],
      internalProtection: ["pass"],
      labelingComplete: ["pass"]
    },

    measurements: [
      {
        sampleName: "S1",
        cartonLength: 45.0,
        cartonWidth: 30.0,
        cartonHeight: 25.0,
        productLength: 45.0,
        productWidth: 30.0,
        retailWeight: 0.5,
        cartonGrossWeight: 25.0,
        status: "PASSED"
      },
      {
        sampleName: "S2",
        cartonLength: 45.1,
        cartonWidth: 30.1,
        cartonHeight: 25.0,
        productLength: 45.1,
        productWidth: 30.1,
        retailWeight: 0.51,
        cartonGrossWeight: 25.2,
        status: "PASSED"
      }
    ],

    defects: {
      majorDefects: 0,
      minorDefects: 2,
      majorDefectDetails: "",
      minorDefectDetails: "Minor stitching irregularities on 2 samples"
    },

    testing: {
      dropTestResult: "pass",
      colorFastnessDry: "pass",
      colorFastnessWet: "pass",
      seamStrengthResult: "pass",
      smellCheck: "pass"
    }
  };

  const handleDownloadPDF = async () => {
    try {
      Alert.alert(
        'Download Report',
        'Choose how you want to save the report:',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save Data', onPress: () => saveReportData() },
          { text: 'Share Info', onPress: () => shareReportInfo() }
        ]
      );
    } catch (error) {
      console.error('Error handling download:', error);
      Alert.alert('Error', 'Failed to process download request');
    }
  };

  const saveReportData = async () => {
    try {
      // Save report data to AsyncStorage for now
      const reportKey = `saved_report_${reportData.id}_${Date.now()}`;
      await AsyncStorage.setItem(reportKey, JSON.stringify(reportData));
      
      Alert.alert(
        'Success',
        `Report data saved locally with key: ${reportKey}. In a production app, this would generate a PDF file.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error saving report:', error);
      Alert.alert('Error', 'Failed to save report data');
    }
  };

  const shareReportInfo = async () => {
    try {
      const reportSummary = `
QC Inspection Report Summary
============================
Report ID: ${reportData.id}
Vendor: ${reportData.vendor}
PO: ${reportData.po}
Status: ${reportData.result}
Date: ${reportData.inspectionDate}
Cartons: ${reportData.cartons}
Inspector: ${reportData.inspector}

Items Inspected: ${reportData.items.length}
Major Defects: ${reportData.defects.majorDefects}
Minor Defects: ${reportData.defects.minorDefects}

Generated by QC Checker Mobile App
      `.trim();

      // For now, just copy to clipboard or show in alert
      Alert.alert(
        'Report Summary',
        reportSummary,
        [
          { text: 'Close' },
          { 
            text: 'Copy Info', 
            onPress: () => {
              // In a real app, you'd copy to clipboard here
              Alert.alert('Info', 'Report summary would be copied to clipboard in production app');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report');
    }
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'passed' || statusLower === 'pass') {
      return <CheckCircle size={14} color="#059669" />;
    }
    if (statusLower === 'failed' || statusLower === 'fail') {
      return <XCircle size={14} color="#dc2626" />;
    }
    if (statusLower === 'pending') {
      return <Clock size={14} color="#d97706" />;
    }
    return <AlertTriangle size={14} color="#6b7280" />;
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'passed' || statusLower === 'pass') {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
    if (statusLower === 'failed' || statusLower === 'fail') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    if (statusLower === 'pending') {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatKey = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').trim();
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => router.back()} className="mr-3 rounded-full bg-gray-100 p-2">
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900">Inspection Report</Text>
              <Text className="text-xs text-gray-500">Report ID: {reportId}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={handleDownloadPDF}
          className="flex-row items-center justify-center gap-2 bg-blue-600 rounded-xl py-3 shadow-sm"
        >
          <Download size={16} color="#ffffff" />
          <Text className="text-sm font-bold text-white">Save / Share Report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Report Overview */}
        <View className="px-4 py-4">
          {/* General Information */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="bg-blue-100 rounded-lg p-2">
                <FileText size={18} color="#2563eb" />
              </View>
              <View>
                <Text className="text-base font-bold text-gray-900">General Information</Text>
                <Text className="text-xs text-gray-600">Basic inspection details</Text>
              </View>
            </View>
            
            <View className="space-y-3">
              <View className="mb-3">
                <Text className="text-xs font-semibold text-gray-600 mb-1">Vendor</Text>
                <Text className="text-sm text-gray-900 font-semibold">{reportData.vendor}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-xs font-semibold text-gray-600 mb-1">PO Number</Text>
                <View className="bg-blue-50 border border-blue-200 px-2 py-1 rounded self-start">
                  <Text className="text-xs font-bold text-blue-600">{reportData.po}</Text>
                </View>
              </View>
              <View className="mb-3">
                <Text className="text-xs font-semibold text-gray-600 mb-1">Client</Text>
                <Text className="text-sm text-gray-900 font-semibold">{reportData.client}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-xs font-semibold text-gray-600 mb-1">Factory</Text>
                <Text className="text-sm text-gray-900">{reportData.factory}</Text>
              </View>
              <View className="mb-3">
                <Text className="text-xs font-semibold text-gray-600 mb-1">Service Location</Text>
                <Text className="text-sm text-gray-900">{reportData.serviceLocation}</Text>
              </View>
              <View>
                <Text className="text-xs font-semibold text-gray-600 mb-1">Inspector</Text>
                <Text className="text-sm text-gray-900">{reportData.inspector}</Text>
              </View>
            </View>
          </View>

          {/* Inspection Status */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="bg-emerald-100 rounded-lg p-2">
                <Calendar size={18} color="#059669" />
              </View>
              <View>
                <Text className="text-base font-bold text-gray-900">Inspection Status</Text>
                <Text className="text-xs text-gray-600">Overall result</Text>
              </View>
            </View>
            
            <View className="items-center mb-4">
              <View className={`flex-row items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(reportData.result)}`}>
                {getStatusIcon(reportData.result)}
                <Text className="text-base font-bold">{reportData.result}</Text>
              </View>
            </View>

            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                <Text className="text-2xl font-bold text-gray-900">{reportData.cartons}</Text>
                <Text className="text-xs text-gray-600">Cartons</Text>
              </View>
              <View className="flex-1 bg-gray-50 rounded-xl p-3 items-center">
                <Text className="text-2xl font-bold text-gray-900">{reportData.items.length}</Text>
                <Text className="text-xs text-gray-600">Items</Text>
              </View>
            </View>

            <View className="items-center">
              <Text className="text-xs text-gray-600">Inspection Date</Text>
              <Text className="text-sm font-semibold text-gray-900">{reportData.inspectionDate}</Text>
            </View>
          </View>

          {/* Items Inspected */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <View className="bg-purple-100 rounded-lg p-2">
                <Package size={18} color="#9333ea" />
              </View>
              <View>
                <Text className="text-base font-bold text-gray-900">Items Inspected</Text>
                <Text className="text-xs text-gray-600">Product details</Text>
              </View>
            </View>
            
            {reportData.items.map((item) => (
              <View key={item.id} className="border border-gray-200 rounded-xl p-3 mb-3">
                <View className="flex-row justify-between items-start mb-2">
                  <View className="flex-1 mr-2">
                    <Text className="text-sm font-bold text-gray-900 mb-1">{item.itemName}</Text>
                    <Text className="text-xs text-gray-600">{item.itemDescription}</Text>
                  </View>
                  <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <Text className="text-[10px] font-bold">{item.status}</Text>
                  </View>
                </View>
                <View className="flex-row justify-between mt-2">
                  <View>
                    <Text className="text-[10px] text-gray-500">PO Quantity</Text>
                    <Text className="text-xs font-semibold text-gray-900">{item.poQuantity.toLocaleString()}</Text>
                  </View>
                  <View>
                    <Text className="text-[10px] text-gray-500">Inspected</Text>
                    <Text className="text-xs font-semibold text-gray-900">{item.inspectedQuantity}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Packaging & Testing Results */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-4">Packaging & Labeling</Text>
            {Object.entries(reportData.packaging).map(([key, value]) => (
              <View key={key} className="flex-row items-center justify-between mb-3">
                <Text className="text-xs text-gray-600 flex-1 capitalize">{formatKey(key)}</Text>
                <View className="flex-row items-center gap-2">
                  {getStatusIcon(Array.isArray(value) ? value[0] : value)}
                  <Text className="text-xs font-semibold capitalize">
                    {Array.isArray(value) ? value.join(', ') : value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-4">Quality Testing</Text>
            {Object.entries(reportData.testing).map(([key, value]) => (
              <View key={key} className="flex-row items-center justify-between mb-3">
                <Text className="text-xs text-gray-600 flex-1 capitalize">{formatKey(key)}</Text>
                <View className="flex-row items-center gap-2">
                  {getStatusIcon(value)}
                  <Text className="text-xs font-semibold capitalize">{value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Measurements */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
            <Text className="text-base font-bold text-gray-900 mb-4">Physical Measurements</Text>
            {reportData.measurements.map((measurement, index) => (
              <View key={index} className="border border-gray-200 rounded-xl p-3 mb-3">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-sm font-bold text-gray-900">{measurement.sampleName}</Text>
                  <View className={`flex-row items-center gap-1 px-2 py-1 rounded-full border ${getStatusColor(measurement.status)}`}>
                    {getStatusIcon(measurement.status)}
                    <Text className="text-[10px] font-bold">{measurement.status}</Text>
                  </View>
                </View>
                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600">Carton (L×W×H)</Text>
                    <Text className="text-xs font-semibold text-gray-900">
                      {measurement.cartonLength} × {measurement.cartonWidth} × {measurement.cartonHeight} cm
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600">Product (L×W)</Text>
                    <Text className="text-xs font-semibold text-gray-900">
                      {measurement.productLength} × {measurement.productWidth} cm
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600">Retail Weight</Text>
                    <Text className="text-xs font-semibold text-gray-900">{measurement.retailWeight} kg</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-gray-600">Gross Weight</Text>
                    <Text className="text-xs font-semibold text-gray-900">{measurement.cartonGrossWeight} kg</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Defects Summary */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <Text className="text-base font-bold text-gray-900 mb-4">AQL Defects Summary</Text>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1 bg-red-50 border border-red-200 rounded-xl p-3">
                <Text className="text-xs font-semibold text-red-800 mb-1">Major Defects</Text>
                <Text className="text-2xl font-bold text-red-600">{reportData.defects.majorDefects}</Text>
              </View>
              <View className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Text className="text-xs font-semibold text-amber-800 mb-1">Minor Defects</Text>
                <Text className="text-2xl font-bold text-amber-600">{reportData.defects.minorDefects}</Text>
              </View>
            </View>
            {reportData.defects.minorDefectDetails && (
              <View>
                <Text className="text-xs font-semibold text-gray-600 mb-2">Minor Defect Details</Text>
                <View className="bg-gray-50 p-3 rounded-lg">
                  <Text className="text-xs text-gray-900">{reportData.defects.minorDefectDetails}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
