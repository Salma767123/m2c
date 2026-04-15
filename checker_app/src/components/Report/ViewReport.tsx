import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, AlertCircle,
  Building2, ShieldCheck, Factory, Settings, ClipboardList, Package
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';

interface ViewReportProps {
  reportId: string;
  onBack?: () => void;
}

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View className="mb-3">
    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</Text>
    <Text className="text-sm font-semibold text-gray-900">{value || '—'}</Text>
  </View>
);

const YesNoRow = ({ label, value }: { label: string; value?: string }) => {
  const v = (value || '').toLowerCase();
  const isYes = v === 'yes' || v === 'pass' || v === 'passed';
  const isNo = v === 'no' || v === 'fail' || v === 'failed';

  const Icon = isYes ? CheckCircle2 : isNo ? XCircle : AlertCircle;
  const color = isYes ? '#10b981' : isNo ? '#ef4444' : '#f59e0b';
  const textColor = isYes ? 'text-emerald-600' : isNo ? 'text-red-600' : 'text-amber-600';

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
      <Text className="text-sm text-gray-700 flex-1">{label}</Text>
      {value ? (
        <View className="flex-row items-center bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
          <Icon size={14} color={color} />
          <Text className={`text-xs font-bold ml-1.5 ${textColor}`}>{value}</Text>
        </View>
      ) : (
        <Text className="text-gray-400 text-xs">—</Text>
      )}
    </View>
  );
};

const Section = ({ title, icon: Icon, accent, children }: {
  title: string;
  icon: any;
  accent: { bg: string; border: string; text: string; icon: string };
  children: React.ReactNode;
}) => (
  <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
    <View className={`flex-row items-center px-5 py-4 border-b border-gray-100 ${accent.bg}`}>
      <View className={`p-1.5 rounded-lg mr-3 ${accent.border}`}>
        <Icon size={18} color={accent.icon} />
      </View>
      <Text className={`font-bold text-base ${accent.text}`}>{title}</Text>
    </View>
    <View className="p-5">{children}</View>
  </View>
);

export function ViewReport({ reportId, onBack }: ViewReportProps) {
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await qcCheckerService.getMyInspectionById(reportId);
        if (mounted) {
          if (res.success) {
            setInspection(res.inspection);
          } else {
            setError('Report not found');
          }
        }
      } catch (e: any) {
        if (mounted) {
          setError(e.message || 'Failed to load report');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [reportId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-gray-500 font-medium">Loading report...</Text>
      </View>
    );
  }

  if (error || !inspection) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <AlertCircle size={48} color="#f59e0b" />
        <Text className="mt-4 text-gray-600 text-sm text-center">{error || 'Inspection not found'}</Text>
        {onBack && (
          <TouchableOpacity onPress={onBack} className="mt-4">
            <Text className="text-blue-600 text-sm font-medium underline">Go back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // After completion, itemsToInspect holds the submitted form data object
  const fd = inspection.itemsToInspect && !Array.isArray(inspection.itemsToInspect)
    ? inspection.itemsToInspect : {};
  // Original items assigned by admin
  const assignedItems = Array.isArray(inspection.itemsToInspect) ? inspection.itemsToInspect : [];

  const getResultStyle = (result: string) => {
    switch (result) {
      case 'PASSED': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-800' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const resultStyle = inspection.result ? getResultStyle(inspection.result) : { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="flex-row items-center mb-6">
        {onBack && (
          <TouchableOpacity onPress={onBack} className="p-2.5 bg-white border border-gray-200 rounded-xl mr-3">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-gray-900 mb-1">Inspection Report</Text>
          <Text className="text-gray-500 text-xs font-mono">
            {inspection.vendor?.companyName || fd.vendorName || 'Unknown'} {'\u2022'} REF: {reportId.slice(-8).toUpperCase()}
          </Text>
        </View>
        {inspection.result && (
          <View className={`px-3 py-1.5 rounded-full ${resultStyle.bg} flex-row items-center`}>
            {inspection.result === 'PASSED' && <CheckCircle2 size={12} color="#059669" />}
            {inspection.result === 'FAILED' && <XCircle size={12} color="#dc2626" />}
            <Text className={`text-[10px] font-bold ml-1 ${resultStyle.text}`}>{inspection.result}</Text>
          </View>
        )}
      </View>

      {/* Summary Banner */}
      <View className="bg-blue-700 rounded-2xl p-5 mb-6 flex-row flex-wrap">
        <View className="w-1/2 mb-4">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Vendor</Text>
          <Text className="font-bold text-white text-sm" numberOfLines={1}>
            {inspection.vendor?.companyName || fd.vendorName || '—'}
          </Text>
        </View>
        <View className="w-1/2 mb-4">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Client</Text>
          <Text className="font-bold text-white text-sm" numberOfLines={1}>
            {inspection.clientName || '—'}
          </Text>
        </View>
        <View className="w-1/2">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Completed On</Text>
          <Text className="font-bold text-white text-sm">
            {inspection.completedAt ? new Date(inspection.completedAt).toLocaleDateString('en-IN') : '—'}
          </Text>
        </View>
        <View className="w-1/2">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Priority</Text>
          <Text className="font-bold text-white text-sm">{inspection.priority || '—'}</Text>
        </View>
      </View>

      {/* SECTION 1: Factory Details */}
      <Section
        title="Section 1 — Factory Details"
        icon={Factory}
        accent={{ bg: 'bg-blue-50', border: 'bg-blue-100', text: 'text-blue-900', icon: '#2563eb' }}
      >
        <View className="flex-row flex-wrap">
          <View className="w-1/2 pr-2"><InfoRow label="Vendor Name" value={fd.vendorName} /></View>
          <View className="w-1/2"><InfoRow label="Factory Name" value={fd.factoryName} /></View>
          <View className="w-1/2 pr-2"><InfoRow label="Factory Address" value={fd.factoryAddress} /></View>
          <View className="w-1/2"><InfoRow label="Contact Person" value={fd.contactPersonName} /></View>
          <View className="w-1/2 pr-2"><InfoRow label="Contact Phone" value={fd.contactPhoneNumber} /></View>
        </View>
      </Section>

      {/* SECTION 2: Legal & Registration */}
      <Section
        title="Section 2 — Legal & Registration"
        icon={ShieldCheck}
        accent={{ bg: 'bg-indigo-50', border: 'bg-indigo-100', text: 'text-indigo-900', icon: '#4f46e5' }}
      >
        <View className="flex-row flex-wrap">
          <View className="w-1/2 pr-2"><InfoRow label="Business Reg. No." value={fd.businessRegistrationNumber} /></View>
          <View className="w-1/2"><InfoRow label="GST / Tax ID" value={fd.gstTaxId} /></View>
          <View className="w-full"><InfoRow label="Factory License No." value={fd.factoryLicenseNumber} /></View>
        </View>
      </Section>

      {/* SECTION 3: Production Info */}
      <Section
        title="Section 3 — Production Info"
        icon={Settings}
        accent={{ bg: 'bg-purple-50', border: 'bg-purple-100', text: 'text-purple-900', icon: '#7c3aed' }}
      >
        <View className="flex-row flex-wrap">
          <View className="w-1/2 pr-2"><InfoRow label="Products Manufactured" value={fd.productsManufactured} /></View>
          <View className="w-1/2"><InfoRow label="Monthly Capacity" value={fd.monthlyProductionCapacity} /></View>
          <View className="w-1/2 pr-2"><InfoRow label="Production Workers" value={fd.numberOfProductionWorkers} /></View>
          <View className="w-1/2"><InfoRow label="Category to Inspect" value={fd.categoryToInspect} /></View>
        </View>
      </Section>

      {/* SECTION 4: Basic Infrastructure */}
      <Section
        title="Section 4 — Basic Infrastructure"
        icon={Building2}
        accent={{ bg: 'bg-teal-50', border: 'bg-teal-100', text: 'text-teal-900', icon: '#0d9488' }}
      >
        <YesNoRow label="Machinery Available" value={fd.machineryAvailable} />
        <YesNoRow label="Electricity Available" value={fd.electricityAvailable} />
        <YesNoRow label="Water Available" value={fd.waterAvailable} />
        <YesNoRow label="Storage Area Available" value={fd.storageAreaAvailable} />
      </Section>

      {/* SECTION 5: Quality & Safety */}
      <Section
        title="Section 5 — Quality & Safety"
        icon={ShieldCheck}
        accent={{ bg: 'bg-emerald-50', border: 'bg-emerald-100', text: 'text-emerald-900', icon: '#059669' }}
      >
        <YesNoRow label="Quality Check Process in Place" value={fd.qualityCheckProcess} />
        <YesNoRow label="Safety Equipment Available" value={fd.safetyEquipment} />
        <YesNoRow label="Clean Working Environment" value={fd.cleanWorkingEnvironment} />
      </Section>

      {/* SECTION 6: Inspection Info */}
      <Section
        title="Section 6 — Inspection Info"
        icon={ClipboardList}
        accent={{ bg: 'bg-orange-50', border: 'bg-orange-100', text: 'text-orange-900', icon: '#ea580c' }}
      >
        <View className="flex-row flex-wrap mb-2">
          <View className="w-1/2 pr-2"><InfoRow label="Inspection Date" value={fd.inspectionDate} /></View>
          <View className="w-1/2"><InfoRow label="Inspector Name" value={fd.inspectorName || inspection.checker?.name} /></View>
          <View className="w-1/2 pr-2"><InfoRow label="Inspection Status" value={fd.inspectionStatus} /></View>
        </View>
        {(fd.inspectorRemarks || inspection.notes) && (
          <View className="bg-orange-50 border border-orange-100 rounded-xl p-4 mt-2">
            <Text className="text-[10px] font-bold text-orange-800 uppercase mb-1">Remarks</Text>
            <Text className="text-sm text-orange-900">{fd.inspectorRemarks || inspection.notes}</Text>
          </View>
        )}
      </Section>

      {/* SECTION 7: Evidence */}
      {((fd.factoryPhotos?.length > 0) || (fd.documentsUpload?.length > 0)) && (
        <Section
          title="Section 7 — Evidence"
          icon={FileText}
          accent={{ bg: 'bg-rose-50', border: 'bg-rose-100', text: 'text-rose-900', icon: '#e11d48' }}
        >
          {fd.factoryPhotos?.length > 0 && (
            <View className="mb-4">
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Factory Photos ({fd.factoryPhotos.length})
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {fd.factoryPhotos.map((p: any, i: number) => {
                  const src = p?.data || p?.url || null;
                  const isImage = src && typeof src === 'string' && src.startsWith('data:image');
                  return isImage ? (
                    <View key={i} className="w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
                      <Image source={{ uri: src }} className="w-full h-full" resizeMode="cover" />
                    </View>
                  ) : (
                    <View key={i} className="w-24 h-24 bg-gray-100 rounded-xl border border-dashed border-gray-300 items-center justify-center">
                      <Text className="text-[10px] text-gray-500 text-center px-1" numberOfLines={2}>
                        {p?.name || `Photo ${i + 1}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
          {fd.documentsUpload?.length > 0 && (
            <View>
              <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                Documents ({fd.documentsUpload.length})
              </Text>
              <View className="gap-y-2">
                {fd.documentsUpload.map((doc: any, i: number) => (
                  <View key={i} className="flex-row items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <FileText size={14} color="#1d4ed8" />
                    <Text className="text-xs font-medium text-blue-700 ml-2">
                      {doc?.name || `Document ${i + 1}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Section>
      )}

      {/* Assigned Items */}
      {assignedItems.length > 0 && (
        <Section
          title="Items Assigned for Inspection"
          icon={Package}
          accent={{ bg: 'bg-gray-50', border: 'bg-gray-100', text: 'text-gray-800', icon: '#374151' }}
        >
          <View className="gap-y-3">
            {assignedItems.map((item: any, i: number) => (
              <View key={i} className="flex-row items-start p-4 bg-gray-50 rounded-xl border border-gray-200">
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900 text-sm">{item.itemName}</Text>
                  {item.description && (
                    <Text className="text-xs text-gray-500 mt-0.5">{item.description}</Text>
                  )}
                </View>
                {item.aqlLevel && (
                  <View className="items-center ml-3">
                    <Text className="font-bold text-blue-600 text-sm">{item.aqlLevel}</Text>
                    <Text className="text-[10px] text-gray-500">AQL</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </Section>
      )}

      {/* Timestamps */}
      <View className="bg-white rounded-xl border border-gray-200 px-5 py-4 mb-6">
        <View className="flex-row flex-wrap">
          <View className="w-1/2 pr-2 mb-2">
            <InfoRow label="Scheduled Date" value={inspection.scheduledDate} />
          </View>
          <View className="w-1/2 mb-2">
            <InfoRow
              label="Started At"
              value={inspection.startedAt ? new Date(inspection.startedAt).toLocaleString('en-IN') : undefined}
            />
          </View>
          <View className="w-1/2 pr-2">
            <InfoRow
              label="Completed At"
              value={inspection.completedAt ? new Date(inspection.completedAt).toLocaleString('en-IN') : undefined}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
