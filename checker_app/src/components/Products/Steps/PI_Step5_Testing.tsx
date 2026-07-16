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
} from 'lucide-react-native';
import type { TestGroup, TestItem } from '../PI_data';
import { ADDITIONAL_EVIDENCE_DEFS } from '../PI_data';
import { StepHeader, Card, ErrorBanner, PhotoGrid, RemarkInput, Photo } from './piShared';

interface Props {
  formData: {
    testGroups: TestGroup[];
    additionalEvidence: Record<string, Photo[]>;
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
}

// ── Single test row ──────────────────────────────────────────────────────────
function TestRow({
  test,
  onChange,
}: {
  test: TestItem;
  onChange: (patch: Partial<TestItem>) => void;
}) {
  const togglePass = () => (test.pass ? onChange({ pass: null }) : onChange({ pass: true, fail: null }));
  const toggleFail = () => (test.fail ? onChange({ fail: null }) : onChange({ fail: true, pass: null }));

  const borderCls = test.pass ? 'border-emerald-200 bg-emerald-50' : test.fail ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white';

  return (
    <View className={`border rounded-xl overflow-hidden mb-3 ${borderCls}`}>
      <View className="px-3 py-3 flex-row items-center">
        <Text className="text-sm font-medium text-slate-800 flex-1 pr-2">{test.label}</Text>
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
                onAdd={(ph) => onChange({ rightPhotos: [...test.rightPhotos, ...ph] })}
                onRemove={(i) => {
                  const next = [...test.rightPhotos];
                  next.splice(i, 1);
                  onChange({ rightPhotos: next });
                }}
                addLabel="Add right photo"
                allowMultiple
                thumb={56}
              />
            </View>
          )}
          {test.fail && (
            <>
              <View className="mb-2">
                <Text className="text-xs font-semibold text-red-700 mb-1">Wrong / Incorrect Photo</Text>
                <PhotoGrid
                  photos={test.wrongPhotos}
                  onAdd={(ph) => onChange({ wrongPhotos: [...test.wrongPhotos, ...ph] })}
                  onRemove={(i) => {
                    const next = [...test.wrongPhotos];
                    next.splice(i, 1);
                    onChange({ wrongPhotos: next });
                  }}
                  addLabel="Add wrong photo"
                  allowMultiple
                  thumb={56}
                />
              </View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">Remarks</Text>
              <RemarkInput value={test.remarks} onChangeText={(t) => onChange({ remarks: t })} placeholder="Describe the failure…" error />
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Custom "Others" test row ─────────────────────────────────────────────────
function OtherTestRow({
  test,
  onChange,
  onRemove,
}: {
  test: TestItem;
  onChange: (patch: Partial<TestItem>) => void;
  onRemove: () => void;
}) {
  const togglePass = () => onChange({ pass: test.pass ? null : true, fail: null });
  const toggleFail = () => onChange({ fail: test.fail ? null : true, pass: null });
  const borderCls = test.pass ? 'border-emerald-200 bg-emerald-50' : test.fail ? 'border-red-200 bg-red-50' : 'border-brand-200 bg-brand-50';

  return (
    <View className={`border rounded-xl overflow-hidden mb-3 ${borderCls}`}>
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
                onAdd={(ph) => onChange({ rightPhotos: [...test.rightPhotos, ...ph] })}
                onRemove={(i) => {
                  const next = [...test.rightPhotos];
                  next.splice(i, 1);
                  onChange({ rightPhotos: next });
                }}
                addLabel="Add right photo"
                allowMultiple
                thumb={56}
              />
            </View>
          )}
          {test.fail && (
            <>
              <View className="mb-2">
                <Text className="text-xs font-semibold text-red-700 mb-1">Wrong / Incorrect Photo</Text>
                <PhotoGrid
                  photos={test.wrongPhotos}
                  onAdd={(ph) => onChange({ wrongPhotos: [...test.wrongPhotos, ...ph] })}
                  onRemove={(i) => {
                    const next = [...test.wrongPhotos];
                    next.splice(i, 1);
                    onChange({ wrongPhotos: next });
                  }}
                  addLabel="Add wrong photo"
                  allowMultiple
                  thumb={56}
                />
              </View>
              <Text className="text-xs font-semibold text-slate-600 mb-1">Remarks</Text>
              <RemarkInput value={test.remarks} onChangeText={(t) => onChange({ remarks: t })} placeholder="Describe the failure…" error />
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ── Collapsible group ────────────────────────────────────────────────────────
function TestGroupCard({
  group,
  onToggleCollapse,
  onTestChange,
  onAddOther,
  onRemoveOther,
}: {
  group: TestGroup;
  onToggleCollapse: () => void;
  onTestChange: (testId: string, patch: Partial<TestItem>) => void;
  onAddOther: () => void;
  onRemoveOther: (testId: string) => void;
}) {
  const regularTests = group.tests.filter((t) => !t.isOther);
  const otherTests = group.tests.filter((t) => t.isOther);
  const passed = group.tests.filter((t) => t.pass).length;
  const failed = group.tests.filter((t) => t.fail).length;
  const total = group.tests.length;
  const done = passed + failed;

  return (
    <View className="border border-slate-200 rounded-2xl overflow-hidden mb-4">
      <TouchableOpacity
        onPress={onToggleCollapse}
        className="px-4 py-3.5 flex-row items-center bg-slate-50"
        activeOpacity={0.8}
      >
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

      {!group.collapsed && (
        <View className="p-3">
          {regularTests.map((test) => (
            <TestRow key={test.id} test={test} onChange={(patch) => onTestChange(test.id, patch)} />
          ))}
          {otherTests.map((test) => (
            <OtherTestRow
              key={test.id}
              test={test}
              onChange={(patch) => onTestChange(test.id, patch)}
              onRemove={() => onRemoveOther(test.id)}
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

export default function PI_Step5_Testing({ formData, setFormData, errors = {} }: Props) {
  const groups: TestGroup[] = formData.testGroups || [];
  const evidence: Record<string, Photo[]> = formData.additionalEvidence || {};

  const toggleCollapse = (groupId: string) => {
    setFormData({
      ...formData,
      testGroups: groups.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g)),
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

  const addEvidencePhoto = (id: string, photos: Photo[]) => {
    setFormData({
      ...formData,
      additionalEvidence: { ...evidence, [id]: [...(evidence[id] || []), ...photos] },
    });
  };
  const removeEvidence = (id: string, i: number) => {
    const next = [...(evidence[id] || [])];
    next.splice(i, 1);
    setFormData({ ...formData, additionalEvidence: { ...evidence, [id]: next } });
  };

  const allTests = groups.flatMap((g) => g.tests);
  const totalPass = allTests.filter((t) => t.pass).length;
  const totalFail = allTests.filter((t) => t.fail).length;
  const totalDone = totalPass + totalFail;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
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
          onToggleCollapse={() => toggleCollapse(group.id)}
          onTestChange={(testId, patch) => updateTest(group.id, testId, patch)}
          onAddOther={() => addOtherTest(group.id)}
          onRemoveOther={(testId) => removeOtherTest(group.id, testId)}
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
          right={<Text className="text-xs text-slate-500">{(evidence[def.id] || []).length} photo{(evidence[def.id] || []).length !== 1 ? 's' : ''}</Text>}
        >
          <PhotoGrid
            photos={evidence[def.id] || []}
            onAdd={(ph) => addEvidencePhoto(def.id, ph)}
            onRemove={(i) => removeEvidence(def.id, i)}
            addLabel="Add"
            allowMultiple
          />
        </Card>
      ))}

      <View className="h-6" />
    </ScrollView>
  );
}
