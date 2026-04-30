/**
 * Validation for admin re-inspection review payloads.
 */

function validateAdminReviewPayload(body) {
    const errors = {};
    const { decision, reason, remarks, notes } = body;

    const VALID_DECISIONS = ['APPROVE', 'FINAL_REJECT', 'RAISE_REINSPECTION'];
    if (!decision || !VALID_DECISIONS.includes(decision)) {
        errors.decision = `Decision is required and must be one of: ${VALID_DECISIONS.join(', ')}`;
    }

    if (decision === 'FINAL_REJECT') {
        if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
            errors.reason = 'A detailed rejection reason is required (minimum 5 characters)';
        }
    }

    if (decision === 'RAISE_REINSPECTION') {
        if ((!reason || reason.trim().length === 0) && (!remarks || remarks.trim().length === 0)) {
            errors.reason = 'At least a reason or remarks is required when raising re-inspection';
        }
    }

    if (remarks && typeof remarks !== 'string') {
        errors.remarks = 'Remarks must be a string';
    }

    if (notes && typeof notes !== 'string') {
        errors.notes = 'Notes must be a string';
    }

    return errors;
}

module.exports = { validateAdminReviewPayload };
