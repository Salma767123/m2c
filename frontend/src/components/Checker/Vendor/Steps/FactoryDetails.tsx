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
    // Captured by parent at autofill time so lock state is stable across
    // typing and step remounts.
    autofillSnapshot?: Record<string, boolean>
}

// Vendor Name / Vendor Code are always server-supplied and never editable.
// The remaining fields lock only when the vendor provided a value, so the
// checker can still fill in anything the vendor left blank from on-site
// verification.
export default function FactoryDetails({ formData, setFormData, errors = {}, autofillSnapshot = {} }: StepProps) {
    const factoryNameLocked = !!autofillSnapshot.factoryName
    const contactNameLocked = !!autofillSnapshot.contactPersonName
    const contactPhoneLocked = !!autofillSnapshot.contactPhoneNumber
    const addressLocked = !!autofillSnapshot.factoryAddress

    return (
        <div className="space-y-8">
            <div className="border-b border-slate-200 pb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Factory Details</h2>
                <p className="text-slate-600">
                    General information regarding the vendor and factory.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor Name:</label>
                    <input
                        type="text"
                        value={formData.vendorName || ""}
                        readOnly
                        aria-readonly="true"
                        className={READONLY_CLS}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">Vendor Code:</label>
                    <input
                        type="text"
                        value={formData.vendorCode || ""}
                        readOnly
                        aria-readonly="true"
                        placeholder="Loading..."
                        className={`${READONLY_CLS} text-slate-700 font-mono`}
                    />
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory Name{!factoryNameLocked && <RequiredMark />}
                    </label>
                    {factoryNameLocked ? (
                        <input
                            type="text"
                            value={formData.factoryName}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.factoryName || ""}
                                onChange={(e) => setFormData({ ...formData, factoryName: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.factoryName}
                                className={inputCls(!!errors.factoryName)}
                            />
                            <ErrorText msg={errors.factoryName} />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Contact Person Name{!contactNameLocked && <RequiredMark />}
                    </label>
                    {contactNameLocked ? (
                        <input
                            type="text"
                            value={formData.contactPersonName}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="text"
                                value={formData.contactPersonName || ""}
                                onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.contactPersonName}
                                className={inputCls(!!errors.contactPersonName)}
                            />
                            <ErrorText msg={errors.contactPersonName} />
                        </>
                    )}
                </div>
                <div>
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Contact Phone Number{!contactPhoneLocked && <RequiredMark />}
                    </label>
                    {contactPhoneLocked ? (
                        <input
                            type="tel"
                            inputMode="tel"
                            value={formData.contactPhoneNumber}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                        />
                    ) : (
                        <>
                            <input
                                type="tel"
                                inputMode="tel"
                                value={formData.contactPhoneNumber || ""}
                                onChange={(e) => setFormData({ ...formData, contactPhoneNumber: e.target.value })}
                                placeholder="+91 98765 43210"
                                aria-invalid={!!errors.contactPhoneNumber}
                                className={inputCls(!!errors.contactPhoneNumber)}
                            />
                            <ErrorText msg={errors.contactPhoneNumber} />
                        </>
                    )}
                </div>
                <div className="md:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-3 text-sm">
                        Factory Address{!addressLocked && <RequiredMark />}
                    </label>
                    {addressLocked ? (
                        <textarea
                            value={formData.factoryAddress}
                            readOnly
                            aria-readonly="true"
                            className={READONLY_CLS}
                            rows={3}
                        />
                    ) : (
                        <>
                            <textarea
                                value={formData.factoryAddress || ""}
                                onChange={(e) => setFormData({ ...formData, factoryAddress: e.target.value })}
                                placeholder="Not provided by vendor — enter if verified on-site"
                                aria-invalid={!!errors.factoryAddress}
                                className={inputCls(!!errors.factoryAddress)}
                                rows={3}
                            />
                            <ErrorText msg={errors.factoryAddress} />
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
