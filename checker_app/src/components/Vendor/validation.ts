// RN validation for the 8-step Vendor Inspection (verification) form.
//
// Mirrors the *active* web VendorInspectionForm.tsx logic (NOT the legacy
// flat-field validation.ts): each step registers a set of verification field
// keys and the step is valid only when every registered field has a non-null
// `ok`. Step 2 additionally requires at least one inspector evidence photo.
// Step 8 requires an overall result (and inspector name to be present).

import type { Verifications } from './Steps/VI_VerifyField';
import type { FactoryEvidenceState } from './Steps/VI_Step2_WarehouseFactory';
import type { InspectorMeta } from './Steps/VI_Step8_FinalReview';

// Returns the registered keys that are not yet verified (ok === null).
export function unverifiedKeys(registeredKeys: string[], verifications: Verifications): string[] {
  return registeredKeys.filter((k) => (verifications[k]?.ok ?? null) === null);
}

// Step 2 — at least one inspector evidence photo (mirrors goNext step===2).
export function hasEvidence(evidence: FactoryEvidenceState): boolean {
  return !!(evidence.frontView || evidence.nameBoard || evidence.routeMap);
}

export interface StepValidationResult {
  ok: boolean;
  /** Verification keys still pending (for highlighting). */
  unverified: string[];
  /** True when step 2 evidence is missing. */
  missingEvidence?: boolean;
  message?: string;
}

// Validate a single step. `registeredKeys` are the keys the currently-mounted
// step registered via onRegisterFields.
export function validateStep(
  step: number,
  registeredKeys: string[],
  verifications: Verifications,
  evidence: FactoryEvidenceState,
): StepValidationResult {
  if (step === 2 && !hasEvidence(evidence)) {
    return {
      ok: false,
      unverified: [],
      missingEvidence: true,
      message: 'Please upload at least one inspector evidence photo before continuing.',
    };
  }

  if (step >= 1 && step <= 8) {
    const unverified = unverifiedKeys(registeredKeys, verifications);
    if (unverified.length > 0) {
      return {
        ok: false,
        unverified,
        message: `${unverified.length} field${unverified.length !== 1 ? 's' : ''} not yet verified. Please verify all fields before continuing.`,
      };
    }
  }

  return { ok: true, unverified: [] };
}

// Final submit gate (mirrors handleSubmit meta checks).
export interface SubmitValidationResult {
  ok: boolean;
  jumpToStep?: number;
  message?: string;
}

export function validateForSubmit(meta: InspectorMeta): SubmitValidationResult {
  if (!meta.inspectorName.trim()) {
    return { ok: false, jumpToStep: 8, message: 'Please enter the inspector name before submitting.' };
  }
  if (!meta.overallResult) {
    return { ok: false, jumpToStep: 8, message: 'Please select an overall result before submitting.' };
  }
  if (!meta.inspectorRemarks.trim()) {
    return { ok: false, jumpToStep: 8, message: 'Please enter your overall inspector remarks before submitting.' };
  }
  return { ok: true };
}
