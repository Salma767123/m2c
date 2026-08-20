import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Images,
  Camera,
  Package,
  Box,
  Ruler,
  Zap,
} from 'lucide-react-native';
import type { TestGroup, TestItem } from '../PI_data';
import { ADDITIONAL_EVIDENCE_DEFS, PACKAGING_TOGGLE_GROUPS, relabelForPackaging, isTestOptional } from '../PI_data';
import { StepHeader, Card, ErrorBanner, PhotoGrid, RemarkInput, Photo } from './piShared';
import { InvalidAnchor } from './piValidation';
import type { ScrollNavHandlers } from '@/components/General/ScrollNav';

// ── Group icon map (matches web) ─────────────────────────────────────────────
const GROUP_ICONS: Record<string, React.ReactNode> = {
  packagingVerification: <Package size={16} color="#e01a1b" />,
  productVerification: <Box size={16} color="#e01a1b" />,
  measurementInspection: <Ruler size={16} color="#e01a1b" />,
  functionalTests: <Zap size={16} color="#e01a1b" />,
};

interface Props {
  formData: {
    testGroups: TestGroup[];
    additionalEvidence: Record<string, Photo[]>;
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
  scrollNav?: ScrollNavHandlers;
  /** 'VIRTUAL' allows gallery uploads; 'PHYSICAL' is camera-only. */
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}

// ── Single test row ──────────────────────────────────────────────────────────
function TestRow({
  test,
  onChange,
  inspectionType,
  invalid = false,
  optional = false,
}: {
  test: TestItem;
  onChange: (patch: Partial<TestItem>) => void;
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
  invalid?: boolean;
  /** Pass/Fail may be left unanswered — shown as a badge so the checker knows. */
  optional?: boolean;
}) {
  const togglePass = () => (test.pass ? onChange({ pass: null }) : onChange({ pass: true, fail: null }));
  const toggleFail = () => (test.fail ? onChange({ fail: null }) : onChange({ fail: true, pass: null }));

  const borderCls = invalid
    ? 'border-red-500 bg-red-50'
    : test.pass
    ? 'border-emerald-200 bg-emerald-50'
    : test.fail
    ? 'border-red-200 bg-red-50'
    : 'border-slate-200 bg-white';

  return (
    <InvalidAnchor errorKey="testGroups" invalid={invalid} style={{ marginBottom: 12 }} radius={12}>
    <View className={`border rounded-xl overflow-hidden ${borderCls}`}>
      <View className="px-3 py-3 flex-row items-center">
        <View className="flex-1 pr-2">
          <Text className="text-sm font-medium text-slate-800">{test.label}</Text>
          {optional && (
            <View className="self-start mt-1 px-1.5 py-0.5 rounded bg-slate-100">
              <Text className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Optional</Text>
            </View>
          )}
        </View>
        <View className="flex-row" style={{ columnGap: 8 }}>
          <TouchableOpacity
            onPress={togglePass}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border-2 ${
              test.pass ? 'bg-emerald-500 border-emerald-500' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <CheckCircle2 size={14} color={test.pass ? '#ffffff' : '#059669'} />
            <Text className={`text-xs font-bold ml-1 ${test.pass ? 'text-white' : 'text-emerald-600'}`}>Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleFail}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border-2 ${
              test.fail ? 'bg-red-500 border-red-500' : 'bg-red-50 border-red-200'
            }`}
          >
            <XCircle size={14} color={test.fail ? '#ffffff' : '#dc2626'} />
            <Text className={`text-xs font-bold ml-1 ${test.fail ? 'text-white' : 'text-red-600'}`}>Fail</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(test.pass || test.fail) && (
        <View className="px-3 pb-3 border-t border-slate-100 pt-3">
          {test.pass && (
            <View>
              <Text className="text-xs font-semibold text-emerald-700 mb-1">Correct / Right Photo</Text>
              <PhotoGrid
                photos={test.rightPhotos}
                onAdd={(ph) => onChange({ rightPhotos: ph.slice(0, 1) })}
                onRemove={() => onChange({ rightPhotos: [] })}
                addLabel="Add right photo"
                thumb={56}
                inspectionType={inspectionType}
              />
            </View>
          )}
          {test.fail && (
            <>
              <View className="mb-2">
                <Text className="text-xs font-semibold text-red-700 mb-1">Wrong / Incorrect Photo</Text>
                <PhotoGrid
                  photos={test.wrongPhotos}
                  onAdd={(ph) => onChange({ wrongPhotos: ph.slice(0, 1) })}
                  onRemove={() => onChange({ wrongPhotos: [] })}
                  addLabel="Add wrong photo"
                  thumb={56}
                  inspectionType={inspectionType}
                />
              </View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">Remarks</Text>
              <RemarkInput value={test.remarks} onChangeText={(t) => onChange({ remarks: t })} placeholder="Describe the failure…" error />
            </>
          )}
        </View>
      )}
    </View>
    </InvalidAnchor>
  );
}

// ── Custom "Others" test row ─────────────────────────────────────────────────
function OtherTestRow({
  test,
  onChange,
  onRemove,
  inspectionType,
  invalid = false,
}: {
  test: TestItem;
  onChange: (patch: Partial<TestItem>) => void;
  onRemove: () => void;
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
  invalid?: boolean;
}) {
  const togglePass = () => onChange({ pass: test.pass ? null : true, fail: null });
  const toggleFail = () => onChange({ fail: test.fail ? null : true, pass: null });
  const borderCls = invalid
    ? 'border-red-500 bg-red-50'
    : test.pass
    ? 'border-emerald-200 bg-emerald-50'
    : test.fail
    ? 'border-red-200 bg-red-50'
    : 'border-brand-200 bg-brand-50';

  return (
    <InvalidAnchor errorKey="testGroups" invalid={invalid} style={{ marginBottom: 12 }} radius={12}>
    <View className={`border rounded-xl overflow-hidden ${borderCls}`}>
      <View className="px-3 py-3">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xs font-bold text-brand-600 uppercase">Custom Test</Text>
          <TouchableOpacity onPress={onRemove} className="p-1">
            <Trash2 size={15} color="#94a3b8" />
          </TouchableOpacity>
        </View>
        <View className="flex-row mb-3" style={{ columnGap: 12 }}>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-600 mb-1">Test Subject</Text>
            <TextInput
              value={test.subject || ''}
              onChangeText={(t) => onChange({ subject: t })}
              placeholder="e.g. Stitching"
              placeholderTextColor="#94a3b8"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
            />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold text-slate-600 mb-1">Test Name</Text>
            <TextInput
              value={test.label}
              onChangeText={(t) => onChange({ label: t })}
              placeholder="e.g. Seam integrity"
              placeholderTextColor="#94a3b8"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white"
            />
          </View>
        </View>
        <View className="flex-row" style={{ columnGap: 8 }}>
          <TouchableOpacity
            onPress={togglePass}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border-2 ${
              test.pass ? 'bg-emerald-500 border-emerald-500' : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <CheckCircle2 size={14} color={test.pass ? '#ffffff' : '#059669'} />
            <Text className={`text-xs font-bold ml-1 ${test.pass ? 'text-white' : 'text-emerald-600'}`}>Pass</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleFail}
            className={`flex-row items-center px-3 py-1.5 rounded-lg border-2 ${
              test.fail ? 'bg-red-500 border-red-500' : 'bg-red-50 border-red-200'
            }`}
          >
            <XCircle size={14} color={test.fail ? '#ffffff' : '#dc2626'} />
            <Text className={`text-xs font-bold ml-1 ${test.fail ? 'text-white' : 'text-red-600'}`}>Fail</Text>
          </TouchableOpacity>
        </View>
      </View>
      {(test.pass || test.fail) && (
        <View className="px-3 pb-3 border-t border-slate-100 pt-3">
          {test.pass && (
            <View>
              <Text className="text-xs font-semibold text-emerald-700 mb-1">Correct / Right Photo</Text>
              <PhotoGrid
                photos={test.rightPhotos}
                onAdd={(ph) => onChange({ rightPhotos: ph.slice(0, 1) })}
                onRemove={() => onChange({ rightPhotos: [] })}
                addLabel="Add right photo"
                thumb={56}
                inspectionType={inspectionType}
              />
            </View>
          )}
          {test.fail && (
            <>
              <View className="mb-2">
                <Text className="text-xs font-semibold text-red-700 mb-1">Wrong / Incorrect Photo</Text>
                <PhotoGrid
                  photos={test.wrongPhotos}
                  onAdd={(ph) => onChange({ wrongPhotos: ph.slice(0, 1) })}
                  onRemove={() => onChange({ wrongPhotos: [] })}
                  addLabel="Add wrong photo"
                  thumb={56}
                  inspectionType={inspectionType}
                />
              </View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">Remarks</Text>
              <RemarkInput value={test.remarks} onChangeText={(t) => onChange({ remarks: t })} placeholder="Describe the failure…" error />
            </>
          )}
        </View>
      )}
    </View>
    </InvalidAnchor>
  );
}

// ── Collapsible group ────────────────────────────────────────────────────────
function TestGroupCard({
  group,
  invalidTestId = null,
  onToggleCollapse,
  onTestChange,
  onAddOther,
  onRemoveOther,
  onPackagingTypeChange,
  inspectionType,
}: {
  group: TestGroup;
  invalidTestId?: string | null;
  onToggleCollapse: () => void;
  onTestChange: (testId: string, patch: Partial<TestItem>) => void;
  onAddOther: () => void;
  onRemoveOther: (testId: string) => void;
  onPackagingTypeChange: (type: 'Carton' | 'Bale') => void;
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}) {
  // Only the measurement & functional groups carry the Carton/Bale packaging toggle.
  const showPackagingToggle = (PACKAGING_TOGGLE_GROUPS as readonly string[]).includes(group.id);
  const packagingType = group.packagingType || 'Carton';
  const regularTests = group.tests.filter((t) => !t.isOther);
  const otherTests = group.tests.filter((t) => t.isOther);
  const passed = group.tests.filter((t) => t.pass).length;
  const failed = group.tests.filter((t) => t.fail).length;
  const total = group.tests.length;
  const done = passed + failed;
  // Force this group open when it holds the failing test, so the highlighted
  // row is actually in the DOM for the scroll-to-error to land on.
  const holdsInvalid = !!invalidTestId && group.tests.some((t) => t.id === invalidTestId);
  const showTests = !group.collapsed || holdsInvalid;

  return (
    <View className="border border-slate-200 rounded-2xl overflow-hidden mb-4">
      <TouchableOpacity
        onPress={onToggleCollapse}
        className="px-4 py-3.5 flex-row items-center bg-slate-50"
        activeOpacity={0.8}
      >
        <View className="mr-2">{GROUP_ICONS[group.id]}</View>
        <Text className="text-sm font-bold text-slate-800 flex-1">{group.label}</Text>
        {done > 0 && (
          <View className="flex-row items-center mr-2" style={{ columnGap: 6 }}>
            {passed > 0 && (
              <View className="flex-row items-center px-2 py-0.5 bg-emerald-100 rounded-full">
                <CheckCircle2 size={11} color="#047857" />
                <Text className="text-[11px] font-semibold text-emerald-700 ml-0.5">{passed}</Text>
              </View>
            )}
            {failed > 0 && (
              <View className="flex-row items-center px-2 py-0.5 bg-red-100 rounded-full">
                <XCircle size={11} color="#b91c1c" />
                <Text className="text-[11px] font-semibold text-red-700 ml-0.5">{failed}</Text>
              </View>
            )}
          </View>
        )}
        <Text className="text-xs text-slate-400 font-medium mr-2">{done}/{total}</Text>
        {group.collapsed ? <ChevronRight size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
      </TouchableOpacity>

      {showTests && (
        <View className="p-3">
          {showPackagingToggle && (
            <View className="flex-row items-center mb-3" style={{ columnGap: 10 }}>
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Packaging Type
              </Text>
              <View className="flex-row rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(['Carton', 'Bale'] as const).map((type) => {
                  const active = type === packagingType;
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => { if (!active) onPackagingTypeChange(type); }}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      className={`px-4 py-1.5 rounded-md ${active ? 'bg-brand-500' : ''}`}
                      activeOpacity={0.8}
                    >
                      <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-slate-600'}`}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
          {regularTests.map((test) => (
            <TestRow key={test.id} test={test} invalid={test.id === invalidTestId} optional={isTestOptional(test.id, group.packagingType)} onChange={(patch) => onTestChange(test.id, patch)} inspectionType={inspectionType} />
          ))}
          {otherTests.map((test) => (
            <OtherTestRow
              key={test.id}
              test={test}
              invalid={test.id === invalidTestId}
              onChange={(patch) => onTestChange(test.id, patch)}
              onRemove={() => onRemoveOther(test.id)}
              inspectionType={inspectionType}
            />
          ))}
          <TouchableOpacity
            onPress={onAddOther}
            className="flex-row items-center justify-center px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/40"
          >
            <Plus size={16} color="#e01a1b" />
            <Text className="text-sm font-semibold text-brand-600 ml-1.5">Add Others</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function PI_Step5_Testing({ formData, setFormData, errors = {}, scrollNav, inspectionType }: Props) {
  const groups: TestGroup[] = formData.testGroups || [];
  const evidence: Record<string, Photo[]> = formData.additionalEvidence || {};

  const toggleCollapse = (groupId: string) => {
    setFormData({
      ...formData,
      testGroups: groups.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)),
    });
  };

  // Carton/Bale toggle for the measurement & functional groups: store the choice and
  // relabel that group's predefined test names accordingly (custom "Other" rows keep
  // whatever the checker typed).
  const setPackagingType = (groupId: string, type: 'Carton' | 'Bale') => {
    setFormData({
      ...formData,
      testGroups: groups.map((g) =>
        g.id === groupId
          ? {
              ...g,
              packagingType: type,
              tests: g.tests.map((t) => (t.isOther ? t : { ...t, label: relabelForPackaging(t.label, type) })),
            }
          : g,
      ),
    });
  };

  const updateTest = (groupId: string, testId: string, patch: Partial<TestItem>) => {
    setFormData({
      ...formData,
      testGroups: groups.map((g) =>
        g.id === groupId ? { ...g, tests: g.tests.map((t) => (t.id === testId ? { ...t, ...patch } : t)) } : g,
      ),
    });
  };

  const addOtherTest = (groupId: string) => {
    const newItem: TestItem = {
      id: `other_${groupId}_${Date.now()}`,
      label: '',
      pass: null,
      fail: null,
      remarks: '',
      rightPhotos: [],
      wrongPhotos: [],
      isOther: true,
      subject: '',
    };
    setFormData({
      ...formData,
      testGroups: groups.map((g) => (g.id === groupId ? { ...g, tests: [...g.tests, newItem] } : g)),
    });
  };

  const removeOtherTest = (groupId: string, testId: string) => {
    setFormData({
      ...formData,
      testGroups: groups.map((g) =>
        g.id === groupId ? { ...g, tests: g.tests.filter((t) => t.id !== testId) } : g,
      ),
    });
  };

  // Only ONE photo allowed per evidence slot — any new pick replaces the old one.
  const addEvidencePhoto = (id: string, photos: Photo[]) => {
    setFormData({
      ...formData,
      additionalEvidence: { ...evidence, [id]: photos.slice(0, 1) },
    });
  };
  const removeEvidence = (id: string) => {
    setFormData({ ...formData, additionalEvidence: { ...evidence, [id]: [] } });
  };

  const allTests = groups.flatMap((g) => g.tests);
  const totalPass = allTests.filter((t) => t.pass).length;
  const totalFail = allTests.filter((t) => t.fail).length;
  const totalDone = totalPass + totalFail;

  // Mirror the Next-gate validation so, when blocked, we can point at (and
  // highlight) the exact failing test.
  const firstInvalidTestId: string | null = (() => {
    if (!errors.testGroups) return null;
    const blank = (s: any) => !s || !String(s).trim();
    for (const g of groups) {
      for (const t of g.tests || []) {
        if (t.isOther && (blank(t.subject) || blank(t.label))) return t.id;
        const optional = !t.isOther && isTestOptional(t.id, g.packagingType);
        if (t.pass !== true && t.fail !== true) { if (optional) continue; return t.id; }
        if (t.pass === true && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) return t.id;
        if (t.fail === true && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) return t.id;
      }
    }
    return null;
  })();

  return (
    <ScrollView showsVerticalScrollIndicator={false} {...scrollNav}>
      <StepHeader
        title="Testing"
        subtitle="Record Pass / Fail for each test. On Fail: add a wrong photo and remarks. On Pass: add a correct photo."
      />

      {!!errors.testGroups && <ErrorBanner message={errors.testGroups} />}

      {totalDone > 0 && (
        <View className="flex-row items-center p-3 bg-slate-50 border border-slate-200 rounded-xl mb-4" style={{ columnGap: 12 }}>
          <Text className="text-sm text-slate-600 font-medium">{totalDone} / {allTests.length} tests completed</Text>
          <View className="flex-row items-center px-2.5 py-1 bg-emerald-100 rounded-full">
            <CheckCircle2 size={13} color="#047857" />
            <Text className="text-xs font-semibold text-emerald-700 ml-1">{totalPass} Pass</Text>
          </View>
          <View className="flex-row items-center px-2.5 py-1 bg-red-100 rounded-full">
            <XCircle size={13} color="#b91c1c" />
            <Text className="text-xs font-semibold text-red-700 ml-1">{totalFail} Fail</Text>
          </View>
        </View>
      )}

      {groups.map((group) => (
        <TestGroupCard
          key={group.id}
          group={group}
          invalidTestId={firstInvalidTestId}
          onToggleCollapse={() => toggleCollapse(group.id)}
          onTestChange={(testId, patch) => updateTest(group.id, testId, patch)}
          onAddOther={() => addOtherTest(group.id)}
          onRemoveOther={(testId) => removeOtherTest(group.id, testId)}
          onPackagingTypeChange={(type) => setPackagingType(group.id, type)}
          inspectionType={inspectionType}
        />
      ))}

      {/* Additional Evidence */}
      <View className="flex-row items-center mb-3 mt-2" style={{ columnGap: 8 }}>
        <Images size={16} color="#e01a1b" />
        <Text className="text-base font-bold text-slate-800">Additional Evidence</Text>
      </View>
      {ADDITIONAL_EVIDENCE_DEFS.map((def) => (
        <Card
          key={def.id}
          title={def.label}
          icon={<Camera size={16} color="#e01a1b" />}
          right={<Text className="text-xs text-slate-500">{(evidence[def.id] || []).length} photo</Text>}
        >
          <PhotoGrid
            photos={evidence[def.id] || []}
            onAdd={(ph) => addEvidencePhoto(def.id, ph)}
            onRemove={() => removeEvidence(def.id)}
            addLabel="Add"
            thumb={56}
            inspectionType={inspectionType}
          />
        </Card>
      ))}

      <View className="h-6" />
    </ScrollView>
  );
}