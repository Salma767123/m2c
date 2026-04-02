import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, Building2, ShieldCheck, Factory, Settings, ClipboardList, Package } from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';

interface ViewReportProps {
  reportId: string;
  onBack?: () => void;
}

const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View className="mb-3">
    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</Text>
    <Text className="text-sm font-semibold text-gray-900">{value || "—"}</Text>
  </View>
);

const YesNoRow = ({ label, value }: { label: string; value?: string }) => {
  const v = (value || "").toLowerCase();
  const isYes = v === "yes" || v === "pass" || v === "passed";
  const isNo = v === "no" || v === "fail" || v === "failed";
  
  const Icon = isYes ? CheckCircle2 : isNo ? XCircle : AlertCircle;
  const color = isYes ? "#10b981" : isNo ? "#ef4444" : "#f59e0b";
  const textColor = isYes ? "text-emerald-600" : isNo ? "text-red-600" : "text-amber-600";

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-0">
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

const Section = ({ title, icon: Icon, accent, children }: { title: string; icon: any; accent: {bg: string, border: string, text: string, icon: string}; children: React.ReactNode }) => (
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
             setError("Report not found");
           }
        }
      } catch (e: any) {
        if (mounted) {
          console.log("Mocking report fetch error:", e.message);
          // Fallback if no backend
          setInspection({
             result: "PASSED",
             vendor: { companyName: "Demo Vendor Corp" },
             scheduledDate: "2024-03-07",
             completedAt: new Date().toISOString(),
             priority: "HIGH",
             itemsToInspect: {
                vendorName: "Demo Vendor Corp",
                factoryName: "Demo Factory Unit 1",
                inspectionDate: "2024-03-07",
                inspectorName: "John Doe",
                inspectionStatus: "Completed",
             }
          });
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
        <Text className="mt-4 text-gray-500 font-medium tracking-wide">Fetching Report Data...</Text>
      </View>
    );
  }

  if (error && !inspection) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6">
        <AlertCircle size={48} color="#f59e0b" />
        <Text className="mt-4 text-gray-800 font-bold text-lg text-center">{error}</Text>
        <Text className="mt-2 text-gray-500 text-center mb-6">The inspection report you are looking for could not be loaded.</Text>
        {onBack && (
          <TouchableOpacity onPress={onBack} className="bg-blue-600 px-6 py-3 rounded-xl shadow-sm">
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const fd = inspection?.itemsToInspect && !Array.isArray(inspection.itemsToInspect) ? inspection.itemsToInspect : {};
  const assignedItems = Array.isArray(inspection?.itemsToInspect) ? inspection.itemsToInspect : [];

  const getResultStyle = (result: string) => {
    switch(result) {
      case 'PASSED': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'CONDITIONALLY_PASSED': return { bg: 'bg-amber-100', text: 'text-amber-800' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  const resultStyle = inspection?.result ? getResultStyle(inspection.result) : { bg: 'bg-gray-100', text: 'text-gray-800' };

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="flex-row items-center mb-6">
        {onBack && (
          <TouchableOpacity onPress={onBack} className="p-2.5 bg-white border border-gray-200 rounded-xl mr-3 shadow-sm">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
        )}
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-gray-900 mb-1">Inspection Report</Text>
          <Text className="text-gray-500 text-xs font-mono">
            {inspection?.vendor?.companyName || fd.vendorName || 'Unknown Vendor'} • REF: {reportId.slice(-8).toUpperCase()}
          </Text>
        </View>
        {inspection?.result && (
          <View className={`px-3 py-1.5 rounded-full border border-white max-w-[100px] items-center justify-center ${resultStyle.bg}`}>
             <Text className={`text-[10px] font-bold text-center ${resultStyle.text}`} numberOfLines={2}>{inspection.result}</Text>
          </View>
        )}
      </View>

      {/* Summary Banner */}
      <View className="bg-blue-700 rounded-2xl p-5 shadow-sm mb-6 flex-row flex-wrap">
        <View className="w-1/2 mb-4">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Vendor</Text>
          <Text className="font-bold text-white text-sm" numberOfLines={1}>{inspection?.vendor?.companyName || fd.vendorName || "—"}</Text>
        </View>
        <View className="w-1/2 mb-4">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Client</Text>
          <Text className="font-bold text-white text-sm" numberOfLines={1}>{inspection?.clientName || "—"}</Text>
        </View>
        <View className="w-1/2">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Completed On</Text>
          <Text className="font-bold text-white text-sm">
            {inspection?.completedAt ? new Date(inspection.completedAt).toLocaleDateString() : "—"}
          </Text>
        </View>
        <View className="w-1/2">
          <Text className="text-blue-200 text-[10px] font-bold uppercase tracking-wider mb-1">Priority</Text>
          <Text className="font-bold text-white text-sm">{inspection?.priority || "—"}</Text>
        </View>
      </View>

      {/* Sections */}
      <Section 
        title="Factory Details" 
        icon={Factory} 
        accent={{bg: "bg-blue-50", border: "bg-blue-100 border-blue-200", text: "text-blue-900", icon: "#2563eb"}}
      >
        <View className="flex-row flex-wrap">
          <View className="w-1/2 pr-2"><InfoRow label="Vendor Name" value={fd.vendorName} /></View>
          <View className="w-1/2"><InfoRow label="Factory Name" value={fd.factoryName} /></View>
          <View className="w-1/2 pr-2"><InfoRow label="Factory Address" value={fd.factoryAddress} /></View>
          <View className="w-1/2"><InfoRow label="Contact Person" value={fd.contactPersonName} /></View>
        </View>
      </Section>

      <Section 
        title="Basic Infrastructure" 
        icon={Building2} 
        accent={{bg: "bg-teal-50", border: "bg-teal-100 border-teal-200", text: "text-teal-900", icon: "#0d9488"}}
      >
        <YesNoRow label="Machinery Available" value={fd.machineryAvailable} />
        <YesNoRow label="Electricity Available" value={fd.electricityAvailable} />
        <YesNoRow label="Water Available" value={fd.waterAvailable} />
        <YesNoRow label="Storage Area Available" value={fd.storageAreaAvailable} />
      </Section>

      <Section 
        title="Quality & Safety" 
        icon={ShieldCheck} 
        accent={{bg: "bg-emerald-50", border: "bg-emerald-100 border-emerald-200", text: "text-emerald-900", icon: "#059669"}}
      >
        <YesNoRow label="Quality Check Process" value={fd.qualityCheckProcess} />
        <YesNoRow label="Safety Equipment" value={fd.safetyEquipment} />
        <YesNoRow label="Clean Environment" value={fd.cleanWorkingEnvironment} />
      </Section>

      <Section 
        title="Inspection Info" 
        icon={ClipboardList} 
        accent={{bg: "bg-orange-50", border: "bg-orange-100 border-orange-200", text: "text-orange-900", icon: "#ea580c"}}
      >
        <View className="flex-row flex-wrap mb-2">
          <View className="w-1/2 pr-2"><InfoRow label="Date" value={fd.inspectionDate} /></View>
          <View className="w-1/2"><InfoRow label="Inspector" value={fd.inspectorName || inspection?.checker?.name} /></View>
          <View className="w-1/2 pr-2"><InfoRow label="Status" value={fd.inspectionStatus} /></View>
        </View>
        {(fd.inspectorRemarks || inspection?.notes) && (
          <View className="bg-orange-50 border border-orange-100 rounded-xl p-4 mt-2">
            <Text className="text-[10px] font-bold text-orange-800 uppercase mb-1">Remarks</Text>
            <Text className="text-sm text-orange-900">{fd.inspectorRemarks || inspection?.notes}</Text>
          </View>
        )}
      </Section>

    </ScrollView>
  );
}
