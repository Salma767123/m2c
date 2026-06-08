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
    const photos = Array.isArray(d.measurementPhotos) ? d.measurementPhotos : []
    if (photos.length === 0) {
        e.measurementPhotos = "Upload at least one measurement photo"
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
    const photos = Array.isArray(d.packagingPhotos) ? d.packagingPhotos : []
    if (photos.length === 0) {
        e.packagingPhotos = "Upload at least one packaging photo"
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
// Every on-site test must be decided (Pass or Fail). Pass requires at
// least one right photo; Fail requires at least one wrong photo.
function validateTesting(d: any): StepErrors {
    const e: StepErrors = {}
    const tests = Array.isArray(d.tests) ? d.tests : []
    for (const t of tests) {
        const decided = t?.pass === true || t?.fail === true
        if (!decided) {
            e.tests = `"${t?.label || "Test"}" requires a Pass or Fail decision`
            break
        }
        if (t.pass && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) {
            e.tests = `"${t.label}" passed — upload at least one Right/Correct photo`
            break
        }
        if (t.fail && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) {
            e.tests = `"${t.label}" failed — upload at least one Wrong/Incorrect photo`
            break
        }
    }
    return e
}

// ---------------- Documentation ----------------
// Inspector signature is auto-derived from the logged-in checker profile, and
// the photocopy upload was removed. A company ID card is still required, plus
// at least one signed document — either a manually-signed scan OR the
// digitally-signed (merged) report (either path is enough to submit).
function validateDocumentation(d: any): StepErrors {
    const e: StepErrors = {}
    const ids = Array.isArray(d.companyIdCards) ? d.companyIdCards : []
    if (ids.length === 0) e.companyIdCards = "Upload at least one company ID card"
    const signedScans = Array.isArray(d.signedDocuments) ? d.signedDocuments : []
    const signedReport = Array.isArray(d.signedReport) ? d.signedReport : []
    if (signedScans.length === 0 && signedReport.length === 0) {
        e.signedDocuments =
            "Upload a signed report, or generate the digitally-signed report"
    }
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
