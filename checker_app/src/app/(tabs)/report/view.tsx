import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ViewReport } from '@/components/Report/ViewReport';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ReportStatus = 'passed' | 'failed' | 'pending';

type InspectionReport = {
  id: string;
  vendor: string;
  po: string;
  status: ReportStatus;
  createdAt: string;
  cartons?: number;
  inspector?: string;
  client?: string;
  factory?: string;
  serviceLocation?: string;
};

const MOCK_REPORTS: InspectionReport[] = [
  {
    id: 'RPT-001',
    vendor: 'Alpha Textiles Ltd',
    po: 'PO-2024-091',
    status: 'passed',
    createdAt: '2024-02-25',
    cartons: 50,
    inspector: 'John Smith',
    client: 'Fashion Forward Inc.',
    factory: 'Alpha Textiles Main Unit',
    serviceLocation: 'Bangalore, IN',
  },
  {
    id: 'RPT-002',
    vendor: 'Bright Garments',
    po: 'PO-2024-089',
    status: 'failed',
    createdAt: '2024-02-24',
    cartons: 75,
    inspector: 'John Smith',
    client: 'Style Co.',
    factory: 'Bright Garments Factory',
    serviceLocation: 'Tiruppur, IN',
  },
  {
    id: 'RPT-003',
    vendor: 'Quality Fashions',
    po: 'PO-2024-087',
    status: 'passed',
    createdAt: '2024-02-24',
    cartons: 100,
    inspector: 'John Smith',
    client: 'Premium Brands Ltd.',
    factory: 'Quality Fashions Manufacturing',
    serviceLocation: 'Mumbai, IN',
  },
  {
    id: 'RPT-004',
    vendor: 'Modern Apparel Co',
    po: 'PO-2024-085',
    status: 'pending',
    createdAt: '2024-02-23',
    cartons: 60,
    inspector: 'John Smith',
    client: 'Urban Wear Inc.',
    factory: 'Modern Apparel Factory',
    serviceLocation: 'Chennai, IN',
  },
  {
    id: 'RPT-005',
    vendor: 'Thread Masters',
    po: 'PO-2024-084',
    status: 'passed',
    createdAt: '2024-02-22',
    cartons: 45,
    inspector: 'John Smith',
    client: 'Textile World',
    factory: 'Thread Masters Unit',
    serviceLocation: 'Coimbatore, IN',
  },
];

export default function ReportViewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [reportExists, setReportExists] = useState(false);

  useEffect(() => {
    const checkReport = async () => {
      if (id) {
        // Check if report exists in mock data
        const report = MOCK_REPORTS.find(r => r.id === id);
        if (report) {
          setReportExists(true);
          
          // Try to load saved report data or create it
          try {
            const savedReport = await AsyncStorage.getItem(`report_${id}`);
            if (!savedReport) {
              // Generate report data if it doesn't exist
              const reportData = {
                id: report.id,
                vendor: report.vendor,
                po: report.po,
                inspectionDate: report.createdAt,
                result: report.status.toUpperCase(),
                cartons: report.cartons || 0,
                inspector: report.inspector || 'John Smith',
                client: report.client || 'Fashion Forward Inc.',
                factory: report.factory || `${report.vendor} Manufacturing Unit`,
                serviceLocation: report.serviceLocation || 'Chennai, Tamil Nadu',
                serviceType: 'Pre-Shipment Inspection',
                
                items: [
                  {
                    id: 1,
                    itemName: 'Cotton T-Shirt',
                    itemDescription: '100% Cotton Round Neck T-Shirt - Various Colors',
                    poQuantity: 2500,
                    inspectedQuantity: 200,
                    status: report.status.toUpperCase()
                  },
                  {
                    id: 2,
                    itemName: 'Denim Jeans',
                    itemDescription: 'Blue Denim Straight Fit Jeans - Size 28-42',
                    poQuantity: 2500,
                    inspectedQuantity: 200,
                    status: report.status.toUpperCase()
                  }
                ],

                packaging: {
                  shipperCartonQuality: ['pass'],
                  retailPackagingQuality: ['pass'],
                  internalProtection: ['pass'],
                  labelingComplete: ['pass']
                },

                measurements: [
                  {
                    sampleName: 'S1',
                    cartonLength: 45.0,
                    cartonWidth: 30.0,
                    cartonHeight: 25.0,
                    productLength: 45.0,
                    productWidth: 30.0,
                    retailWeight: 0.5,
                    cartonGrossWeight: 25.0,
                    status: report.status.toUpperCase()
                  },
                  {
                    sampleName: 'S2',
                    cartonLength: 45.1,
                    cartonWidth: 30.1,
                    cartonHeight: 25.0,
                    productLength: 45.1,
                    productWidth: 30.1,
                    retailWeight: 0.51,
                    cartonGrossWeight: 25.2,
                    status: report.status.toUpperCase()
                  }
                ],

                defects: {
                  majorDefects: report.status === 'failed' ? 1 : 0,
                  minorDefects: report.status === 'passed' ? 2 : 0,
                  majorDefectDetails: report.status === 'failed' ? 'Critical stitching defect found' : '',
                  minorDefectDetails: report.status === 'passed' ? 'Minor stitching irregularities on 2 samples' : ''
                },

                testing: {
                  dropTestResult: 'pass',
                  colorFastnessDry: 'pass',
                  colorFastnessWet: 'pass',
                  seamStrengthResult: report.status === 'failed' ? 'fail' : 'pass',
                  smellCheck: 'pass'
                }
              };
              
              // Save the generated report data
              await AsyncStorage.setItem(`report_${id}`, JSON.stringify(reportData));
            }
          } catch (error) {
            console.error('Error handling report data:', error);
          }
        }
      }
      setLoading(false);
    };

    checkReport();
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!reportExists || !id) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="text-gray-500">Report not found</Text>
      </View>
    );
  }

  return (
    <ViewReport
      reportId={id}
      onBack={handleBack}
    />
  );
}