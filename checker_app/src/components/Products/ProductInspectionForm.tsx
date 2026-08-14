import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable, BackHandler } from 'react-native';
import { ArrowLeft, ArrowRight, Check, RotateCcw, AlertTriangle, MapPin, X, Save, AlarmClockOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isInspectionWindowElapsed, formatAssignmentWindow } from '@/lib/inspectionSchedule';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import qcCheckerService from '@/services/qcCheckerService';
import { formatCheckerName } from '@/components/Vendor/Steps/fieldHelpers';

import {
  makeDefaultPackagingItems,
  makeDefaultTestGroups,
  makeDefaultAdditionalEvidence,
} from './PI_data';
import {
  validateStep,
  validateAll,
  hasErrors,
  countErrors,
  countAllErrors,
  type Step,
  type AllErrors,
} from './validation';

import PI_Step1_GeneralInfo from './Steps/PI_Step1_GeneralInfo';
import PI_Step2_ProductVerification from './Steps/PI_Step2_ProductVerification';
import PI_Step3_PackagingInspection from './Steps/PI_Step3_PackagingInspection';
import Defects from './Steps/Defects';
import PI_Step5_Testing from './Steps/PI_Step5_Testing';
import PI_Step6_Review from './Steps/PI_Step6_Review';
import Documentation from './Steps/Documentation';
import InspectionTypeDialog, { type InspectionType } from './InspectionTypeDialog';
import { useScrollNav, ScrollNavButton } from '@/components/General/ScrollNav';
import { PIValidationProvider, useInvalidFieldRegistry } from './Steps/piValidation';

interface Props {
  productId: string;
  productName: string;
  vendorName: string;
  onComplete: () => void;
  onCancel: () => void;
}

// Draft + chosen-type storage, one entry per product.
const draftKeyFor = (productId: string) => `productInspectionDraft:${productId}`;
const typeKeyFor = (productId: string) => `productInspectionType:${productId}`;

// Drop base64 payloads so an over-quota snapshot can still be saved. The photos
// are lost, everything the checker typed survives — the right trade when the
// alternative is saving nothing at all.
function stripBase64Deep(value: any): any {
  if (typeof value === 'string') return value.startsWith('data:') ? '' : value;
  if (Array.isArray(value)) return value.map(stripBase64Deep);
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) out[k] = stripBase64Deep(v);
    return out;
  }
  return value;
}

// The blank form. Extracted so "discard draft & restart" can rebuild it, and the
// initial state can be merged over by a restored draft.
function makeDefaultFormData(productName: string, vendorName: string) {
  return {
    // Step 1
    client: 'M2C',
    vendor: vendorName,
    // Local calendar date (en-CA → YYYY-MM-DD). toISOString() gives the UTC date,
    // which is the PREVIOUS day for IST times before 05:30 (web bug F-09).
    serviceStartDate: new Date().toLocaleDateString('en-CA'),
    // Timestamp when the inspection was opened — surfaces as "Inspection Start
    // Time" in the generated report and on the product detail screen.
    inspectionStartedAt: new Date().toISOString(),
    // Draft/pause timing. pausedAt marks an explicit "save draft & exit";
    // totalPausedMs accumulates paused time across resume cycles.
    pausedAt: null as string | null,
    totalPausedMs: 0,
    serviceType: 'Pre-Shipment Inspection',
    vendorData: null as any,
    productData: null as any,

    // Step 2
    productVerifications: {} as Record<string, { ok: boolean | null; remarks: string }>,
    productEvidencePhotos: [] as any[],

    // Step 3
    packagingItems: makeDefaultPackagingItems(),
    packagingPhotos: [] as any[],

    // Step 4 – Defects
    inspectionLevel: 'L-II',
    sampleSize: 200,
    aqlCritical: 0,
    aqlMajor: 2.5,
    aqlMinor: 4.0,
    maxAllowedCritical: 0,
    maxAllowedMajor: 10,
    maxAllowedMinor: 14,
    criticalDefects: 0,
    majorDefects: 0,
    minorDefects: 0,
    criticalDefectDetails: '',
    majorDefectDetails: '',
    minorDefectDetails: '',
    defectPhotos: [] as any[],

    // Step 5 – Testing
    testGroups: makeDefaultTestGroups(),
    additionalEvidence: makeDefaultAdditionalEvidence(),

    // Step 6 – Final Decision (within Review step)
    finalDecision: 'Approved',
    reviewerRemarks: '',

    // Step 7 – Documentation
    inspectorSignature: '',
    inspectionStatus: '',
    documentationPhotos: [] as any[],
    photocopyDocuments: [] as any[],
    companyIdCards: [] as any[],
    signedDocuments: [] as any[],
    signedReport: [] as any[],
    clientSignature: '',

    // Legacy compat fields
    items: [
      {
        id: 1,
        itemName: productName,
        itemDescription: 'Standard Product Assessment',
        totalQuantity: 0,
        inspectionQuantity: 0,
      },
    ] as any[],
    warehousePhotoEvidences: [] as any[],
    measurements: [] as any[],
    measurementPhotos: [] as any[],
    tests: [] as any[],
    testingPhotos: [] as any[],
    shipperCartonRemark: '',
    innerCartonRemark: '',
    retailPackagingRemark: '',
    productTypeRemark: '',
    aqlWorkmanshipRemark: '',
    onSiteTestsRemark: '',
  };
}

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: 'generalInformation', label: 'General Info', description: 'Vendor registration data and inspection context' },
  { id: 'productVerification', label: 'Product Verification', description: 'Field-level verification of all product data' },
  { id: 'packagingInspection', label: 'Packaging', description: 'Carton, retail packaging and product type' },
  { id: 'defects', label: 'Defects', description: 'AQL sampling and defect counts' },
  { id: 'testing', label: 'Testing', description: 'Comprehensive on-site test battery' },
  { id: 'review', label: 'Review', description: 'Full summary and final decision' },
  { id: 'documentation', label: 'Documentation', description: 'Report, signatures and final submit' },
];

export default function ProductInspectionForm({
  productId,
  productName,
  vendorName,
  onComplete,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<Step>('generalInformation');
  const scrollNav = useScrollNav();
  const invalidFields = useInvalidFieldRegistry();
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<AllErrors>({});
  // Physical vs virtual — chosen in the mandatory dialog before the form is usable.
  // Virtual inspections may upload photos from the gallery; physical are camera-only.
  const [inspectionType, setInspectionType] = useState<InspectionType | null>(null);

  // ── Draft / resume state ────────────────────────────────────────────────
  // Held behind `hydrating` until the AsyncStorage read below settles.
  const [hydrating, setHydrating] = useState(true);
  const [isResume, setIsResume] = useState(false);
  const [draftInspectionType, setDraftInspectionType] = useState<InspectionType | null>(null);
  const [discardConfirm, setDiscardConfirm] = useState<{ type: InspectionType } | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // ── Exit-confirmation guard ─────────────────────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // Reason the server refused to start this inspection, if it did. Shown as a
  // dismissible banner; it does not block the form.
  const [startWarning, setStartWarning] = useState<string | null>(null);
  // The admin-booked window has elapsed — blocks the form entirely. Filling it in
  // would be wasted work: the server refuses the submit for the same reason.
  const [expiredError, setExpiredError] = useState<string | null>(null);
  const pendingNavRef = useRef<null | (() => void)>(null);
  const allowLeaveRef = useRef(false);

  const requestExit = (action: () => void) => {
    if (allowLeaveRef.current) {
      action();
      return;
    }
    pendingNavRef.current = action;
    setShowExitConfirm(true);
  };
  const confirmExit = () => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    const action = pendingNavRef.current;
    pendingNavRef.current = null;
    action?.();
  };
  const cancelExit = () => {
    setShowExitConfirm(false);
    pendingNavRef.current = null;
  };

  // ── Resume / draft orchestration ──────────────────────────────────────────
  const persistType = (type: InspectionType) => {
    AsyncStorage.setItem(typeKeyFor(productId), type).catch(() => {});
  };

  // Called from the type dialog. A fresh inspection just starts; a paused resume
  // continues the draft on a matching type, or asks to discard on a different one.
  const handleTypeChosen = (type: InspectionType) => {
    if (!isResume) {
      setInspectionType(type);
      persistType(type);
      return;
    }
    if (type === (draftInspectionType || inspectionType)) {
      // Same type → resume, folding the paused gap into totalPausedMs so the
      // report's active/paused split stays accurate.
      setFormData((prev: any) => {
        const pausedMs = prev.pausedAt ? Math.max(0, Date.now() - new Date(prev.pausedAt).getTime()) : 0;
        return { ...prev, totalPausedMs: (prev.totalPausedMs || 0) + pausedMs, pausedAt: null };
      });
      setIsResume(false);
      setInspectionType(type);
      persistType(type);
      return;
    }
    // Different type → the saved draft cannot carry over; confirm first.
    setDiscardConfirm({ type });
  };

  const confirmDiscardDraft = () => {
    if (!discardConfirm) return;
    const { type } = discardConfirm;
    // Wipe the draft and restart fresh at the current time, keeping only the
    // already-loaded product/vendor context and the inspector's name.
    AsyncStorage.removeItem(draftKeyFor(productId)).catch(() => {});
    setFormData((prev: any) => ({
      ...makeDefaultFormData(productName, vendorName),
      productData: prev.productData,
      vendorData: prev.vendorData,
      inspectorSignature: prev.inspectorSignature,
    }));
    setCurrentStep('generalInformation');
    setReviewMode(false);
    setDiscardConfirm(null);
    setIsResume(false);
    setInspectionType(type);
    persistType(type);
  };

  // Save the half-filled form as a paused draft, then leave. pausedAt marks the
  // pause so the next open re-prompts the inspection type (resume vs restart).
  const saveDraftAndExit = async () => {
    if (savingDraft) return;
    setSavingDraft(true);
    const { productData: _pd, vendorData: _vd, ...rest } = { ...formData, pausedAt: new Date().toISOString() };
    try {
      try {
        await AsyncStorage.setItem(draftKeyFor(productId), JSON.stringify(rest));
      } catch {
        // Over quota with photos — keep the typed work, drop the base64.
        await AsyncStorage.setItem(draftKeyFor(productId), JSON.stringify(stripBase64Deep(rest)));
      }
      showSuccessToast('Draft saved', 'You can resume this inspection later.');
    } catch {
      showErrorToast('Could not save draft', 'Your device storage is full. Try removing some photos.');
      setSavingDraft(false);
      return;
    }
    setSavingDraft(false);
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    const action = pendingNavRef.current;
    pendingNavRef.current = null;
    (action ?? onCancel)?.();
  };

  // Android hardware back → confirm exit (disabled after submit)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowLeaveRef.current) return false;
      requestExit(onCancel);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel]);

  // ── Form data ─────────────────────────────────────────────────────────────
  const prefilledRef = useRef<string | null>(null);
  const startedRef = useRef<string | null>(null);

  // Auto-start the inspection on mount (no selfie / GPS gate). Location is not
  // sent, and a failed start does NOT block the form — submission stays the
  // source of truth, same as before.
  //
  // What changed: the failure is no longer swallowed. The server's reason (most
  // often a geofence block, now measured against the vendor's factory AND
  // warehouse) is kept in state and shown as a dismissible banner. Silently
  // discarding it meant the checker filled all seven steps and only discovered
  // the block at submit.
  useEffect(() => {
    if (!productId || startedRef.current === productId) return;
    startedRef.current = productId;
    qcCheckerService.startProductInspection(productId).catch((err: any) => {
      // "Location required" is the server answering the fact that this call
      // deliberately sends no GPS — not a real problem the checker can act on.
      // Surfacing it would fire on every single inspection. A genuine geofence
      // rejection ("Location mismatch") means the server DID measure a position
      // and refused it, and that is worth showing.
      if (err?.data?.error === 'Location required') return;
      // The booked window has passed (409 INSPECTION_EXPIRED). This is a hard
      // block, not a warning — the same rule rejects the submit.
      if (err?.data?.code === 'INSPECTION_EXPIRED' || err?.status === 409) {
        setExpiredError(err?.message || 'This inspection can no longer be started.');
        return;
      }
      const detail =
        err?.distanceMeters != null
          ? ` You are ${Math.round(err.distanceMeters)}m away; the limit is ${err.thresholdMeters ?? 1000}m.`
          : '';
      setStartWarning(
        (err?.message || 'The server could not confirm the start of this inspection.') + detail,
      );
    });
  }, [productId]);

  const [formData, setFormData] = useState<any>(() => makeDefaultFormData(productName, vendorName));

  // ── Draft restore ─────────────────────────────────────────────────────────
  // AsyncStorage is async, so unlike the web portal (synchronous localStorage in
  // a useState initializer) the draft cannot be read before the first render.
  // The form is held behind a spinner until this settles — otherwise the blank
  // defaults would flash, and the debounced save below would race the restore
  // and overwrite the draft with an empty form.
  useEffect(() => {
    let cancelled = false;
    if (!productId) return;
    (async () => {
      try {
        const [rawType, rawDraft] = await Promise.all([
          AsyncStorage.getItem(typeKeyFor(productId)),
          AsyncStorage.getItem(draftKeyFor(productId)),
        ]);
        if (cancelled) return;

        const savedType = rawType === 'PHYSICAL' || rawType === 'VIRTUAL' ? (rawType as InspectionType) : null;
        let draft: any = null;
        if (rawDraft) {
          try {
            draft = JSON.parse(rawDraft);
          } catch {
            draft = null; // malformed draft — start clean rather than crash
          }
        }
        if (draft) setFormData((prev: any) => ({ ...prev, ...draft }));

        setDraftInspectionType(savedType);
        // A draft the checker explicitly paused re-asks the type on resume; a
        // plain reopen keeps the saved choice silently.
        const paused = !!draft?.pausedAt;
        setIsResume(paused);
        setInspectionType(paused ? null : savedType);
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  // ── Draft persistence — debounced write on every change ───────────────────
  useEffect(() => {
    if (!productId || hydrating || allowLeaveRef.current) return;
    const t = setTimeout(() => {
      // Re-check on fire, not just on schedule: a submit or an explicit
      // save-draft-and-exit can land inside the debounce window, and this write
      // would otherwise resurrect the draft we just deleted, or clear the
      // pausedAt we just stamped.
      if (allowLeaveRef.current) return;
      // productData/vendorData are re-fetched on open, so they are not worth the
      // quota. Photos are, until the snapshot no longer fits.
      const { productData: _pd, vendorData: _vd, ...rest } = formData;
      AsyncStorage.setItem(draftKeyFor(productId), JSON.stringify(rest)).catch(() => {
        AsyncStorage.setItem(draftKeyFor(productId), JSON.stringify(stripBase64Deep(rest))).catch(() => {});
      });
    }, 400);
    return () => clearTimeout(t);
  }, [productId, formData, hydrating]);

  // ── Autofill from API ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    // Wait for the draft restore, otherwise this merge lands on the blank
    // defaults and is then overwritten when the draft arrives.
    if (!productId || hydrating || prefilledRef.current === productId) return;

    (async () => {
      const cached = await qcCheckerService.getCheckerData();
      if (cached?.name && !cancelled) {
        setFormData((prev: any) => ({
          ...prev,
          inspectorSignature: prev.inspectorSignature || formatCheckerName(cached),
        }));
      }

      try {
        const res = await qcCheckerService.getProductDetails(productId);
        if (cancelled || !res?.success) return;
        const product = res.data.product;
        const v = product?.vendor || {};

        // Second guard, independent of the start call: the products list can push
        // straight here without a window check, because its endpoint does not
        // return qcAssignment. This detail response does.
        const sched = product?.qcAssignment || {};
        if (isInspectionWindowElapsed(sched.scheduledDate, sched.scheduledTime, sched.estimatedDuration)) {
          setExpiredError(
            `This inspection can no longer be started — its scheduled window (${formatAssignmentWindow(
              sched.scheduledDate,
              sched.scheduledTime,
              sched.estimatedDuration,
            )}) has already ended. Please ask the admin to schedule a new assignment.`,
          );
        }

        setFormData((prev: any) => ({
          ...prev,
          vendor: prev.vendor || v.companyName || vendorName,
          vendorData: v,
          productData: product,
          inspectorSignature: product?.assignedQc ? formatCheckerName(product.assignedQc) : prev.inspectorSignature,
        }));

        prefilledRef.current = productId;
      } catch (err) {
        if (!cancelled) console.error('PI autofill failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, vendorName, hydrating]);

  // Reset the scroll-nav position whenever the active step changes, since each
  // step mounts its own ScrollView starting at the top.
  useEffect(() => {
    scrollNav.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // ── Scroll to the field that failed ───────────────────────────────────────
  // Mirrors the web form: jump to the exact field that blocked Next and pulse a
  // red ring, instead of leaving the checker to hunt for it. The node is polled
  // rather than read once — the step still has to render (and Testing has to
  // expand the collapsed group holding the failing test) before it registers.
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToFirstError = (stepErrors: Record<string, string>) => {
    const key = Object.keys(stepErrors)[0];
    if (!key) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    invalidFields.flash(key);

    let attempts = 0;
    const tryScroll = async () => {
      const node = invalidFields.getNode(key);
      if (node && (await scrollNav.scrollToNode(node))) return;
      if (attempts++ < 8) {
        scrollTimer.current = setTimeout(tryScroll, 80);
        return;
      }
      // The step never marked a specific field — the error banner is at the top.
      scrollNav.scrollToTop();
    };
    scrollTimer.current = setTimeout(tryScroll, 60);
  };

  useEffect(
    () => () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    [],
  );

  // Tell the checker how many fields still need attention, matching the web
  // portal's "N fields need to be completed" toast.
  //
  // Web counts the DOM nodes it marked data-invalid, because several of its steps
  // collapse many missing fields into a single error string. Our validators keep
  // one entry per field, so the error object itself is the accurate count and no
  // registry walk is needed.
  const announceMissing = (count: number) => {
    const n = Math.max(count, 1);
    showErrorToast(
      `${n} ${n === 1 ? 'field needs' : 'fields need'} to be completed`,
      'The required fields are highlighted — jumping to the first one.',
    );
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextStep = () => {
    const stepErrors = validateStep(currentStep, formData);
    setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }));
    if (hasErrors(stepErrors)) {
      announceMissing(countErrors(stepErrors));
      scrollToFirstError(stepErrors);
      return;
    }

    if (reviewMode) {
      setReviewMode(false);
      setCurrentStep('review');
      return;
    }

    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (reviewMode) {
      setReviewMode(false);
      setCurrentStep('review');
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const goToStep = (target: Step) => {
    const targetIndex = STEPS.findIndex((s) => s.id === target);
    if (targetIndex === -1 || targetIndex === currentStepIndex) return;
    const stepErrors = validateStep(currentStep, formData);
    setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }));
    setReviewMode(false);
    setCurrentStep(target);
  };

  // Called by Review step's Edit buttons
  const handleEditStep = (stepId: string) => {
    setReviewMode(true);
    setCurrentStep(stepId as Step);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const cleanPhotos = (photos: any[]) => {
    if (!photos) return [];
    return photos.map((p) => ({ name: p.name || 'image.jpg', data: p.data || p.uri || p.url || null }));
  };

  const handleSubmit = async () => {
    const all = validateAll(formData);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const firstInvalid = STEPS.find((s) => all[s.id])?.id;
      if (firstInvalid) {
        setReviewMode(false);
        setCurrentStep(firstInvalid);
        // The step is about to swap, so its fields have not registered yet —
        // scrollToFirstError polls, which covers the remount.
        scrollToFirstError(all[firstInvalid]!);
      }
      announceMissing(countAllErrors(all));
      return;
    }

    setSubmitting(true);
    try {
      // Stamp the completion time and fold any still-open pause into totalPausedMs
      // so the report's active/paused/total split is accurate. These ride along in
      // the payload → persisted into the product's qcInspectionData.
      const completedIso = new Date().toISOString();
      const openPauseMs = formData.pausedAt
        ? Math.max(0, Date.now() - new Date(formData.pausedAt).getTime())
        : 0;

      const cleanedData = {
        ...formData,
        inspectionCompletedAt: completedIso,
        totalPausedMs: (formData.totalPausedMs || 0) + openPauseMs,
        pausedAt: null,
        packagingPhotos: cleanPhotos(formData.packagingPhotos),
        productEvidencePhotos: cleanPhotos(formData.productEvidencePhotos),
        defectPhotos: cleanPhotos(formData.defectPhotos),
        documentationPhotos: cleanPhotos(formData.documentationPhotos),
        photocopyDocuments: cleanPhotos(formData.photocopyDocuments),
        companyIdCards: cleanPhotos(formData.companyIdCards),
        signedDocuments: cleanPhotos(formData.signedDocuments),
        signedReport: cleanPhotos(formData.signedReport),
        testGroups: (formData.testGroups || []).map((g: any) => ({
          ...g,
          tests: (g.tests || []).map((t: any) => ({
            ...t,
            rightPhotos: cleanPhotos(t.rightPhotos),
            wrongPhotos: cleanPhotos(t.wrongPhotos),
          })),
        })),
        additionalEvidence: Object.fromEntries(
          Object.entries(formData.additionalEvidence || {}).map(([k, v]) => [k, cleanPhotos(v as any[])]),
        ),
      };

      // Route on the checker's ACTUAL decision from the Review step
      // (inspectionStatus). Only an explicit "Rejected" hits the reject
      // endpoint; everything else goes through approve, which derives the
      // final approvalStatus from inspectionStatus on the backend.
      const type = inspectionType ?? 'PHYSICAL';
      if (formData.inspectionStatus === 'Rejected') {
        const reason = (formData.reviewerRemarks || '').trim() || 'Rejected during QC product inspection';
        await qcCheckerService.rejectProduct(productId, reason, cleanedData, null, type);
      } else {
        await qcCheckerService.approveProduct(productId, cleanedData, null, type);
      }

      allowLeaveRef.current = true;
      // Submitted — the draft has served its purpose and must not resurface.
      await AsyncStorage.multiRemove([draftKeyFor(productId), typeKeyFor(productId)]).catch(() => {});
      showSuccessToast('Success', 'Product inspection submitted successfully.');
      onComplete();
    } catch (error: any) {
      showErrorToast('Submission Failed', error.message || 'Unable to submit inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStepContent = () => {
    const props = { formData, setFormData, scrollNav: scrollNav.handlers, inspectionType };
    switch (currentStep) {
      case 'generalInformation':
        return <PI_Step1_GeneralInfo {...props} errors={errors.generalInformation || {}} />;
      case 'productVerification':
        return <PI_Step2_ProductVerification {...props} errors={errors.productVerification || {}} />;
      case 'packagingInspection':
        return <PI_Step3_PackagingInspection {...props} errors={errors.packagingInspection || {}} />;
      case 'defects':
        return <Defects {...props} errors={errors.defects || {}} />;
      case 'testing':
        return <PI_Step5_Testing {...props} errors={errors.testing || {}} />;
      case 'review':
        return <PI_Step6_Review {...props} onEditStep={handleEditStep} errors={errors.review || {}} />;
      case 'documentation':
        return <Documentation {...props} errors={errors.documentation || {}} />;
      default:
        return null;
    }
  };

  // Booked window has elapsed — the form is unusable, so don't render it at all.
  if (expiredError) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-6">
        <View className="w-14 h-14 rounded-full bg-amber-50 items-center justify-center mb-4">
          <AlarmClockOff size={28} color="#d97706" />
        </View>
        <Text className="text-lg font-bold text-slate-900 text-center">Inspection Window Expired</Text>
        <Text className="text-sm text-slate-600 text-center leading-relaxed mt-2">{expiredError}</Text>
        <TouchableOpacity
          onPress={onCancel}
          className="mt-6 px-5 py-2.5 rounded-xl bg-brand-500 items-center self-stretch"
        >
          <Text className="text-white font-semibold text-sm">Back to Products</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Reading the saved draft — hold the form back rather than flash a blank one.
  if (hydrating) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#e01a1b" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Mandatory type selection — shown until the checker chooses, and re-asked
          when resuming a paused draft. Cancelling backs out of the inspection. */}
      {!inspectionType && !discardConfirm && (
        <InspectionTypeDialog
          subjectName={productName}
          onSelect={handleTypeChosen}
          onCancel={onCancel}
        />
      )}

      {/* Discard-draft confirmation — shown when resuming with a DIFFERENT type
          than the saved draft, which cannot be carried over. */}
      <Modal visible={!!discardConfirm} transparent animationType="fade" onRequestClose={() => setDiscardConfirm(null)}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={() => setDiscardConfirm(null)}>
          <Pressable className="bg-white rounded-2xl overflow-hidden w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            <View className="p-5 flex-row items-start">
              <View className="w-11 h-11 rounded-full bg-amber-50 items-center justify-center mr-3">
                <AlertTriangle size={22} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Discard saved draft?</Text>
                <Text className="text-sm text-slate-600 mt-1">
                  You saved this inspection as a{' '}
                  <Text className="font-bold">{(draftInspectionType || '').toLowerCase()}</Text> inspection.
                  Switching to <Text className="font-bold">{(discardConfirm?.type || '').toLowerCase()}</Text> will{' '}
                  <Text className="font-bold text-amber-700">discard the saved draft</Text> and start a fresh
                  inspection at the current time.
                </Text>
              </View>
            </View>
            <View className="flex-row px-5 py-4 bg-slate-50 border-t border-slate-100" style={{ columnGap: 12 }}>
              <TouchableOpacity
                onPress={() => setDiscardConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center"
              >
                <Text className="text-slate-700 font-semibold text-sm">Go back</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDiscardDraft} className="flex-1 py-2.5 rounded-xl bg-amber-500 items-center">
                <Text className="text-white font-semibold text-sm">Discard & start fresh</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View className="px-4 pt-2 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => requestExit(onCancel)} className="mr-3 p-1">
          <ArrowLeft size={22} color="#334155" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            Product Inspection
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {productName}
            {vendorName ? ` · ${vendorName}` : ''}
          </Text>
        </View>
      </View>

      {reviewMode && (
        <View className="mx-4 mb-2 flex-row items-center bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
          <RotateCcw size={14} color="#c41617" />
          <Text className="text-xs font-medium text-brand-700 ml-2">
            Editing from Review — tap Save & Continue to return.
          </Text>
        </View>
      )}

      {!!startWarning && (
        <View className="mx-4 mb-2 flex-row items-start bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <MapPin size={14} color="#b45309" style={{ marginTop: 2 }} />
          <View className="flex-1 ml-2">
            <Text className="text-xs font-bold text-amber-800">Inspection not confirmed by the server</Text>
            <Text className="text-xs text-amber-800 mt-0.5">{startWarning}</Text>
          </View>
          <TouchableOpacity onPress={() => setStartWarning(null)} hitSlop={8} className="ml-2 p-0.5">
            <X size={14} color="#b45309" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step Indicator */}
      <View className="px-4 pt-1 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row" style={{ columnGap: 4 }}>
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isPast = currentStepIndex > index;
              const stepHasErrors = hasErrors(errors[step.id]);
              return (
                <TouchableOpacity
                  key={step.id}
                  className={`flex-row items-center px-3 py-2 rounded-full ${
                    stepHasErrors ? 'bg-red-50' : isActive ? 'bg-brand-50' : isPast ? 'bg-green-50' : 'bg-gray-100'
                  }`}
                  onPress={() => goToStep(step.id)}
                >
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center mr-1.5 ${
                      stepHasErrors ? 'bg-red-500' : isActive ? 'bg-brand-500' : isPast ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    {stepHasErrors ? (
                      <Text className="text-[9px] text-white font-bold">!</Text>
                    ) : isPast ? (
                      <Check size={10} color="#fff" />
                    ) : (
                      <Text className="text-[9px] text-white font-bold">{index + 1}</Text>
                    )}
                  </View>
                  <Text
                    className={`text-xs font-medium ${
                      stepHasErrors ? 'text-red-600' : isActive ? 'text-brand-700' : isPast ? 'text-green-700' : 'text-gray-500'
                    }`}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Step title/description */}
      <View className="px-4 pb-2">
        <Text className="text-[11px] text-slate-500">
          Step {currentStepIndex + 1} of {STEPS.length} · {STEPS[currentStepIndex].description}
        </Text>
      </View>

      {/* Form Content */}
      <View className="flex-1 px-4">
        <PIValidationProvider register={invalidFields.register} flashKey={invalidFields.flashKey}>
          {renderStepContent()}
        </PIValidationProvider>
        <ScrollNavButton nav={scrollNav} />
      </View>

      {/* Bottom Navigation */}
      <View
        className="px-4 pt-3 border-t border-gray-200 bg-gray-50 flex-row items-center justify-between"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}
      >
        <TouchableOpacity
          className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white flex-row items-center"
          onPress={prevStep}
          disabled={currentStepIndex === 0 && !reviewMode}
          style={{ opacity: currentStepIndex === 0 && !reviewMode ? 0.4 : 1 }}
        >
          <ArrowLeft size={16} color="#374151" />
          <Text className="text-gray-700 font-medium text-sm ml-1">{reviewMode ? 'Back to Review' : 'Previous'}</Text>
        </TouchableOpacity>

        {isLastStep && !reviewMode ? (
          <TouchableOpacity
            className="flex-row items-center px-5 py-2.5 bg-emerald-600 rounded-xl"
            onPress={() => handleSubmit()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm ml-1">Submit Inspection</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="flex-row items-center px-5 py-2.5 bg-brand-500 rounded-xl" onPress={nextStep}>
            <Text className="text-white font-semibold text-sm mr-1">{reviewMode ? 'Save & Continue' : 'Next'}</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Exit-confirmation modal */}
      <Modal visible={showExitConfirm} transparent animationType="fade" onRequestClose={cancelExit}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={cancelExit}>
          <Pressable className="bg-white rounded-2xl overflow-hidden w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            <View className="p-5 flex-row items-start">
              <View className="w-11 h-11 rounded-full bg-brand-50 items-center justify-center mr-3">
                <AlertTriangle size={22} color="#e01a1b" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Exit inspection?</Text>
                <Text className="text-sm text-slate-600 mt-1">
                  {inspectionType
                    ? 'You can save your progress as a draft and resume this inspection later, or exit without saving.'
                    : "Are you sure you want to exit? Your inspection progress will be lost and won't be saved."}
                </Text>
              </View>
            </View>
            <View className="px-5 py-4 bg-slate-50 border-t border-slate-100" style={{ rowGap: 12 }}>
              {!!inspectionType && (
                <TouchableOpacity
                  onPress={saveDraftAndExit}
                  disabled={savingDraft}
                  className="flex-row py-2.5 rounded-xl bg-brand-500 items-center justify-center"
                  style={{ columnGap: 8, opacity: savingDraft ? 0.7 : 1 }}
                >
                  {savingDraft ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
                  <Text className="text-white font-semibold text-sm">
                    {savingDraft ? 'Saving draft…' : 'Save draft & exit'}
                  </Text>
                </TouchableOpacity>
              )}
              <View className="flex-row" style={{ columnGap: 12 }}>
                <TouchableOpacity
                  onPress={cancelExit}
                  disabled={savingDraft}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center"
                  style={{ opacity: savingDraft ? 0.5 : 1 }}
                >
                  <Text className="text-slate-700 font-semibold text-sm">Keep editing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmExit}
                  disabled={savingDraft}
                  className="flex-1 py-2.5 rounded-xl border border-red-200 bg-white items-center"
                  style={{ opacity: savingDraft ? 0.5 : 1 }}
                >
                  <Text className="text-red-600 font-semibold text-sm">Exit without saving</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
