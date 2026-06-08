// Client-side generator for the Product Inspection report PDF.
//
// Produces a full overview of every inspection step (general info, items,
// measurements, packaging remarks + score, defects/AQL, on-site tests, overall
// result), the quality-checker's details, the capture location + timestamp,
// thumbnails of the attached documents, and a client signature block at the
// bottom of the last page.
//
// When `clientSignatureDataUrl` is supplied the signature image is embedded in
// the signature block — that "merged" document is the digitally-signed report.
// Without it, a blank signature line is drawn so the client can sign a printed
// copy.

import jsPDF from "jspdf"
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
    location?: { latitude: number; longitude: number } | null
    generatedAt?: Date
}

export interface ReportOptions {
    clientSignatureDataUrl?: string | null
}

const BRAND: [number, number, number] = [224, 26, 27] // brand-500 #e01a1b
const SLATE: [number, number, number] = [51, 65, 85] // slate-700
const MUTED: [number, number, number] = [100, 116, 139] // slate-500

// ── Remark scoring (mirrors Review.tsx) ──────────────────────────────────────
function computeOverallResult(formData: any) {
    const categories = [
        "shipperCartonRemark",
        "innerCartonRemark",
        "retailPackagingRemark",
        "productTypeRemark",
        "aqlWorkmanshipRemark",
        "onSiteTestsRemark",
    ]
    const codes: number[] = []
    categories.forEach((key) => {
        const raw = formData?.[key]
        if (raw != null && String(raw).trim() !== "") {
            const code = parseInt(String(raw).trim(), 10)
            if (!isNaN(code) && code >= 1 && code <= 10) codes.push(code)
        }
    })
    const average = codes.length > 0 ? codes.reduce((s, c) => s + c, 0) / codes.length : 10
    let status = "REJECTED"
    if (average >= 8) status = "PASS"
    else if (average >= 6) status = "RE-INSPECTION"
    return { average, status, count: codes.length }
}

function fmtDateTime(d: Date) {
    return d.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    })
}

/**
 * Build the full Product Inspection report and return the jsPDF document.
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

    // Track the current vertical cursor across mixed content (tables + images).
    let y = margin

    const ensureSpace = (needed: number) => {
        if (y + needed > pageH - margin) {
            doc.addPage()
            y = margin
        }
    }

    const sectionTitle = (text: string) => {
        ensureSpace(28)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(12)
        doc.setTextColor(...BRAND)
        doc.text(text, margin, y)
        y += 6
        doc.setDrawColor(...BRAND)
        doc.setLineWidth(1)
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
            headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
            bodyStyles: { fontSize: 9, textColor: SLATE },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            styles: { cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5 },
        })
        // @ts-expect-error lastAutoTable is attached by the plugin at runtime
        y = (doc.lastAutoTable?.finalY ?? y) + 18
    }

    // ── Header ────────────────────────────────────────────────────────────────
    doc.setFillColor(...BRAND)
    doc.rect(0, 0, pageW, 70, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Product Inspection Report", margin, 34)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(
        `${meta.productName || "Product"}${meta.vendorName ? "  •  " + meta.vendorName : ""}`,
        margin,
        52
    )
    doc.setFontSize(8)
    doc.text(`Generated: ${fmtDateTime(generatedAt)}`, pageW - margin, 34, { align: "right" })
    y = 92
    doc.setTextColor(...SLATE)

    // ── General Information ─────────────────────────────────────────────────────
    sectionTitle("A. General Information")
    runTable(
        [["Field", "Value"]],
        [
            ["Client", formData.client || "—"],
            ["Vendor", formData.vendor || meta.vendorName || "—"],
            ["Factory", formData.factory || "—"],
            ["Service Location", formData.serviceLocation || "—"],
            ["Service Start Date", formData.serviceStartDate || "—"],
            ["Service Type", formData.serviceType || "—"],
        ]
    )

    // ── Inspection Items ────────────────────────────────────────────────────────
    const items: any[] = Array.isArray(formData.items) ? formData.items : []
    if (items.length > 0) {
        sectionTitle("B. Inspection Items")
        runTable(
            [["Item", "Description", "Total Qty", "Inspection Qty"]],
            items.map((it) => [
                it.itemName || "—",
                it.itemDescription || "—",
                it.totalQuantity ?? 0,
                it.inspectionQuantity ?? 0,
            ])
        )
    }

    // ── Measurements ────────────────────────────────────────────────────────────
    const measurements: any[] = Array.isArray(formData.measurements) ? formData.measurements : []
    if (measurements.length > 0) {
        sectionTitle("Measurements")
        // Collect a stable set of dimension keys present on the samples.
        const dimKeys = Array.from(
            measurements.reduce((set: Set<string>, m: any) => {
                Object.keys(m || {}).forEach((k) => {
                    if (!["id", "name", "label", "sample"].includes(k)) set.add(k)
                })
                return set
            }, new Set<string>())
        )
        const head = [["#", ...(dimKeys.length ? dimKeys : ["Value"])]]
        const body = measurements.map((m: any, i: number) => [
            m.name || m.label || `Sample ${i + 1}`,
            ...(dimKeys.length ? dimKeys.map((k) => (m?.[k] ?? "—")) : [JSON.stringify(m)]),
        ])
        runTable(head, body)
    }

    // ── Packaging / Appearance Remarks ──────────────────────────────────────────
    sectionTitle("C. Inspection Result Summary (Remark Codes)")
    runTable(
        [["Category", "Remark Code (1-10)"]],
        [
            ["Shipper Carton Packaging", formData.shipperCartonRemark || "—"],
            ["Inner Carton Packaging", formData.innerCartonRemark || "—"],
            ["Retail Packaging", formData.retailPackagingRemark || "—"],
            ["Product Type (style, size, color, etc.)", formData.productTypeRemark || "—"],
            ["AQL (Workmanship / Appearance / Function)", formData.aqlWorkmanshipRemark || "—"],
            ["On-site Tests", formData.onSiteTestsRemark || "—"],
        ]
    )

    // ── Defects (AQL) ───────────────────────────────────────────────────────────
    sectionTitle("Defects (AQL Summary)")
    runTable(
        [["Severity", "Found", "Max Allowed", "Details"]],
        [
            [
                "Critical",
                formData.criticalDefects ?? 0,
                formData.maxAllowedCritical ?? 0,
                formData.criticalDefectDetails || "—",
            ],
            [
                "Major",
                formData.majorDefects ?? 0,
                formData.maxAllowedMajor ?? 0,
                formData.majorDefectDetails || "—",
            ],
            [
                "Minor",
                formData.minorDefects ?? 0,
                formData.maxAllowedMinor ?? 0,
                formData.minorDefectDetails || "—",
            ],
        ]
    )

    // ── On-site Tests ───────────────────────────────────────────────────────────
    const tests: any[] = Array.isArray(formData.tests) ? formData.tests : []
    if (tests.length > 0) {
        sectionTitle("On-site Tests")
        runTable(
            [["Test", "Result", "Right Photos", "Wrong Photos"]],
            tests.map((t) => [
                t.label || "—",
                t.pass ? "PASS" : t.fail ? "FAIL" : "—",
                Array.isArray(t.rightPhotos) ? t.rightPhotos.length : 0,
                Array.isArray(t.wrongPhotos) ? t.wrongPhotos.length : 0,
            ])
        )
    }

    // ── Overall Result ──────────────────────────────────────────────────────────
    const result = computeOverallResult(formData)
    sectionTitle("Overall Result")
    runTable(
        [["Metric", "Value"]],
        [
            ["Average Score", `${result.average.toFixed(1)} / 10`],
            ["Result", result.status],
            ["Final Decision", formData.finalDecision || "—"],
            ["Reviewer Remarks", formData.reviewerRemarks || "—"],
        ]
    )

    // ── Quality Checker + capture context ───────────────────────────────────────
    const checker = meta.checker || {}
    const loc = meta.location
    sectionTitle("Inspection Conducted By")
    runTable(
        [["Field", "Value"]],
        [
            ["Quality Checker", checker.name || formData.inspectorSignature || "—"],
            ["Checker ID", checker.checkerId || "—"],
            ["Email", checker.email || "—"],
            ["Phone", checker.phone || "—"],
            [
                "GPS Location",
                loc ? `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}` : "Not available",
            ],
            ["Date & Time", fmtDateTime(generatedAt)],
        ]
    )

    // ── Attached documents (thumbnails) ─────────────────────────────────────────
    const docImages: any[] = [
        ...(Array.isArray(formData.documentationPhotos) ? formData.documentationPhotos : []),
        ...(Array.isArray(formData.signedDocuments) ? formData.signedDocuments : []),
        ...(Array.isArray(formData.companyIdCards) ? formData.companyIdCards : []),
    ].filter((p) => p && (p.data || p.url))

    if (docImages.length > 0) {
        sectionTitle("Attached Documents")
        const cols = 3
        const gap = 12
        const thumbW = (contentW - gap * (cols - 1)) / cols
        const thumbH = thumbW * 0.72
        let col = 0
        docImages.forEach((img) => {
            if (col === 0) ensureSpace(thumbH + 16)
            const x = margin + col * (thumbW + gap)
            try {
                doc.addImage(img.data || img.url, "JPEG", x, y, thumbW, thumbH, undefined, "FAST")
            } catch {
                doc.setDrawColor?.(226, 232, 240)
                doc.rect(x, y, thumbW, thumbH)
            }
            doc.setFontSize(7)
            doc.setTextColor(...MUTED)
            doc.text(String(img.name || "document").slice(0, 28), x, y + thumbH + 9)
            col++
            if (col === cols) {
                col = 0
                y += thumbH + 22
            }
        })
        if (col !== 0) y += thumbH + 22
        doc.setTextColor(...SLATE)
    }

    // ── Client signature block (always on a fresh stretch at the bottom) ─────────
    ensureSpace(120)
    y = Math.max(y, pageH - margin - 110)
    doc.setDrawColor(...BRAND)
    doc.setLineWidth(0.5)
    doc.line(margin, y, margin + contentW, y)
    y += 18

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...SLATE)
    doc.text("Inspector:", margin, y)
    doc.setFont("helvetica", "normal")
    doc.text(checker.name || formData.inspectorSignature || "—", margin + 60, y)

    // Right-hand client signature area.
    const sigX = margin + contentW / 2
    doc.setFont("helvetica", "bold")
    doc.text("Client Signature:", sigX, y)

    const sig = options.clientSignatureDataUrl
    if (sig) {
        const sigFmt = /^data:image\/png/i.test(sig) ? "PNG" : "JPEG"
        try {
            doc.addImage(sig, sigFmt, sigX, y + 8, 150, 50, undefined, "FAST")
        } catch {
            /* ignore malformed signature image */
        }
        doc.setFont("helvetica", "italic")
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(`Digitally signed • ${fmtDateTime(generatedAt)}`, sigX, y + 70)
    } else {
        doc.setDrawColor(...MUTED)
        doc.line(sigX, y + 48, sigX + 180, y + 48)
        doc.setFont("helvetica", "italic")
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text("Signature / Date", sigX, y + 60)
    }

    // ── Page footer numbers ─────────────────────────────────────────────────────
    const pageCount = (doc as any).getNumberOfPages?.() ?? doc.internal.pages.length - 1
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p)
        doc.setFontSize(8)
        doc.setTextColor(...MUTED)
        doc.text(`Page ${p} of ${pageCount}`, pageW - margin, pageH - 18, { align: "right" })
        doc.text("M2C — Confidential Inspection Report", margin, pageH - 18)
    }

    return doc
}

export function pdfFileName(meta: ReportMeta, signed: boolean): string {
    const base = (meta.productName || "product").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
    const stamp = (meta.generatedAt || new Date()).toISOString().slice(0, 10)
    return `inspection-report-${base}-${stamp}${signed ? "-signed" : ""}.pdf`
}
