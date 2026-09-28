// Shared data definitions for the Product Inspection Form redesign.
// Imported by step components and the orchestrator for consistent defaults.

export const PACKAGING_ITEM_DEFS = [
  { id: 'shipperCarton',    label: 'Shipper Carton Packaging',     detail: 'Front, side, top views — carton condition and markings' },
  { id: 'innerCarton',      label: 'Inner Carton Packaging',        detail: 'Inner packaging structure and protection condition' },
  { id: 'retailPackaging',  label: 'Retail Packaging',              detail: 'Brand sticker, warning labels, retail presentation' },
  { id: 'productType',      label: 'Product Type — style, size, color, construction, material, marking, labeling', detail: 'Matches approved specifications and purchase order' },
] as const

export const TEST_GROUP_DEFS = [
  {
    id: 'packagingVerification',
    label: 'Packaging Verification',
    tests: [
      { id: 'pvFrontView',              label: 'Front View Photo' },
      { id: 'pvSideView',               label: 'Side View Photo' },
      { id: 'pvTopView',                label: 'Top View Photo' },
      { id: 'pvShipperCartonCheck',     label: 'Shipper Carton Check' },
      { id: 'pvInnerPackagingCheck',    label: 'Inner Packaging Check' },
      { id: 'pvRetailPackagingCheck',   label: 'Retail Packaging Check' },
      { id: 'pvShippingMarkVerification', label: 'Shipping Mark Verification' },
      { id: 'pvLabelVerification',      label: 'Label Verification' },
      { id: 'pvBrandStickerVerification', label: 'Brand Sticker Verification' },
      { id: 'pvWarningLabelVerification', label: 'Warning Label Verification' },
      { id: 'pvPolybagAirHoleCheck',    label: 'Polybag & Air Hole Check' },
      { id: 'pvSilicaGelCheck',         label: 'Silica Gel Check' },
    ],
  },
  {
    id: 'productVerification',
    label: 'Product Verification',
    tests: [
      { id: 'prMaterialVerification',   label: 'Material Verification' },
      { id: 'prConstructionVerification', label: 'Construction Verification' },
      { id: 'prColorCheck',             label: 'Color Check' },
      { id: 'prWashCareLabelCheck',     label: 'Wash Care Label Check' },
      { id: 'prProductAppearanceCheck', label: 'Product Appearance Check' },
      { id: 'prSampleVsBulkComparison', label: 'Sample vs Bulk Comparison' },
    ],
  },
  {
    id: 'measurementInspection',
    label: 'Measurement Inspection',
    tests: [
      { id: 'miCartonDimensions',       label: 'Carton Dimensions' },
      { id: 'miCartonGrossWeight',      label: 'Carton Gross Weight' },
      { id: 'miRetailPackageDimensions',label: 'Retail Package Dimensions' },
      { id: 'miProductDimensions',      label: 'Product Dimensions (Length & Width)' },
      { id: 'miProductWeight',          label: 'Product Weight' },
      { id: 'miBrandStickerDimensions', label: 'Brand Sticker Dimensions' },
      { id: 'miWarningLabelDimensions', label: 'Warning Label Dimensions' },
    ],
  },
  {
    id: 'functionalTests',
    label: 'Functional Tests',
    tests: [
      { id: 'ftCartonDropTest',         label: 'Carton Drop Test' },
      { id: 'ftStitchPerInch',          label: 'Stitch Per Inch (SPI) Check' },
      { id: 'ftDryCrocking',            label: 'Dry Crocking (Dry Rub Test)' },
      { id: 'ftWetCrocking',            label: 'Wet Crocking (Wet Rub Test)' },
      { id: 'ftSeamStrengthTest',       label: 'Seam Strength Test' },
      { id: 'ftOdorCheck',              label: 'Odor (Smell) Check' },
      { id: 'ftFunctionCheck',          label: 'Function Check' },
      { id: 'ftBarcodeCheck',           label: 'Barcode Check' },
      { id: 'ftPrintingAdhesionTest',   label: 'Printing Adhesion Test' },
      { id: 'ftHandWashTest',           label: 'Hand Wash Test' },
      { id: 'ftDishwasherTest',         label: 'Dishwasher Test' },
      { id: 'ftFastenerVelcroFatigue',  label: 'Fastener / Velcro Fatigue Test' },
      { id: 'ftGsmTest',                label: 'GSM Test' },
      { id: 'ftMetalDetectorTest',      label: 'Metal Detector Test' },
    ],
  },
] as const

export const ADDITIONAL_EVIDENCE_DEFS = [
  { id: 'majorDefectiveSamples', label: 'Major Defective Samples (Sealed View)' },
  { id: 'minorDefectiveSamples', label: 'Minor Defective Samples (Sealed View)' },
  { id: 'factoryFrontView',      label: 'Factory Front View' },
  { id: 'factoryNameBoard',      label: 'Factory Name Board' },
] as const

// ── Default state builders ──────────────────────────────────────────────────

export type PackagingItem = {
  id: string
  label: string
  detail: string
  verified: boolean | null
  remarkCode: number | null
  remarks: string
}

export type TestItem = {
  id: string
  label: string
  pass: boolean | null
  fail: boolean | null
  remarks: string
  rightPhotos: any[]
  wrongPhotos: any[]
  isOther?: boolean
  subject?: string
}

export type TestGroup = {
  id: string
  label: string
  collapsed: boolean
  tests: TestItem[]
  // For the Measurement Inspection & Functional Tests groups: whether the goods are
  // packed as 'Carton' or 'Bale'. Selecting it relabels the group's test names
  // (e.g. "Carton Drop Test" ⇄ "Bale Drop Test"). Undefined = Carton (the default).
  packagingType?: 'Carton' | 'Bale'
}

// Groups that expose the Carton/Bale packaging toggle (their test names carry the word).
export const PACKAGING_TOGGLE_GROUPS = ['measurementInspection', 'functionalTests'] as const

// Testing-step checks that the checker MAY leave unanswered (no Pass/Fail required).
// If they DO answer, the normal photo rule still applies.
export const OPTIONAL_TEST_IDS = new Set<string>([
  'pvBrandStickerVerification', // Brand Sticker Verification
  'pvSilicaGelCheck',           // Silica Gel Check
  'miBrandStickerDimensions',   // Brand Sticker Dimensions
  'ftBarcodeCheck',             // Barcode Check
])

// Whether a test is optional. Carton Drop Test is a special case: optional only when
// the goods are packed as Bale, but mandatory for Carton (its default).
export function isTestOptional(testId: string, packagingType?: 'Carton' | 'Bale'): boolean {
  if (OPTIONAL_TEST_IDS.has(testId)) return true
  if (testId === 'ftCartonDropTest') return (packagingType || 'Carton') === 'Bale'
  return false
}

// Canonical display labels for the Product Verification (Step 2) fields. Single source
// used by the form's summary, the report detail view AND the PDF so they never drift —
// e.g. pv_baseColor reads "Product Color" everywhere, pv_uom reads "Unit (UOM)".
const VERIFICATION_FIELD_LABELS: Record<string, string> = {
  pv_category: 'Category',
  pv_name: 'Product Name',
  pv_baseColor: 'Product Color',
  pv_uom: 'Unit (UOM)',
  pv_brand: 'Brand',
  pv_description: 'Product Description',
  pv_fabricType: 'Fabric Type',
  pv_material: 'Material Description',
  pv_careLabel: 'Care Label',
  pv_countryOfOrigin: 'Country of Origin',
  pv_labelInfo: 'Label Information',
  pv_construction: 'Construction',
  pv_weight: 'Shipping Weight',
  pv_processingDays: 'Processing Days',
  pv_shippingDays: 'Shipping Days',
}

const VERIFICATION_SPEC_LABELS: Record<string, string> = {
  weightValue: 'Weight', weave: 'Weave Type', gsm: 'GSM', length: 'Length', breadth: 'Width',
  careInstructions: 'Care Instructions',
}

/** Human label for a productVerifications key (report view + PDF share this). */
export function verificationLabel(key: string): string {
  if (VERIFICATION_FIELD_LABELS[key]) return VERIFICATION_FIELD_LABELS[key]
  const spec = key.match(/^pv_spec_(.+)$/)
  if (spec) return VERIFICATION_SPEC_LABELS[spec[1]] || spec[1].replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
  const variant = key.match(/^pv_var(\d+)_(.+)$/)
  if (variant) return `Variant ${Number(variant[1]) + 1} ${variant[2].replace(/^./, (c) => c.toUpperCase())}`
  const img = key.match(/^pv_img_(\d+)$/)
  if (img) return `Product Image ${Number(img[1]) + 1}`
  return key.replace(/^pv_/, '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Swap the packaging word in a test label to the chosen type — "Carton Drop Test"
// ⇄ "Bale Drop Test". Whole-word, case-insensitive; labels without the word are
// returned unchanged.
export function relabelForPackaging(label: string, type: 'Carton' | 'Bale'): string {
  return label.replace(/\b(carton|bale)\b/gi, type)
}

export function makeDefaultPackagingItems(): PackagingItem[] {
  return PACKAGING_ITEM_DEFS.map(d => ({
    id: d.id,
    label: d.label,
    detail: d.detail,
    verified: null,
    remarkCode: null,
    remarks: '',
  }))
}

export function makeDefaultTestGroups(): TestGroup[] {
  return TEST_GROUP_DEFS.map(g => ({
    id: g.id,
    label: g.label,
    collapsed: false,
    ...(PACKAGING_TOGGLE_GROUPS.includes(g.id as any) ? { packagingType: 'Carton' as const } : {}),
    tests: g.tests.map(t => ({
      id: t.id,
      label: t.label,
      pass: null,
      fail: null,
      remarks: '',
      rightPhotos: [],
      wrongPhotos: [],
    })),
  }))
}

export function makeDefaultAdditionalEvidence(): Record<string, any[]> {
  const out: Record<string, any[]> = {}
  ADDITIONAL_EVIDENCE_DEFS.forEach(d => { out[d.id] = [] })
  return out
}

// ── Packaging-mode driven form shaping ──────────────────────────────────────
// A product carries packagingType ('PACKED' | 'UNPACKED') and, when packed,
// packingType ('BALE' | 'CARTON'), set by the vendor. These drive the QC form:
//   • UNPACKED  → the packaging-specific sections are skipped entirely.
//   • PACKED    → the Measurement/Functional groups' Carton/Bale toggle is
//                 pre-selected to match the vendor's packingType.

// Packaging items shown only when the product is PACKED (skipped for UNPACKED).
export const PACKED_ONLY_PACKAGING_ITEM_IDS = new Set<string>(['shipperCarton', 'innerCarton', 'retailPackaging'])
// Test groups shown only when the product is PACKED (skipped for UNPACKED).
export const PACKED_ONLY_TEST_GROUP_IDS = new Set<string>(['packagingVerification', 'measurementInspection', 'functionalTests'])

/** Is this product marked UNPACKED by the vendor? */
export function isProductUnpacked(product?: { packagingType?: string | null } | null): boolean {
  return String(product?.packagingType || '').toUpperCase() === 'UNPACKED'
}

/** Map the product's packingType ('BALE' | 'CARTON') to the Carton/Bale toggle value. */
export function packingTypeToToggle(packingType?: string | null): 'Carton' | 'Bale' {
  return String(packingType || '').toUpperCase() === 'BALE' ? 'Bale' : 'Carton'
}

/** Filter packaging items for the product's packaging mode (drops carton-only items when UNPACKED). */
export function packagingItemsForMode(items: PackagingItem[], unpacked: boolean): PackagingItem[] {
  if (!unpacked) return items
  return items.filter(it => !PACKED_ONLY_PACKAGING_ITEM_IDS.has(it.id))
}

/**
 * Filter + seed test groups for the product's packaging mode:
 *   • UNPACKED → drops the packaging/measurement/functional groups.
 *   • PACKED   → sets the Carton/Bale toggle on the toggle groups to `toggle`
 *                and relabels their (non-custom) test names to match.
 */
export function testGroupsForMode(groups: TestGroup[], unpacked: boolean, toggle: 'Carton' | 'Bale'): TestGroup[] {
  const kept = unpacked ? groups.filter(g => !PACKED_ONLY_TEST_GROUP_IDS.has(g.id)) : groups
  return kept.map(g => {
    if (!PACKAGING_TOGGLE_GROUPS.includes(g.id as any)) return g
    if ((g.packagingType || 'Carton') === toggle) return g
    return {
      ...g,
      packagingType: toggle,
      tests: g.tests.map(t => (t.isOther ? t : { ...t, label: relabelForPackaging(t.label, toggle) })),
    }
  })
}
