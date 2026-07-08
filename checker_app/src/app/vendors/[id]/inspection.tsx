import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  BackHandler,
} from 'react-native';
import { useLocalSearchParams, router, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Save,
  AlertTriangle,
  ShieldAlert,
  Clock,
} from 'lucide-react-native';
import qcCheckerService from '../../../services/qcCheckerService';
import SelfieCaptureModal, { SelfieResult } from '../../../components/General/SelfieCaptureModal';

import { HighlightFieldsProvider, Verifications } from '../../../components/Vendor/Steps/VI_VerifyField';
import VI_Step1_CompanyInfo from '../../../components/Vendor/Steps/VI_Step1_CompanyInfo';
import VI_Step2_WarehouseFactory, { FactoryEvidenceState } from '../../../components/Vendor/Steps/VI_Step2_WarehouseFactory';
import VI_Step3_OwnerProfile from '../../../components/Vendor/Steps/VI_Step3_OwnerProfile';
import VI_Step4_VendorType from '../../../components/Vendor/Steps/VI_Step4_VendorType';
import VI_Step5_Manufacturing from '../../../components/Vendor/Steps/VI_Step5_Manufacturing';
import VI_Step6_Certifications from '../../../components/Vendor/Steps/VI_Step6_Certifications';
import VI_Step7_ContactTrade from '../../../components/Vendor/Steps/VI_Step7_ContactTrade';
import VI_Step8_FinalReview, { InspectorMeta } from '../../../components/Vendor/Steps/VI_Step8_FinalReview';
import { validateStep, validateForSubmit } from '../../../components/Vendor/validation';
import { formatCheckerName } from '../../../components/Vendor/Steps/fieldHelpers';

const STEPS = [
  { id: 1, label: 'Company' },
  { id: 2, label: 'Warehouse' },
  { id: 3, label: 'Owner' },
  { id: 4, label: 'Products' },
  { id: 5, label: 'Manufacturing' },
  { id: 6, label: 'Certifications' },
  { id: 7, label: 'Contact' },
  { id: 8, label: 'Final Review' },
];

const draftKey = (inspectionId: string) => `vendorInspectionDraft:${inspectionId}`;

export default function VendorInspectionScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<{ type: 'not_assigned' | 'submitted' | 'unknown'; message: string } | null>(null);

  const [vendor, setVendor] = useState<any>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [previousRejectionReason, setPreviousRejectionReason] = useState<string | null>(null);

  const [verifications, setVerifications] = useState<Verifications>({});
  const [meta, setMeta] = useState<InspectorMeta>({
    inspectorName: '',
    inspectionDate: new Date().toISOString().split('T')[0],
    overallResult: '',
    inspectorRemarks: '',
  });
  const [factoryEvidence, setFactoryEvidence] = useState<FactoryEvidenceState>({
    frontView: null,
    nameBoard: null,
    routeMap: null,
  });
  const [evidenceError, setEvidenceError] = useState(false);

  // Registered verification keys for the currently mounted step
  const registeredFieldsRef = useRef<string[]>([]);
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set());

  // ── Selfie / GPS gates ──────────────────────────────────────────────
  const [showBeforeSelfie, setShowBeforeSelfie] = useState(true);
  const [beforeSelfie, setBeforeSelfie] = useState<SelfieResult | null>(null);
  const [showAfterSelfie, setShowAfterSelfie] = useState(false);
  const [afterSelfie, setAfterSelfie] = useState<SelfieResult | null>(null);
  const [locationStarting, setLocationStarting] = useState(false);

  // ── Exit guard state ────────────────────────────────────────────────
  const allowLeaveRef = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pendingNavActionRef = useRef<null | (() => void)>(null);
  const dirtyRef = useRef(false);

  const handleRegisterFields = useCallback((keys: string[]) => {
    registeredFieldsRef.current = keys;
    setVerifications((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const k of keys) {
        if (!(k in next)) {
          next[k] = { ok: null, remarks: '' };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const handleVerificationChange = (key: string, ok: boolean | null, remarks: string) => {
    dirtyRef.current = true;
    setVerifications((prev) => ({ ...prev, [key]: { ok, remarks } }));
  };

  // ── Data load ──────────────────────────────────────────────────────
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (!id || prefilledRef.current) {
      if (!id) setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const cached = await qcCheckerService.getCheckerData();
        if (cached?.name && !cancelled) {
          setMeta((prev) => ({ ...prev, inspectorName: prev.inspectorName || formatCheckerName(cached) }));
        }

        const [vendorRes, inspRes] = await Promise.all([
          qcCheckerService.getVendorDetails(id),
          qcCheckerService.getActiveInspectionForVendor(id).catch(() => null),
        ]);
        if (cancelled) return;

        if (vendorRes?.success) {
          setVendor(vendorRes.data.vendor);
          const liveQc = vendorRes.data.vendor?.assignedQc;
          if (liveQc) setMeta((prev) => ({ ...prev, inspectorName: formatCheckerName(liveQc) }));
        }

        let insp = (inspRes as any)?.inspection;
        if (!insp) {
          try {
            const beginRes = await qcCheckerService.beginInspection(id);
            if (cancelled) return;
            insp = beginRes.inspection;
          } catch (beginErr: any) {
            if (cancelled) return;
            const status = beginErr?.status;
            const msg: string = beginErr?.message || 'Could not begin inspection.';
            if (status === 403) setLoadError({ type: 'not_assigned', message: msg });
            else if (status === 409) setLoadError({ type: 'submitted', message: msg });
            else setLoadError({ type: 'unknown', message: msg });
            return;
          }
        }

        if (insp && !cancelled) {
          setInspection(insp);
          setInspectionId(insp.id);
          if (insp.cycleNumber > 1) setCycleNumber(insp.cycleNumber);
          if ((inspRes as any)?.previousRejectionReason) setPreviousRejectionReason((inspRes as any).previousRejectionReason);
          else if (insp.rejectionReason) setPreviousRejectionReason(insp.rejectionReason);

          // Restore any saved draft for this inspection.
          try {
            const raw = await AsyncStorage.getItem(draftKey(insp.id));
            if (raw && !cancelled) {
              const draft = JSON.parse(raw);
              if (draft.verifications) setVerifications(draft.verifications);
              if (draft.meta) setMeta((prev) => ({ ...prev, ...draft.meta, inspectorName: prev.inspectorName || draft.meta.inspectorName }));
              if (draft.factoryEvidence) setFactoryEvidence(draft.factoryEvidence);
              if (typeof draft.step === 'number') setStep(draft.step);
            }
          } catch {
            /* ignore malformed draft */
          }
        }
        prefilledRef.current = true;
      } catch (err: any) {
        if (cancelled) return;
        const status = err?.status;
        const msg: string = err?.message || 'Failed to load inspection data.';
        if (status === 403) setLoadError({ type: 'not_assigned', message: msg });
        else setLoadError({ type: 'unknown', message: msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // ── Draft persistence — debounced write on every change ─────────────
  useEffect(() => {
    if (!inspectionId || loading || allowLeaveRef.current) return;
    const t = setTimeout(() => {
      AsyncStorage.setItem(
        draftKey(inspectionId),
        JSON.stringify({ verifications, meta, factoryEvidence, step }),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [inspectionId, verifications, meta, factoryEvidence, step, loading]);

  // ── Exit guard — navigation-away (beforeRemove) + Android hardware back ──
  useEffect(() => {
    const sub = (navigation as any).addListener?.('beforeRemove', (e: any) => {
      if (allowLeaveRef.current || !dirtyRef.current) return;
      e.preventDefault();
      pendingNavActionRef.current = () => (navigation as any).dispatch(e.data.action);
      setShowExitConfirm(true);
    });
    return sub;
  }, [navigation]);

  useEffect(() => {
    const onBack = () => {
      if (allowLeaveRef.current || !dirtyRef.current) return false;
      pendingNavActionRef.current = () => router.back();
      setShowExitConfirm(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  const confirmExit = () => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    const action = pendingNavActionRef.current;
    pendingNavActionRef.current = null;
    if (action) action();
    else router.back();
  };
  const cancelExit = () => {
    setShowExitConfirm(false);
    pendingNavActionRef.current = null;
  };

  // ── Navigation between steps ────────────────────────────────────────
  const goNext = () => {
    const result = validateStep(step, registeredFieldsRef.current, verifications, factoryEvidence);
    if (!result.ok) {
      if (result.missingEvidence) {
        setEvidenceError(true);
        Alert.alert('Evidence photo required', result.message || 'Upload at least one evidence photo.');
        return;
      }
      setHighlightedKeys(new Set(result.unverified));
      Alert.alert('Verification incomplete', result.message || 'Please verify all fields before continuing.');
      return;
    }
    setEvidenceError(false);
    setHighlightedKeys(new Set());
    if (step < STEPS.length) setStep((s) => s + 1);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  const handleGoToStep = (target: number, fieldKey?: string) => {
    setStep(target);
    if (fieldKey) setHighlightedKeys(new Set([fieldKey]));
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (afterSelfieOverride?: SelfieResult) => {
    if (!inspectionId) {
      Alert.alert('Cannot Submit', 'No active inspection found.');
      return;
    }
    const gate = validateForSubmit(meta);
    if (!gate.ok) {
      if (gate.jumpToStep) setStep(gate.jumpToStep);
      Alert.alert('Required', gate.message || 'Please complete the required fields.');
      return;
    }

    // Require after-selfie + GPS before finalising.
    const resolvedAfterSelfie = afterSelfieOverride ?? afterSelfie;
    if (!resolvedAfterSelfie) {
      setShowAfterSelfie(true);
      return;
    }

    setSubmitting(true);
    try {
      // Payload keys EXACTLY match the web VendorInspectionForm submit, with the
      // app's selfie keys added additively. GPS goes through the service's
      // `location` param (adds checkerLatitude/checkerLongitude), same as web.
      const payload: any = {
        verifications,
        inspectorName: meta.inspectorName,
        inspectionDate: meta.inspectionDate,
        inspectionStatus: meta.overallResult,
        inspectorRemarks: meta.inspectorRemarks,
        cycleNumber,
        clientSignature: null,
        // App-only additive keys (selfie evidence + factory evidence photos)
        factoryEvidence,
        beforeSelfieTakenAt: beforeSelfie?.takenAt,
        beforeSelfiePhoto: beforeSelfie ? { name: 'before-selfie.jpg', data: beforeSelfie.dataUri } : undefined,
        afterSelfieTakenAt: resolvedAfterSelfie.takenAt,
        afterSelfiePhoto: { name: 'after-selfie.jpg', data: resolvedAfterSelfie.dataUri },
      };

      const submitLoc =
        resolvedAfterSelfie.latitude != null && resolvedAfterSelfie.longitude != null
          ? { latitude: resolvedAfterSelfie.latitude, longitude: resolvedAfterSelfie.longitude }
          : null;

      const res = await qcCheckerService.completeInspection(inspectionId, payload, submitLoc);
      if (res.success) {
        allowLeaveRef.current = true;
        dirtyRef.current = false;
        await AsyncStorage.removeItem(draftKey(inspectionId)).catch(() => {});
        Alert.alert('Inspection Submitted', 'Vendor inspection report has been submitted successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Submission Failed', 'Could not submit the inspection.');
      }
    } catch (err: any) {
      const code = err?.data?.error;
      if (code === 'Location mismatch' || code === 'Location required' || code === 'Vendor location not set') {
        Alert.alert(
          code === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
          err?.data?.message || 'Location verification failed.',
          [{ text: 'OK' }],
        );
        return;
      }
      const fieldErrors = err?.data?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        Alert.alert('Validation Failed', Object.values(fieldErrors).slice(0, 5).join('\n'));
      } else {
        Alert.alert('Error', err?.message || 'Unexpected error submitting.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────
  const commonProps = {
    vendor: vendor ?? {},
    verifications,
    onChange: handleVerificationChange,
    onRegisterFields: handleRegisterFields,
  };

  const renderStep = () => {
    if (!vendor) return null;
    switch (step) {
      case 1:
        return <VI_Step1_CompanyInfo {...commonProps} />;
      case 2:
        return (
          <VI_Step2_WarehouseFactory
            {...commonProps}
            factoryEvidence={factoryEvidence}
            onEvidenceChange={(slot, photo) => {
              dirtyRef.current = true;
              setFactoryEvidence((prev) => ({ ...prev, [slot]: photo }));
              setEvidenceError(false);
            }}
            evidenceError={evidenceError}
          />
        );
      case 3:
        return <VI_Step3_OwnerProfile {...commonProps} />;
      case 4:
        return <VI_Step4_VendorType {...commonProps} />;
      case 5:
        return <VI_Step5_Manufacturing {...commonProps} />;
      case 6:
        return <VI_Step6_Certifications {...commonProps} />;
      case 7:
        return <VI_Step7_ContactTrade {...commonProps} />;
      case 8:
        return (
          <VI_Step8_FinalReview
            vendor={vendor ?? {}}
            inspection={inspection}
            verifications={verifications}
            meta={meta}
            onMetaChange={(patch) => {
              dirtyRef.current = true;
              setMeta((prev) => ({ ...prev, ...patch }));
            }}
            onGoToStep={handleGoToStep}
          />
        );
      default:
        return null;
    }
  };

  // ── Loading / error states ──────────────────────────────────────────
  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-slate-600">Loading vendor inspection…</Text>
      </View>
    );
  }

  if (loadError) {
    const isSubmitted = loadError.type === 'submitted';
    return (
      <View className="flex-1 bg-slate-50">
        <Header onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <View className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${isSubmitted ? 'bg-amber-50' : 'bg-red-50'}`}>
            {isSubmitted ? <Clock size={28} color="#f59e0b" /> : <ShieldAlert size={28} color="#ef4444" />}
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-1 text-center">
            {isSubmitted ? 'Inspection Submitted' : loadError.type === 'not_assigned' ? 'Access Denied' : 'Unable to Start Inspection'}
          </Text>
          <Text className="text-slate-600 text-sm text-center leading-relaxed">{loadError.message}</Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-blue-600 rounded-xl px-6 py-3">
            <Text className="text-white font-bold">Back to Vendor List</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={() => router.back()} title={typeof name === 'string' ? name : 'Vendor Inspection'} />

      {/* Before-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showBeforeSelfie}
        title="Before Inspection Selfie"
        description="Take a selfie to verify your presence before starting the inspection. Your GPS location will be verified against the vendor's factory."
        onConfirm={async (result) => {
          setBeforeSelfie(result);
          setShowBeforeSelfie(false);
          if (inspectionId) {
            setLocationStarting(true);
            try {
              const loc =
                result.latitude != null && result.longitude != null
                  ? { latitude: result.latitude, longitude: result.longitude }
                  : null;
              await qcCheckerService.startInspection(inspectionId, loc);
            } catch (startErr: any) {
              const errData = startErr?.data;
              if (
                errData?.error === 'Location mismatch' ||
                errData?.error === 'Location required' ||
                errData?.error === 'Vendor location not set'
              ) {
                Alert.alert(
                  errData.error === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
                  errData.message || 'Location verification failed.',
                  [{ text: 'Go Back', onPress: () => { allowLeaveRef.current = true; router.back(); } }],
                );
                return;
              }
              if (startErr?.status !== 400) console.error('Auto-start failed:', startErr);
            } finally {
              setLocationStarting(false);
            }
          }
        }}
        onCancel={() => { allowLeaveRef.current = true; router.back(); }}
      />

      {/* After-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showAfterSelfie}
        title="After Inspection Selfie"
        description="Great work! Take a final selfie to confirm you completed the inspection on-site."
        onConfirm={(result) => {
          setAfterSelfie(result);
          setShowAfterSelfie(false);
          handleSubmit(result);
        }}
      />

      {/* Location verification overlay */}
      {locationStarting && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center" style={{ zIndex: 100 }}>
          <View className="bg-white rounded-2xl p-8 mx-8 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-base font-bold text-slate-900 mt-4">Verifying Location…</Text>
            <Text className="text-sm text-slate-500 mt-1 text-center">Checking your proximity to the vendor's factory</Text>
          </View>
        </View>
      )}

      {/* Location verified banner */}
      {beforeSelfie && !locationStarting && !showBeforeSelfie && (
        <View className="mx-4 mt-2 mb-1 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex-row items-center" style={{ columnGap: 8 }}>
          <View className="w-6 h-6 rounded-full bg-emerald-500 items-center justify-center">
            <Check size={14} color="#ffffff" strokeWidth={3} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-emerald-800">Location Verified ✓</Text>
            <Text className="text-[11px] text-emerald-600 mt-0.5">Your location has been confirmed near the vendor's factory</Text>
          </View>
        </View>
      )}

      {/* Re-inspection banner */}
      {cycleNumber > 1 && (
        <View className="mx-4 mt-2 mb-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <Text className="text-xs font-bold text-amber-800">Re-Inspection #{cycleNumber}</Text>
          <Text className="text-[11px] text-amber-700 mt-0.5">Previous inspection was rejected. Please re-evaluate thoroughly.</Text>
          {previousRejectionReason && (
            <Text className="text-[11px] text-amber-600 mt-1">Previous reason: {previousRejectionReason}</Text>
          )}
        </View>
      )}

      {/* Stepper */}
      <View className="bg-white border-b border-slate-200 pt-3 pb-4">
        <View className="px-4 mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-slate-900">Step {step} of {STEPS.length}</Text>
          <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>{STEPS[step - 1].label}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {STEPS.map((s) => {
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <TouchableOpacity key={s.id} onPress={() => setStep(s.id)} activeOpacity={0.7} className="items-center mx-1" style={{ width: 78 }}>
                <View className={`w-10 h-10 rounded-full items-center justify-center ${isActive || isDone ? 'bg-blue-600' : 'bg-slate-200'}`}>
                  {isDone ? (
                    <Check size={18} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{s.id}</Text>
                  )}
                </View>
                <Text className={`text-[10px] mt-1.5 font-semibold ${isActive || isDone ? 'text-slate-900' : 'text-slate-500'}`} numberOfLines={1}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={10}>
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          <View className="bg-white rounded-2xl border border-slate-200 p-4">
            <HighlightFieldsProvider keys={highlightedKeys}>{renderStep()}</HighlightFieldsProvider>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav */}
      <View
        className="flex-row bg-white border-t border-slate-200 px-4 pt-3"
        style={{ columnGap: 8, paddingBottom: Math.max(insets.bottom, 12) + 4 }}
      >
        {step > 1 ? (
          <TouchableOpacity onPress={goPrev} activeOpacity={0.8} className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-slate-200">
            <ArrowLeft size={16} color="#0f172a" />
            <Text className="ml-2 font-bold text-sm text-slate-900">Previous</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-1" />
        )}
        {step === STEPS.length ? (
          <TouchableOpacity
            onPress={() => handleSubmit()}
            disabled={submitting}
            activeOpacity={0.85}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-emerald-600"
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            <Check size={16} color="#ffffff" strokeWidth={2.5} />
            <Text className="ml-2 font-bold text-sm text-white">{submitting ? 'Submitting…' : 'Submit Inspection Report'}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={goNext} activeOpacity={0.85} className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-blue-600">
            <Save size={16} color="#ffffff" strokeWidth={2.5} />
            <Text className="mx-2 font-bold text-sm text-white">Save & Continue</Text>
            <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Exit confirmation modal */}
      <Modal visible={showExitConfirm} transparent animationType="fade" onRequestClose={cancelExit}>
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
          <View className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <View className="p-6 flex-row items-start" style={{ columnGap: 16 }}>
              <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center">
                <AlertTriangle size={24} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">Exit inspection?</Text>
                <Text className="mt-1 text-sm text-slate-600">
                  Are you sure you want to exit? Your unsaved changes on this form will be lost.
                </Text>
              </View>
            </View>
            <View className="flex-row px-6 py-4 bg-slate-50 border-t border-slate-100" style={{ columnGap: 12 }}>
              <TouchableOpacity onPress={cancelExit} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white items-center">
                <Text className="font-semibold text-slate-700">Keep editing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmExit} className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 items-center">
                <Text className="font-semibold text-white">Yes, exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Header({ onBack, title = 'Vendor Inspection' }: { onBack: () => void; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center justify-between px-4 pb-3" style={{ backgroundColor: '#0f172a', paddingTop: insets.top + 8 }}>
      <TouchableOpacity onPress={onBack} hitSlop={10} activeOpacity={0.7} className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <ArrowLeft size={20} color="#ffffff" />
      </TouchableOpacity>
      <Text className="text-base font-extrabold text-white flex-1 text-center" numberOfLines={1}>
        {title}
      </Text>
      <View className="w-10" />
    </View>
  );
}
