# Products Module — Web ↔ Mobile Parity Contract

> QC Checker **Products** module. Goal: mobile (`checker_app`) must be a **ditto** of web (`frontend`) — every field, label, value, badge, validation identical; remove mobile-only extras.
> Web source: `frontend/src/components/Checker/Products/*` + `Report/ProductReportDetail.tsx`
> Mobile target: `checker_app/src/app/(tabs)/products.tsx`, `products/[id].tsx`, `(tabs)/product-inspection.tsx`, `components/Products/*`
> Legend: ✅ already matches · 🔧 fix to match web · ➕ add (missing in mobile) · ❌ remove (mobile-only extra) · 🐛 bug

---

## 0. CRITICAL BUGS (fix first)

| # | Issue | Web behavior | Mobile behavior | Action |
|---|---|---|---|---|
| 🐛1 | **approve/reject routing** | routes on `inspectionStatus === 'Rejected'` → `rejectProduct(id, reason, data)`, else `approveProduct`. `reason = reviewerRemarks.trim() \|\| 'Rejected during QC product inspection'` | routes on constant `finalDecision:'Approved'` (never changes) → **always approves**; ignores selected `inspectionStatus`; reject unreachable | 🔧 route on `inspectionStatus`; drop `finalDecision` |
| 🐛2 | **Reviewer Remarks** | Step 6 has a Reviewer Remarks textarea; label gets `*` and is **required when Rejected** | no reviewer-remarks input anywhere; `reviewerRemarks` submitted empty | ➕ add textarea in Step 6 + validation |
| 🐛3 | **Selfie + GPS geofence** | none (form opens directly; `/start` not gated by selfie; submit sends no coords) | before-selfie modal + after-selfie modal + `/start` geofence + submit GPS | ❌ remove all selfie/geofence (same as vendor form); auto-`/start` on mount with null coords |

---

## 1. LIST PAGE

Web `Products.tsx` · Mobile `(tabs)/products.tsx`

### Header
- Web H1 "Assigned Products", subtitle **"Review and approve or reject vendor products"**
- Mobile subtitle "Review and inspect vendor products" → 🔧 change to web's

### Status filter — values match; label + first-option text
| value | web label | mobile label | action |
|---|---|---|---|
| `''` | All Statuses | **All statuses** | 🔧 → "All Statuses" |
| PENDING | Pending | Pending | ✅ |
| REINSPECTION | Reinspection | Reinspection | ✅ |
| QC_APPROVED | Approved by QC | Approved by QC | ✅ |
| APPROVED | Approved by Admin | Approved by Admin | ✅ |
| REJECTED | Rejected | Rejected | ✅ |
- Web renders as **pill tabs**; mobile as dropdown modal. (Structural — mobile dropdown acceptable; keep, but label text must match.)

### Sort — ✅ matches exactly (Newest first / Oldest first / Price low–high / Price high–low; default `createdAt:desc`)

### Search placeholder
- Web "Search by product, SKU, category, or vendor..." · Mobile "Search product, SKU, category, vendor..." → 🔧 match web

### Approval badge colors — 🔧 MISMATCH (fix mobile to web)
| status | web (`APPROVAL_BADGE`) | mobile (`APPROVAL_STYLE`) | action |
|---|---|---|---|
| PENDING | amber | amber | ✅ |
| REINSPECTION | **purple** | orange | 🔧 → purple |
| QC_APPROVED | **blue** | emerald | 🔧 → blue |
| APPROVED | **emerald** | green | 🔧 → emerald |
| REJECTED | red | red | ✅ |

### Card / row content — ✅ mostly matches (image, name, SKU, vendor+owner, category, approval badge, View + Inspect). Inspect shows only when `PENDING\|REINSPECTION` ✅. Date filter client-side ✅.

---

## 2. DETAIL / VIEW PAGE

Web `ProductDetail.tsx` · Mobile `products/[id].tsx`

### Header pill — 🔧 mobile shows **RAW enum** (`QC_APPROVED`); web shows `APPROVAL_LABELS` → "Approved by QC". Fix to label.

### Tabs
| web | mobile | action |
|---|---|---|
| Overview | Overview | ✅ |
| **Images & Variants** | Images | 🔧 rename to "Images & Variants" |
| QC Activity | QC Activity | ✅ |

### Summary card (4 stats) — 🔧 MISMATCH (replace mobile's)
| web | mobile | action |
|---|---|---|
| **Inspection Status** (`APPROVAL_LABELS`) | Base Price | 🔧 replace |
| **Inspection Cycle** `#{n}` | Total Stock | 🔧 replace |
| **Last Inspected** (`approvedAt`) | Variants | 🔧 replace |
| **Listed** (`createdAt`) | Listed | ✅ |
| — | Inspection Cycle | (web has it; keep as one of the 4) |
→ Final mobile summary = **Inspection Status · Inspection Cycle · Last Inspected · Listed**. ❌ remove Base Price, Total Stock, Variants from summary.

### Overview → "Product" section — 🔧 align to web exactly
Web rows: **Product Name** (`name`), **Category**, **Total Stock**, **Base Color** (swatch), **Selling Unit (UOM)** (`UOM_LABELS`), **Description**, **Tags**.
Mobile rows: Category, **Sub-category** ❌, **Base Price** ❌, Total Stock, Base Color, UOM, Tags; Description separate card.
Action: ➕ add Product Name; ❌ remove Sub-category + Base Price; move Description into this section (web has it as a row); keep Total Stock/Base Color/UOM/Tags.

### Overview → "Vendor" section — 🔧 align
Web: Company, Owner, **Primary Email** (`businessEmail\|\|email`), **Secondary Email** (`businessEmail2`), **Primary Phone** (`businessPhone`), **Secondary Phone** (`phoneNumber2`), **Factory Location** = `[factoryAddress,factoryCity,factoryState,factoryZipCode,factoryCountry].join(', ')`.
Mobile: Company, Owner, Email, Phone, Factory (city+state only).
Action: 🔧 rename Email→Primary Email, Phone→Primary Phone, Factory→Factory Location (full join); ➕ add Secondary Email + Secondary Phone.

### Overview → "Fabric & Specifications" — mostly ✅. Web rows: Fabric Type, Material Description, Composition, Weight (`{weightValue} g`), Length (cm), Breadth (cm), GSM, Weight (GSM) legacy, Type of Weave, Care Instructions.
- 🔧 Mobile has an extra **Construction** row + generic `fsExtra` rows — web's fabric section has neither → remove Construction row + fsExtra (keep only web's fixed rows).
- ⚠️ Care Instructions: web renders **CareIcon cards (colored by category)**; mobile renders plain bulleted text. Same info, different visual. → render as a labeled list (functional parity); icon-card parity is a heavier follow-up (documented deviation).

### Overview → "Dispatch & Shipping" — ✅ matches (Shipping Weight, Processing/Shipping/Total Days).

### Overview → "Rejection Reason" — ✅.

### Images & Variants tab
- Web: Images grid (Primary badge) + **Variants table** (Image / Variant / Color / Stock). Mobile: Images grid + Variants cards (size/color/SKU/price/stock). 🔧 Mobile variant cards show **SKU + Price** — web variant table shows only Image/Variant/Color/Stock (no SKU, no Price). → remove SKU + Price from variant display to match web.

### QC Activity tab
- ✅ Status banner (raw enum — web also raw), Assigned QC, **Inspection Form Summary** (generic `summariseQcData` + humanize — **web does the same**, keep), Timeline.
- ➕ ADD **Re-Inspection info box** (web has it): amber "Re-Inspection Cycle #{n}", "Previous inspection was rejected…", "Previous reason: {previousInspectionData[last].rejectionReason}". Shown when `isReinspection && inspectionCycleNumber>1`.
- 🔧 Timeline: web = Listed on + Last updated only. Mobile adds "Inspection Cycle" row → remove (cycle now in summary + re-inspection box).

---

## 3. INSPECT PAGE (7 steps)

Web `ProductInspectionForm.tsx` (+ Vendor/Steps/PI_*) · Mobile `components/Products/*`

Steps ✅ match (General Info / Product Verification / Packaging / Defects / Testing / Review / Documentation), labels/descriptions ✅. Draft, edit-from-review, exit guard ✅.

### Flow — 🐛3 remove selfie + geofence (see §0). Auto-`/start` on mount (null coords). Submit sends no coords, no selfie keys.

### STEP 1 — General Info
- 🔧 **Business Type** shown RAW in mobile; web uses `getBusinessTypeLabel` (proprietorship→Proprietorship, pvt-ltd→**Private Limited Company**, partnership-firm→Partnership Firm, llp→**Limited Liability Partnership (LLP)**, unregistered→Unregistered). → add + use map.
- ✅ Service Type (6 options), read-only Inspection Date, company/factory/warehouse/contact/product cards match.

### STEP 2 — Product Verification — 🔧 key set must match web exactly
`getExpectedProductVerificationKeys` — align mobile to web:
- Basic Info keys web: `pv_name, pv_category, pv_baseColor, pv_uom, pv_brand, pv_description`. Mobile: `pv_name, pv_category, pv_subCategory, pv_brand, pv_description`.
  - ❌ remove `pv_subCategory` · ➕ add `pv_baseColor` (Base Color + swatch) · ➕ add `pv_uom` (Selling Unit (UOM), `UOM_LABELS`).
- Images: `pv_img_{i}` ✅ (label "Product Image {i+1}[ (Primary)]").
- Specs: web `pv_spec_{key}` excludes `basis` **and** `weightUnit`; mobile excludes only `basis` → 🔧 also exclude `weightUnit`.
  - Spec label map web: `weightValue→Weight`, `weave→Weave Type`, `gsm→GSM`, `length→Length`, `breadth→Breadth`. Mobile: `weightValue→"Weight Per Unit"` → 🔧 change to "Weight".
- Variants: web keys `pv_var{vi}_color, _size, _material, _variantName, _image`. Mobile: `_color, _size, _material, _sku, _variantName`.
  - ❌ remove `pv_var{vi}_sku` · ➕ add `pv_var{vi}_image`.
- Shipping/Material keys `pv_construction, pv_weight, pv_processingDays, pv_shippingDays` ✅ (web section title "Shipping"; align section grouping/titles to web: "Basic Product Information", "Product Images", "Measurements & Specifications", "Product Variants", "Packaging Information", "Labels & Markings", "Shipping").
- Packaging/Labels: `pv_packagingType, pv_packagingMaterial, pv_packagingDetails, pv_careLabel, pv_countryOfOrigin, pv_labelInfo` ✅ (objects JSON.stringify — web same).
- ✅ Validation: all expected `ok!==null` → "Please verify all product fields before continuing"; ≥1 evidence photo → "Upload at least one product evidence photo".

### STEP 3 — Packaging — ✅ matches (4 items, remark codes 1–10, CODE_LABELS, tiers, validation messages, legend). No change.

### STEP 4 — Defects/AQL
- ➕ ADD **AQL Level - Critical** input (`aqlCritical`, step 0.1) — web has it; mobile missing.
- 🔧 Validation messages → web text:
  - sampleSize≤0: mobile "Sample size must be greater than 0" → **"Enter the number of units sampled"**
  - defect photo: mobile "Add at least one defect photo as evidence" → **"Upload at least one defect photo when defects are recorded"**
- ✅ config defaults, counters, AQL pass computation (`crit≤maxCrit && major≤maxMajor && minor≤maxMinor`), titles all match.

### STEP 5 — Testing — ✅ matches (4 groups, 39 tests, exact names, custom "Add Others", 4 Additional Evidence defs, pass/fail + photo rules, validation messages). Verify test IDs match web for payload; labels confirmed identical. No functional change.

### STEP 6 — Review
- ➕ ADD **Reviewer Remarks** textarea (web): label `*` when `inspectionStatus==='Rejected'`; placeholder "Reason for rejection (required)…" (Rejected) / "Optional notes explaining this decision…".
- 🔧 Validation: web = inspectionStatus required **+ reviewerRemarks required when Rejected**. Mobile only checks inspectionStatus → add rejected-remarks rule.
- ✅ inspectionStatus options (Approved/Rejected/On Hold/Re-Inspection), summary cards.

### STEP 7 — Documentation — ✅ matches (manual vs digital sign-off, validation). No change.

### Submit routing (🐛1) — 🔧
```
if (inspectionStatus === 'Rejected')
   rejectProduct(id, reviewerRemarks.trim() || 'Rejected during QC product inspection', cleanedData)
else
   approveProduct(id, cleanedData)
```
Remove `finalDecision` constant. Remove selfie keys + coords from payload.

---

## 4. REPORT VIEW (`product-report/[id].tsx`) — reference

Web `ProductReportDetail.tsx`. Mobile status labels differ ("QC Approved" vs list "Approved by QC") — **web report page ALSO uses "Approved by QC"/"Approved by Admin"** (`statusLabels`), so 🔧 align mobile report labels to `QC_APPROVED→"Approved by QC"`, `APPROVED→"Approved by Admin"`. Report sections read legacy keys (`fd.items/measurements/tests/*Remark/factory/serviceLocation`) — this matches web's report renderer (web reads the same legacy keys), so no mobile-specific change beyond labels. (Selfie section in report becomes dead once selfies removed — harmless; leave conditional.)

---

## Summary of actions
- **List:** subtitle, "All Statuses" label, search placeholder, 3 badge colors.
- **Detail:** hero pill label, tab rename, summary 4 stats, Product section (add name/desc, remove sub-cat/price), Vendor section (primary/secondary + full factory), fabric section trim, variant table (remove SKU/price), QC re-inspection box, timeline trim.
- **Inspect:** remove selfie/geofence + auto-start; fix approve/reject routing; add reviewer remarks + validation; Step1 business-type label; Step2 key alignment (remove subCategory/sku, add baseColor/uom/variant-image, exclude weightUnit, spec label); Step4 aqlCritical input + 2 validation messages.
- **Report:** status label alignment.
