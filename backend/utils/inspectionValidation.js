// Server-side mirror of the frontend inspection validators.
// Kept intentionally simple (plain JS) so it can be unit-tested without any
// transpile step. If the client somehow submits an incomplete form (API hit
// directly, older frontend, etc.) these checks block the COMPLETED write.

const PHONE_RE = /^\+?[\d][\d\s\-()]{6,14}\d$/;

const isBlank = (v) =>
    v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

// Overall result options the checker can pick on the Final Review step. Mirrors
// the frontend RESULT_OPTIONS (VI_Step8_FinalReview) exactly. Any non-approval
// maps to a FAILED result server-side (see mapStatusToResult in
// inspectionController) while the exact choice is preserved in the stored form.
const VALID_INSPECTION_STATUSES = ['Approved', 'Rejected', 'On Hold', 'Re-inspection Required'];

const isPositiveIntegerString = (v) => {
    if (typeof v !== 'string' && typeof v !== 'number') return false;
    const s = String(v).replace(/[\s,]/g, '');
    return /^\d+$/.test(s) && parseInt(s, 10) > 0;
};

// Accept YYYY-MM-DD (date input format) or full ISO; reject loose strings like "2024"
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const isValidDateString = (v) => {
    if (typeof v !== 'string') return false;
    const trimmed = v.trim();
    if (!ISO_DATE_RE.test(trimmed)) return false;
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) return false;
    // Echo-check the YYYY-MM-DD portion so JS's lenient Date parsing can't
    // accept rolled-over dates like 2024-02-31 or 2024-13-01.
    const [y, m, day] = trimmed.slice(0, 10).split('-').map(Number);
    return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
};

const isFutureDate = (v) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return d.getTime() > today.getTime();
};

// Cap individual photo payload (base64 dataURL). ~8MB dataURL ≈ 6MB binary.
const MAX_PHOTO_CHARS = 8 * 1024 * 1024;
const MAX_PHOTOS = 20;

// Named factory-photo slots the checker must provide. Mirrors the required
// slots in frontend Steps/factoryImageSlots.ts.
const REQUIRED_PHOTO_SLOTS = [
    { id: 'nameBoard', label: 'Factory Name Board' },
    { id: 'frontView', label: 'Front View' },
];

// ── New 9-step "verifications" format ─────────────────────────────────────
// The current checker flow submits a `verifications` map ({ fieldKey: { ok,
// remarks } }) plus inspector meta — NOT the flat factory-detail fields the
// legacy validator below expects. Validate it on its own terms, mirroring the
// guarantees the frontend enforces at submit time (inspector name, a valid
// non-future date, a decided overall result, and remarks when rejecting).
function validateVerificationPayload(d) {
    const errors = {};

    if (isBlank(d.inspectorName)) errors.inspectorName = 'Inspector name is required';

    if (isBlank(d.inspectionDate)) {
        errors.inspectionDate = 'Inspection date is required';
    } else if (!isValidDateString(d.inspectionDate)) {
        errors.inspectionDate = 'Invalid date';
    } else if (isFutureDate(d.inspectionDate)) {
        errors.inspectionDate = 'Inspection date cannot be in the future';
    }

    if (!VALID_INSPECTION_STATUSES.includes(d.inspectionStatus)) {
        errors.inspectionStatus = 'Invalid inspection status';
    }
    if (d.inspectionStatus === 'Rejected' && isBlank(d.inspectorRemarks)) {
        errors.inspectorRemarks = 'Remarks are required when rejecting';
    }

    if (!d.verifications || typeof d.verifications !== 'object' || Array.isArray(d.verifications) || Object.keys(d.verifications).length === 0) {
        errors.verifications = 'Inspection verifications are required';
    }

    // Inspector evidence photos (optional). Sent as [{ label, dataUrl }]; each
    // dataUrl is a base64 image (uploaded to Cloudinary post-validation by
    // resolveBase64InValue) or an already-hosted https URL. Mirror the
    // factoryPhotos size/count/format guards.
    if (d.inspectorEvidenceImages != null) {
        if (!Array.isArray(d.inspectorEvidenceImages)) {
            errors.inspectorEvidenceImages = 'Invalid evidence photos';
        } else if (d.inspectorEvidenceImages.length > MAX_PHOTOS) {
            errors.inspectorEvidenceImages = `At most ${MAX_PHOTOS} evidence photos allowed`;
        } else {
            const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
            const HTTP_URL_RE = /^https?:\/\//i;
            for (const item of d.inspectorEvidenceImages) {
                const src = item && typeof item === 'object' ? item.dataUrl : null;
                if (typeof src !== 'string' || src.length === 0) {
                    errors.inspectorEvidenceImages = 'Invalid evidence photo data';
                    break;
                }
                if (src.length > MAX_PHOTO_CHARS) {
                    errors.inspectorEvidenceImages = 'Evidence photo exceeds maximum size (~6MB)';
                    break;
                }
                if (!DATA_URL_RE.test(src) && !HTTP_URL_RE.test(src)) {
                    errors.inspectorEvidenceImages = 'Evidence photo must be an image data URL or HTTPS URL';
                    break;
                }
            }
        }
    }

    return errors;
}

function isNewFormatPayload(d) {
    return !!d && typeof d.verifications === 'object' && d.verifications !== null && !Array.isArray(d.verifications);
}

function validateInspectionPayload(d = {}) {
    if (isNewFormatPayload(d)) {
        return validateVerificationPayload(d);
    }

    const errors = {};

    // Factory Details
    if (isBlank(d.factoryName)) errors.factoryName = 'Factory name is required';
    if (isBlank(d.contactPersonName)) errors.contactPersonName = 'Contact person name is required';
    if (isBlank(d.contactPhoneNumber)) {
        errors.contactPhoneNumber = 'Phone number is required';
    } else if (!PHONE_RE.test(String(d.contactPhoneNumber).trim())) {
        errors.contactPhoneNumber = 'Invalid phone number';
    }
    if (isBlank(d.factoryAddress)) errors.factoryAddress = 'Factory address is required';

    // Legal & Registration
    if (isBlank(d.businessRegistrationNumber)) errors.businessRegistrationNumber = 'Business registration number is required';
    if (isBlank(d.gstTaxId)) errors.gstTaxId = 'GST / Tax ID is required';
    if (isBlank(d.factoryLicenseNumber)) errors.factoryLicenseNumber = 'Factory license number is required';

    // Production Info
    if (isBlank(d.categoryToInspect)) errors.categoryToInspect = 'Category to inspect is required';
    if (isBlank(d.productsManufactured)) errors.productsManufactured = 'Products manufactured is required';
    if (isBlank(d.monthlyProductionCapacity)) {
        errors.monthlyProductionCapacity = 'Monthly production capacity is required';
    } else if (!isPositiveIntegerString(d.monthlyProductionCapacity)) {
        errors.monthlyProductionCapacity = 'Must be a positive whole number';
    }
    if (isBlank(d.numberOfProductionWorkers)) {
        errors.numberOfProductionWorkers = 'Number of workers is required';
    } else if (!isPositiveIntegerString(d.numberOfProductionWorkers)) {
        errors.numberOfProductionWorkers = 'Must be a positive whole number';
    }

    // Inspection Info
    if (isBlank(d.inspectionDate)) {
        errors.inspectionDate = 'Inspection date is required';
    } else if (!isValidDateString(d.inspectionDate)) {
        errors.inspectionDate = 'Invalid date';
    } else if (isFutureDate(d.inspectionDate)) {
        errors.inspectionDate = 'Inspection date cannot be in the future';
    }
    if (!VALID_INSPECTION_STATUSES.includes(d.inspectionStatus)) {
        errors.inspectionStatus = 'Invalid inspection status';
    }
    if (d.inspectionStatus === 'Rejected' && isBlank(d.inspectorRemarks)) {
        errors.inspectorRemarks = 'Remarks are required when rejecting';
    }

    // Evidence — frontend sends named slots `[{ slotId, label, name, data }]`.
    // `data` is either a base64 data URL (converted to a Cloudinary URL
    // post-validation by resolveBase64InValue) or an already-hosted https URL.
    const photos = Array.isArray(d.factoryPhotos) ? d.factoryPhotos : [];
    const photoSrc = (raw) =>
        typeof raw === 'string'
            ? raw
            : (raw && typeof raw === 'object' ? (raw.data || raw.url || null) : null);
    const hasSlot = (slotId) =>
        photos.some((p) => p && typeof p === 'object' && p.slotId === slotId && photoSrc(p));

    if (photos.length > MAX_PHOTOS) {
        errors.factoryPhotos = `At most ${MAX_PHOTOS} photos allowed`;
    } else {
        // Required named slots must each have an image.
        for (const slot of REQUIRED_PHOTO_SLOTS) {
            if (!hasSlot(slot.id)) {
                errors[`factoryImage:${slot.id}`] = `${slot.label} photo is required`;
            }
        }
        if (REQUIRED_PHOTO_SLOTS.some((s) => !hasSlot(s.id))) {
            const missing = REQUIRED_PHOTO_SLOTS.filter((s) => !hasSlot(s.id)).map((s) => s.label);
            errors.factoryPhotos = `Upload the required photos: ${missing.join(', ')}`;
        }

        // Per-photo integrity checks (applies to every uploaded slot).
        const DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif);base64,/i;
        const HTTP_URL_RE = /^https?:\/\//i;
        for (let i = 0; i < photos.length; i++) {
            const p = photoSrc(photos[i]);
            if (typeof p !== 'string' || p.length === 0) {
                errors.factoryPhotos = 'Invalid photo data';
                break;
            }
            if (p.length > MAX_PHOTO_CHARS) {
                errors.factoryPhotos = 'Photo exceeds maximum size (~6MB)';
                break;
            }
            if (!DATA_URL_RE.test(p) && !HTTP_URL_RE.test(p)) {
                errors.factoryPhotos = 'Photo must be an image data URL or HTTPS URL';
                break;
            }
        }
    }

    return errors;
}

module.exports = { validateInspectionPayload };
