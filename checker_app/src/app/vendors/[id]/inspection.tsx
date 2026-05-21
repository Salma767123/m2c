import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  FileText,
  X,
  Factory,
  ShieldCheck,
  Boxes,
  Building,
  ClipboardCheck,
  ClipboardList,
  Image as ImageIcon,
} from 'lucide-react-native';
import qcCheckerService from '../../../services/qcCheckerService';
import SelfieCaptureModal, { SelfieResult } from '../../../components/General/SelfieCaptureModal';

type StepId =
  | 'factoryDetails'
  | 'legalRegistration'
  | 'productionInfo'
  | 'basicInfrastructure'
  | 'qualitySafety'
  | 'inspectionInfo'
  | 'basicEvidence';

const STEPS: {
  id: StepId;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
}[] = [
  { id: 'factoryDetails', label: 'Factory', description: 'Vendor and factory context', icon: Factory },
  { id: 'legalRegistration', label: 'Legal', description: 'Business & tax info', icon: ShieldCheck },
  { id: 'productionInfo', label: 'Production', description: 'Capacity & workforce', icon: Boxes },
  { id: 'basicInfrastructure', label: 'Facility', description: 'Facilities availability', icon: Building },
  { id: 'qualitySafety', label: 'Quality', description: 'Processes & environment', icon: ClipboardCheck },
  { id: 'inspectionInfo', label: 'Result', description: 'Status & remarks', icon: ClipboardList },
  { id: 'basicEvidence', label: 'Photos', description: 'Photos & documents', icon: ImageIcon },
];

type FormData = {
  vendorName: string;
  vendorId: string;
  factoryName: string;
  factoryAddress: string;
  contactPersonName: string;
  contactPhoneNumber: string;
  businessRegistrationNumber: string;
  gstTaxId: string;
  factoryLicenseNumber: string;
  productsManufactured: string;
  monthlyProductionCapacity: string;
  numberOfProductionWorkers: string;
  categoryToInspect: string;
  machineryAvailable: 'Yes' | 'No';
  electricityAvailable: 'Yes' | 'No';
  waterAvailable: 'Yes' | 'No';
  storageAreaAvailable: 'Yes' | 'No';
  qualityCheckProcess: 'Yes' | 'No';
  safetyEquipment: 'Yes' | 'No';
  cleanWorkingEnvironment: 'Yes' | 'No';
  inspectionDate: string;
  inspectorName: string;
  inspectionStatus: 'Approved' | 'Rejected';
  inspectorRemarks: string;
  factoryPhotos: { name: string; data: string }[];
  documentsUpload: { name: string; data: string }[];
};

export default function FactoryInspectionScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [currentStep, setCurrentStep] = useState<StepId>('factoryDetails');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [previousRejectionReason, setPreviousRejectionReason] = useState<string | null>(null);

  // ── Selfie gates ──────────────────────────────────────────────────
  const [showBeforeSelfie, setShowBeforeSelfie] = useState(true);
  const [beforeSelfie, setBeforeSelfie] = useState<SelfieResult | null>(null);
  const [showAfterSelfie, setShowAfterSelfie] = useState(false);
  const [afterSelfie, setAfterSelfie] = useState<SelfieResult | null>(null);
  const [locationStarting, setLocationStarting] = useState(false);

  // Captures vendor-supplied fields at load time so we can lock them readonly
  const [autofillSnapshot, setAutofillSnapshot] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    vendorName: name || '',
    vendorId: id || '',
    factoryName: '',
    factoryAddress: '',
    contactPersonName: '',
    contactPhoneNumber: '',
    businessRegistrationNumber: '',
    gstTaxId: '',
    factoryLicenseNumber: '',
    productsManufactured: '',
    monthlyProductionCapacity: '',
    numberOfProductionWorkers: '',
    categoryToInspect: '',
    machineryAvailable: 'Yes',
    electricityAvailable: 'Yes',
    waterAvailable: 'Yes',
    storageAreaAvailable: 'Yes',
    qualityCheckProcess: 'Yes',
    safetyEquipment: 'Yes',
    cleanWorkingEnvironment: 'Yes',
    inspectionDate: new Date().toISOString().slice(0, 10),
    inspectorName: '',
    inspectionStatus: 'Approved',
    inspectorRemarks: '',
    factoryPhotos: [],
    documentsUpload: [],
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        // Prefill inspector name from cached checker profile
        const checkerData = await qcCheckerService.getCheckerData();
        if (checkerData?.name && !cancelled) {
          setFormData((prev) => ({
            ...prev,
            inspectorName: prev.inspectorName || checkerData.name,
          }));
        }

        const res = await qcCheckerService.getActiveInspectionForVendor(id);
        if (cancelled) return;

        const inspection = res?.inspection;
        if (inspection) {
          setInspectionId(inspection.id);
          if (inspection.cycleNumber > 1) {
            setCycleNumber(inspection.cycleNumber);
          }
          if (res.previousRejectionReason) {
            setPreviousRejectionReason(res.previousRejectionReason);
          } else if (inspection.rejectionReason) {
            setPreviousRejectionReason(inspection.rejectionReason);
          }

          const items = inspection.itemsToInspect;
          const assignedCategories = Array.isArray(items)
            ? items.map((i: any) => i.itemName).join(', ')
            : '';

          // For re-inspections, itemsToInspect contains previous form data
          const prevForm = (!Array.isArray(items) && items && typeof items === 'object') ? items as Record<string, any> : null;

          // Prefill from vendor record + previous form data
          const v = inspection.vendor || {};
          const factoryAddressFull = [
            v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode,
          ]
            .map((p: string | null | undefined) => (p ?? '').trim())
            .filter(Boolean)
            .join(', ');

          setFormData((prev) => ({
            ...prev,
            categoryToInspect: prev.categoryToInspect || (prevForm?.categoryToInspect) || assignedCategories,
            // Identity fields — these come from the vendor record, not the
            // checker. Prefer the CURRENT vendor data so admin edits to the
            // vendor's name/address/mapLink propagate into the next inspection
            // open, instead of being shadowed by a stale draft snapshot.
            factoryName: v.companyName || prev.factoryName || prevForm?.factoryName || '',
            contactPersonName: v.ownerName || prev.contactPersonName || prevForm?.contactPersonName || '',
            contactPhoneNumber: v.businessPhone || prev.contactPhoneNumber || prevForm?.contactPhoneNumber || '',
            factoryAddress: factoryAddressFull || prev.factoryAddress || prevForm?.factoryAddress || '',
            gstTaxId: v.gstNumber || prev.gstTaxId || prevForm?.gstTaxId || '',
            businessRegistrationNumber: v.businessRegistrationNumber || prev.businessRegistrationNumber || prevForm?.businessRegistrationNumber || '',
            factoryLicenseNumber: v.tradeLicenseNumber || prev.factoryLicenseNumber || prevForm?.factoryLicenseNumber || '',
            // Production Info
            productsManufactured: prev.productsManufactured || (prevForm?.productsManufactured) || '',
            monthlyProductionCapacity: prev.monthlyProductionCapacity || (prevForm?.monthlyProductionCapacity) || '',
            numberOfProductionWorkers: prev.numberOfProductionWorkers || (prevForm?.numberOfProductionWorkers) || '',
            // Infrastructure
            machineryAvailable: prevForm?.machineryAvailable || prev.machineryAvailable,
            electricityAvailable: prevForm?.electricityAvailable || prev.electricityAvailable,
            waterAvailable: prevForm?.waterAvailable || prev.waterAvailable,
            storageAreaAvailable: prevForm?.storageAreaAvailable || prev.storageAreaAvailable,
            // Quality & Safety
            qualityCheckProcess: prevForm?.qualityCheckProcess || prev.qualityCheckProcess,
            safetyEquipment: prevForm?.safetyEquipment || prev.safetyEquipment,
            cleanWorkingEnvironment: prevForm?.cleanWorkingEnvironment || prev.cleanWorkingEnvironment,
          }));

          // Lock-state snapshot
          const has = (s?: string | null) => typeof s === 'string' && s.trim() !== '';
          // Lock snapshot mirrors the same precedence — current vendor data
          // wins, draft is fallback only when the vendor record is missing.
          setAutofillSnapshot({
            factoryName: has(v.companyName) ? v.companyName : (prevForm?.factoryName || ''),
            contactPersonName: has(v.ownerName) ? v.ownerName : (prevForm?.contactPersonName || ''),
            contactPhoneNumber: has(v.businessPhone) ? v.businessPhone : (prevForm?.contactPhoneNumber || ''),
            factoryAddress: has(factoryAddressFull) ? factoryAddressFull : (prevForm?.factoryAddress || ''),
            gstTaxId: has(v.gstNumber) ? v.gstNumber : (prevForm?.gstTaxId || ''),
            businessRegistrationNumber: has(v.businessRegistrationNumber) ? v.businessRegistrationNumber : (prevForm?.businessRegistrationNumber || ''),
            factoryLicenseNumber: has(v.tradeLicenseNumber) ? v.tradeLicenseNumber : (prevForm?.factoryLicenseNumber || ''),
            categoryToInspect: has(prevForm?.categoryToInspect || assignedCategories) ? (prevForm?.categoryToInspect || assignedCategories) : '',
          });

          // NOTE: Inspection start moved to before-selfie confirmation handler
          // (needs GPS coordinates from the selfie capture).
        } else {
          setError('No active inspection found for this vendor.');
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load inspection');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [id]);

  // ── Per-step validation ──────────────────────────────────────────────
  const [attempted, setAttempted] = useState<Set<StepId>>(new Set());
  const markAttempted = (step: StepId) =>
    setAttempted((prev) => {
      if (prev.has(step)) return prev;
      const next = new Set(prev);
      next.add(step);
      return next;
    });

  const PHONE_RE = /^\+?[\d][\d\s\-()]{6,14}\d$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const isPositiveInt = (v: string) => /^\d+$/.test(v.replace(/[\s,]/g, '')) && parseInt(v, 10) > 0;

  const validateStep = (step: StepId): Record<string, string> => {
    const errs: Record<string, string> = {};
    const reqStr = (k: string, v: any, msg: string) => {
      if (!(typeof v === 'string' && v.trim().length > 0)) errs[k] = msg;
    };
    const reqArr = (k: string, v: any, msg: string) => {
      if (!(Array.isArray(v) && v.length > 0)) errs[k] = msg;
    };

    switch (step) {
      case 'factoryDetails':
        reqStr('vendorName', formData.vendorName, 'Vendor name is required');
        reqStr('vendorId', formData.vendorId, 'Vendor ID is required');
        reqStr('factoryName', formData.factoryName, 'Factory name is required');
        reqStr('factoryAddress', formData.factoryAddress, 'Factory address is required');
        reqStr('contactPersonName', formData.contactPersonName, 'Contact person is required');
        if (!formData.contactPhoneNumber?.trim()) {
          errs.contactPhoneNumber = 'Contact phone is required';
        } else if (!PHONE_RE.test(formData.contactPhoneNumber.trim())) {
          errs.contactPhoneNumber = 'Invalid phone number format';
        }
        break;
      case 'legalRegistration':
        reqStr('businessRegistrationNumber', formData.businessRegistrationNumber, 'Registration number is required');
        reqStr('gstTaxId', formData.gstTaxId, 'GST / Tax ID is required');
        reqStr('factoryLicenseNumber', formData.factoryLicenseNumber, 'License number is required');
        break;
      case 'productionInfo':
        reqStr('categoryToInspect', formData.categoryToInspect, 'Category is required');
        reqStr('productsManufactured', formData.productsManufactured, 'Products manufactured is required');
        if (!formData.monthlyProductionCapacity?.trim()) {
          errs.monthlyProductionCapacity = 'Production capacity is required';
        } else if (!isPositiveInt(formData.monthlyProductionCapacity)) {
          errs.monthlyProductionCapacity = 'Must be a positive whole number';
        }
        if (!formData.numberOfProductionWorkers?.trim()) {
          errs.numberOfProductionWorkers = 'Number of workers is required';
        } else if (!isPositiveInt(formData.numberOfProductionWorkers)) {
          errs.numberOfProductionWorkers = 'Must be a positive whole number';
        }
        break;
      case 'basicInfrastructure':
        break;
      case 'qualitySafety':
        break;
      case 'inspectionInfo':
        if (!formData.inspectionDate?.trim()) {
          errs.inspectionDate = 'Inspection date is required';
        } else if (!DATE_RE.test(formData.inspectionDate.trim())) {
          errs.inspectionDate = 'Use format YYYY-MM-DD';
        } else if (new Date(formData.inspectionDate) > new Date()) {
          errs.inspectionDate = 'Cannot be a future date';
        }
        reqStr('inspectorName', formData.inspectorName, 'Inspector name is required');
        if (formData.inspectionStatus !== 'Approved' && formData.inspectionStatus !== 'Rejected') {
          errs.inspectionStatus = 'Select Approved or Rejected';
        }
        if (formData.inspectionStatus === 'Rejected' && !formData.inspectorRemarks?.trim()) {
          errs.inspectorRemarks = 'Remarks are required when rejecting';
        }
        break;
      case 'basicEvidence': {
        const photos = formData.factoryPhotos || [];
        if (photos.length === 0) {
          errs.factoryPhotos = 'Add at least one factory photo';
        } else {
          const badPhoto = photos.find(
            (p) => !p.data?.startsWith('data:image') && !p.data?.startsWith('https://'),
          );
          if (badPhoto) errs.factoryPhotos = 'One or more photos failed to encode. Re-add them.';
        }
        reqArr('documentsUpload', formData.documentsUpload, 'Add at least one document');
        break;
      }
    }
    return errs;
  };

  const currentErrors = validateStep(currentStep);
  const showErrors = attempted.has(currentStep);
  const stepErrors = showErrors ? currentErrors : {};
  const errorCount = Object.keys(currentErrors).length;

  const goNext = () => {
    if (currentStepIndex >= STEPS.length - 1) return;
    if (errorCount > 0) {
      markAttempted(currentStep);
      return;
    }
    setCurrentStep(STEPS[currentStepIndex + 1].id);
  };
  const goPrev = () => {
    if (currentStepIndex > 0) setCurrentStep(STEPS[currentStepIndex - 1].id);
  };

  const pickMedia = useCallback(
    async (target: 'factoryPhotos' | 'documentsUpload') => {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow photo library access.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.6,
        base64: true,
      });
      if (result.canceled) return;
      const newItems = result.assets.map((a, i) => ({
        name: a.fileName || `${target}-${Date.now()}-${i}.jpg`,
        data: `data:image/jpeg;base64,${a.base64}`,
      }));
      setFormData((prev) => ({
        ...prev,
        [target]: [...(prev[target] as any[]), ...newItems],
      }));
    },
    [],
  );

  const removeMedia = (target: 'factoryPhotos' | 'documentsUpload', idx: number) => {
    setFormData((prev) => ({
      ...prev,
      [target]: (prev[target] as any[]).filter((_, i) => i !== idx),
    }));
  };

  const handleComplete = async (afterSelfieOverride?: SelfieResult) => {
    if (!inspectionId) {
      Alert.alert('Cannot Submit', 'No active inspection found.');
      return;
    }
    // Full sweep — reveal inline errors on every invalid step, jump to first
    const invalidSteps = STEPS.filter(
      (s) => Object.keys(validateStep(s.id)).length > 0,
    );
    if (invalidSteps.length > 0) {
      setAttempted((prev) => {
        const next = new Set(prev);
        invalidSteps.forEach((s) => next.add(s.id));
        return next;
      });
      setCurrentStep(invalidSteps[0].id);
      return;
    }
    // Require after-selfie before submitting
    const resolvedAfterSelfie = afterSelfieOverride ?? afterSelfie;
    if (!resolvedAfterSelfie) {
      setShowAfterSelfie(true);
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        factoryPhotos: formData.factoryPhotos.map((p) => ({ name: p.name, data: p.data })),
        documentsUpload: formData.documentsUpload.map((d) => ({ name: d.name, data: d.data })),
        beforeSelfieTakenAt: beforeSelfie?.takenAt,
        beforeSelfiePhoto: beforeSelfie ? { name: 'before-selfie.jpg', data: beforeSelfie.dataUri } : undefined,
        afterSelfieTakenAt: resolvedAfterSelfie.takenAt,
        afterSelfiePhoto: { name: 'after-selfie.jpg', data: resolvedAfterSelfie.dataUri },
      };
      // The after-selfie was taken seconds before submit, so its GPS is the
      // freshest reading we have for the submit-time geofence.
      const submitLoc =
        resolvedAfterSelfie.latitude != null && resolvedAfterSelfie.longitude != null
          ? { latitude: resolvedAfterSelfie.latitude, longitude: resolvedAfterSelfie.longitude }
          : null;
      const res = await qcCheckerService.completeInspection(inspectionId, payload, submitLoc);
      if (res.success) {
        Alert.alert('Submitted', 'Factory inspection report submitted.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Submission Failed', 'Could not submit the inspection.');
      }
    } catch (err: any) {
      // Surface the three geofence errors with the same UX as start.
      const code = err?.data?.error;
      if (
        code === 'Location mismatch' ||
        code === 'Location required' ||
        code === 'Vendor location not set'
      ) {
        Alert.alert(
          code === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
          err?.data?.message || 'Location verification failed.',
          [{ text: 'OK' }],
        );
        return;
      }
      // Surface backend field errors so the user can fix them
      const fieldErrors = err?.data?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === 'object') {
        const msgs = Object.values(fieldErrors).slice(0, 5).join('\n');
        Alert.alert('Validation Failed', msgs);
      } else {
        Alert.alert('Error', err?.message || 'Unexpected error submitting.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="mt-4 text-slate-600">Loading assignment…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-slate-50">
        <Header onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-base text-slate-700 text-center">{error}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 bg-slate-900 rounded-xl px-6 py-3"
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={() => router.back()} />

      {/* Before-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showBeforeSelfie}
        title="Before Inspection Selfie"
        description="Take a selfie to verify your presence before starting the inspection. Your GPS location will be verified against the vendor's factory."
        onConfirm={async (result) => {
          setBeforeSelfie(result);
          setShowBeforeSelfie(false);

          // Start the inspection with GPS — blocks if location mismatch
          if (inspectionId) {
            setLocationStarting(true);
            try {
              const loc = (result.latitude != null && result.longitude != null)
                ? { latitude: result.latitude, longitude: result.longitude }
                : null;
              await qcCheckerService.startInspection(inspectionId, loc);
            } catch (startErr: any) {
              const errData = startErr?.data;
              if (errData?.error === 'Location mismatch' || errData?.error === 'Location required' || errData?.error === 'Vendor location not set') {
                Alert.alert(
                  errData.error === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
                  errData.message || 'Location verification failed.',
                  [{ text: 'Go Back', onPress: () => router.back() }],
                );
                return;
              }
              // Non-location errors — log but don't block (the inspection might already be IN_PROGRESS)
              if (startErr?.status !== 400) {
                console.error('Auto-start failed:', startErr);
              }
            } finally {
              setLocationStarting(false);
            }
          }
        }}
        onCancel={() => router.back()}
      />

      {/* After-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showAfterSelfie}
        title="After Inspection Selfie"
        description="Great work! Take a final selfie to confirm you completed the inspection on-site."
        onConfirm={(result) => {
          setAfterSelfie(result);
          setShowAfterSelfie(false);
          // Pass result directly to avoid stale closure on afterSelfie state
          handleComplete(result);
        }}
      />

      {/* Location verification loading overlay */}
      {locationStarting && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center" style={{ zIndex: 100 }}>
          <View className="bg-white rounded-2xl p-8 mx-8 items-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-base font-bold text-slate-900 mt-4">Verifying Location…</Text>
            <Text className="text-sm text-slate-500 mt-1 text-center">
              Checking your proximity to the vendor's factory
            </Text>
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
            <Text className="text-[11px] text-emerald-600 mt-0.5">
              Your location has been confirmed near the vendor's factory
            </Text>
          </View>
        </View>
      )}

      {/* Re-inspection banner */}
      {cycleNumber > 1 && (
        <View className="mx-4 mt-2 mb-1 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <Text className="text-xs font-bold text-amber-800">
            Re-Inspection #{cycleNumber}
          </Text>
          <Text className="text-[11px] text-amber-700 mt-0.5">
            Previous inspection was rejected. Please re-evaluate thoroughly.
          </Text>
          {previousRejectionReason && (
            <Text className="text-[11px] text-amber-600 mt-1">
              Previous reason: {previousRejectionReason}
            </Text>
          )}
        </View>
      )}

      {/* Stepper */}
      <View className="bg-white border-b border-slate-200 pt-3 pb-4">
        <View className="px-4 mb-3 flex-row items-center justify-between">
          <Text className="text-sm font-bold text-slate-900">
            Step {currentStepIndex + 1} of {STEPS.length}
          </Text>
          <Text className="text-xs text-slate-500 font-medium" numberOfLines={1}>
            {STEPS[currentStepIndex].description}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === currentStepIndex;
            const isDone = idx < currentStepIndex;
            return (
              <TouchableOpacity
                key={s.id}
                onPress={() => setCurrentStep(s.id)}
                activeOpacity={0.7}
                className="items-center mx-1 w-[70px]"
              >
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isActive || isDone ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  {isDone ? (
                    <Check size={18} color="#ffffff" strokeWidth={3} />
                  ) : (
                    <Icon
                      size={18}
                      color={isActive ? '#ffffff' : '#64748b'}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <Text
                  className={`text-[10px] mt-1.5 font-semibold ${
                    isActive || isDone ? 'text-slate-900' : 'text-slate-500'
                  }`}
                  numberOfLines={1}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {currentStep === 'factoryDetails' ? (
            <StepCard title="Factory Details">
              <InlineErrorBanner count={showErrors ? errorCount : 0} />
              <Field label="Vendor Name" value={formData.vendorName} editable={false} required error={stepErrors.vendorName} />
              <Field label="Vendor ID" value={formData.vendorId} editable={false} required error={stepErrors.vendorId} />
              <Field
                label="Factory Name"
                value={formData.factoryName}
                editable={!autofillSnapshot.factoryName}
                onChange={(v) => update('factoryName', v)}
                required error={stepErrors.factoryName}
              />
              <Field
                label="Factory Address"
                value={formData.factoryAddress}
                multiline
                editable={!autofillSnapshot.factoryAddress}
                onChange={(v) => update('factoryAddress', v)}
                required error={stepErrors.factoryAddress}
              />
              <Field
                label="Contact Person"
                value={formData.contactPersonName}
                editable={!autofillSnapshot.contactPersonName}
                onChange={(v) => update('contactPersonName', v)}
                required error={stepErrors.contactPersonName}
              />
              <Field
                label="Contact Phone"
                value={formData.contactPhoneNumber}
                keyboardType="phone-pad"
                editable={!autofillSnapshot.contactPhoneNumber}
                onChange={(v) => update('contactPhoneNumber', v)}
                required error={stepErrors.contactPhoneNumber}
              />
            </StepCard>
          ) : null}

          {currentStep === 'legalRegistration' ? (
            <StepCard title="Legal & Registration">
              <InlineErrorBanner count={showErrors ? errorCount : 0} />
              <Field
                label="Business Registration No."
                value={formData.businessRegistrationNumber}
                editable={!autofillSnapshot.businessRegistrationNumber}
                onChange={(v) => update('businessRegistrationNumber', v)}
                required error={stepErrors.businessRegistrationNumber}
              />
              <Field
                label="GST / Tax ID"
                value={formData.gstTaxId}
                editable={!autofillSnapshot.gstTaxId}
                onChange={(v) => update('gstTaxId', v)}
                required error={stepErrors.gstTaxId}
              />
              <Field
                label="Factory License No."
                value={formData.factoryLicenseNumber}
                editable={!autofillSnapshot.factoryLicenseNumber}
                onChange={(v) => update('factoryLicenseNumber', v)}
                required error={stepErrors.factoryLicenseNumber}
              />
            </StepCard>
          ) : null}

          {currentStep === 'productionInfo' ? (
            <StepCard title="Production Info">
              <InlineErrorBanner count={showErrors ? errorCount : 0} />
              <Field
                label="Category to Inspect"
                value={formData.categoryToInspect}
                editable={!autofillSnapshot.categoryToInspect}
                required error={stepErrors.categoryToInspect}
              />
              <Field
                label="Products Manufactured"
                value={formData.productsManufactured}
                multiline
                onChange={(v) => update('productsManufactured', v)}
                required error={stepErrors.productsManufactured}
              />
              <Field
                label="Monthly Production Capacity"
                value={formData.monthlyProductionCapacity}
                onChange={(v) => update('monthlyProductionCapacity', v)}
                required error={stepErrors.monthlyProductionCapacity}
              />
              <Field
                label="Number of Production Workers"
                keyboardType="number-pad"
                value={formData.numberOfProductionWorkers}
                onChange={(v) => update('numberOfProductionWorkers', v)}
                required error={stepErrors.numberOfProductionWorkers}
              />
            </StepCard>
          ) : null}

          {currentStep === 'basicInfrastructure' ? (
            <StepCard title="Basic Infrastructure">
              <YesNo
                label="Machinery Available"
                value={formData.machineryAvailable}
                onChange={(v) => update('machineryAvailable', v)}
              />
              <YesNo
                label="Electricity Available"
                value={formData.electricityAvailable}
                onChange={(v) => update('electricityAvailable', v)}
              />
              <YesNo
                label="Water Available"
                value={formData.waterAvailable}
                onChange={(v) => update('waterAvailable', v)}
              />
              <YesNo
                label="Storage Area Available"
                value={formData.storageAreaAvailable}
                onChange={(v) => update('storageAreaAvailable', v)}
              />
            </StepCard>
          ) : null}

          {currentStep === 'qualitySafety' ? (
            <StepCard title="Quality & Safety">
              <YesNo
                label="Quality Check Process"
                value={formData.qualityCheckProcess}
                onChange={(v) => update('qualityCheckProcess', v)}
              />
              <YesNo
                label="Safety Equipment"
                value={formData.safetyEquipment}
                onChange={(v) => update('safetyEquipment', v)}
              />
              <YesNo
                label="Clean Working Environment"
                value={formData.cleanWorkingEnvironment}
                onChange={(v) => update('cleanWorkingEnvironment', v)}
              />
            </StepCard>
          ) : null}

          {currentStep === 'inspectionInfo' ? (
            <StepCard title="Inspection Info">
              <InlineErrorBanner count={showErrors ? errorCount : 0} />
              <Field
                label="Inspection Date (YYYY-MM-DD)"
                value={formData.inspectionDate}
                onChange={(v) => update('inspectionDate', v)}
                required error={stepErrors.inspectionDate}
              />
              <Field
                label="Inspector Name"
                value={formData.inspectorName}
                onChange={(v) => update('inspectorName', v)}
                required error={stepErrors.inspectorName}
              />
              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-700 mb-2">
                  Inspection Status <Text className="text-red-500">*</Text>
                </Text>
                <View className="flex-row" style={{ columnGap: 8 }}>
                  {(['Approved', 'Rejected'] as const).map((v) => {
                    const active = formData.inspectionStatus === v;
                    const bg = active
                      ? v === 'Approved'
                        ? 'bg-emerald-600'
                        : 'bg-red-600'
                      : 'bg-slate-100';
                    const tc = active ? 'text-white' : 'text-slate-700';
                    return (
                      <TouchableOpacity
                        key={v}
                        onPress={() => update('inspectionStatus', v)}
                        activeOpacity={0.8}
                        className={`flex-1 items-center py-3 rounded-xl ${bg}`}
                      >
                        <Text className={`text-sm font-bold ${tc}`}>{v}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <Field
                label="Inspector Remarks"
                value={formData.inspectorRemarks}
                required error={stepErrors.inspectorRemarks}
                multiline
                onChange={(v) => update('inspectorRemarks', v)}
              />
            </StepCard>
          ) : null}

          {currentStep === 'basicEvidence' ? (
            <StepCard title="Basic Evidence">
              <InlineErrorBanner count={showErrors ? errorCount : 0} />
              <MediaSection
                label="Factory Photos"
                icon={<Camera size={18} color="#2563eb" />}
                items={formData.factoryPhotos}
                onAdd={() => pickMedia('factoryPhotos')}
                onRemove={(i) => removeMedia('factoryPhotos', i)}
                error={stepErrors.factoryPhotos}
              />
              <View className="h-4" />
              <MediaSection
                label="Documents"
                icon={<FileText size={18} color="#2563eb" />}
                items={formData.documentsUpload}
                onAdd={() => pickMedia('documentsUpload')}
                onRemove={(i) => removeMedia('documentsUpload', i)}
                error={stepErrors.documentsUpload}
              />
            </StepCard>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom nav — safe area aware */}
      <BottomNav
        showPrev={currentStepIndex > 0}
        onPrev={goPrev}
        isLast={currentStepIndex === STEPS.length - 1}
        onNext={goNext}
        onComplete={handleComplete}
        submitting={submitting}
      />
    </View>
  );
}

function BottomNav({
  showPrev,
  onPrev,
  isLast,
  onNext,
  onComplete,
  submitting,
}: {
  showPrev: boolean;
  onPrev: () => void;
  isLast: boolean;
  onNext: () => void;
  onComplete: () => void;
  submitting: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row bg-white border-t border-slate-200 px-4 pt-3"
      style={{ columnGap: 8, paddingBottom: Math.max(insets.bottom, 12) + 4 }}
    >
      {showPrev ? (
        <TouchableOpacity
          onPress={onPrev}
          activeOpacity={0.8}
          className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-slate-200"
        >
          <ArrowLeft size={16} color="#0f172a" />
          <Text className="ml-2 font-bold text-sm text-slate-900">Previous</Text>
        </TouchableOpacity>
      ) : (
        <View className="flex-1" />
      )}
      {isLast ? (
        <TouchableOpacity
          onPress={onComplete}
          disabled={submitting}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-emerald-600"
          style={{ opacity: submitting ? 0.6 : 1 }}
        >
          <Check size={16} color="#ffffff" strokeWidth={2.5} />
          <Text className="ml-2 font-bold text-sm text-white">
            {submitting ? 'Submitting…' : 'Complete'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onNext}
          activeOpacity={0.85}
          className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-blue-600"
        >
          <Text className="mr-2 font-bold text-sm text-white">Next</Text>
          <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between px-4 pb-3"
      style={{ backgroundColor: '#0f172a', paddingTop: insets.top + 8 }}
    >
      <TouchableOpacity
        onPress={onBack}
        hitSlop={10}
        activeOpacity={0.7}
        className="w-10 h-10 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
      >
        <ArrowLeft size={20} color="#ffffff" />
      </TouchableOpacity>
      <Text className="text-base font-extrabold text-white">
        Factory Inspection
      </Text>
      <View className="w-10" />
    </View>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4">
      <Text className="text-lg font-extrabold text-slate-900 mb-4">{title}</Text>
      {children}
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  editable = true,
  keyboardType,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  multiline?: boolean;
  editable?: boolean;
  keyboardType?: any;
  required?: boolean;
  error?: string;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-700 mb-1.5">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholderTextColor="#94a3b8"
        className={`rounded-xl border px-3.5 py-3 text-sm text-slate-900 ${
          error ? 'border-red-400 bg-red-50' : editable ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-slate-100'
        }`}
        style={multiline ? { minHeight: 80, textAlignVertical: 'top' } : undefined}
      />
      {error ? (
        <Text className="text-xs font-medium text-red-600 mt-1">{error}</Text>
      ) : null}
    </View>
  );
}

function InlineErrorBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-3 flex-row items-start">
      <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center mr-2 mt-0.5">
        <Text className="text-white text-[10px] font-bold">!</Text>
      </View>
      <Text className="text-xs text-red-700 flex-1 leading-4">
        <Text className="font-bold">
          {count} {count === 1 ? 'field needs' : 'fields need'} your attention.
        </Text>{' '}
        Review the highlighted fields to continue.
      </Text>
    </View>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 'Yes' | 'No';
  onChange: (v: 'Yes' | 'No') => void;
}) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-700 mb-1.5">
        {label} <Text className="text-red-500">*</Text>
      </Text>
      <View className="flex-row" style={{ columnGap: 8 }}>
        {(['Yes', 'No'] as const).map((v) => {
          const active = value === v;
          const bg = active
            ? v === 'Yes'
              ? 'bg-emerald-600'
              : 'bg-red-600'
            : 'bg-slate-100';
          const tc = active ? 'text-white' : 'text-slate-700';
          return (
            <TouchableOpacity
              key={v}
              onPress={() => onChange(v)}
              activeOpacity={0.8}
              className={`flex-1 items-center py-2.5 rounded-xl ${bg}`}
            >
              <Text className={`text-sm font-bold ${tc}`}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MediaSection({
  label,
  icon,
  items,
  onAdd,
  onRemove,
  error,
}: {
  label: string;
  icon: React.ReactNode;
  items: { name: string; data: string }[];
  onAdd: () => void;
  onRemove: (i: number) => void;
  error?: string;
}) {
  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          {icon}
          <Text className="text-sm font-bold text-slate-900 ml-2">
            {label} <Text className="text-red-500">*</Text>{' '}
            <Text className="text-slate-500 font-normal">({items.length})</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={onAdd}
          activeOpacity={0.8}
          className="bg-blue-600 rounded-lg px-3 py-1.5"
        >
          <Text className="text-white text-xs font-bold">+ Add</Text>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? (
        <View className={`border-2 border-dashed rounded-xl py-8 items-center ${
          error ? 'border-red-400 bg-red-50' : 'border-slate-200'
        }`}>
          <Text className="text-xs text-slate-500">No files added</Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap" style={{ columnGap: 8, rowGap: 8 }}>
          {items.map((item, i) => (
            <View
              key={i}
              className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 relative"
            >
              <Image
                source={{ uri: item.data }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => onRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              >
                <X size={12} color="#ffffff" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      {error ? (
        <Text className="text-xs font-medium text-red-600 mt-1.5">{error}</Text>
      ) : null}
    </View>
  );
}
