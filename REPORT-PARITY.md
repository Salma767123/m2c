# Report Module — Web ↔ Mobile Parity Contract

> QC Checker **Report** module. Goal: mobile ditto with web; remove mobile-only extras; fix data-shape mismatches.
> Web: `frontend/src/components/Checker/Report/*` (Report.tsx, ProductReportDetail.tsx) + PDF libs.
> Mobile: `checker_app/src/app/(tabs)/report/index.tsx`, `factory-report/[id].tsx`+`components/Report/ViewReport.tsx`, `product-report/[id].tsx`, `lib/reportPdf.ts`.
> Legend: ✅ matches · 🔧 fix · ➕ add · ❌ remove · 🐛 correctness bug

---

## 0. CORRECTNESS BUGS

| # | Issue | Detail | Action |
|---|---|---|---|
| 🐛1 | **Product report VIEW reads LEGACY keys** | Mobile `product-report/[id].tsx` renders Preparation(`fd.items`), Measurements(`fd.measurements`), Packaging&Remarks(`fd.*Remark` /10), On-site Testing(`fd.tests`). The current inspect form produces `productVerifications`/`packagingItems`/`testGroups`/defect keys. → these sections show EMPTY/legacy for new inspections. Web `ProductReportDetail` reads the NEW keys. | 🔧 rebuild mobile product report view to web's sections (see §3) |
| 🐛2 | **Product report PDF reads LEGACY keys** | `lib/reportPdf.ts buildProductHtml` uses items/measurements/tests/*Remark. Web `productInspectionReportPdf` uses productVerifications/packagingItems/testGroups. | 🔧 rebuild product PDF sections to new keys (see §5) |
| 🐛3 | **Product list badge raw enum** | list card shows `approvalStatus.replace(_→' ')` → "QC APPROVED". Web + mobile detail use friendly labels. | 🔧 use STATUS_LABELS (Approved by QC / Approved by Admin / Rejected) |

---

## 1. LIST PAGE

Web `Report.tsx` · Mobile `report/index.tsx`. Header "Inspection Reports" / "Your completed quality control reports" ✅.

### Tabs
🔧 Tab labels: mobile "Factory" / "Product" → web **"Factory Reports"** / **"Product Reports"**.

### Factory tab
| item | web | mobile | action |
|---|---|---|---|
| Search placeholder | "Search by vendor, client..." | "Search vendor, client..." | 🔧 match |
| Result options | All results / **Approved**(PASSED) / **Rejected**(FAILED) | All results / **Passed** / **Failed** | 🔧 labels → Approved/Rejected |
| Sort options | Latest first / Oldest first (completedAt) | + **Vendor A–Z / Vendor Z–A** (vendorName) | ❌ remove the 2 vendorName sorts |
| Columns | Vendor · **Vendor ID** · **Assigned Date**(scheduledDate) · Completed On · **Priority** · Result | vendor · **factoryName** · Vendor ID · **Client** · Completed + result+priority badges | 🔧 card should show Vendor, Vendor ID, **Assigned Date**, Completed On, Priority, Result. ❌ drop factoryName + Client (web has neither). |
| Result badge | 8-state map (Approved/QC Approved/Re-Inspection/Rejected/In Progress/Submitted for Review/Under Admin Review/Completed) | 3-state (Passed/Failed/raw) | 🔧 expand to web's `getResultBadge` map incl. **PASSED→"Approved"** |
| Priority badge | high red / medium amber / low emerald | same | ✅ |
| **View/Download actions** | **NONE** (rows read-only) | **View Report + Download** per row | ⚠️ DECISION — see §2 |

### Product tab
| item | web | mobile | action |
|---|---|---|---|
| Search placeholder | "Search by product, SKU, or vendor..." | "Search product, SKU, vendor..." | 🔧 match |
| Status options | All results / Approved / Rejected | same | ✅ |
| Sort options | Latest first / Oldest first (updatedAt) | + **Name A–Z / Name Z–A** | ❌ remove the 2 name sorts |
| Columns | Product(img+name) · Vendor · Category · SKU · **Inspected On** · Result · Actions | name · SKU · vendor·category · badge · View+Download | 🔧 add **Inspected On** (updatedAt); keep View Report + Download (web has both) |
| Result badge | QC_APPROVED→"Approved by QC", APPROVED→"Approved by Admin", REJECTED→"Rejected" (emerald/emerald/red) | **raw enum** | 🔧 use friendly labels (🐛3) |

---

## 2. FACTORY REPORT VIEW — DECISION NEEDED

Web has **no factory report detail page and no View/Download in the factory list** (factory PDF only downloadable during inspection sign-off). Mobile has a full `factory-report/[id]` + `ViewReport.tsx` + per-row View/Download.
- **Option A (strict ditto):** remove factory View/Download buttons + the ViewReport screen; factory list becomes read-only (web-exact).
- **Option B (keep as mobile enhancement):** keep the factory report view/download (useful on mobile), just align its sections/labels to the factory PDF and remove dead selfie/location blocks.
→ **Ask the user.** (Recommend B — web's omission isn't a designed feature; but honor ditto if they want A.)

If kept (B): 🔧 align ViewReport to web factory PDF sections; ❌ remove dead **Selfie Verification** + **Location Verification** blocks (selfies/geofence removed from inspect flow → always empty); header result pill → friendly "Approved/Rejected" (not raw PASSED/FAILED); ➕ show inspector-evidence photos (`fd.factoryEvidence` slots) which currently appear only in the PDF.

---

## 3. PRODUCT REPORT VIEW — rebuild to web sections (🐛1)

Web `ProductReportDetail` sections (read exact from web) → mobile must render these, reading the NEW keys:
- **Header**: back → report?tab=product; "Product Inspection Report"; `{name} • SKU: {baseSku||N/A}`; **Download PDF** (+ Preview keep); status badge via `statusLabels`/`statusColors` (QC_APPROVED "Approved by QC" emerald, APPROVED "Approved by Admin" emerald, REJECTED red, REINSPECTION amber, PENDING slate).
- **Summary banner**: Product / Vendor / Category / Inspected On(updatedAt).
- **Rejection Reason** (if product.rejectionReason).
- **Section 1 General Information**: Client/Vendor/Factory/Service Location/Service Start Date/Service Type (fd.*).
- **Section 2 Product Verification**: table Field(`humanizeVerKey`)/Status(Verified/Not Verified/Not Checked)/Remarks over `fd.productVerifications`; + Product Evidence Photos (`fd.productEvidencePhotos`).
- **Section 3 Packaging Inspection**: table Item/Inspected/Remark Code(`REMARK_LABELS`)/Remarks over `fd.packagingItems`; + Packaging Photos (`fd.packagingPhotos`).
- **Section 4 Defects & AQL**: Inspection Level, Sample Size; table Type/AQL/Max/Found/Status(Exceeded|Within Limit) for Critical/Major/Minor; detail boxes; + Defect Photos (`fd.defectPhotos`).
- **Section 5 On-site Testing**: per `fd.testGroups[]` group label + pass/fail counts; per test PASS/FAIL/No decision + right/wrong photo grids; Additional Evidence chips (`fd.additionalEvidence`).
- **Section 6 Review & Final Decision**: Inspector's Decision(`fd.inspectionStatus`), Final Status badge, Reviewer Remarks(`fd.reviewerRemarks`).
- **Section 7 Documentation & Sign-off**: Client Signature(`fd.clientSignature` image or "Not captured"), Digitally-Signed Report(`fd.signedReport` links), Signed Documents(`fd.signedDocuments`), Company ID Cards(`fd.companyIdCards`), General Documentation Photos(`fd.documentationPhotos`).
- **Selfie Verification** (conditional on beforeSelfiePhoto/afterSelfiePhoto — web keeps it conditional; will just never show for new inspections; ❌ optionally drop since selfies removed).
- **Timestamps**: Product Listed(createdAt), Inspected On(updatedAt), Approval Status(statusLabels).
❌ Remove the legacy sections (Preparation/Measurements/Packaging&Remarks/legacy Testing) and legacy keys (items/measurements/*Remark/warehousePhotoEvidences/measurementPhotos/photocopyDocuments/inspectorSignature-as-text).
➕ Section-header blue icons per the app's icon convention.

---

## 4. Dead blocks to remove (selfies/geofence removed earlier)
- ❌ **Selfie Verification** blocks in factory view, product view, and PDF `buildSelfieHtml` (always empty for new data). (Web keeps product selfie conditional — acceptable to keep conditional OR remove; prefer remove for cleanliness since the inspect flow no longer captures selfies.)
- ❌ **Location Verification** block in factory ViewReport (geofence removed).

---

## 5. PRODUCT PDF rebuild (🐛2)
`lib/reportPdf.ts buildProductHtml` → match web `productInspectionReportPdf` sections: A General, B Main Contact, C Product Being Inspected, D Product Verification(`productVerifications`), E Packaging(`packagingItems`), F Defects(AQL), G Testing(`testGroups`), H Inspector Details, J Attached Documents, + signature block. Remove legacy items/measurements/tests/*Remark sections. Keep M2C branding/canonical variant/filename `Product_Report_{name}_{sku}.pdf`.
(Factory PDF already close to web's factory sections A–L — keep; just drop `buildSelfieHtml`.)

---

## Summary of actions
- List: tab labels, factory result labels+badge map, product list badge labels, add Inspected On, remove 4 extra sort options, search placeholders, factory columns (Assigned Date, drop factoryName/Client).
- Factory view: DECISION (keep vs remove); if keep, align + drop selfie/location.
- Product view: **rebuild to web's 7 sections + new keys** (biggest item).
- Product PDF: rebuild to web sections/new keys.
- Remove dead selfie/location everywhere.
- Section-header icons everywhere (icon convention).
