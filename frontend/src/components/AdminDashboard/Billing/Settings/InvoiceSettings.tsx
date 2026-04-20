"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, CalendarClock, CalendarCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/UI/Card";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { invoiceSettingsService, InvoiceSettingsData } from "@/services/invoiceSettingsService";
import { hasPermission } from "@/lib/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
];

/** Days remaining until a future date (returns negative if past) */
const daysUntil = (dateStr: string) => {
    const target = new Date(dateStr);
    const now = new Date();
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/** Format a date string as "1 Apr 2025" */
const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });

/**
 * Client-side preview of FY dates from month+day anchor.
 * Mirrors the server logic in computeFYDates().
 */
const previewFYDates = (month: number, day: number) => {
    const now = new Date();
    const refYear = now.getFullYear();
    let startYear = refYear;
    let fyStart = new Date(startYear, month - 1, day);

    if (now < fyStart) {
        startYear = refYear - 1;
        fyStart = new Date(startYear, month - 1, day);
    }

    const nextFYStart = new Date(startYear + 1, month - 1, day);
    const fyEnd = new Date(nextFYStart.getTime() - 1);

    return {
        start: fyStart.toISOString(),
        end: fyEnd.toISOString(),
        label: `${fyStart.getFullYear()}-${String(fyEnd.getFullYear()).slice(-2)}`,
    };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function InvoiceSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<InvoiceSettingsData | null>(null);

    // Local FY anchor state (auto mode)
    const [fyMonth, setFyMonth] = useState(4); // April default
    const [fyDay, setFyDay] = useState(1);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchSettings = useCallback(async () => {
        setLoading(true);
        try {
            const response = await invoiceSettingsService.getInvoiceSettings();
            if (response.success) {
                setSettings(response.data);
                setFyMonth(response.data.financialYearStartMonth ?? 4);
                setFyDay(response.data.financialYearStartDay ?? 1);
            }
        } catch (error: any) {
            showErrorToast("Error", error.message || "Failed to load settings");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // ── Derived FY preview (auto mode) ───────────────────────────────────────
    const fyPreview = previewFYDates(fyMonth, fyDay);
    const daysLeft = settings ? daysUntil(settings.financialYearEnd) : 0;

    // ── Input handlers ───────────────────────────────────────────────────────
    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!settings) return;
        const { name, value, type, checked } = e.target;
        setSettings({ ...settings, [name]: type === "checkbox" ? checked : value });
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!settings) return;
        setSettings({ ...settings, [e.target.name]: e.target.value });
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            const payload: Parameters<typeof invoiceSettingsService.updateInvoiceSettings>[0] = {
                invoicePrefix: settings.invoicePrefix,
                sequenceLength: Number(settings.sequenceLength),
                currentSequence: Number(settings.currentSequence),
                autoFinancialYear: settings.autoFinancialYear,
                formatTemplate: settings.formatTemplate,
            };

            if (settings.autoFinancialYear) {
                payload.financialYearStartMonth = fyMonth;
                payload.financialYearStartDay = fyDay;
            } else {
                payload.financialYearStart = settings.financialYearStart;
            }

            const response = await invoiceSettingsService.updateInvoiceSettings(payload);
            if (response.success) {
                showSuccessToast("Saved", "Invoice settings updated successfully");
                setSettings(response.data);
                setFyMonth(response.data.financialYearStartMonth ?? fyMonth);
                setFyDay(response.data.financialYearStartDay ?? fyDay);
            }
        } catch (error: any) {
            showErrorToast("Error", error.message || "Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    // ── Invoice number preview ────────────────────────────────────────────────
    const generatePreview = () => {
        if (!settings) return "";
        const fyLabel = settings.autoFinancialYear
            ? fyPreview.label
            : (() => {
                const d = new Date(settings.financialYearStart);
                const e = new Date(settings.financialYearEnd);
                return `${d.getFullYear()}-${String(e.getFullYear()).slice(-2)}`;
            })();
        const seqLen = isNaN(Number(settings.sequenceLength)) ? 4 : Number(settings.sequenceLength);
        const seq = isNaN(Number(settings.currentSequence)) ? 1 : Number(settings.currentSequence);
        return settings.formatTemplate
            .replace("{PREFIX}", settings.invoicePrefix)
            .replace("{FY}", fyLabel)
            .replace("{SEQ}", String(seq).padStart(seqLen, "0"));
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-96">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Loading invoice settings…</p>
                </div>
            </div>
        );
    }

    if (!settings) return null;

    const autoOn = settings.autoFinancialYear;

    // Status badge for days-until-year-end
    const fyStatusBadge = () => {
        if (!autoOn) return null;
        if (daysLeft < 0) {
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                    <AlertTriangle className="h-3 w-3" />
                    Year ended — will auto-rollover on next save/load
                </span>
            );
        }
        if (daysLeft <= 30) {
            return (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                    <CalendarClock className="h-3 w-3" />
                    {daysLeft} days until year ends
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3" />
                {daysLeft} days remaining in FY
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Invoice Settings</h2>
                    <p className="text-gray-600 mt-1">Configure how invoice numbers are generated</p>
                </div>
                {hasPermission("manage_billing") && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                    >
                        {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        {saving ? "Saving…" : "Save Settings"}
                    </button>
                )}
            </div>

            {/* ── Invoice Numbering ── */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Invoice Numbering</h2>
                        <p className="text-sm text-gray-500">Configure prefix and sequence numbers</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Invoice Prefix *
                            </label>
                            <input
                                type="text"
                                name="invoicePrefix"
                                value={settings.invoicePrefix}
                                onChange={handleInput}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222]"
                            />
                            <p className="text-xs text-gray-500 mt-1">e.g. INV, BILL, ORD</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Sequence Length *
                            </label>
                            <input
                                type="number"
                                name="sequenceLength"
                                value={settings.sequenceLength}
                                onChange={handleInput}
                                min="3"
                                max="10"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222]"
                            />
                            <p className="text-xs text-gray-500 mt-1">Digits in sequence — e.g. 4 = 0001</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Current Sequence Number
                        </label>
                        <input
                            type="number"
                            name="currentSequence"
                            value={settings.currentSequence}
                            onChange={handleInput}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Auto-incremented with each invoice. Resets to 1 at financial year rollover.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ── Financial Year ── */}
            <Card>
                <CardContent className="p-6">
                    {/* Header row */}
                    <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Financial Year</h2>
                            <p className="text-sm text-gray-500">Configure FY for invoice numbering</p>
                        </div>
                        {/* Auto toggle */}
                        <div className="flex items-center gap-3">
                            {fyStatusBadge()}
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="autoFinancialYear"
                                    checked={settings.autoFinancialYear}
                                    onChange={handleInput}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900" />
                            </label>
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                Auto Financial Year
                            </span>
                        </div>
                    </div>

                    {/* ── AUTO MODE ── */}
                    {autoOn && (
                        <div className="space-y-5">
                            {/* Explanation banner */}
                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex gap-3">
                                <CalendarClock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-semibold mb-1">Automatic Financial Year Enabled</p>
                                    <p>
                                        The system will automatically advance to the next financial year on{" "}
                                        <strong>
                                            {MONTHS.find(m => m.value === fyMonth)?.label} {fyDay}
                                        </strong>{" "}
                                        each year. The invoice sequence resets to 1 on rollover — no manual action required.
                                    </p>
                                </div>
                            </div>

                            {/* Month + Day picker */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        FY Start Month *
                                    </label>
                                    <select
                                        value={fyMonth}
                                        onChange={e => setFyMonth(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222] bg-white"
                                    >
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Month the financial year begins (Indian FY = April)
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        FY Start Day *
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={31}
                                        value={fyDay}
                                        onChange={e => setFyDay(Number(e.target.value))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222]"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Day of the month (1–31)
                                    </p>
                                </div>
                            </div>

                            {/* Live calculated dates */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs text-gray-500 mb-1">Current FY Label</p>
                                    <p className="text-lg font-bold text-gray-900 font-mono">{fyPreview.label}</p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs text-gray-500 mb-1">FY Start</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        <CalendarCheck className="inline h-4 w-4 mr-1 text-green-600" />
                                        {fmtDate(fyPreview.start)}
                                    </p>
                                </div>
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-xs text-gray-500 mb-1">FY End (auto-calculated)</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        <CalendarClock className="inline h-4 w-4 mr-1 text-orange-500" />
                                        {fmtDate(fyPreview.end)}
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 italic">
                                * FY end is always auto-calculated as the day before{" "}
                                {MONTHS.find(m => m.value === fyMonth)?.label} {fyDay} of the following year.
                                You cannot set it manually in auto mode.
                            </p>
                        </div>
                    )}

                    {/* ── MANUAL MODE ── */}
                    {!autoOn && (
                        <div className="space-y-5">
                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-semibold mb-1">Manual Mode</p>
                                    <p>
                                        You control the financial year dates. The year end is auto-calculated
                                        as one year after the start date you set. You must manually update
                                        dates each year.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Financial Year Start *
                                    </label>
                                    <input
                                        type="date"
                                        name="financialYearStart"
                                        value={settings.financialYearStart ? settings.financialYearStart.split("T")[0] : ""}
                                        onChange={handleInput}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222]"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Start date of your financial year</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Financial Year End (auto-calculated)
                                    </label>
                                    <input
                                        type="date"
                                        value={settings.financialYearEnd ? settings.financialYearEnd.split("T")[0] : ""}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 opacity-70 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">One year after start date minus one day</p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ── Invoice Format ── */}
            <Card>
                <CardContent className="p-6">
                    <div className="mb-6">
                        <h2 className="text-lg font-bold text-gray-900">Invoice Format</h2>
                        <p className="text-sm text-gray-500">Auto-generated invoice number format</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Format Template
                            </label>
                            <input
                                type="text"
                                name="formatTemplate"
                                value={settings.formatTemplate}
                                onChange={handleInput}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#222222]"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Variables: <code className="bg-gray-100 px-1 rounded">{"{PREFIX}"}</code> = Prefix &nbsp;
                                <code className="bg-gray-100 px-1 rounded">{"{FY}"}</code> = Financial Year &nbsp;
                                <code className="bg-gray-100 px-1 rounded">{"{SEQ}"}</code> = Sequence
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Preview
                            </label>
                            <div className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-green-400 font-mono font-bold tracking-widest text-lg">
                                {generatePreview()}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">This is how your next invoice number will look</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
