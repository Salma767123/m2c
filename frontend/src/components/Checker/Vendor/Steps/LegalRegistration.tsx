"use client"

import type { StepErrors } from "../validation"
import {
    READONLY_CLS,
    ErrorText,
    RequiredMark,
    inputCls,
} from "./fieldHelpers"

interface StepProps {
    formData: any
    setFormData: (data: any) => void
    errors?: StepErrors
    // Per-field snapshot: true iff the vendor supplied a value at autofill
    // time. Captured once by the parent so typing into an empty field can't
    // silently re-lock it, and lock state survives step remounts.
    autofillSnapshot?: Record<string, boolean>
}

export default function LegalRegistration({ formData, setFormData, errors = {}, autofillSnapshot = {} }: StepProps) {
    const bizRegLocked = !!autofillSnapshot.businessRegistrationNumber
    const gstLocked = !!autofillSnapshot.gstTaxId
    const licenseLocked = !!autofillSnapshot.factoryLicenseNumber

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Legal & Registration</h2>
                <p className="text-slate-600">
                    Verify business and factory registrations.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Business Registration Number{!bizRegLocked && <RequiredMark />}
                    </label>
                    {bizRegLocked ? (
                        <input
                            type="text"
                            value={formData.businessRegistrationNumber}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.businessRegistrationNumber || ""}
                                onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.businessRegistrationNumber}
                                className={inputCls(!!errors.businessRegistrationNumber)}
                            />
                            <ErrorText msg={errors.businessRegistrationNumber} />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        GST / Tax ID{!gstLocked && <RequiredMark />}
                    </label>
                    {gstLocked ? (
                        <input
                            type="text"
                            value={formData.gstTaxId}
                            readOnly
                            aria-readonly="true"
                            className={`${READONLY_CLS} font-mono`}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.gstTaxId || ""}
                                onChange={(e) => setFormData({ ...formData, gstTaxId: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.gstTaxId}
                                className={`${inputCls(!!errors.gstTaxId)} font-mono`}
                            />
                            <ErrorText msg={errors.gstTaxId} />
                        </>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory License Number{!licenseLocked && <RequiredMark />}
                    </label>
                    {licenseLocked ? (
                        <input
                            type="text"
                            value={formData.factoryLicenseNumber}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.factoryLicenseNumber || ""}
                                onChange={(e) => setFormData({ ...formData, factoryLicenseNumber: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.factoryLicenseNumber}
                                className={inputCls(!!errors.factoryLicenseNumber)}
                            />
                            <ErrorText msg={errors.factoryLicenseNumber} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
