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

const notEmptyVal = (val: unknown): boolean =>
    val !== null && val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0)

// ── Step 1: General Information ──────────────────────────────────────────────
function validateGeneralInformation(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.serviceType)) e.serviceType = "Service type is required"
    return e
}

// ── Step 2: Product Verification ─────────────────────────────────────────────
// Computes the set of verification keys that the step renders, so the
// validator knows exactly which fields the inspector must mark Yes/No.
export function getExpectedProductVerificationKeys(productData: any): string[] {
    const p = productData || {}
    const keys: string[] = []

    if (notEmptyVal(p.name))        keys.push("pv_name")
    if (notEmptyVal(p.category))    keys.push("pv_category")
    if (notEmptyVal(p.subCategory)) keys.push("pv_subCategory")
    if (notEmptyVal(p.brand))       keys.push("pv_brand")
    if (notEmptyVal(p.description)) keys.push("pv_description")

    if (Array.isArray(p.images)) {
        p.images.forEach((_: unknown, i: number) => keys.push(`pv_img_${i}`))
    }

    if (notEmptyVal(p.fabricType))   keys.push("pv_fabricType")
    if (notEmptyVal(p.material))     keys.push("pv_material")
    if (notEmptyVal(p.construction)) keys.push("pv_construction")
    if (notEmptyVal(p.weight))       keys.push("pv_weight")
    if (notEmptyVal(p.dispatchTimeline?.processingDays)) keys.push("pv_processingDays")
    if (notEmptyVal(p.dispatchTimeline?.shippingDays))   keys.push("pv_shippingDays")

    if (Array.isArray(p.variants)) {
        p.variants.forEach((v: any, vi: number) => {
            if (notEmptyVal(v.color))       keys.push(`pv_var${vi}_color`)
            if (notEmptyVal(v.size))        keys.push(`pv_var${vi}_size`)
            if (notEmptyVal(v.material))    keys.push(`pv_var${vi}_material`)
            if (notEmptyVal(v.sku))         keys.push(`pv_var${vi}_sku`)
            if (notEmptyVal(v.variantName)) keys.push(`pv_var${vi}_variantName`)
        })
    }

    if (notEmptyVal(p.dimensions)) keys.push("pv_dimensions")
    if (p.fabricSpecifications && typeof p.fabricSpecifications === "object") {
        Object.entries(p.fabricSpecifications).forEach(([key, val]) => {
            if (key === 'basis') return
            if (notEmptyVal(val)) keys.push(`pv_spec_${key}`)
        })
    }

    if (notEmptyVal(p.packagingType))     keys.push("pv_packagingType")
    if (notEmptyVal(p.packagingMaterial)) keys.push("pv_packagingMaterial")
    if (notEmptyVal(p.packagingDetails))  keys.push("pv_packagingDetails")
    if (notEmptyVal(p.careLabel))         keys.push("pv_careLabel")
    if (notEmptyVal(p.countryOfOrigin))   keys.push("pv_countryOfOrigin")
    if (notEmptyVal(p.labelInfo))         keys.push("pv_labelInfo")

    return keys
}

function validateProductVerification(d: any): StepErrors {
    const e: StepErrors = {}
    const verifications = d.productVerifications || {}
    const expectedKeys = getExpectedProductVerificationKeys(d.productData)

    const unverified = expectedKeys.find(
        (key) => !verifications[key] || verifications[key].ok === null
    )
    if (unverified) {
        e.productVerifications = "Please verify all product fields before continuing"
    }

    const photos = Array.isArray(d.productEvidencePhotos) ? d.productEvidencePhotos : []
    if (photos.length === 0) {
        e.productEvidencePhotos = "Upload at least one product evidence photo"
    }

    return e
}

// ── Step 3: Packaging Inspection ─────────────────────────────────────────────
function validatePackagingInspection(d: any): StepErrors {
    const e: StepErrors = {}
    const items: any[] = Array.isArray(d.packagingItems) ? d.packagingItems : []

    // Every item must have a Yes / No answer before proceeding
    const unanswered = items.find(
        (item) => item.verified === null || item.verified === undefined
    )
    if (unanswered) {
        e.packagingItems = `Mark "${unanswered.label.split("—")[0].trim()}" as Yes or No before continuing`
        return e
    }

    for (const item of items) {
        if (item.verified !== true) continue
        if (item.remarkCode === null) {
            e.packagingItems = `"${item.label.split("—")[0].trim()}" is marked as inspected — select a remark code`
            break
        }
        if (item.remarkCode <= 7 && isBlank(item.remarks)) {
            e.packagingItems = `"${item.label.split("—")[0].trim()}" (code ${item.remarkCode}) requires remarks`
            break
        }
    }

    const photos = Array.isArray(d.packagingPhotos) ? d.packagingPhotos : []
    if (photos.length === 0) e.packagingPhotos = "Upload at least one packaging photo"

    return e
}

// ── Step 4: Defects ──────────────────────────────────────────────────────────
// All defect fields have sensible numeric defaults (zero defects is a valid
// result), so this step never blocks Next.
function validateDefects(_d: any): StepErrors {
    return {}
}

// ── Step 5: Testing ──────────────────────────────────────────────────────────
// Every test must have a Pass or Fail decision. Once decided, the
// corresponding photo is required.
function validateTesting(d: any): StepErrors {
    const e: StepErrors = {}
    const groups: any[] = Array.isArray(d.testGroups) ? d.testGroups : []

    for (const group of groups) {
        const tests: any[] = Array.isArray(group.tests) ? group.tests : []
        for (const t of tests) {
            const displayName = t.label || (t.isOther ? "Custom test" : "Unnamed test")
            if (t.isOther && (isBlank(t.subject) || isBlank(t.label))) {
                e.testGroups = `Fill in Test Subject and Test Name for the custom test in "${group.label}"`
                return e
            }
            if (t.pass !== true && t.fail !== true) {
                e.testGroups = `"${displayName}" — select Pass or Fail before continuing`
                return e
            }
            if (t.pass === true && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) {
                e.testGroups = `"${displayName}" passed — upload a correct photo`
                return e
            }
            if (t.fail === true && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) {
                e.testGroups = `"${displayName}" failed — upload a wrong photo`
                return e
            }
        }
    }

    return e
}

// ── Step 6: Review ───────────────────────────────────────────────────────────
function validateReview(d: any): StepErrors {
    const e: StepErrors = {}
    if (!d.inspectionStatus) {
        e.inspectionStatus = "Select an inspection status before continuing"
    }
    return e
}

// ── Step 7: Documentation ────────────────────────────────────────────────────
function validateDocumentation(d: any): StepErrors {
    const e: StepErrors = {}
    const signedScans = Array.isArray(d.signedDocuments) ? d.signedDocuments : []
    const signedReport = Array.isArray(d.signedReport) ? d.signedReport : []
    if (signedScans.length === 0 && signedReport.length === 0) {
        e.signedDocuments = "Upload a signed report, or generate the digitally-signed report"
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
