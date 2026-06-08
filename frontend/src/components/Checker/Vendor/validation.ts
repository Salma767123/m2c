// Central validators for the multi-step factory inspection form.
// Each validator returns a map of fieldName -> error message. An empty object
// means "this step is valid".

import { FACTORY_IMAGE_SLOTS } from "./Steps/factoryImageSlots"

// Required named photo slots — both must be uploaded before the step is valid.
const REQUIRED_FACTORY_SLOTS = FACTORY_IMAGE_SLOTS.filter((s) => s.required)

export type Step =
    | "factoryDetails"
    | "legalRegistration"
    | "productionInfo"
    | "basicInfrastructure"
    | "qualitySafety"
    | "inspectionInfo"
    | "basicEvidence"

export type StepErrors = Record<string, string>
export type AllErrors = Partial<Record<Step, StepErrors>>

// Flexible international phone pattern: optional leading +, 8–15 digits total,
// allowing spaces / dashes / parentheses as separators.
const PHONE_RE = /^\+?[\d][\d\s\-()]{6,14}\d$/

const isBlank = (v: unknown): boolean =>
    v === null || v === undefined || (typeof v === "string" && v.trim() === "")

const isPositiveIntegerString = (v: unknown): boolean => {
    if (typeof v !== "string") return false
    const cleaned = v.replace(/[\s,]/g, "")
    return /^\d+$/.test(cleaned) && parseInt(cleaned, 10) > 0
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

const isValidDateString = (v: unknown): boolean => {
    if (typeof v !== "string") return false
    const trimmed = v.trim()
    if (!ISO_DATE_RE.test(trimmed)) return false
    const d = new Date(trimmed)
    if (isNaN(d.getTime())) return false
    // Reject rolled-over dates like 2024-02-31.
    const [y, m, day] = trimmed.slice(0, 10).split("-").map(Number)
    return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day
}

const isFutureDate = (v: unknown): boolean => {
    if (typeof v !== "string") return false
    const d = new Date(v)
    if (isNaN(d.getTime())) return false
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return d.getTime() > today.getTime()
}

function validateFactoryDetails(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.factoryName)) e.factoryName = "Factory name is required"
    if (isBlank(d.contactPersonName)) e.contactPersonName = "Contact person name is required"
    if (isBlank(d.contactPhoneNumber)) {
        e.contactPhoneNumber = "Phone number is required"
    } else if (!PHONE_RE.test(d.contactPhoneNumber.trim())) {
        e.contactPhoneNumber = "Enter a valid phone number (8–15 digits)"
    }
    if (isBlank(d.factoryAddress)) e.factoryAddress = "Factory address is required"
    return e
}

function validateLegalRegistration(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.businessRegistrationNumber)) {
        e.businessRegistrationNumber = "Business registration number is required"
    }
    if (isBlank(d.gstTaxId)) e.gstTaxId = "GST / Tax ID is required"
    if (isBlank(d.factoryLicenseNumber)) e.factoryLicenseNumber = "Factory license number is required"
    return e
}

function validateProductionInfo(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.categoryToInspect)) e.categoryToInspect = "Category to inspect is required"
    if (isBlank(d.productsManufactured)) e.productsManufactured = "Products manufactured is required"
    if (isBlank(d.monthlyProductionCapacity)) {
        e.monthlyProductionCapacity = "Monthly production capacity is required"
    } else if (!isPositiveIntegerString(d.monthlyProductionCapacity)) {
        e.monthlyProductionCapacity = "Enter a positive whole number"
    }
    if (isBlank(d.numberOfProductionWorkers)) {
        e.numberOfProductionWorkers = "Number of workers is required"
    } else if (!isPositiveIntegerString(d.numberOfProductionWorkers)) {
        e.numberOfProductionWorkers = "Enter a positive whole number"
    }
    return e
}

function validateBasicInfrastructure(_d: any): StepErrors {
    // All fields default to "Yes" and are constrained to a fixed option list,
    // so no validation is needed — kept for symmetry.
    return {}
}

function validateQualitySafety(_d: any): StepErrors {
    return {}
}

function validateInspectionInfo(d: any): StepErrors {
    const e: StepErrors = {}
    if (isBlank(d.inspectionDate)) {
        e.inspectionDate = "Inspection date is required"
    } else if (!isValidDateString(d.inspectionDate)) {
        e.inspectionDate = "Invalid date"
    } else if (isFutureDate(d.inspectionDate)) {
        e.inspectionDate = "Inspection date cannot be in the future"
    }
    if (isBlank(d.inspectorName)) {
        e.inspectorName = "Inspector name not loaded — please refresh"
    }
    if (d.inspectionStatus !== "Approved" && d.inspectionStatus !== "Rejected") {
        e.inspectionStatus = "Select inspection status"
    }
    // If the inspector is rejecting, remarks are mandatory to capture the reason.
    if (d.inspectionStatus === "Rejected" && isBlank(d.inspectorRemarks)) {
        e.inspectorRemarks = "Remarks are required when rejecting"
    }
    return e
}

function validateBasicEvidence(d: any): StepErrors {
    const e: StepErrors = {}
    const photos = Array.isArray(d.factoryPhotos) ? d.factoryPhotos : []
    const hasSlot = (id: string) =>
        photos.some((p: any) => p?.slotId === id && (p?.data || p?.url))

    const missing = REQUIRED_FACTORY_SLOTS.filter((s) => !hasSlot(s.id))
    for (const s of missing) {
        e[`factoryImage:${s.id}`] = `${s.label} photo is required`
    }
    if (missing.length > 0) {
        e.factoryPhotos = `Upload the required photos: ${missing.map((s) => s.label).join(", ")}`
    }
    return e
}

const STEP_VALIDATORS: Record<Step, (d: any) => StepErrors> = {
    factoryDetails: validateFactoryDetails,
    legalRegistration: validateLegalRegistration,
    productionInfo: validateProductionInfo,
    basicInfrastructure: validateBasicInfrastructure,
    qualitySafety: validateQualitySafety,
    inspectionInfo: validateInspectionInfo,
    basicEvidence: validateBasicEvidence,
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

// Field ownership map — used to fan out flat server-side fieldErrors back into
// the step-grouped shape the UI consumes. Kept in sync with the validators.
const FIELD_TO_STEP: Record<string, Step> = {
    factoryName: "factoryDetails",
    contactPersonName: "factoryDetails",
    contactPhoneNumber: "factoryDetails",
    factoryAddress: "factoryDetails",
    businessRegistrationNumber: "legalRegistration",
    gstTaxId: "legalRegistration",
    factoryLicenseNumber: "legalRegistration",
    categoryToInspect: "productionInfo",
    productsManufactured: "productionInfo",
    monthlyProductionCapacity: "productionInfo",
    numberOfProductionWorkers: "productionInfo",
    inspectionDate: "inspectionInfo",
    inspectorName: "inspectionInfo",
    inspectionStatus: "inspectionInfo",
    inspectorRemarks: "inspectionInfo",
    factoryPhotos: "basicEvidence",
}

// Fan a flat `{ field: message }` map (from the server) into the grouped
// `AllErrors` shape. Unknown fields are dropped to avoid noise.
export function groupFieldErrors(flat: Record<string, string>): AllErrors {
    const out: AllErrors = {}
    for (const [field, msg] of Object.entries(flat)) {
        // Per-slot photo errors (`factoryImage:<slotId>`) all belong to the
        // Basic Evidence step.
        const step = field.startsWith("factoryImage:") ? "basicEvidence" : FIELD_TO_STEP[field]
        if (!step) continue
        if (!out[step]) out[step] = {}
        out[step]![field] = msg
    }
    return out
}
