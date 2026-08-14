// Client-side generator for the Product Inspection report PDF.
//
// Produces a structured report aligned with the 7-step Product Inspection Form:
//   A. General Information
//   B. Main Contact Person
//   C. Product Being Inspected
//   D. Product Verification
//   E. Packaging Inspection
//   F. Testing            (order mirrors the inspection form: Testing before Defects)
//   G. Defects (AQL)
//   H. Final Decision
//   I. Inspector Details
//   Signature block (manual or digital)
//
// All data is read dynamically from `formData`. Blank values render as "—".
// When `clientSignatureDataUrl` is supplied the signature image is embedded
// (digitally-signed report). Without it a blank line is drawn for manual signing.

import jsPDF from "jspdf"
import { formatCheckerName, formatInspectionDate } from "@/lib/checkerUtils"
import { verificationLabel, isTestOptional } from "@/components/Checker/Vendor/Steps/PI_data"
import { resolveOwnerDesignation } from "@/lib/utils"
import { formatDuration } from "@/lib/inspectionDuration"
import autoTable from "jspdf-autotable"

export interface ReportChecker {
    name?: string
    checkerId?: string
    email?: string
    phone?: string
}

export interface ReportMeta {
    productName?: string
    vendorName?: string
    checker?: ReportChecker | null
    /** 'PHYSICAL' | 'VIRTUAL'. Decides whether GPS coordinates are printed. */
    inspectionType?: string | null
    location?: { latitude: number; longitude: number } | null
    /** Location verification so the report names the exact site the checker was verified at. */
    locationVerified?: boolean | null
    locationDistanceM?: number | null
    /** 'legal/factory' | 'warehouse' — which registered address matched. */
    matchedAddress?: string | null
    inspectionStartedAt?: string
    /** ISO string for when the inspection was completed/submitted. */
    inspectionCompletedAt?: string
    generatedAt?: Date
    // Duration breakdown (see lib/inspectionDuration.ts). When present, the report
    // prints Active / Paused / Total rows; exceededSchedule highlights the total.
    activeDurationMs?: number
    pausedDurationMs?: number
    totalDurationMs?: number
    scheduledDurationMs?: number
    exceededSchedule?: boolean
}

export interface ReportOptions {
    clientSignatureDataUrl?: string | null
}

const BRAND: [number, number, number] = [224, 26, 27]   // #e01a1b
const SLATE: [number, number, number] = [51, 65, 85]    // slate-700
const MUTED: [number, number, number] = [100, 116, 139] // slate-500

// Business-type full forms (mirrors the registration form / factory report).
const BUSINESS_TYPE_LABELS: Record<string, string> = {
    proprietorship: "Proprietorship",
    "pvt-ltd": "Private Limited Company",
    "partnership-firm": "Partnership Firm",
    llp: "Limited Liability Partnership (LLP)",
    unregistered: "Unregistered",
}
// Full form when known; otherwise Title-Case the raw value (first letter caps).
const businessTypeLabel = (val?: string | null): string => {
    if (!val) return "—"
    const key = String(val).trim().toLowerCase()
    if (BUSINESS_TYPE_LABELS[key]) return BUSINESS_TYPE_LABELS[key]
    return key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

const REMARK_LABELS: Record<number, string> = {
    1: "Critical Defect", 2: "Major Defect", 3: "Functional Fail",
    4: "Safety Issue", 5: "Non-Conformance", 6: "Minor Issue",
    7: "Re-inspection", 8: "Acceptable", 9: "Good", 10: "Excellent",
}

function fmtDateTime(d: Date) {
    return d.toLocaleString("en-US", {
        year: "numeric", month: "short", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: true,
    })
}

function fmtTime(d: Date) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
}

function blank(v: unknown): boolean {
    return v === null || v === undefined || (typeof v === "string" && v.trim() === "")
}

function val(v: unknown): string {
    if (blank(v)) return "—"
    return String(v).trim()
}

// Resolve main contact name from the mainContact object or owner fields.
function resolveContactName(v: any): string {
    if (!v) return "—"
    const mc = v.mainContact && typeof v.mainContact === "object" ? v.mainContact : null
    if (mc) {
        const parts = [mc.title, mc.firstName, mc.middleName, mc.lastName].filter(Boolean)
        return parts.length ? parts.join(" ") : mc.name || "—"
    }
    const ownerParts = [v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName].filter(Boolean)
    return ownerParts.length ? ownerParts.join(" ") : v.ownerName || "—"
}

/**
 * Build the full Product Inspection PDF and return the jsPDF document.
 */
export function generateProductInspectionPdf(
    formData: any,
    meta: ReportMeta = {},
    options: ReportOptions = {}
): jsPDF {
    const doc = new jsPDF({ unit: "pt", format: "a4" })
    const pageW = doc.internal.pageSize.getWidth()
    const pageH = doc.internal.pageSize.getHeight()
    const margin = 40
    const contentW = pageW - margin * 2
    const generatedAt = meta.generatedAt || new Date()
    // Inspection start time comes from when the inspection was opened; the complete
    // time uses the real completion stamp when available, else the report-gen time.
    const startTimeStr = meta.inspectionStartedAt ? fmtTime(new Date(meta.inspectionStartedAt)) : "—"
    const completeTimeStr = fmtTime(meta.inspectionCompletedAt ? new Date(meta.inspectionCompletedAt) : generatedAt)
    const checker = meta.checker || {}

    let y = margin

    const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
            doc.addPage()
            y = margin
        }
    }

    const sectionTitle = (text: string) => {
        ensureSpace(32)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(11)
        doc.setTextColor(...BRAND)
        doc.text(text, margin, y)
        y += 6
        doc.setDrawColor(...BRAND)
        doc.setLineWidth(0.8)
        doc.line(margin, y, margin + contentW, y)
        y += 14
        doc.setTextColor(...SLATE)
    }

    const runTable = (head: string[][], body: (string | number)[][]) => {
        autoTable(doc, {
            startY: y,
            head,
            body,
            margin: { left: margin, right: margin },
            theme: "grid",
            // Section table headers match the PDF's top header band — light brand
            // tint + brand-red bold text + red border — instead of a solid red fill.
            headStyles: { fillColor: [255, 245, 245], textColor: BRAND, fontSize: 9, fontStyle: "bold", lineColor: BRAND, lineWidth: 0.5 },
            bodyStyles: { fontSize: 9, textColor: SLATE },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5 },
        })
        // @ts-expect-error lastAutoTable is attached by the plugin at runtime
        y = (doc.lastAutoTable?.finalY ?? y) + 16
    }

    // Render a labelled grid of uploaded evidence photos (embedded, not just a count).
    // Images are base64 data URLs stored on submit, so addImage works synchronously.
    const photoGrid = (photos: any[] | undefined, heading?: string) => {
        const imgs = (Array.isArray(photos) ? photos : []).filter((p) => p && (p.data || p.url) && !p.isPdf)
        if (imgs.length === 0) return
        const cols = 5
        const gap = 8
        const thumbW = (contentW - gap * (cols - 1)) / cols
        const thumbH = thumbW * 0.75
        const rowGap = 10
        // Keep the heading with its first row so a page break never orphans it.
        if (heading) {
            ensureSpace(16 + thumbH + rowGap)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(8.5)
            doc.setTextColor(...SLATE)
            doc.text(`${heading} (${imgs.length})`, margin, y)
            y += 13
        }
        // Draw strictly row by row: reserve the full row height, capture the row's top
        // once, draw every thumbnail at that same top, then advance y past the row. This
        // makes it impossible for the next section to overlap the images.
        for (let i = 0; i < imgs.length; i += cols) {
            ensureSpace(thumbH + rowGap)
            const rowY = y
            imgs.slice(i, i + cols).forEach((img, c) => {
                const x = margin + c * (thumbW + gap)
                try {
                    doc.addImage(img.data || img.url, "JPEG", x, rowY, thumbW, thumbH, undefined, "FAST")
                } catch {
                    doc.setDrawColor(226, 232, 240)
                    doc.rect(x, rowY, thumbW, thumbH)
                }
            })
            y = rowY + thumbH + rowGap
        }
        // Extra trailing gap so the NEXT section's title (drawn on its text baseline,
        // whose ascenders sit ~8pt above y) never visually touches the last image row.
        y += 12
        doc.setTextColor(...SLATE)
    }

    // ── Cover header (matches the Factory Inspection Report style) ───────────────
    doc.setFillColor(255, 245, 245)
    doc.rect(0, 0, pageW, 72, "F")
    // Red accent line along the bottom of the header
    doc.setDrawColor(...BRAND)
    doc.setLineWidth(2)
    doc.line(0, 72, pageW, 72)
    // Title in brand red
    doc.setTextColor(...BRAND)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Product Inspection Report", margin, 34)
    // Subtitle and date in slate
    doc.setTextColor(...SLATE)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    const subtitle = [meta.productName || "Product", meta.vendorName].filter(Boolean).join("  ·  ")
    doc.text(subtitle, margin, 52)
    doc.setFontSize(8)
    doc.text(`Generated: ${fmtDateTime(generatedAt)}`, pageW - margin, 34, { align: "right" })
    y = 96
    doc.setTextColor(...SLATE)

    // ── A. General Information ─────────────────────────────────────────────────
    const v = formData.vendorData || {}
    sectionTitle("A. General Information")
    const generalRows: [string, string][] = [
        ["Company Name", val(v.companyName || formData.vendor || meta.vendorName)],
        ["Business Type", businessTypeLabel(v.businessType)],
        ["Primary Phone", val(v.businessPhone)],
        ["Secondary Phone", val(v.phoneNumber2)],
        ["Primary Email", val(v.businessEmail)],
        ["Inspection Date", val(formatInspectionDate(formData.serviceStartDate))],
        ["Service Type", val(formData.serviceType)],
    ]
    runTable(
        [["Field", "Value"]],
        // Hide "Secondary Phone" when there's no value.
        generalRows.filter(([label, value]) => !(label.startsWith("Secondary") && value === "—")),
    )

    // ── B. Main Contact Person ─────────────────────────────────────────────────
    const mc = v.mainContact && typeof v.mainContact === "object" ? v.mainContact : null
    const contactRows: [string, string][] = [
        ["Full Name", resolveContactName(v)],
        ["Designation", val(mc ? mc.customDesignation || mc.designation : resolveOwnerDesignation(v.designation))],
        ["Department", val(mc ? mc.customDepartment || mc.department : undefined)],
        ["Primary Phone", val(mc ? mc.phone1 || mc.phone : v.ownerPhone)],
        ["Secondary Phone", val(mc ? mc.phone2 : v.ownerPhone2)],
        ["Primary Email", val(mc ? mc.email1 || mc.email : v.ownerEmail)],
        ["Secondary Email", val(mc ? mc.email2 : v.ownerEmail2)],
    ]
    // Hide "Secondary Phone"/"Secondary Email" rows when they have no value.
    const visibleContactRows = contactRows.filter(([label, value]) => !(label.startsWith("Secondary") && value === "—"))
    const hasContactData = visibleContactRows.some(([, v]) => v !== "—")
    if (hasContactData) {
        sectionTitle("B. Main Contact Person")
        runTable([["Field", "Value"]], visibleContactRows)
    }


    // ── C. Product Being Inspected ─────────────────────────────────────────────
    const p = formData.productData || {}
    if (p.name || p.category) {
        sectionTitle("C. Product Being Inspected")
        const productRows: [string, string][] = [
            ["Product Name", val(p.name)],
            ["Category", val(p.category)],
            ["Sub-Category", val(p.subCategory)],
        ]
        runTable(
            [["Field", "Value"]],
            // Hide "Sub-Category" when there's no value (vendors don't set it).
            productRows.filter(([label, value]) => !(label === "Sub-Category" && value === "—")),
        )
    }

    // ── C2. Manufacturer (who made the item) ───────────────────────────────────
    const mi = p.manufacturerInfo || {}
    const mfrName = [mi.title, mi.fullName].filter((x: unknown) => x && String(x).trim()).join(" ").trim()
    if (mfrName || mi.role || mi.experience || mi.description) {
        sectionTitle("Manufacturer Information")
        const mfrRows: [string, string][] = [
            ["Name", val(mfrName)],
            ["Role", val(mi.role)],
            ["Experience", val(mi.experience)],
            ["Description", val(mi.description)],
        ]
        runTable([["Field", "Value"]], mfrRows.filter(([, value]) => value !== "—"))
    }

    // ── D. Product Verification ────────────────────────────────────────────────
    sectionTitle("D. Product Verification")
    const verEntries = Object.entries(formData.productVerifications || {})
    if (verEntries.length === 0) {
        doc.setFont("helvetica", "italic")
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        doc.text("No product fields were verified.", margin, y)
        y += 20
        doc.setTextColor(...SLATE)
    } else {
        const verBody = verEntries.map(([key, entry]: [string, any]) => [
            verificationLabel(key),
            entry.ok === true ? "Verified" : entry.ok === false ? "Not Verified" : "Not Checked",
            val(entry.remarks),
        ])
        runTable([["Field", "Status", "Remarks"]], verBody)
    }
    photoGrid(formData.productEvidencePhotos, "Product Verification Evidence")

    // ── E. Packaging Inspection ────────────────────────────────────────────────
    sectionTitle("E. Packaging Inspection")
    const pkgItems: any[] = Array.isArray(formData.packagingItems) ? formData.packagingItems : []
    if (pkgItems.length === 0) {
        doc.setFont("helvetica", "italic")
        doc.setFontSize(9)
        doc.setTextColor(...MUTED)
        doc.text("No packaging items recorded.", margin, y)
        y += 20
        doc.setTextColor(...SLATE)
    } else {
        const pkgBody = pkgItems.map((item: any) => {
            const code = item.remarkCode != null ? `${item.remarkCode} — ${REMARK_LABELS[item.remarkCode] || ""}` : "—"
            return [
                (item.label || "").split("—")[0].trim(),
                item.verified === true ? "Yes" : item.verified === false ? "No" : "—",
                code,
                val(item.remarks),
            ]
        })
        runTable([["Item", "Inspected", "Remark Code", "Remarks"]], pkgBody)
    }
    photoGrid(formData.packagingPhotos, "Packaging Photos")

    // ── F. Defects (AQL) ──────────────────────────────────────────────────────
    // ── F. Testing ────────────────────────────────────────────────────────────
    // Report section order mirrors the inspection form: Testing comes before Defects.
    const testGroups: any[] = Array.isArray(formData.testGroups) ? formData.testGroups : []
    if (testGroups.length > 0) {
        sectionTitle("F. Testing")
        for (const group of testGroups) {
            const tests: any[] = Array.isArray(group.tests) ? group.tests : []
            const gPass = tests.filter((t) => t.pass).length
            const gFail = tests.filter((t) => t.fail).length
            const groupLabel = `${group.label || "Group"}  (${gPass} passed, ${gFail} failed)`
            ensureSpace(28)
            doc.setFont("helvetica", "bold")
            doc.setFontSize(9)
            doc.setTextColor(...SLATE)
            doc.text(groupLabel, margin, y)
            y += 14

            // Photos per test — kept alongside the row so the pass/fail thumbnails can be
            // drawn inside the "Pass Photos" / "Fail Photos" cells (didDrawCell below).
            const rowPhotos = tests.map((t: any) => ({
                right: (Array.isArray(t.rightPhotos) ? t.rightPhotos : []).filter((p: any) => p && (p.data || p.url)),
                wrong: (Array.isArray(t.wrongPhotos) ? t.wrongPhotos : []).filter((p: any) => p && (p.data || p.url)),
            }))
            const testBody = tests.map((t: any, i: number) => [
                // Custom tests: show "Name (Subject)  [Custom]" so their data isn't lost.
                t.isOther
                    ? `${val(t.label || t.subject)}${t.subject && t.label ? ` (${t.subject})` : ""}  [Custom]`
                    : val(t.label),
                t.pass === true ? "Pass" : t.fail === true ? "Fail"
                    : (!t.isOther && isTestOptional(t.id, group.packagingType) ? "Optional" : "—"),
                val(t.remarks),
                rowPhotos[i].right.length ? "" : "—",
                rowPhotos[i].wrong.length ? "" : "—",
            ])

            const THUMB = 24, TPAD = 3
            autoTable(doc, {
                startY: y,
                head: [["Test", "Result", "Remarks", "Pass Photos", "Fail Photos"]],
                body: testBody,
                margin: { left: margin, right: margin },
                theme: "grid",
                headStyles: { fillColor: [255, 245, 245], textColor: BRAND, fontSize: 9, fontStyle: "bold", lineColor: BRAND, lineWidth: 0.5 },
                bodyStyles: { fontSize: 9, textColor: SLATE, valign: "middle" },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                styles: { cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5 },
                columnStyles: { 3: { cellWidth: 104, halign: "left" }, 4: { cellWidth: 104, halign: "left" } },
                // Reserve vertical space so the embedded thumbnails fit in the photo cells.
                didParseCell: (d: any) => {
                    if (d.section === "body" && (d.column.index === 3 || d.column.index === 4)) {
                        const set = d.column.index === 3 ? rowPhotos[d.row.index]?.right : rowPhotos[d.row.index]?.wrong
                        const n = set?.length || 0
                        if (n > 0) {
                            const perRow = Math.max(1, Math.floor((d.cell.width - TPAD) / (THUMB + TPAD)))
                            const lines = Math.ceil(n / perRow)
                            d.cell.styles.minCellHeight = lines * (THUMB + TPAD) + TPAD
                        }
                    }
                },
                // Draw each uploaded pass/fail photo as a small thumbnail inside its cell.
                didDrawCell: (d: any) => {
                    if (d.section === "body" && (d.column.index === 3 || d.column.index === 4)) {
                        const set = d.column.index === 3 ? rowPhotos[d.row.index]?.right : rowPhotos[d.row.index]?.wrong
                        if (!set || set.length === 0) return
                        const perRow = Math.max(1, Math.floor((d.cell.width - TPAD) / (THUMB + TPAD)))
                        set.forEach((p: any, i: number) => {
                            const cx = d.cell.x + TPAD + (i % perRow) * (THUMB + TPAD)
                            const cy = d.cell.y + TPAD + Math.floor(i / perRow) * (THUMB + TPAD)
                            try { doc.addImage(p.data || p.url, "JPEG", cx, cy, THUMB, THUMB, undefined, "FAST") } catch { /* skip bad image */ }
                        })
                    }
                },
            })
            // @ts-expect-error lastAutoTable is attached by the plugin at runtime
            y = (doc.lastAutoTable?.finalY ?? y) + 16
        }

        // Additional evidence — embed the actual photos, grouped by category.
        const additionalEvidence: Record<string, any[]> = formData.additionalEvidence || {}
        Object.entries(additionalEvidence)
            .filter(([, photos]) => Array.isArray(photos) && photos.length > 0)
            .forEach(([key, photos]) => photoGrid(photos, `Additional Evidence — ${key.replace(/_/g, " ")}`))
    }

    // ── G. Defects (AQL) ──────────────────────────────────────────────────────
    sectionTitle("G. Defects — AQL Summary")
    runTable(
        [["Field", "Value"]],
        [
            ["Inspection Level", val(formData.inspectionLevel)],
            ["Sample Size", val(formData.sampleSize)],
            ["AQL Critical", val(formData.aqlCritical)],
            ["AQL Major", val(formData.aqlMajor)],
            ["AQL Minor", val(formData.aqlMinor)],
        ]
    )
    runTable(
        [["Severity", "Found", "Max Allowed", "Details"]],
        [
            ["Critical", String(formData.criticalDefects ?? 0), String(formData.maxAllowedCritical ?? 0), val(formData.criticalDefectDetails)],
            ["Major", String(formData.majorDefects ?? 0), String(formData.maxAllowedMajor ?? 0), val(formData.majorDefectDetails)],
            ["Minor", String(formData.minorDefects ?? 0), String(formData.maxAllowedMinor ?? 0), val(formData.minorDefectDetails)],
        ]
    )
    photoGrid(formData.defectPhotos, "Defect Photos")

    // ── H. Inspector Details ──────────────────────────────────────────────────
    const loc = meta.location
    const isVirtual = String(meta.inspectionType).toUpperCase() === "VIRTUAL"
    const matchedSiteLabel =
        meta.matchedAddress === "warehouse" ? "Warehouse address"
        : meta.matchedAddress === "legal/factory" ? "Legal / Factory site"
        : "Vendor location"
    sectionTitle("H. Inspector Details")
    runTable(
        [["Field", "Value"]],
        [
            ["Inspector Name", val(formatCheckerName(checker) || formData.inspectorSignature)],
            ["Checker ID", val(checker.checkerId)],
            ["Email", val(checker.email)],
            ["Phone", val(checker.phone)],
            ["Inspection Type", isVirtual ? "Virtual Inspection" : "Physical Inspection"],
            ["Inspection Date", val(formatInspectionDate(formData.serviceStartDate))],
            ["Inspection Start Time", startTimeStr],
            ["Inspection Complete Time", completeTimeStr],
            // Duration breakdown across pauses (only when time tracking is available).
            ...(meta.totalDurationMs != null && meta.totalDurationMs > 0
                ? [
                    ["Active Duration", formatDuration(meta.activeDurationMs || 0)],
                    ["Paused Duration", formatDuration(meta.pausedDurationMs || 0)],
                    ["Total Duration", `${formatDuration(meta.totalDurationMs || 0)}${meta.exceededSchedule ? "  (exceeded scheduled duration)" : ""}`],
                  ]
                : []),
            ["Inspection Status", val(formData.inspectionStatus)],
            // Virtual inspections have no location — show the type in place of coordinates.
            ...(isVirtual
                ? []
                : [["GPS Location", loc ? `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}` : "Not available"]]),
            // Which registered address the checker was verified at (the product's chosen
            // site). Only shown when verification info was captured (final stored reports).
            ...(isVirtual || meta.locationVerified == null
                ? []
                : [["Verified Site", meta.locationVerified
                      ? `${matchedSiteLabel}${meta.locationDistanceM != null ? ` — ${Math.round(meta.locationDistanceM)}m away` : ""}`
                      : "Not verified"]]),
            ["Report Generated", fmtDateTime(generatedAt)],
        ]
    )

    // Highlight when the inspection ran past its scheduled duration.
    if (meta.exceededSchedule) {
        ensureSpace(20)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(8.5)
        doc.setTextColor(200, 30, 30)
        doc.text(
            `⚠  Exceeded scheduled duration${meta.scheduledDurationMs ? ` (scheduled ${formatDuration(meta.scheduledDurationMs)})` : ""} — active work took ${formatDuration(meta.activeDurationMs || 0)}.`,
            margin, y
        )
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...SLATE)
        y += 16
    }

    // ── Attached documents (thumbnails) ───────────────────────────────────────
    const docImages: any[] = [
        ...(Array.isArray(formData.documentationPhotos) ? formData.documentationPhotos : []),
        ...(Array.isArray(formData.signedDocuments) ? formData.signedDocuments : []),
    ].filter((d) => d && (d.data || d.url) && !d.isPdf)

    if (docImages.length > 0) {
        sectionTitle("J. Attached Documents")
        const cols = 3
        const gap = 12
        const thumbW = (contentW - gap * (cols - 1)) / cols
        const thumbH = thumbW * 0.72
        let col = 0
        docImages.forEach((img) => {
            if (col === 0) ensureSpace(thumbH + 24)
            const x = margin + col * (thumbW + gap)
            try {
                doc.addImage(img.data || img.url, "JPEG", x, y, thumbW, thumbH, undefined, "FAST")
            } catch {
                doc.setDrawColor(226, 232, 240)
                doc.rect(x, y, thumbW, thumbH)
            }
            doc.setFontSize(7)
            doc.setTextColor(...MUTED)
            doc.text(String(img.name || "document").slice(0, 30), x, y + thumbH + 9)
            col++
            if (col === cols) { col = 0; y += thumbH + 24 }
        })
        if (col !== 0) y += thumbH + 24
        doc.setTextColor(...SLATE)
    }

    // ── Signature block ────────────────────────────────────────────────────────
    const sig = options.clientSignatureDataUrl
    ensureSpace(160)
    y = Math.max(y, pageH - margin - 150)

    doc.setDrawColor(...BRAND)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentW, y)
    const blockY = y + 20

    // Left: Inspector section (Name + Date + Time)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...SLATE)
    doc.text("Inspector:", margin, blockY)
    doc.setFont("helvetica", "normal")
    doc.text(val(formatCheckerName(checker) || formData.inspectorSignature), margin + 65, blockY)

    doc.setFont("helvetica", "bold")
    doc.text("Inspection Date:", margin, blockY + 22)
    doc.setFont("helvetica", "normal")
    doc.text(val(formatInspectionDate(formData.serviceStartDate)), margin + 108, blockY + 22)

    doc.setFont("helvetica", "bold")
    doc.text("Inspection Start Time:", margin, blockY + 44)
    doc.setFont("helvetica", "normal")
    doc.text(startTimeStr, margin + 130, blockY + 44)

    doc.setFont("helvetica", "bold")
    doc.text("Inspection Complete Time:", margin, blockY + 66)
    doc.setFont("helvetica", "normal")
    doc.text(completeTimeStr, margin + 148, blockY + 66)

    // Right: Client Signature section
    const sigX = margin + contentW / 2
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...SLATE)

    if (sig) {
        // Digital signed report — "Client Signature:" + embedded image
        doc.text("Client Signature:", sigX, blockY)
        const sigFmt = /^data:image\/png/i.test(sig) ? "PNG" : "JPEG"
        try {
            doc.addImage(sig, sigFmt, sigX, blockY + 8, 150, 50, undefined, "FAST")
        } catch { /* ignore malformed */ }
        doc.setFont("helvetica", "italic")
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(`Digitally signed  ·  ${fmtDateTime(generatedAt)}`, sigX, blockY + 74)
    } else {
        // Manual report — "Client Signature & Seal:" + blank line (no "Signature / Date")
        doc.text("Client Signature & Seal:", sigX, blockY)
        doc.setDrawColor(...MUTED)
        doc.setLineWidth(0.5)
        doc.line(sigX, blockY + 50, sigX + 180, blockY + 50)
    }

    // Inspection Status stamp (bottom-left of signature block)
    const status = formData.inspectionStatus
    if (status) {
        const statusColors: Record<string, [number, number, number]> = {
            Approved: [22, 163, 74],
            Rejected: [220, 38, 38],
            "On Hold": [202, 138, 4],
            "Re-Inspection": [234, 88, 12],
        }
        const color: [number, number, number] = statusColors[status] || SLATE
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(...color)
        // A full line below "Inspection Complete Time" (blockY + 66) so it no
        // longer overlaps that row.
        doc.text(`Status: ${status}`, margin, blockY + 92)
        doc.setTextColor(...SLATE)
    }

    // ── Page footers ──────────────────────────────────────────────────────────
    const pageCount = (doc as any).getNumberOfPages?.() ?? doc.internal.pages.length - 1
    for (let pg = 1; pg <= pageCount; pg++) {
        doc.setPage(pg)
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(`Page ${pg} of ${pageCount}`, pageW - margin, pageH - 18, { align: "right" })
        doc.text("M2C — Confidential Inspection Report", margin, pageH - 18)
    }

    return doc
}

export function pdfFileName(meta: ReportMeta, signed: boolean): string {
    const base = (meta.productName || "product").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
    const stamp = (meta.generatedAt || new Date()).toISOString().slice(0, 10)
    return `inspection-report-${base}-${stamp}${signed ? "-signed" : ""}.pdf`
}
