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
  AlarmClockOff,
  MapPin,
} from 'lucide-react-native';
import qcCheckerService from '../../../services/qcCheckerService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

import { HighlightFieldsProvider, Verifications } from '../../../components/Vendor/Steps/VI_VerifyField';
import VI_Step1_CompanyInfo from '../../../components/Vendor/Steps/VI_Step1_CompanyInfo';
import VI_Step2_WarehouseFactory, { FactoryEvidenceState } from '../../../components/Vendor/Steps/VI_Step2_WarehouseFactory';
import VI_Step3_OwnerProfile from '../../../components/Vendor/Steps/VI_Step3_OwnerProfile';
import VI_Step4_VendorType from '../../../components/Vendor/Steps/VI_Step4_VendorType';
import VI_Step5_Manufacturing from '../../../components/Vendor/Steps/VI_Step5_Manufacturing';
import VI_Step6_Certifications from '../../../components/Vendor/Steps/VI_Step6_Certifications';
import VI_Step7_ContactTrade from '../../../components/Vendor/Steps/VI_Step7_ContactTrade';
import VI_Step8_FinalReview, { InspectorMeta } from '../../../components/Vendor/Steps/VI_Step8_FinalReview';
import VI_Step9_Documentation, { VendorDocData } from '../../../components/Vendor/Steps/VI_Step9_Documentation';
import { validateStep, validateForSubmit } from '../../../components/Vendor/validation';
import { formatCheckerName } from '../../../components/Vendor/Steps/fieldHelpers';
import InspectionTypeDialog, { type InspectionType } from '@/components/Products/InspectionTypeDialog';
import { isInspectionWindowElapsed } from '@/lib/inspectionSchedule';
import { GEOFENCE_DISABLED, getCurrentCoords, captureCoordsForSubmit, type CheckerCoords } from '@/lib/checkerLocation';

const STEPS = [
  { id: 1, label: 'Company Info' },
  { id: 2, label: 'Warehouse' },
  { id: 3, label: 'Owner' },
  { id: 4, label: 'Vendor & Products' },
  { id: 5, label: 'Manufacturing' },
  { id: 6, label: 'Certifications' },
  { id: 7, label: 'Contact & Trade' },
  { id: 8, label: 'Final Review' },
  { id: 9, label: 'Documentation' },
];

const draftKey = (inspectionId: string) => `vendorInspectionDraft:${inspectionId}`;

export default function VendorInspectionScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<{
    type: 'not_assigned' | 'submitted' | 'unknown' | 'expired' | 'location';
    message: string;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    distanceMeters?: number | null;
    thresholdMeters?: number | null;
  } | null>(null);

  // Physical vs virtual — chosen in the mandatory dialog before the form is usable,
  // or read back from an inspection that was already started. The backend skips the
  // geofence for VIRTUAL, so this is what lets an off-site inspection submit at all.
  const [inspectionType, setInspectionType] = useState<InspectionType | null>(null);
  // Inspection id awaiting a type choice → drives the mandatory dialog. Set for a
  // SCHEDULED (never-started) inspection AND when resuming an IN_PROGRESS one.
  //
  // This must NOT be derived from `inspection.inspectionType`: that column defaults
  // to PHYSICAL in the schema, so a never-started inspection already reads
  // 'PHYSICAL' and the dialog would never open — the checker could never choose
  // Virtual. Web keys off the STATUS for exactly this reason.
  const [typeDialogFor, setTypeDialogFor] = useState<string | null>(null);
  // Resume/draft state. Re-entering an already-started inspection re-asks the type:
  // the same type resumes the saved draft, a different one discards it and restarts.
  const [isResume, setIsResume] = useState(false);
  const [draftInspectionType, setDraftInspectionType] = useState<InspectionType | null>(null);
  const [discardConfirm, setDiscardConfirm] = useState<{ inspId: string; type: InspectionType } | null>(null);
  // GPS captured at start, reused at submit so the checker is prompted once.
  const [checkerCoords, setCheckerCoords] = useState<CheckerCoords | null>(null);
  // Remember the last start attempt so the location card can offer a retry once the
  // checker has moved closer to the site.
  const lastStartRef = useRef<{ inspId: string; type: InspectionType; discardDraft: boolean } | null>(null);

  const [vendor, setVendor] = useState<any>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [inspectionId, setInspectionId] = useState<string | null>(null);
  // Ref mirror: the exit guards are registered once and would otherwise close
  // over the id from the first render, when it is still null.
  const inspectionIdRef = useRef<string | null>(null);
  const [cycleNumber, setCycleNumber] = useState(1);
  const [previousRejectionReason, setPreviousRejectionReason] = useState<string | null>(null);

  // Client-side fallback for the report's "Inspection Start Time": the backend
  // only stamps inspection.startedAt on the SCHEDULED→IN_PROGRESS transition, so
  // it can be null. Capture when the checker opened this form so the time always
  // shows on the generated report.
  const formOpenedAtRef = useRef<string>(new Date().toISOString());

  const [verifications, setVerifications] = useState<Verifications>({});
  const [meta, setMeta] = useState<InspectorMeta>({
    inspectorName: '',
    // Local date, not UTC (F-09) — toISOString() rolls back a day for IST
    // before 05:30, dating the inspection to yesterday.
    inspectionDate: new Date().toLocaleDateString('en-CA'),
    overallResult: '',
    inspectorRemarks: '',
  });
  // Six slots, not three: the Warehouse trio is required whenever the warehouse
  // address differs from the Legal Address & Factory Site (mirrors web).
  const [factoryEvidence, setFactoryEvidence] = useState<FactoryEvidenceState>({
    frontView: null,
    nameBoard: null,
    routeMap: null,
    warehouseFrontView: null,
    warehouseNameBoard: null,
    warehouseRouteMap: null,
  });
  const [evidenceError, setEvidenceError] = useState(false);
  const [docData, setDocData] = useState<VendorDocData>({
    signedDocuments: [],
    signedReport: [],
    clientSignature: '',
  });

  // Registered verification keys for the currently mounted step
  const registeredFieldsRef = useRef<string[]>([]);
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set());

  // Set once the chosen type has been sent to the server, so a re-render can't
  // fire a second start for the same inspection.
  const startedRef = useRef(false);

  // ── Exit guard state ────────────────────────────────────────────────
  const allowLeaveRef = useRef(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const pendingNavActionRef = useRef<null | (() => void)>(null);
  const dirtyRef = useRef(false);
  const contentScrollRef = useRef<ScrollView>(null);
  const scrollToTop = () => contentScrollRef.current?.scrollTo({ y: 0, animated: true });

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
          inspectionIdRef.current = insp.id;
          // Client-side deadline check, so a lapsed window blocks before the
          // checker fills nine steps and the submit is refused.
          if (isInspectionWindowElapsed(insp.scheduledDate, insp.scheduledTime, insp.estimatedDuration)) {
            setLoadError({
              type: 'expired',
              message:
                'This inspection can no longer be started because its scheduled date and time have already passed.',
              scheduledDate: insp.scheduledDate,
              scheduledTime: insp.scheduledTime,
            });
            return;
          }
          if (insp.cycleNumber > 1) setCycleNumber(insp.cycleNumber);
          if ((inspRes as any)?.previousRejectionReason) setPreviousRejectionReason((inspRes as any).previousRejectionReason);
          else if (insp.rejectionReason) setPreviousRejectionReason(insp.rejectionReason);

          // Ask (or re-ask) how this inspection is being carried out. A SCHEDULED
          // row has never been started, so its stored type is just the schema
          // default and the checker still has the choice. An IN_PROGRESS row is a
          // resume: re-ask, and remember what the draft was saved under so a
          // change of mind can offer to discard it.
          const storedType: InspectionType = insp.inspectionType === 'VIRTUAL' ? 'VIRTUAL' : 'PHYSICAL';
          if (insp.status === 'SCHEDULED') {
            setIsResume(false);
            setTypeDialogFor(insp.id);
          } else {
            setInspectionType(storedType);
            if (insp.status === 'IN_PROGRESS') {
              setDraftInspectionType(storedType);
              setIsResume(true);
              setTypeDialogFor(insp.id);
            }
          }

          // Restore a saved draft. The on-device copy wins because it is written
          // continuously and is therefore never older than the server's, which is
          // only pushed on exit. The server copy is the fallback that makes a
          // draft survive a reinstall or a switch to another device.
          try {
            let draft: any = null;
            const raw = await AsyncStorage.getItem(draftKey(insp.id));
            if (raw) {
              try {
                draft = JSON.parse(raw);
              } catch {
                draft = null; // malformed local draft — fall through to the server copy
              }
            }
            if (!draft && insp.draftData && typeof insp.draftData === 'object') {
              draft = insp.draftData;
            }
            if (draft && !cancelled) {
              if (draft.verifications) setVerifications(draft.verifications);
              if (draft.meta) setMeta((prev) => ({ ...prev, ...draft.meta, inspectorName: prev.inspectorName || draft.meta.inspectorName }));
              if (draft.factoryEvidence) setFactoryEvidence(draft.factoryEvidence);
              if (draft.docData) setDocData(draft.docData);
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

  // Wipe the form back to a blank inspection — used when a different type is
  // chosen on resume, so the saved draft is discarded and we start fresh.
  const resetForm = useCallback(
    (inspId: string) => {
      setVerifications({});
      setMeta((prev) => ({ ...prev, overallResult: '', inspectorRemarks: '' }));
      setFactoryEvidence({
        frontView: null, nameBoard: null, routeMap: null,
        warehouseFrontView: null, warehouseNameBoard: null, warehouseRouteMap: null,
      });
      setDocData({ signedDocuments: [], signedReport: [], clientSignature: '' });
      setStep(1);
      AsyncStorage.removeItem(draftKey(inspId)).catch(() => {});
    },
    [],
  );

  // Start the inspection with the chosen type. PHYSICAL captures the device
  // position first — the backend geofences it and answers 400 "Location required"
  // when nothing is sent, so a physical inspection genuinely cannot start without
  // it. VIRTUAL (and the geofence escape hatch) sends explicit nulls. Failures are
  // not swallowed: an expired window or a geofence rejection blocks here rather
  // than at submit, after nine steps of work.
  const startInspection = useCallback(
    async (inspId: string, type: InspectionType, discardDraft = false) => {
      if (!inspId) return;
      lastStartRef.current = { inspId, type, discardDraft };
      try {
        let coords: CheckerCoords | null = null;
        if (type !== 'VIRTUAL' && !GEOFENCE_DISABLED) {
          coords = await getCurrentCoords();
          setCheckerCoords(coords);
        }
        const res = await qcCheckerService.startInspection(inspId, coords, type, discardDraft);
        if (res?.inspection) setInspection(res.inspection);
      } catch (err: any) {
        const msg: string = err?.message || '';
        if (err?.code === 'INSPECTION_EXPIRED' || err?.status === 409) {
          setLoadError({
            type: 'expired',
            message: msg || 'This inspection can no longer be started.',
            scheduledDate: inspection?.scheduledDate,
            scheduledTime: inspection?.scheduledTime,
          });
          return;
        }
        if (err?.status === 400 && /already/i.test(msg)) return; // already started
        // Geofence block — outside the radius of BOTH registered addresses (403),
        // or no GPS reached the server (400). Both get the persistent card with a
        // retry, not a toast that scrolls away.
        const isLocationBlock =
          (err?.status === 403 && /location|within\s*\d+\s*m|registered locations|nearest/i.test(msg)) ||
          (err?.status === 400 && /location/i.test(msg)) ||
          err?.data?.error === 'Location required';
        if (isLocationBlock) {
          setLoadError({
            type: 'location',
            message: msg || "Your current location could not be verified against the vendor's registered locations.",
            distanceMeters: err?.distanceMeters ?? null,
            thresholdMeters: err?.thresholdMeters ?? null,
          });
          return;
        }
        // Device-side GPS failures (permission denied, services off, timeout) carry
        // no HTTP status — they are actionable, so say so instead of failing mute.
        if (!err?.status) {
          showErrorToast('Could not start inspection', msg || 'Please enable location services and try again.');
          return;
        }
        showErrorToast('Could not start inspection', msg || 'Please try again.');
      }
    },
    [inspection],
  );

  // Entry point from the type dialog. A fresh inspection starts immediately; a
  // resume continues the draft when the type matches, or asks to discard it.
  const handleTypeChosen = (inspId: string, type: InspectionType) => {
    if (isResume) {
      const draftType = draftInspectionType || inspectionType;
      if (type === draftType) {
        setTypeDialogFor(null);
        setIsResume(false);
        setInspectionType(type);
        startedRef.current = true;
        startInspection(inspId, type, false);
      } else {
        // Different type — confirm discarding the saved draft first.
        setDiscardConfirm({ inspId, type });
      }
      return;
    }
    setTypeDialogFor(null);
    setInspectionType(type);
    startedRef.current = true;
    startInspection(inspId, type, false);
  };

  const confirmDiscardDraft = () => {
    if (!discardConfirm) return;
    const { inspId, type } = discardConfirm;
    setDiscardConfirm(null);
    setTypeDialogFor(null);
    resetForm(inspId);
    setIsResume(false);
    setInspectionType(type);
    startedRef.current = true;
    startInspection(inspId, type, true);
  };

  // Retry the last start attempt after the checker moves closer to the site.
  const retryLocationStart = () => {
    const attempt = lastStartRef.current;
    setLoadError(null);
    if (attempt) startInspection(attempt.inspId, attempt.type, attempt.discardDraft);
  };

  // ── Draft persistence — debounced write on every change ─────────────
  useEffect(() => {
    if (!inspectionId || loading || allowLeaveRef.current) return;
    const t = setTimeout(() => {
      // Re-check on fire: "Exit without saving" deletes the draft and leaves, and a
      // timer scheduled just before that would otherwise write it straight back.
      if (allowLeaveRef.current) return;
      AsyncStorage.setItem(
        draftKey(inspectionId),
        JSON.stringify({ verifications, meta, factoryEvidence, docData, step }),
      ).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [inspectionId, verifications, meta, factoryEvidence, docData, step, loading]);

  // ── Exit guard — navigation-away (beforeRemove) + Android hardware back ──
  // Prompt whenever an inspection is open — not only once a field has been
  // touched, which is what `dirtyRef` used to gate this on. Leaving early still
  // matters: the clock is already running server-side, and only "Save draft &
  // exit" stamps `pausedAt`, so a silent exit counts the break as working time.
  // Web guards the same way (any exit goes through the dialog).
  const shouldGuardExit = () => !allowLeaveRef.current && !!inspectionIdRef.current;

  useEffect(() => {
    const sub = (navigation as any).addListener?.('beforeRemove', (e: any) => {
      if (!shouldGuardExit()) return;
      e.preventDefault();
      pendingNavActionRef.current = () => (navigation as any).dispatch(e.data.action);
      setShowExitConfirm(true);
    });
    return sub;
  }, [navigation]);

  useEffect(() => {
    const onBack = () => {
      if (!shouldGuardExit()) return false;
      pendingNavActionRef.current = () => router.back();
      setShowExitConfirm(true);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, []);

  const leaveNow = () => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    const action = pendingNavActionRef.current;
    pendingNavActionRef.current = null;
    if (action) action();
    else router.back();
  };

  /**
   * Push the half-filled form to the server, then leave.
   *
   * The local AsyncStorage draft already survives an exit on this device, so the
   * server call is not what saves the work — it is what tells the backend the
   * inspection is PAUSED. Without it `pausedAt` is never stamped, the pause gap
   * never lands in `totalPausedMs`, and the report's active-vs-paused duration
   * counts the checker's break as working time.
   *
   * A failed sync is therefore not worth trapping the checker for: warn, and let
   * them out on the local draft.
   */
  const saveDraftAndExit = async () => {
    if (savingDraft) return;
    if (!inspectionId) {
      leaveNow();
      return;
    }
    setSavingDraft(true);
    try {
      await qcCheckerService.saveInspectionDraft(inspectionId, {
        verifications, meta, factoryEvidence, docData, step,
      });
      showSuccessToast('Draft saved', 'You can resume this inspection later.');
    } catch {
      showErrorToast('Saved on this device only', 'Could not sync the draft — resume it on this phone.');
    } finally {
      setSavingDraft(false);
      leaveNow();
    }
  };

  /**
   * Leave and keep nothing from this sitting.
   *
   * Unlike web — where exiting without saving simply drops in-memory state — this
   * screen writes a local draft on every change, so the on-device copy has to be
   * deleted too. Otherwise the next open would silently restore the work the
   * checker just chose to throw away. Any draft they saved to the server earlier
   * is left alone: that was an explicit save, and it becomes what resumes.
   */
  const exitWithoutSaving = async () => {
    if (savingDraft) return;
    allowLeaveRef.current = true; // stop the debounced writer before we delete
    if (inspectionId) {
      await AsyncStorage.removeItem(draftKey(inspectionId)).catch(() => {});
    }
    dirtyRef.current = false;
    leaveNow();
  };

  const cancelExit = () => {
    setShowExitConfirm(false);
    pendingNavActionRef.current = null;
  };

  // ── Navigation between steps ────────────────────────────────────────
  const goNext = () => {
    // `vendor` is what tells validateStep whether the warehouse address differs
    // from the factory — omitting it silently skipped the three Warehouse evidence
    // photos the web form requires in that case.
    const result = validateStep(step, registeredFieldsRef.current, verifications, factoryEvidence, vendor);
    if (!result.ok) {
      if (result.missingEvidence) {
        setEvidenceError(true);
        scrollToTop();
        Alert.alert('Evidence photo required', result.message || 'Upload at least one evidence photo.');
        return;
      }
      setHighlightedKeys(new Set(result.unverified));
      scrollToTop();
      Alert.alert('Verification incomplete', result.message || 'Please verify all fields before continuing.');
      return;
    }
    if (step === 8) {
      // Final Review: overall result and overall remarks are both mandatory
      // before advancing to the Documentation step.
      if (!meta.overallResult) {
        Alert.alert('Overall result required', 'Please select an overall inspection result before continuing.');
        return;
      }
      if (!meta.inspectorRemarks.trim()) {
        Alert.alert('Overall remarks required', 'Please enter your overall inspector remarks before continuing.');
        return;
      }
    }
    setEvidenceError(false);
    setHighlightedKeys(new Set());
    if (step < STEPS.length) setStep((s) => s + 1);
  };

  const goPrev = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  // When the step changes, reset the form scroll to the top so each step
  // starts from its heading (not wherever the previous step was scrolled).
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ y: 0, animated: true });
  }, [step]);

  const handleGoToStep = (target: number, fieldKey?: string) => {
    setStep(target);
    if (fieldKey) setHighlightedKeys(new Set([fieldKey]));
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
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

    // Sign-off gate — mirror web VendorInspectionForm: block submit until a
    // signed document is uploaded OR a digitally-signed report is generated.
    const hasSignOff = docData.signedDocuments.length > 0 || docData.signedReport.length > 0;
    if (!hasSignOff) {
      setStep(9);
      Alert.alert(
        'Sign-off Required',
        'Please upload a manually signed document or generate a digitally signed report before submitting the inspection.',
      );
      return;
    }

    setSubmitting(true);

    // The submit is geofenced too, so the checker has to still be on-site — not
    // just at start. Reuse the fix captured then; only re-read if it was lost.
    // captureCoordsForSubmit returns null for VIRTUAL (and when the geofence is
    // off), so those post explicit nulls.
    const effectiveType: InspectionType =
      inspectionType ?? (inspection?.inspectionType as InspectionType) ?? 'PHYSICAL';
    let submitLoc: CheckerCoords | null = checkerCoords;
    if (!submitLoc) {
      try {
        submitLoc = await captureCoordsForSubmit(effectiveType);
        if (submitLoc) setCheckerCoords(submitLoc);
      } catch (gpsErr: any) {
        Alert.alert('Location Required', gpsErr?.message || 'Please enable location services and try again.');
        setSubmitting(false);
        return;
      }
    }

    try {
      // Payload keys EXACTLY match the web VendorInspectionForm submit.
      const payload: any = {
        verifications,
        inspectorName: meta.inspectorName,
        inspectionDate: meta.inspectionDate,
        inspectionStatus: meta.overallResult,
        inspectorRemarks: meta.inspectorRemarks,
        cycleNumber,
        // Step 9 Documentation sign-off — payload keys match web exactly.
        signedDocuments: docData.signedDocuments,
        signedReport: docData.signedReport,
        clientSignature: docData.clientSignature || null,
        // App-only additive key (factory evidence photos)
        factoryEvidence,
      };

      const res = await qcCheckerService.completeInspection(
        inspectionId,
        payload,
        submitLoc,
        effectiveType,
      );
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
      case 9:
        return (
          <VI_Step9_Documentation
            vendor={vendor ?? {}}
            verifications={verifications}
            meta={meta}
            docData={docData}
            checkerName={meta.inspectorName}
            onDocDataChange={(patch) => {
              dirtyRef.current = true;
              setDocData((prev) => ({ ...prev, ...patch }));
            }}
            factoryEvidence={factoryEvidence}
            inspection={inspection}
            inspectionStartedAt={inspection?.startedAt ?? formOpenedAtRef.current}
            inspectionType={inspectionType ?? (inspection?.inspectionType as InspectionType) ?? 'PHYSICAL'}
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
        <ActivityIndicator size="large" color="#e01a1b" />
        <Text className="mt-4 text-slate-600">Loading vendor inspection…</Text>
      </View>
    );
  }

  if (loadError) {
    const isSubmitted = loadError.type === 'submitted';
    const isExpired = loadError.type === 'expired';
    const isLocation = loadError.type === 'location';
    const amber = isSubmitted || isExpired || isLocation;
    return (
      <View className="flex-1 bg-slate-50">
        <Header onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-8">
          <View className={`w-14 h-14 rounded-full items-center justify-center mb-4 ${amber ? 'bg-amber-50' : 'bg-red-50'}`}>
            {isSubmitted ? (
              <Clock size={28} color="#f59e0b" />
            ) : isExpired ? (
              <AlarmClockOff size={28} color="#f59e0b" />
            ) : isLocation ? (
              <MapPin size={28} color="#f59e0b" />
            ) : (
              <ShieldAlert size={28} color="#ef4444" />
            )}
          </View>
          <Text className="text-xl font-bold text-slate-900 mb-1 text-center">
            {isSubmitted
              ? 'Inspection Submitted'
              : loadError.type === 'not_assigned'
                ? 'Access Denied'
                : isExpired
                  ? 'Inspection Window Expired'
                  : isLocation
                    ? "You're Not at the Vendor Location"
                    : 'Unable to Start Inspection'}
          </Text>
          <Text className="text-slate-600 text-sm text-center leading-relaxed">{loadError.message}</Text>

          {isExpired && (loadError.scheduledDate || loadError.scheduledTime) && (
            <View className="mt-3 flex-row items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-2" style={{ columnGap: 6 }}>
              <AlarmClockOff size={14} color="#b45309" />
              <Text className="text-xs font-semibold text-amber-800">
                Scheduled: {[loadError.scheduledDate, loadError.scheduledTime].filter(Boolean).join(' · ')}
              </Text>
            </View>
          )}

          {isLocation && loadError.distanceMeters != null && (
            <View className="mt-3 flex-row items-center rounded-lg bg-amber-50 border border-amber-200 px-3 py-2" style={{ columnGap: 6 }}>
              <MapPin size={14} color="#b45309" />
              <Text className="text-xs font-semibold text-amber-800">
                You are {Math.round(loadError.distanceMeters)}m away · must be within{' '}
                {loadError.thresholdMeters ?? 1000}m
              </Text>
            </View>
          )}
          {isLocation && (
            <Text className="text-slate-500 text-xs text-center leading-relaxed mt-3">
              Move to the vendor&apos;s legal / factory site or warehouse, then check again. A physical
              inspection can only be started on-site.
            </Text>
          )}

          {isLocation ? (
            <View className="mt-6 self-stretch" style={{ rowGap: 10 }}>
              <TouchableOpacity
                onPress={retryLocationStart}
                className="flex-row bg-brand-500 rounded-xl px-6 py-3 items-center justify-center"
                style={{ columnGap: 8 }}
              >
                <MapPin size={16} color="#ffffff" />
                <Text className="text-white font-bold">Check My Location Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.back()}
                className="rounded-xl px-6 py-3 border border-slate-200 bg-white items-center"
              >
                <Text className="text-slate-700 font-bold">Back to Vendor List</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-brand-500 rounded-xl px-6 py-3">
              <Text className="text-white font-bold">Back to Vendor List</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // Mandatory type selection — the form stays behind it. Shown for a fresh
  // (SCHEDULED) inspection and re-asked when resuming an IN_PROGRESS one, so a
  // draft saved as physical can be switched to virtual (and vice versa).
  // Cancelling backs out of the inspection.
  if (typeDialogFor && !discardConfirm) {
    return (
      <View className="flex-1 bg-slate-50">
        <InspectionTypeDialog
          subjectName={vendor?.companyName || name || 'this vendor'}
          onSelect={(type) => handleTypeChosen(typeDialogFor, type)}
          onCancel={() => {
            allowLeaveRef.current = true;
            router.back();
          }}
        />
      </View>
    );
  }

  // Switching type on resume cannot carry the saved draft over — confirm first.
  if (discardConfirm) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center px-6">
        <View className="bg-white rounded-2xl w-full max-w-md overflow-hidden border border-slate-200">
          <View className="p-6 flex-row items-start" style={{ columnGap: 16 }}>
            <View className="w-12 h-12 rounded-full bg-amber-50 items-center justify-center">
              <AlertTriangle size={24} color="#f59e0b" />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-slate-900">Discard saved draft?</Text>
              <Text className="mt-1 text-sm text-slate-600">
                You saved this inspection as a{' '}
                <Text className="font-bold">{(draftInspectionType || '').toLowerCase()}</Text> inspection.
                Switching to <Text className="font-bold">{discardConfirm.type.toLowerCase()}</Text> will
                <Text className="font-bold text-amber-700"> discard the saved draft</Text> and start a fresh
                inspection at the current time.
              </Text>
            </View>
          </View>
          <View className="flex-row px-6 py-4 bg-slate-50 border-t border-slate-100" style={{ columnGap: 12 }}>
            <TouchableOpacity
              onPress={() => setDiscardConfirm(null)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white items-center"
            >
              <Text className="font-semibold text-slate-700">Go back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmDiscardDraft}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 items-center"
            >
              <Text className="font-semibold text-white">Discard & start fresh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={() => router.back()} title={typeof name === 'string' ? name : 'Vendor Inspection'} />

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
                <View className={`w-10 h-10 rounded-full items-center justify-center ${isActive || isDone ? 'bg-brand-500' : 'bg-slate-200'}`}>
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
        <ScrollView ref={contentScrollRef} className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
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
  disabled={submitting || !(docData.signedDocuments.length > 0 || docData.signedReport.length > 0)}
  activeOpacity={0.85}
  className="flex-row items-center justify-center px-3 rounded-xl bg-emerald-600"
  style={{
    flex: 2,
    minHeight: 46,
    columnGap: 8,
    opacity: submitting || !(docData.signedDocuments.length > 0 || docData.signedReport.length > 0) ? 0.6 : 1,
  }}
>
  <Check size={16} color="#ffffff" strokeWidth={2.5} />
  <Text className="font-bold text-sm text-white" numberOfLines={1}>
    {submitting ? 'Submitting…' : 'Submit Inspection Report'}
  </Text>
</TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={goNext} activeOpacity={0.85} className="flex-1 flex-row items-center justify-center py-3 rounded-xl bg-brand-500">
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
              <View className="w-12 h-12 rounded-full bg-brand-50 items-center justify-center">
                <AlertTriangle size={24} color="#e01a1b" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-slate-900">Exit inspection?</Text>
                <Text className="mt-1 text-sm text-slate-600">
                  You can save your progress as a draft and resume this inspection later,
                  or exit without saving.
                </Text>
              </View>
            </View>
            {/* Three ways out, same as web: save the draft, stay, or drop the work.
                Save is the full-width primary; the other two share the row below. */}
            <View className="px-6 py-4 bg-slate-50 border-t border-slate-100" style={{ rowGap: 12 }}>
              <TouchableOpacity
                onPress={saveDraftAndExit}
                disabled={savingDraft}
                className="flex-row w-full px-4 py-3 rounded-xl bg-brand-500 items-center justify-center"
                style={{ columnGap: 8, opacity: savingDraft ? 0.7 : 1 }}
              >
                {savingDraft ? <ActivityIndicator size="small" color="#ffffff" /> : <Save size={16} color="#ffffff" />}
                <Text className="font-bold text-white">{savingDraft ? 'Saving draft…' : 'Save draft & exit'}</Text>
              </TouchableOpacity>
              <View className="flex-row" style={{ columnGap: 12 }}>
                <TouchableOpacity
                  onPress={cancelExit}
                  disabled={savingDraft}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white items-center"
                  style={{ opacity: savingDraft ? 0.5 : 1 }}
                >
                  <Text className="font-semibold text-slate-700">Keep editing</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={exitWithoutSaving}
                  disabled={savingDraft}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-red-200 bg-white items-center"
                  style={{ opacity: savingDraft ? 0.5 : 1 }}
                >
                  <Text className="font-semibold text-red-600">Exit without saving</Text>
                </TouchableOpacity>
              </View>
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
    <View className="flex-row items-center justify-between px-4 pb-3" style={{ backgroundColor: '#e01a1b', paddingTop: insets.top + 8 }}>
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
