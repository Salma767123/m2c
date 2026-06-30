// Per-step validators for the Product Inspection form (7-step redesign).
// Aligned with the new step IDs: generalInformation, productVerification,
// packagingInspection, defects, testing, review, documentation.

export type Step =
    | "generalInformation"
    | "productVerification"
    | "packagingInspection"
    | "defects"
    | "testing"
    | "review"
    | "documentation"

export type StepErrors = Record<string, string>
export type AllErrors = Partial<Record<Step, StepErrors>>

const isBlank = (v: unknown): boolean =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "")

// ── Step 1: General Information ──────────────────────────────────────────────
// Service type must be selected. Inspection date is auto-populated so
// it's always present. Client and vendor come from vendor registration data.
function validateGeneralInformation(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.serviceType)) e.serviceType = "Service type is required"
    return e
}

// ── Step 2: Product Verification ─────────────────────────────────────────────
// Verifications are optional — the checker may choose not to verify every
// field. No required fields. This step never blocks Next.
function validateProductVerification(_d: any): StepErrors {
    return {}
}

// ── Step 3: Packaging Inspection ─────────────────────────────────────────────
// For items that were inspected (verified=true) and have a remark code
// in the 1–7 range, remarks are mandatory. At least one packaging photo.
function validatePackagingInspection(d: any): StepErrors {
    const e: StepErrors = {}
    const items: any[] = Array.isArray(d.packagingItems) ? d.packagingItems : []

    for (const item of items) {
        if (item.verified !== true) continue
        if (item.remarkCode === null) {
            e.packagingItems = `"${item.label.split('—')[0].trim()}" is marked as inspected — select a remark code`
            break
        }
        if (item.remarkCode <= 7 && isBlank(item.remarks)) {
            e.packagingItems = `"${item.label.split('—')[0].trim()}" (code ${item.remarkCode}) requires remarks`
            break
        }
    }

    const photos = Array.isArray(d.packagingPhotos) ? d.packagingPhotos : []
    if (photos.length === 0) e.packagingPhotos = "Upload at least one packaging photo"

    return e
}

// ── Step 4: Defects ──────────────────────────────────────────────────────────
// Intentionally lenient: zero-defect inspections are legitimate and the
// counts default to 0, so this step never blocks Next.
function validateDefects(_d: any): StepErrors {
    return {}
}

// ── Step 5: Testing ──────────────────────────────────────────────────────────
// Light validation: if a test has been decided (pass or fail is set),
// the corresponding photo is required. Un-decided tests are allowed.
function validateTesting(d: any): StepErrors {
    const e: StepErrors = {}
    const groups: any[] = Array.isArray(d.testGroups) ? d.testGroups : []

    for (const group of groups) {
        const tests: any[] = Array.isArray(group.tests) ? group.tests : []
        for (const t of tests) {
            if (t.pass === true && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) {
                e.testGroups = `"${t.label}" passed — upload at least one correct/right photo`
                return e
            }
            if (t.fail === true && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) {
                e.testGroups = `"${t.label}" failed — upload at least one wrong/incorrect photo`
                return e
            }
        }
    }

    return e
}

// ── Step 6: Review ───────────────────────────────────────────────────────────
// Final decision must be set; rejected inspections require remarks.
function validateReview(d: any): StepErrors {
    const e: StepErrors = {}
    if (d.finalDecision !== "Approved" && d.finalDecision !== "Rejected") {
        e.finalDecision = "Select Approved or Rejected"
    }
    if (d.finalDecision === "Rejected" && isBlank(d.reviewerRemarks)) {
        e.reviewerRemarks = "Rejection remarks are required"
    }
    return e
}

// ── Step 7: Documentation ────────────────────────────────────────────────────
// At least one signed document (scan or digital report) + inspection status.
function validateDocumentation(d: any): StepErrors {
    const e: StepErrors = {}
    const signedScans = Array.isArray(d.signedDocuments) ? d.signedDocuments : []
    const signedReport = Array.isArray(d.signedReport) ? d.signedReport : []
    if (signedScans.length === 0 && signedReport.length === 0) {
        e.signedDocuments = "Upload a signed report, or generate the digitally-signed report"
    }
    if (!d.inspectionStatus) {
        e.inspectionStatus = "Select an inspection status before submitting"
    }
    return e
}

const STEP_VALIDATORS: Record<Step, (d: any) => StepErrors> = {
    generalInformation: validateGeneralInformation,
    productVerification: validateProductVerification,
    packagingInspection: validatePackagingInspection,
    defects: validateDefects,
    testing: validateTesting,
    review: validateReview,
    documentation: validateDocumentation,
}

export function validateStep(step: Step, formData: any): StepErrors {
    return STEP_VALIDATORS[step](formData)
}

export function validateAll(formData: any): AllErrors {
    const result: AllErrors = {}
    for (const step of Object.keys(STEP_VALIDATORS) as Step[]) {
        const errs = STEP_VALIDATORS[step](formData)
        if (Object.keys(errs).length > 0) result[step] = errs
    }
    return result
}

export function hasErrors(errs: StepErrors | undefined): boolean {
    return !!errs && Object.keys(errs).length > 0
}

export function firstErrorMessage(errs: StepErrors | undefined): string | null {
    if (!errs) return null
    const keys = Object.keys(errs)
    return keys.length > 0 ? errs[keys[0]] : null
}
