// Factory Inspection Report PDF — synced with the 9-step Factory Inspection Form.
//
// Sections:
//   A. Company Information          (Step 1)
//   B. Warehouse & Factory Details  (Step 2)
//   C. Owner Profile                (Step 3)
//   D. Vendor Classification        (Step 4 – Vendor Classification sub-block)
//   E. Market Focus                 (Step 4 – Market Focus sub-block)
//   F. Manufacturing Facilities     (Step 5)
//   G. Certifications & Quality     (Step 6)
//   H. Contact & Trade Information  (Step 7)
//   I. Verification Summary
//   J. Issues Found
//   K. Inspection Details           (Step 8)
//   L. Factory Images               (inspector evidence photos from Step 2)
//      Signature block

import jsPDF from "jspdf"
import { formatCheckerName } from "@/lib/checkerUtils"
import autoTable from "jspdf-autotable"
import type { Verifications } from "@/components/Checker/Vendor/Steps/VI_VerifyField"
export interface FactoryReportChecker {
  name?: string
  checkerId?: string
  email?: string
  phone?: string
}

export interface FactoryReportMeta {
  inspectorName?: string
  inspectionDate?: string
  overallResult?: string
  inspectorRemarks?: string
  checker?: FactoryReportChecker | null
  location?: { latitude: number; longitude: number } | null
  generatedAt?: Date
}

export interface FactoryImageEntry {
  label: string
  dataUrl: string
}

export interface FactoryReportOptions {
  clientSignatureDataUrl?: string | null
  vendorFactoryImages?: FactoryImageEntry[] | null
  inspectorEvidenceImages?: FactoryImageEntry[] | null
  companyLogoDataUrl?: string | null
  ownerPhotoDataUrl?: string | null
  mainContactPhotoDataUrl?: string | null
  /** Data URLs for `vendor.additionalOwners[].photo`, aligned by index
   *  (null for owners without a photo). */
  additionalOwnerPhotoDataUrls?: (string | null)[] | null
}

// ── Colours ───────────────────────────────────────────────────────────────────
const BRAND: [number, number, number] = [224, 26, 27]
const SLATE: [number, number, number] = [51, 65, 85]
const MUTED: [number, number, number] = [100, 116, 139]

// ── Label maps (mirrors the form) ────────────────────────────────────────────
const BUSINESS_TYPE: Record<string, string> = {
  proprietorship: "Proprietorship",
  "pvt-ltd": "Private Limited Company",
  "partnership-firm": "Partnership Firm",
  llp: "Limited Liability Partnership (LLP)",
  unregistered: "Unregistered",
}

const OWNERSHIP_TYPE: Record<string, string> = {
  owned: "Owned",
  rented: "Rented",
  lease: "Lease",
}

const EMPLOYEE_COUNT: Record<string, string> = {
  "10-20": "10–20 employees",
  "20-50": "20–50 employees",
  "50-100": "50–100 employees",
  "100+": "More than 100 employees",
}

// Labels mirror the Manufacturing Facilities form (ManufacturingFacilities.tsx)
// exactly — `loomCount` is a legacy field key, the form calls it "Number of
// Machines"; capacities are per-day, not monthly.
const FACILITY_META: Record<string, { label: string; detailFields: Array<{ key: string; label: string; unit?: string }> }> = {
  spinning:  { label: "Spinning",  detailFields: [{ key: "spinningMachines", label: "Number of Machines", unit: "Machines" }, { key: "spinningCapacity", label: "Daily Capacity", unit: "Kg / Day" }, { key: "remarks", label: "Remarks" }] },
  weaving:   { label: "Weaving",   detailFields: [{ key: "loomCount", label: "Number of Machines", unit: "Machines" }, { key: "weavingCapacity", label: "Daily Capacity", unit: "Kg / Day" }, { key: "remarks", label: "Remarks" }] },
  dyeing:    { label: "Dyeing",    detailFields: [{ key: "dyeingMachines", label: "Number of Machines", unit: "Machines" }, { key: "dyeingCapacity", label: "Daily Capacity", unit: "Kg / Day" }, { key: "remarks", label: "Remarks" }] },
  printing:  { label: "Printing",  detailFields: [{ key: "printingMachines", label: "Number of Machines", unit: "Machines" }, { key: "printingCapacity", label: "Daily Capacity", unit: "Kg / Day" }, { key: "remarks", label: "Remarks" }] },
  stitching: { label: "Stitching", detailFields: [{ key: "stitchingMachines", label: "Number of Machines", unit: "Machines" }, { key: "stitchingCapacity", label: "Daily Capacity", unit: "Pieces / Day" }, { key: "remarks", label: "Remarks" }] },
  finishing: { label: "Final Packing and Dispatch", detailFields: [{ key: "finishingCapacity", label: "Daily Capacity", unit: "Pieces / Day" }, { key: "remarks", label: "Remarks" }] },
}

// ── Step-key → step label (for Issues section) ────────────────────────────────
function stepForKey(key: string): string {
  if (key.startsWith("certDoc_") || key.startsWith("cert_")) return "Step 6 – Certifications"
  if (key.startsWith("vt_")) return "Step 4 – Vendor & Products"
  if (key.startsWith("mf_")) return "Step 5 – Manufacturing"
  if (key.startsWith("ct_")) return "Step 7 – Contact & Trade"
  if (key.startsWith("c_"))  return "Step 1 – Company Info"
  if (key.startsWith("w_"))  return "Step 2 – Warehouse & Factory"
  if (key.startsWith("o_"))  return "Step 3 – Owner Profile"
  return "Unknown"
}

// ── Utility helpers ───────────────────────────────────────────────────────────
function blank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "")
}

function val(v: unknown): string {
  if (blank(v)) return "—"
  if (Array.isArray(v)) return v.length === 0 ? "—" : v.join(", ")
  if (typeof v === "boolean") return v ? "Yes" : "No"
  return String(v).trim()
}

// Append unit when value is a plain number (no letters already present)
function withUnit(v: unknown, unit?: string): string {
  const s = val(v)
  if (s === "—" || !unit) return s
  if (/[a-zA-Z]/.test(s)) return s
  return `${s} ${unit}`
}

function buildName(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ").trim()
}

function localLandline(countryCode: string, std?: string, number?: string): string | null {
  if (!std || !number) return null
  return `${countryCode}-${std}-${number}`
}

// Returns true only when the international landline carries an actual subscriber
// number — not just a default country-code prefix like "+91" with no digits.
function hasIntlLandline(value: unknown): boolean {
  if (blank(value)) return false
  const digits = String(value).replace(/\D/g, '')
  return digits.length > 4
}

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: true,
  })
}

// Strip ISO timestamp — return just the YYYY-MM-DD portion.
function fmtDate(v: unknown): string {
  if (blank(v)) return "—"
  const s = String(v).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

// ── Main export ───────────────────────────────────────────────────────────────
export function generateFactoryInspectionPdf(
  vendor: any,
  verifications: Verifications,
  meta: FactoryReportMeta = {},
  options: FactoryReportOptions = {}
): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentW = pageW - margin * 2
  const generatedAt = meta.generatedAt || new Date()
  const v = vendor || {}

  let y = margin

  // ── Layout helpers ──────────────────────────────────────────────────────────
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage()
      y = margin
    }
  }

  const sectionTitle = (text: string, status?: string) => {
    ensureSpace(36)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...BRAND)
    doc.text(text, margin, y)
    if (status) {
      const statusColor: [number, number, number] =
        status === 'Verified'      ? [22, 163, 74]  :
        status === 'Issues Found'  ? [220, 38, 38]  :
        [202, 138, 4]
      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(...statusColor)
      doc.text(status, pageW - margin, y, { align: "right" })
    }
    y += 6
    doc.setDrawColor(...BRAND)
    doc.setLineWidth(0.8)
    doc.line(margin, y, margin + contentW, y)
    y += 14
    doc.setTextColor(...SLATE)
  }

  const subTitle = (text: string) => {
    ensureSpace(22)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...MUTED)
    doc.text(text.toUpperCase(), margin, y)
    y += 12
    doc.setTextColor(...SLATE)
  }

  const runTable = (head: string[][], body: (string | number)[][]) => {
    if (body.length === 0) return
    autoTable(doc, {
      startY: y,
      head,
      body,
      margin: { left: margin, right: margin },
      theme: "grid",
      showHead: 'firstPage',
      headStyles: { fillColor: [241, 245, 249], textColor: BRAND, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9, textColor: SLATE },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 5, lineColor: [226, 232, 240], lineWidth: 0.5 },
    })
    // @ts-expect-error lastAutoTable is attached by the plugin at runtime
    y = (doc.lastAutoTable?.finalY ?? y) + 16
  }

  // Aggregate verification status for a section based on its field-key prefixes.
  const sectionStatus = (prefixes: string[]): string => {
    const relevant = Object.entries(verifications).filter(([key]) =>
      prefixes.some(p => key.startsWith(p))
    )
    if (relevant.length === 0) return ''
    if (relevant.every(([, fv]) => fv.ok === true))  return 'Verified'
    if (relevant.some(([, fv]) => fv.ok === false))  return 'Issues Found'
    return 'Pending'
  }

  // Render a small inline thumbnail (photo / logo) at the current y position.
  const renderThumbnail = (dataUrl: string | null | undefined, caption: string, size = 60) => {
    if (blank(dataUrl)) return
    ensureSpace(size + 16)
    const fmt = /^data:image\/png/i.test(dataUrl as string) ? "PNG" : "JPEG"
    try {
      doc.addImage(dataUrl as string, fmt, margin, y, size, size, undefined, "FAST")
      doc.setFont("helvetica", "italic")
      doc.setFontSize(8)
      doc.setTextColor(...MUTED)
      doc.text(caption, margin + size + 8, y + size / 2 + 3)
    } catch { /* skip broken image */ }
    y += size + 10
  }

  // ── Cover header ────────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageW, 72, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  doc.text("Factory Inspection Report", margin, 34)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const subtitle = [
    v.companyName,
    meta.inspectorName ? `Inspector: ${meta.inspectorName}` : "",
  ].filter(Boolean).join("  ·  ")
  doc.text(subtitle, margin, 52)
  doc.setFontSize(8)
  doc.text(`Generated: ${fmtDateTime(generatedAt)}`, pageW - margin, 34, { align: "right" })
  y = 96
  doc.setTextColor(...SLATE)

  // ── A. Company Information ──────────────────────────────────────────────────
  sectionTitle("A. Company Information", sectionStatus(['c_']))
  const gstDisplay = v.gstNumber
    ? val(v.gstNumber)
    : v.gstNumber === null || v.businessType === "unregistered"
      ? "Unregistered — no GST number"
      : "—"
  const companyRows: string[][] = [
    ["Company Name", val(v.companyName)],
    ["Business Type", val(BUSINESS_TYPE[v.businessType] || v.businessType)],
    ["GST Number", gstDisplay],
  ]
  if (!blank(v.panNumber)) companyRows.push(["PAN Number", val(v.panNumber)])
  if (!blank(v.aadhaarNumber)) companyRows.push(["Aadhaar Number", val(v.aadhaarNumber)])
  if (!blank(v.companyIdNumber)) companyRows.push(["Company ID Number", val(v.companyIdNumber)])
  if (!blank(v.iecCode)) companyRows.push(["IEC Code", val(v.iecCode)])
  if (!blank(v.website)) companyRows.push(["Website", val(v.website)])
  runTable([["Field", "Value"]], companyRows)
  renderThumbnail(options.companyLogoDataUrl, "Company Logo")

  // Business Contact Details (shown immediately after Company Information)
  const bizPhone2 = v.phoneNumber2
  const bizEmail2 = v.businessEmail2
  const bizLandline = localLandline("+91", v.localLandlineStd, v.landlineNumber)
  const bizIntlLine = hasIntlLandline(v.intlLandline) ? val(v.intlLandline) : null
  const bizContactRows: string[][] = [["Primary Phone", val(v.businessPhone)]]
  if (!blank(bizPhone2)) bizContactRows.push(["Secondary Phone", val(bizPhone2)])
  bizContactRows.push(["Primary Email", val(v.businessEmail)])
  if (!blank(bizEmail2)) bizContactRows.push(["Secondary Email", val(bizEmail2)])
  if (bizLandline) bizContactRows.push(["Local Landline", bizLandline])
  if (bizIntlLine) bizContactRows.push(["International Landline", bizIntlLine])
  subTitle("Business Contact Details")
  runTable([["Field", "Value"]], bizContactRows)

  // ── B. Warehouse & Factory Details ─────────────────────────────────────────
  sectionTitle("B. Warehouse & Factory Details", sectionStatus(['w_']))

  subTitle("Legal Address & Factory Site")
  const warehouseRows: string[][] = [
    ["Ownership Type", val(OWNERSHIP_TYPE[v.ownershipType] || v.ownershipType)],
    ["Warehousing Capacity", val(v.warehouseSize)],
  ]
  if (!blank(v.warehouseAddress)) warehouseRows.push(["Address Line 1", val(v.warehouseAddress)])
  if (!blank(v.warehouseAddressLine2)) warehouseRows.push(["Address Line 2", val(v.warehouseAddressLine2)])
  if (!blank(v.warehouseAddressLine3)) warehouseRows.push(["Address Line 3", val(v.warehouseAddressLine3)])
  if (!blank(v.warehouseLandmark)) warehouseRows.push(["Landmark", val(v.warehouseLandmark)])
  if (!blank(v.warehouseCity)) warehouseRows.push(["City", val(v.warehouseCity)])
  if (!blank(v.warehouseState)) warehouseRows.push(["State", val(v.warehouseState)])
  if (!blank(v.warehouseZipCode)) warehouseRows.push(["ZIP / Postal Code", val(v.warehouseZipCode)])
  if (!blank(v.warehouseCountry)) warehouseRows.push(["Country", val(v.warehouseCountry)])
  runTable([["Field", "Value"]], warehouseRows)

  subTitle("Warehouse Address")
  const pdfEq = (a: unknown, b: unknown) => (String(a || '').trim()) === (String(b || '').trim())
  const pdfSameAsLegal = (
    (blank(v.factoryAddress) && blank(v.factoryCity))
  ) || (
    pdfEq(v.factoryAddress, v.warehouseAddress) &&
    pdfEq(v.factoryCity, v.warehouseCity) &&
    pdfEq(v.factoryState, v.warehouseState) &&
    pdfEq(v.factoryZipCode, v.warehouseZipCode) &&
    pdfEq(v.factoryCountry, v.warehouseCountry)
  )
  if (pdfSameAsLegal) {
    runTable([["Field", "Value"]], [["Warehouse Address", "Same as Legal Address & Factory Site above"]])
    if (!blank(v.mapLink)) runTable([["Field", "Value"]], [["Map / Location Link", val(v.mapLink)]])
  } else {
    const factoryRows: string[][] = []
    if (!blank(v.factoryAddress)) factoryRows.push(["Address Line 1", val(v.factoryAddress)])
    if (!blank(v.factoryCity)) factoryRows.push(["City", val(v.factoryCity)])
    if (!blank(v.factoryState)) factoryRows.push(["State", val(v.factoryState)])
    if (!blank(v.factoryZipCode)) factoryRows.push(["ZIP / Postal Code", val(v.factoryZipCode)])
    if (!blank(v.factoryCountry)) factoryRows.push(["Country", val(v.factoryCountry)])
    if (!blank(v.mapLink)) factoryRows.push(["Map / Location Link", val(v.mapLink)])
    if (factoryRows.length > 0) runTable([["Field", "Value"]], factoryRows)
  }

  // ── C. Owner Profile ────────────────────────────────────────────────────────
  sectionTitle("C. Owner Profile", sectionStatus(['o_']))

  subTitle("Owner Identity")
  const ownerFullName = buildName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName) || v.ownerName
  const ownerLandline = localLandline("+91", v.ownerLocalLandlineStd, v.ownerLandline)
  const ownerIntlLine = hasIntlLandline(v.ownerIntlLandline) ? val(v.ownerIntlLandline) : null
  const ownerRows: string[][] = [
    ["Owner Full Name", val(ownerFullName)],
    ["Designation", val(v.designation)],
    ["Primary Phone", val(v.ownerPhone)],
  ]
  if (!blank(v.ownerPhone2)) ownerRows.push(["Secondary Phone", val(v.ownerPhone2)])
  ownerRows.push(["Primary Email", val(v.ownerEmail)])
  if (!blank(v.ownerEmail2)) ownerRows.push(["Secondary Email", val(v.ownerEmail2)])
  if (ownerLandline) ownerRows.push(["Local Landline", ownerLandline])
  if (ownerIntlLine) ownerRows.push(["International Landline", ownerIntlLine])
  ownerRows.push(["Business Start Date", fmtDate(v.businessStartDate)])
  ownerRows.push(["Number of Employees", val(EMPLOYEE_COUNT[v.employeeCount] || v.employeeCount)])
  runTable([["Field", "Value"]], ownerRows)
  renderThumbnail(options.ownerPhotoDataUrl, "Owner Profile Photo")

  if (v.ownerAddress || v.ownerCity || v.ownerState) {
    subTitle("Owner Address")
    const ownerAddrRows: string[][] = []
    if (!blank(v.ownerAddress)) ownerAddrRows.push(["Address", val(v.ownerAddress)])
    if (!blank(v.ownerCity)) ownerAddrRows.push(["City", val(v.ownerCity)])
    if (!blank(v.ownerState)) ownerAddrRows.push(["State", val(v.ownerState)])
    if (!blank(v.ownerZipCode)) ownerAddrRows.push(["ZIP Code", val(v.ownerZipCode)])
    if (!blank(v.ownerCountry)) ownerAddrRows.push(["Country", val(v.ownerCountry)])
    runTable([["Field", "Value"]], ownerAddrRows)
  }

  const additionalOwners: any[] = Array.isArray(v.additionalOwners) ? v.additionalOwners : []
  if (additionalOwners.length > 0) {
    subTitle("Additional Owners")
    runTable(
      [["Name", "Designation", "Primary Email", "Primary Phone"]],
      additionalOwners.map((o: any) => [
        val(buildName(o.title, o.firstName, o.middleName, o.lastName) || o.firstName),
        val(o.designation),
        val(o.email),
        val(o.phone),
      ])
    )
    // Per-owner profile photos (aligned by index; skips owners without one).
    additionalOwners.forEach((_o: any, i: number) => {
      renderThumbnail(
        options.additionalOwnerPhotoDataUrls?.[i],
        `Owner ${i + 2} Profile Photo`,
      )
    })
  }

  // ── D. Vendor Classification ────────────────────────────────────────────────
  sectionTitle("D. Vendor Classification", sectionStatus(['vt_']))
  const classRows: string[][] = [
    ["Vendor Types", val(Array.isArray(v.vendorTypes) ? v.vendorTypes.map((s: any) => (typeof s === 'string' && s ? s.charAt(0).toUpperCase() + s.slice(1) : s)) : v.vendorTypes)],
    ["Product Categories", val(v.productCategories)],
  ]
  if (!blank(v.categoryRemarks)) classRows.push(["Category Remarks", val(v.categoryRemarks)])
  if (!blank(v.qualityControl)) classRows.push(["Quality Control Measures", val(v.qualityControl)])
  runTable([["Field", "Value"]], classRows)

  // ── E. Market Focus ─────────────────────────────────────────────────────────
  const hasMF = !blank(v.marketFocus) || (Array.isArray(v.primaryMarkets) && v.primaryMarkets.length > 0) || (Array.isArray(v.domesticMarkets) && v.domesticMarkets.length > 0)
  if (hasMF) {
    sectionTitle("E. Market Focus", sectionStatus(['vt_']))
    const mfRows: string[][] = []
    if (!blank(v.marketFocus)) mfRows.push(["Market Focus", val(v.marketFocus)])
    if (Array.isArray(v.primaryMarkets) && v.primaryMarkets.length > 0) mfRows.push(["Primary Markets", val(v.primaryMarkets)])
    if (Array.isArray(v.domesticMarkets) && v.domesticMarkets.length > 0) mfRows.push(["Domestic Markets", val(v.domesticMarkets)])
    runTable([["Field", "Value"]], mfRows)
  }

  // ── F. Manufacturing Facilities ─────────────────────────────────────────────
  const enabledFacilities: Record<string, boolean> = v.enabledFacilities || {}
  const facilityDetails: Record<string, any> = v.facilityDetails || {}
  const activeFacilities = Object.keys(FACILITY_META).filter(f => enabledFacilities[f])

  if (activeFacilities.length > 0) {
    sectionTitle("F. Manufacturing Facilities", sectionStatus(['mf_']))

    subTitle("Active Facilities")
    activeFacilities.forEach((facilityKey) => {
      const fMeta = FACILITY_META[facilityKey]
      const details = facilityDetails[facilityKey] || {}
      const facilityRows: string[][] = [["Facility Status", "Active — declared"]]
      fMeta.detailFields.forEach(({ key, label, unit }) => {
        if (!blank(details[key])) facilityRows.push([label, withUnit(details[key], unit)])
      })
      ensureSpace(24)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)
      doc.setTextColor(...SLATE)
      doc.text(fMeta.label, margin, y)
      y += 10
      runTable([["Detail", "Value"]], facilityRows)
    })
  }

  // ── G. Certifications & Quality Control ────────────────────────────────────
  const certifications: any[] = Array.isArray(v.certifications) ? v.certifications : []
  const hasComplianceOrPkg = !blank(v.complianceStandards) || !blank(v.packagingCapabilities)
  if (certifications.length > 0 || hasComplianceOrPkg) {
    sectionTitle("G. Certifications & Quality Control", sectionStatus(['cert_', 'certDoc_']))

    if (certifications.length > 0) {
      subTitle("Quality Certifications")
      runTable(
        [["Certificate Name", "Expiry Date", "Description"]],
        certifications.map((c: any) => [
          val(c.name),
          fmtDate(c.expiryDate),
          val(c.description),
        ])
      )
    }

    const stdPkgRows: string[][] = []
    if (!blank(v.complianceStandards)) stdPkgRows.push(["Compliance Standards", val(v.complianceStandards)])
    if (!blank(v.packagingCapabilities)) stdPkgRows.push(["Packaging Capabilities", val(v.packagingCapabilities)])
    if (stdPkgRows.length > 0) {
      subTitle("Standards & Packaging")
      runTable([["Field", "Value"]], stdPkgRows)
    }
  }

  // ── H. Contact & Trade Information ─────────────────────────────────────────
  sectionTitle("H. Contact & Trade Information", sectionStatus(['ct_']))

  // Main Contact Person
  const mainContact = v.mainContact || null
  if (mainContact) {
    subTitle("Main Contact Person")
    const mcName = buildName(mainContact.title, mainContact.firstName, mainContact.middleName, mainContact.lastName)
    const mcRows: string[][] = [["Contact Name", val(mcName)]]
    if (!blank(mainContact.designation)) {
      mcRows.push(["Designation", val(mainContact.designation)])
      if (mainContact.designation === "Others" && !blank(mainContact.customDesignation))
        mcRows.push(["Custom Designation", val(mainContact.customDesignation)])
    }
    if (!blank(mainContact.department)) {
      mcRows.push(["Department", val(mainContact.department)])
      if (mainContact.department === "Others" && !blank(mainContact.customDepartment))
        mcRows.push(["Custom Department", val(mainContact.customDepartment)])
    }
    if (!blank(mainContact.email1)) mcRows.push(["Primary Email", val(mainContact.email1)])
    if (!blank(mainContact.email2)) mcRows.push(["Secondary Email", val(mainContact.email2)])
    if (!blank(mainContact.phone1)) mcRows.push(["Primary Phone", val(mainContact.phone1)])
    if (!blank(mainContact.phone2)) mcRows.push(["Secondary Phone", val(mainContact.phone2)])
    runTable([["Field", "Value"]], mcRows)
    renderThumbnail(options.mainContactPhotoDataUrl, "Main Contact Photo")
  }

  // Contact Person 2 (alternate contacts)
  const alternateContacts: any[] = Array.isArray(v.alternateContacts) ? v.alternateContacts : []
  if (alternateContacts.length > 0) {
    subTitle("Contact Person 2")
    runTable(
      [["Name", "Designation", "Department", "Primary Email", "Primary Phone"]],
      alternateContacts.map((c: any) => [
        val(buildName(c.title, c.firstName, c.middleName, c.lastName)),
        val(c.designation),
        val(c.department),
        val(c.email1),
        val(c.phone1),
      ])
    )
  }

  // Trade & Regulatory Details
  const hasTradeReg = !blank(v.tradeLicenseNumber) || !blank(v.businessRegistrationNumber) || !blank(v.taxIdentificationNumber)
  if (hasTradeReg) {
    subTitle("Trade & Regulatory Details")
    const tradeRows: string[][] = []
    if (!blank(v.tradeLicenseNumber)) tradeRows.push(["Trade License Number", val(v.tradeLicenseNumber)])
    if (!blank(v.businessRegistrationNumber)) tradeRows.push(["Business Registration Number", val(v.businessRegistrationNumber)])
    if (!blank(v.taxIdentificationNumber)) tradeRows.push(["Tax Identification Number", val(v.taxIdentificationNumber)])
    runTable([["Field", "Value"]], tradeRows)
  }

  // Import / Export Experience
  const hasImpExp = v.importExperience !== undefined || v.exportExperience !== undefined
  if (hasImpExp) {
    subTitle("Import / Export Experience")
    const impExpRows: string[][] = []
    if (v.importExperience !== undefined) impExpRows.push(["Import Experience", v.importExperience ? "Yes" : "No"])
    if (Array.isArray(v.importCountries) && v.importCountries.length > 0) impExpRows.push(["Import Countries", val(v.importCountries)])
    if (v.exportExperience !== undefined) impExpRows.push(["Export Experience", v.exportExperience ? "Yes" : "No"])
    if (Array.isArray(v.exportCountries) && v.exportCountries.length > 0) impExpRows.push(["Export Countries", val(v.exportCountries)])
    runTable([["Field", "Value"]], impExpRows)
  }

  // Banking Details
  const bankDetails = v.bankDetails || null
  if (bankDetails) {
    subTitle("Banking Details")
    const bankRows: string[][] = [
      ["Bank Name", val(bankDetails.bankName)],
      ["Account Type", val(bankDetails.accountType)],
      ["Account Holder Name", val(bankDetails.accountHolderName)],
    ]
    if (!blank(bankDetails.accountNumber)) bankRows.push(["Account Number", `****${String(bankDetails.accountNumber).slice(-4)}`])
    bankRows.push(["IFSC Code", val(bankDetails.ifscCode)])
    if (!blank(bankDetails.swiftCode)) bankRows.push(["SWIFT Code", val(bankDetails.swiftCode)])
    if (!blank(bankDetails.branchName)) bankRows.push(["Branch Name", val(bankDetails.branchName)])
    if (!blank(bankDetails.branchAddress)) bankRows.push(["Branch Address", val(bankDetails.branchAddress)])
    runTable([["Field", "Value"]], bankRows)
  }

  // ── I. Verification Summary ─────────────────────────────────────────────────
  sectionTitle("I. Verification Summary")
  const allEntries = Object.entries(verifications)
  const approved = allEntries.filter(([, v]) => v.ok === true).length
  const rejected = allEntries.filter(([, v]) => v.ok === false).length
  const pending  = allEntries.filter(([, v]) => v.ok === null).length
  const total    = allEntries.length
  const pct      = total === 0 ? 0 : Math.round((approved / total) * 100)
  runTable(
    [["Metric", "Count"]],
    [
      ["Total Fields",    String(total)],
      ["Verified OK",     String(approved)],
      ["Issues Found",    String(rejected)],
      ["Pending",         String(pending)],
      ["Verification %",  `${pct}%`],
    ]
  )

  // ── J. Issues Found ─────────────────────────────────────────────────────────
  const issues = allEntries.filter(([, v]) => v.ok === false)
  if (issues.length > 0) {
    sectionTitle("J. Issues Found")
    runTable(
      [["Step", "Remarks"]],
      issues.map(([key, v]) => [stepForKey(key), val(v.remarks)])
    )
  }

  // ── K. Inspection Details ───────────────────────────────────────────────────
  const loc = meta.location
  sectionTitle("K. Inspection Details")
  runTable(
    [["Field", "Value"]],
    [
      ["Inspector Name",   val(meta.inspectorName || formatCheckerName(meta.checker))],
      ["Checker ID",       val(meta.checker?.checkerId)],
      ["Inspector Email",  val(meta.checker?.email)],
      ["Inspector Phone",  val(meta.checker?.phone)],
      ["Inspection Date",  fmtDate(meta.inspectionDate)],
      ["Overall Result",   val(meta.overallResult)],
      ["GPS Location",     loc ? `${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}` : "Not available"],
      ["Inspector Remarks", val(meta.inspectorRemarks)],
      ["Report Generated", fmtDateTime(generatedAt)],
    ]
  )

  // ── L. Factory Images ───────────────────────────────────────────────────────
  const vendorImgs   = options.vendorFactoryImages   || []
  const inspectorImgs = options.inspectorEvidenceImages || []

  if (vendorImgs.length > 0 || inspectorImgs.length > 0) {
    sectionTitle("L. Factory Images")

    const COLS     = 3
    const IMG_W    = Math.floor((contentW - (COLS - 1) * 8) / COLS)
    const IMG_H    = Math.round(IMG_W * 0.75)  // 4:3 aspect — avoids huge squares
    const LABEL_H  = 14
    const ROW_H    = IMG_H + LABEL_H + 10

    const renderImageGroup = (heading: string, images: FactoryImageEntry[]) => {
      if (images.length === 0) return
      subTitle(heading)
      for (let i = 0; i < images.length; i += COLS) {
        ensureSpace(ROW_H)
        const row = images.slice(i, i + COLS)
        row.forEach((img, col) => {
          const x = margin + col * (IMG_W + 8)
          const fmt = /^data:image\/png/i.test(img.dataUrl) ? "PNG" : "JPEG"
          try { doc.addImage(img.dataUrl, fmt, x, y, IMG_W, IMG_H, undefined, "FAST") } catch { /* skip broken image */ }
          doc.setFont("helvetica", "normal")
          doc.setFontSize(8)
          doc.setTextColor(...MUTED)
          doc.text(img.label, x + IMG_W / 2, y + IMG_H + 9, { align: "center" })
        })
        y += ROW_H
      }
      y += 6
    }

    renderImageGroup("Vendor Registration Photos", vendorImgs)
    renderImageGroup("Inspector Evidence Photos", inspectorImgs)
  }

  // ── Sign-off block ───────────────────────────────────────────────────────────
  ensureSpace(130)
  y = Math.max(y, pageH - margin - 120)

  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.5)
  doc.line(margin, y, margin + contentW, y)
  y += 16

  const inspectionTime = generatedAt.toLocaleString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  })

  // Left: Inspector Name + Inspection Date + Inspection Time
  doc.setFontSize(9)
  const leftLines: Array<{ label: string; value: string }> = [
    { label: "Inspector:", value: val(meta.inspectorName || formatCheckerName(meta.checker)) },
    { label: "Inspection Date:", value: fmtDate(meta.inspectionDate) },
    { label: "Inspection Time:", value: inspectionTime },
  ]
  let lineY = y
  for (const { label, value } of leftLines) {
    doc.setFont("helvetica", "bold")
    doc.setTextColor(...SLATE)
    doc.text(label, margin, lineY)
    doc.setFont("helvetica", "normal")
    doc.text(value, margin + 95, lineY)
    lineY += 14
  }

  // Result stamp (bottom-left, below inspector lines)
  const result = meta.overallResult
  if (result) {
    const resultColors: Record<string, [number, number, number]> = {
      Approved: [22, 163, 74],
      Rejected: [220, 38, 38],
      "On Hold": [202, 138, 4],
      "Re-inspection Required": [234, 88, 12],
    }
    const color: [number, number, number] = resultColors[result] || SLATE
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...color)
    doc.text(`Result: ${result}`, margin, lineY + 10)
    doc.setTextColor(...SLATE)
  }

  // Right: signature block — label and content differ for digital vs manual
  const sigX = margin + contentW / 2
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(...SLATE)

  const sig = options.clientSignatureDataUrl
  if (sig) {
    // Digital: embed captured signature, label without "& Seal"
    doc.text("Client Signature:", sigX, y)
    const sigFmt = /^data:image\/png/i.test(sig) ? "PNG" : "JPEG"
    try { doc.addImage(sig, sigFmt, sigX, y + 8, 150, 50, undefined, "FAST") } catch { /* ignore */ }
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`Digitally signed  ·  ${fmtDateTime(generatedAt)}`, sigX, y + 70)
  } else {
    // Manual: blank line only — client will sign and stamp physically
    doc.text("Client Signature & Seal:", sigX, y)
    doc.setDrawColor(...MUTED)
    doc.line(sigX, y + 55, sigX + 185, y + 55)
  }

  // ── Page footers ────────────────────────────────────────────────────────────
  const pageCount = (doc as any).getNumberOfPages?.() ?? doc.internal.pages.length - 1
  for (let pg = 1; pg <= pageCount; pg++) {
    doc.setPage(pg)
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${pg} of ${pageCount}`, pageW - margin, pageH - 18, { align: "right" })
    doc.text("M2C — Confidential Factory Inspection Report", margin, pageH - 18)
  }

  return doc
}

export function pdfFileName(meta: FactoryReportMeta, signed: boolean): string {
  const base = (meta.inspectorName || "factory").replace(/[^a-z0-9]+/gi, "-").toLowerCase()
  const stamp = (meta.generatedAt || new Date()).toISOString().slice(0, 10)
  return `factory-inspection-report-${base}-${stamp}${signed ? "-signed" : ""}.pdf`
}
