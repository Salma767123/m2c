import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, SlidersHorizontal, ClipboardCheck } from 'lucide-react-native';
import { StepHeader, Card, PhotoGrid, RemarkInput, Photo } from './piShared';

interface Props {
  formData: {
    inspectionLevel: string;
    sampleSize: number;
    aqlCritical: number;
    aqlMajor: number;
    aqlMinor: number;
    maxAllowedCritical: number;
    maxAllowedMajor: number;
    maxAllowedMinor: number;
    criticalDefects: number;
    majorDefects: number;
    minorDefects: number;
    criticalDefectDetails: string;
    majorDefectDetails: string;
    minorDefectDetails: string;
    defectPhotos: Photo[];
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
}

const LEVELS = ['L-I', 'L-II', 'L-III'];

function NumField({
  label,
  value,
  onChange,
  step = 1,
  error,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  error?: string;
}) {
  return (
    <View className="flex-1 min-w-[45%] mb-3">
      <Text className="text-xs font-medium text-slate-700 mb-1.5">{label}</Text>
      <TextInput
        keyboardType="numeric"
        value={value ? String(value) : ''}
        onChangeText={(t) => {
          if (t === '') return onChange(0);
          const n = step < 1 ? parseFloat(t) : parseInt(t, 10);
          onChange(isNaN(n) ? 0 : n);
        }}
        className={`px-3 py-2 border rounded-lg text-sm text-slate-900 bg-white ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-300'
        }`}
      />
      {!!error && <Text className="text-xs text-red-600 mt-1">{error}</Text>}
    </View>
  );
}

function Counter({
  title,
  value,
  onChange,
  tone,
}: {
  title: string;
  value: number;
  onChange: (n: number) => void;
  tone: 'purple' | 'red' | 'amber';
}) {
  const toneMap = {
    purple: { card: 'bg-purple-50 border-purple-200', title: 'text-purple-800', num: 'text-purple-700', btn: 'border-purple-300', icon: '#7c3aed' },
    red: { card: 'bg-red-50 border-red-200', title: 'text-red-800', num: 'text-red-700', btn: 'border-red-300', icon: '#dc2626' },
    amber: { card: 'bg-amber-50 border-amber-200', title: 'text-amber-800', num: 'text-amber-700', btn: 'border-amber-300', icon: '#d97706' },
  }[tone];
  return (
    <View className={`border rounded-xl p-4 mb-3 ${toneMap.card}`}>
      <Text className={`font-semibold mb-3 text-sm ${toneMap.title}`}>{title}</Text>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className={`p-2.5 bg-white border rounded-lg ${toneMap.btn}`}
          onPress={() => onChange(Math.max(0, value - 1))}
        >
          <ChevronDown size={20} color={toneMap.icon} />
        </TouchableOpacity>
        <Text className={`text-4xl font-bold ${toneMap.num}`}>{value}</Text>
        <TouchableOpacity
          className={`p-2.5 bg-white border rounded-lg ${toneMap.btn}`}
          onPress={() => onChange(value + 1)}
        >
          <ChevronUp size={20} color={toneMap.icon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Defects({ formData, setFormData, errors = {} }: Props) {
  const set = (patch: Partial<Props['formData']>) => setFormData({ ...formData, ...patch });

  const pass =
    formData.criticalDefects <= formData.maxAllowedCritical &&
    formData.majorDefects <= formData.maxAllowedMajor &&
    formData.minorDefects <= formData.maxAllowedMinor;

  const addPhotos = (photos: Photo[]) =>
    set({ defectPhotos: [...(formData.defectPhotos || []), ...photos] });
  const removePhoto = (idx: number) => {
    const next = [...(formData.defectPhotos || [])];
    next.splice(idx, 1);
    set({ defectPhotos: next });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <StepHeader
        title="AQL Summary (Workmanship, Appearance and Basic Function)"
        subtitle={`Visual AQL check on ${formData.sampleSize} randomly selected units for critical, major and minor defects`}
      />

      {/* AQL Configuration */}
      <Card title="AQL Configuration" icon={<SlidersHorizontal size={16} color="#e01a1b" />}>
        <Text className="text-xs font-medium text-slate-700 mb-1.5">Inspection Level</Text>
        <View className="flex-row mb-3" style={{ gap: 8 }}>
          {LEVELS.map((lvl) => {
            const selected = formData.inspectionLevel === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                onPress={() => set({ inspectionLevel: lvl })}
                className={`flex-1 py-2.5 rounded-lg border items-center ${
                  selected ? 'bg-brand-500 border-brand-500' : 'bg-white border-slate-300'
                }`}
              >
                <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-slate-600'}`}>{lvl}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View className="flex-row flex-wrap" style={{ columnGap: 12 }}>
          <NumField label="Sample Size" value={formData.sampleSize} onChange={(n) => set({ sampleSize: n })} error={errors.sampleSize} />
          <NumField label="AQL Level - Critical" value={formData.aqlCritical} onChange={(n) => set({ aqlCritical: n })} step={0.1} />
          <NumField label="AQL Level - Major" value={formData.aqlMajor} onChange={(n) => set({ aqlMajor: n })} step={0.1} />
          <NumField label="AQL Level - Minor" value={formData.aqlMinor} onChange={(n) => set({ aqlMinor: n })} step={0.1} />
        </View>
        <View className="flex-row flex-wrap" style={{ columnGap: 12 }}>
          <NumField label="Max Allowed - Critical" value={formData.maxAllowedCritical} onChange={(n) => set({ maxAllowedCritical: n })} />
          <NumField label="Max Allowed - Major" value={formData.maxAllowedMajor} onChange={(n) => set({ maxAllowedMajor: n })} />
          <NumField label="Max Allowed - Minor" value={formData.maxAllowedMinor} onChange={(n) => set({ maxAllowedMinor: n })} />
        </View>
      </Card>

      {/* Counters */}
      <Counter title={`Critical Defects (Max: ${formData.maxAllowedCritical})`} value={formData.criticalDefects} onChange={(n) => set({ criticalDefects: n })} tone="purple" />
      <Counter title={`Major Defects (Weaving, cut holes - Max: ${formData.maxAllowedMajor})`} value={formData.majorDefects} onChange={(n) => set({ majorDefects: n })} tone="red" />
      <Counter title={`Minor Defects (Pulled yarns, threads - Max: ${formData.maxAllowedMinor})`} value={formData.minorDefects} onChange={(n) => set({ minorDefects: n })} tone="amber" />

      {/* Defect Details */}
      <View className="mb-3">
        <Text className="text-sm font-semibold text-slate-700 mb-2">Critical Defect Details:</Text>
        <RemarkInput value={formData.criticalDefectDetails} onChangeText={(t) => set({ criticalDefectDetails: t })} placeholder="Describe critical defects found..." />
      </View>
      <View className="mb-3">
        <Text className="text-sm font-semibold text-slate-700 mb-2">Major Defect Details:</Text>
        <RemarkInput value={formData.majorDefectDetails} onChangeText={(t) => set({ majorDefectDetails: t })} placeholder="Describe major defects found..." />
      </View>
      <View className="mb-4">
        <Text className="text-sm font-semibold text-slate-700 mb-2">Minor Defect Details:</Text>
        <RemarkInput value={formData.minorDefectDetails} onChangeText={(t) => set({ minorDefectDetails: t })} placeholder="Describe minor defects found..." />
      </View>

      {/* AQL Summary */}
      <Card title="AQL Summary" icon={<ClipboardCheck size={16} color="#e01a1b" />}>
        <View className="flex-row flex-wrap mb-3">
          <View className="w-1/2 items-center mb-3">
            <Text className="text-xs text-slate-600">Critical</Text>
            <Text className="text-xl font-bold text-slate-900">{formData.criticalDefects}/{formData.maxAllowedCritical}</Text>
          </View>
          <View className="w-1/2 items-center mb-3">
            <Text className="text-xs text-slate-600">Major</Text>
            <Text className="text-xl font-bold text-slate-900">{formData.majorDefects}/{formData.maxAllowedMajor}</Text>
          </View>
          <View className="w-1/2 items-center">
            <Text className="text-xs text-slate-600">Minor</Text>
            <Text className="text-xl font-bold text-slate-900">{formData.minorDefects}/{formData.maxAllowedMinor}</Text>
          </View>
          <View className="w-1/2 items-center">
            <Text className="text-xs text-slate-600">AQL Comment</Text>
            <Text className="text-lg font-bold text-slate-900">{pass ? 'PASS' : 'FAIL'}</Text>
          </View>
        </View>
        <View className={`p-4 rounded-lg border-2 flex-row items-center ${pass ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {pass ? <CheckCircle size={22} color="#059669" /> : <AlertTriangle size={22} color="#dc2626" />}
          <Text className={`font-bold text-base ml-3 ${pass ? 'text-emerald-800' : 'text-red-800'}`}>
            {pass ? 'AQL Status: PASS' : 'AQL Status: FAIL'}
          </Text>
        </View>
      </Card>

      {/* Photo evidence */}
      <View className="mb-2">
        <Text className="text-sm font-semibold text-slate-700 mb-1">Photo Evidence:</Text>
        <Text className="text-xs text-slate-500 mb-3">Major/minor defects, sealed samples with AQF tape</Text>
        {!!errors.defectPhotos && <Text className="text-xs text-red-600 mb-2">{errors.defectPhotos}</Text>}
        <PhotoGrid
          photos={formData.defectPhotos || []}
          onAdd={addPhotos}
          onRemove={removePhoto}
          addLabel="Upload defect photo"
          allowMultiple
          hasError={!!errors.defectPhotos}
        />
      </View>

      <View className="h-6" />
    </ScrollView>
  );
}
