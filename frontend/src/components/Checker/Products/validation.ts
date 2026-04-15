// Per-step validators for the Product Inspection form. Pragmatic rules
// aligned with the approval/rejection logic in qcCheckerController —
// enough to prevent half-filled reports reaching the server, without
// making the form uncrossable for legitimate QC variance.

export type Step =
    | "generalInformation"
    | "preparation"
    | "measurements"
    | "packaging"
    | "defects"
    | "testing"
    | "documentation"
    | "review"

export type StepErrors = Record<string, string>
export type AllErrors = Partial<Record<Step, StepErrors>>

const isBlank = (v: unknown): boolean =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "")

// ---------------- General Information ----------------
// Everything here goes on the final report header — all required.
function validateGeneralInformation(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.client)) e.client = "Client is required"
    if (isBlank(d.vendor)) e.vendor = "Vendor is required"
    if (isBlank(d.factory)) e.factory = "Factory is required"
    if (isBlank(d.serviceLocation)) e.serviceLocation = "Service location is required"
    if (isBlank(d.serviceStartDate)) e.serviceStartDate = "Service start date is required"
    if (isBlank(d.serviceType)) e.serviceType = "Service type is required"
    return e
}

// ---------------- Preparation ----------------
// Checker must have reviewed the item list + uploaded at least one
// warehouse photo showing the stock actually exists. Each item also
// needs sensible quantities — `inspectionQuantity` capped by total.
function validatePreparation(d: any): StepErrors {
    const e: StepErrors = {}
    const items = Array.isArray(d.items) ? d.items : []
    if (items.length === 0) {
        e.items = "Add at least one inspection item"
    } else {
        for (const i of items) {
            if (isBlank(i?.itemName)) {
                e.itemName = "Item name is required"
                break
            }
            const total = Number(i?.totalQuantity)
            const inspection = Number(i?.inspectionQuantity)
            if (!(total > 0)) {
                e.totalQuantity = "Total quantity must be greater than zero"
                break
            }
            if (!(inspection > 0)) {
                e.inspectionQuantity = "Inspection quantity must be greater than zero"
                break
            }
            if (inspection > total) {
                e.inspectionQuantity = "Inspection quantity cannot exceed total quantity"
                break
            }
        }
    }
    const photos = Array.isArray(d.warehousePhotoEvidences) ? d.warehousePhotoEvidences : []
    if (photos.length === 0) {
        e.warehousePhotoEvidences = "Upload at least one warehouse photo"
    }
    return e
}

// ---------------- Measurements ----------------
// At least one measurement sample must be recorded. Per-dimension values
// stay lenient — zero can be legitimate for products that don't have a
// given dimension (e.g. flat items with no height).
function validateMeasurements(d: any): StepErrors {
    const e: StepErrors = {}
    const samples = Array.isArray(d.measurements) ? d.measurements : []
    if (samples.length === 0) {
        e.measurements = "Add at least one measurement sample"
    }
    return e
}

// ---------------- Packaging ----------------
// The six packaging / appearance remarks feed directly into the approval
// score on the backend (qcCheckerController), so all six must be set.
function validatePackaging(d: any): StepErrors {
    const e: StepErrors = {}
    const remarks: Array<[string, string]> = [
        ["shipperCartonRemark", "Shipper carton remark"],
        ["innerCartonRemark", "Inner carton remark"],
        ["retailPackagingRemark", "Retail packaging remark"],
        ["productTypeRemark", "Product type remark"],
        ["aqlWorkmanshipRemark", "AQL workmanship remark"],
        ["onSiteTestsRemark", "On-site tests remark"],
    ]
    for (const [key, label] of remarks) {
        if (isBlank(d[key])) e[key] = `${label} is required`
    }
    return e
}

// ---------------- Defects ----------------
// Intentionally lenient per user request: a zero-defect inspection is
// legitimate and the counts default to 0, so this step never blocks Next.
function validateDefects(_d: any): StepErrors {
    return {}
}

// ---------------- Testing ----------------
// At least one on-site test must be decided (Pass or Fail). A report with
// zero test decisions is not a real inspection.
function validateTesting(d: any): StepErrors {
    const e: StepErrors = {}
    const tests = Array.isArray(d.tests) ? d.tests : []
    const anyDecided = tests.some((t: any) => t?.pass === true || t?.fail === true)
    if (!anyDecided) e.tests = "Mark Pass or Fail on at least one test"
    return e
}

// ---------------- Documentation ----------------
function validateDocumentation(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.inspectorSignature)) e.inspectorSignature = "Inspector signature is required"
    return e
}

// ---------------- Review ----------------
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

const STEP_VALIDATORS: Record<Step, (d: any) => StepErrors> = {
    generalInformation: validateGeneralInformation,
    preparation: validatePreparation,
    measurements: validateMeasurements,
    packaging: validatePackaging,
    defects: validateDefects,
    testing: validateTesting,
    documentation: validateDocumentation,
    review: validateReview,
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
