import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Path, Circle, Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { Package, Image as ImageIcon, Ruler, Layers, Box, Tag, Truck, Camera, Check, X } from 'lucide-react-native';
import { getExpectedProductVerificationKeys } from '../validation';
import {
  StepHeader,
  Card,
  ErrorBanner,
  VerifyField,
  PhotoGrid,
  PhotoLightbox,
  RemarkInput,
  Photo,
} from './piShared';
import { InvalidAnchor } from './piValidation';
import type { ScrollNavHandlers } from '@/components/General/ScrollNav';

// ── Verifications type ────────────────────────────────────────────────────────
type Verification = { ok: boolean | null; remarks: string };
type Verifications = Record<string, Verification>;

const SUPPORTED_WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];

// Mirror the product form's UOM dropdown labels.
const UOM_LABELS: Record<string, string> = {
  pcs: 'Pieces (pcs)', meters: 'Meters', kg: 'Kilograms (kg)', yards: 'Yards',
  sets: 'Sets', rolls: 'Rolls', pairs: 'Pairs', dozen: 'Dozen',
};

// Resolve a color name (e.g. "red") to its hex when no hex is stored.
const COLOR_NAME_HEX: Record<string, string> = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080',
  silver: '#c0c0c0', red: '#ff0000', green: '#008000', lime: '#00ff00',
  blue: '#0000ff', navy: '#000080', yellow: '#ffff00', magenta: '#ff00ff',
  cyan: '#00ffff', maroon: '#800000', olive: '#808000', purple: '#800080',
  teal: '#008080', orange: '#ffa500', pink: '#ffc0cb', brown: '#a52a2a',
  beige: '#f5f5dc',
};
function resolveHex(name?: string, hex?: string): string | undefined {
  if (hex && /^#[0-9a-fA-F]{3,8}$/.test(hex.trim())) return hex.trim();
  const n = (name || '').trim().toLowerCase();
  return COLOR_NAME_HEX[n];
}
// "name" → "name (#hex)" when a hex is known.
function colorValue(name?: string, hex?: string): string {
  const h = resolveHex(name, hex);
  const n = name || '';
  return h ? `${n} (${h})` : n;
}
// A small colour swatch to sit in the field header.
function colorSwatch(name?: string, hex?: string): React.ReactNode {
  const h = resolveHex(name, hex);
  if (!h) return undefined;
  return (
    <View
      style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: h }}
      className="border border-slate-300"
    />
  );
}

// ── Care-instruction icon catalogue (ported 1:1 from the web CareInstructionModal) ─
const CATEGORY_COLORS: Record<string, string> = {
  Washing: '#e01a1b',
  Bleaching: '#f59e0b',
  Drying: '#10b981',
  Ironing: '#f97316',
  'Dry Cleaning': '#8b5cf6',
  Special: '#f43f5e',
};

type CarePaths = (color: string) => React.ReactNode;

const washTub = <Path key="tub" d="M4 10H28V21Q28 25 24 25H8Q4 25 4 21Z" />;
const washWave = <Path key="wave" d="M9 18Q11.5 15.5 14 18Q16.5 20.5 19 18Q21.5 15.5 23 18" />;
const notX = <Path key="x" d="M8 8L24 24M24 8L8 24" strokeWidth={2.2} />;
const drySquare = <Rect key="sq" x={3} y={3} width={26} height={26} rx={2} />;
const bigCircle = <Circle key="c" cx={16} cy={16} r={12} />;
const ironBody = [
  <Path key="body" d="M4 22H23Q27 22 28 20L28 17Q28 15 25 15H10Q7 15 4 18Z" />,
  <Path key="handle" d="M11 15V10Q11 9 12 9H15Q16 9 16 10V15" />,
];
const dot = (cx: number, color: string) => (
  <Circle key={`d${cx}`} cx={cx} cy={19} r={1.5} fill={color} stroke="none" />
);
const tempText = (label: string, color: string) => (
  <SvgText key="t" x={16} y={21} textAnchor="middle" fontSize={8} fill={color} stroke="none">
    {label}
  </SvgText>
);

const CARE_INSTRUCTIONS: { id: string; label: string; category: string; paths: CarePaths }[] = [
  { id: 'machine-wash', label: 'Machine Wash', category: 'Washing', paths: () => [washTub, washWave] },
  { id: 'hand-wash', label: 'Hand Wash', category: 'Washing', paths: () => [washTub, <Path key="fingers" d="M16 24V17M13 23V18M19 23V18M11 22V19M21 22V19" strokeWidth={1.5} />] },
  { id: 'warm-wash', label: 'Warm Wash (40°C)', category: 'Washing', paths: (c) => [washTub, tempText('40°', c)] },
  { id: 'cold-wash', label: 'Cold Wash (30°C)', category: 'Washing', paths: (c) => [washTub, tempText('30°', c)] },
  { id: 'do-not-wash', label: 'Do Not Wash', category: 'Washing', paths: () => [washTub, notX] },
  { id: 'bleach', label: 'Bleach Allowed', category: 'Bleaching', paths: () => <Path d="M16 4L29 28H3Z" /> },
  { id: 'non-chlorine-bleach', label: 'Non-Chlorine Bleach', category: 'Bleaching', paths: () => [<Path key="tri" d="M16 4L29 28H3Z" />, <Line key="ln" x1={16} y1={14} x2={16} y2={24} strokeWidth={2} />] },
  { id: 'no-bleach', label: 'Do Not Bleach', category: 'Bleaching', paths: () => [<Path key="tri" d="M16 4L29 28H3Z" />, notX] },
  { id: 'tumble-dry', label: 'Tumble Dry', category: 'Drying', paths: () => [drySquare, <Circle key="ci" cx={16} cy={16} r={8} />] },
  { id: 'no-tumble-dry', label: 'Do Not Tumble Dry', category: 'Drying', paths: () => [drySquare, <Circle key="ci" cx={16} cy={16} r={8} />, notX] },
  { id: 'line-dry', label: 'Line Dry', category: 'Drying', paths: () => [drySquare, <Line key="vl" x1={16} y1={5} x2={16} y2={27} />] },
  { id: 'flat-dry', label: 'Flat Dry', category: 'Drying', paths: () => [drySquare, <Line key="hl" x1={5} y1={16} x2={27} y2={16} />] },
  { id: 'drip-dry', label: 'Drip Dry', category: 'Drying', paths: () => [drySquare, <Path key="drips" d="M11 10V20M16 10V20M21 10V20" />] },
  { id: 'shade-dry', label: 'Shade Dry', category: 'Drying', paths: () => [drySquare, <Path key="hatch" d="M3 13L13 3M3 22L22 3M3 29L29 3M12 29L29 12M21 29L29 21" strokeWidth={1} />] },
  { id: 'iron-low', label: 'Iron Low Heat', category: 'Ironing', paths: (c) => [...ironBody, dot(16, c)] },
  { id: 'iron-medium', label: 'Iron Medium Heat', category: 'Ironing', paths: (c) => [...ironBody, dot(13, c), dot(19, c)] },
  { id: 'iron-high', label: 'Iron High Heat', category: 'Ironing', paths: (c) => [...ironBody, dot(10, c), dot(16, c), dot(22, c)] },
  { id: 'no-iron', label: 'Do Not Iron', category: 'Ironing', paths: () => [...ironBody, notX] },
  { id: 'iron-no-steam', label: 'Iron – No Steam', category: 'Ironing', paths: () => [...ironBody, <Path key="nosteam" d="M12 8L15 5M15 8L12 5" strokeWidth={1.6} />] },
  { id: 'dry-clean', label: 'Dry Clean', category: 'Dry Cleaning', paths: () => bigCircle },
  { id: 'no-dry-clean', label: 'Do Not Dry Clean', category: 'Dry Cleaning', paths: () => [bigCircle, notX] },
  { id: 'professional-wet-clean', label: 'Professional Wet Clean', category: 'Dry Cleaning', paths: () => [bigCircle, <Path key="w" d="M10 12L12.5 22L16 15L19.5 22L22 12" strokeWidth={1.8} />] },
  { id: 'do-not-wring', label: 'Do Not Wring', category: 'Special', paths: () => [<Path key="tw1" d="M4 14Q8 10 12 14Q16 18 20 14Q24 10 28 14" />, <Path key="tw2" d="M4 20Q8 16 12 20Q16 24 20 20Q24 16 28 20" />, notX] },
  { id: 'wash-separately', label: 'Wash Separately', category: 'Special', paths: () => [washTub, <Path key="sep" d="M8 14L13 17L8 20M24 14L19 17L24 20" strokeWidth={1.5} />] },
];

function CareIcon({ paths, color, size = 22 }: { paths: CarePaths; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {paths(color)}
      </G>
    </Svg>
  );
}

function safe(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  return String(val);
}
function notEmpty(val: any) {
  return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
}

// ── Care instructions verify block (icons + Yes/No) ───────────────────────────
function CareInstructionsVerifyBlock({
  fieldKey,
  labels,
  verification,
  onVerify,
  needsHighlight,
}: {
  fieldKey: string;
  labels: string[];
  verification: Verification;
  onVerify: (key: string, ok: boolean | null, remarks: string) => void;
  needsHighlight: boolean;
}) {
  const v = verification ?? { ok: null, remarks: '' };
  const highlight = needsHighlight && v.ok === null;
  const borderCls = highlight
    ? 'border-red-500 bg-red-50'
    : v.ok === true
    ? 'border-emerald-200 bg-emerald-50'
    : v.ok === false
    ? 'border-red-200 bg-red-50'
    : 'border-slate-200 bg-white';

  return (
    <InvalidAnchor errorKey="productVerifications" invalid={highlight} style={{ marginBottom: 12 }}>
    <View className={`rounded-xl border ${borderCls}`}>
      <View className="p-3">
        <Text className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Care Instructions</Text>
        <View className="flex-row flex-wrap" style={{ gap: 12 }}>
          {labels.map((label) => {
            const instr = CARE_INSTRUCTIONS.find((c) => c.label === label);
            const color = instr ? CATEGORY_COLORS[instr.category] : '#64748b';
            return (
              <View key={label} className="flex-row items-center" style={{ columnGap: 6 }}>
                {instr && <CareIcon paths={instr.paths} color={color} size={22} />}
                <Text className="text-sm text-slate-700">{label}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View className="border-t border-slate-100 px-3 py-2.5" style={{ rowGap: 8 }}>
        <Text className="text-xs font-semibold text-slate-600">Verification</Text>
        {/* Large segmented Yes/No — matches VI_VerifyField's primary-action
            buttons: flex-1, solid-filled when picked, slightly more compact. */}
        <View className="flex-row" style={{ columnGap: 8 }}>
          <TouchableOpacity
            onPress={() => onVerify(fieldKey, true, v.remarks)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: v.ok === true }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 py-2 ${
              v.ok === true ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                v.ok === true ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {v.ok === true && <Check size={13} color="#059669" strokeWidth={3.5} />}
            </View>
            <Text className={`text-sm font-bold ${v.ok === true ? 'text-white' : 'text-slate-600'}`}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onVerify(fieldKey, false, v.remarks)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: v.ok === false }}
            className={`flex-1 flex-row items-center justify-center rounded-lg border-2 py-2 ${
              v.ok === false ? 'border-red-600 bg-red-600' : 'border-slate-300 bg-white'
            }`}
            style={{ columnGap: 6 }}
          >
            <View
              className={`w-5 h-5 rounded-full items-center justify-center ${
                v.ok === false ? 'bg-white' : 'border-2 border-slate-300'
              }`}
            >
              {v.ok === false && <X size={13} color="#dc2626" strokeWidth={3.5} />}
            </View>
            <Text className={`text-sm font-bold ${v.ok === false ? 'text-white' : 'text-slate-600'}`}>No</Text>
          </TouchableOpacity>
        </View>
        {highlight && (
          <Text className="text-xs text-red-600 font-medium">
            Please complete this verification before continuing.
          </Text>
        )}
        {v.ok === false && (
          <View className="mt-1">
            <RemarkInput
              value={v.remarks}
              onChangeText={(t) => onVerify(fieldKey, v.ok, t)}
              placeholder="Remarks for this field…"
              error
            />
          </View>
        )}
      </View>
    </View>
    </InvalidAnchor>
  );
}

interface Props {
  formData: {
    productData: any;
    productVerifications: Verifications;
    productEvidencePhotos: Photo[];
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
  scrollNav?: ScrollNavHandlers;
  /** 'VIRTUAL' allows gallery uploads; 'PHYSICAL' is camera-only. */
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}

export default function PI_Step2_ProductVerification({ formData, setFormData, errors = {}, scrollNav, inspectionType }: Props) {
  const p = formData.productData || {};
  const verifications = formData.productVerifications || {};
  const [lightbox, setLightbox] = useState<{ url: string; label?: string } | null>(null);

  // Keys still missing a Yes/No decision — used to highlight fields on error.
  const highlightKeys: Set<string> = errors.productVerifications
    ? new Set(
        getExpectedProductVerificationKeys(p).filter(
          (key) => !verifications[key] || verifications[key].ok === null,
        ),
      )
    : new Set();

  const onVerify = (key: string, ok: boolean | null, remarks: string) => {
    setFormData({
      ...formData,
      productVerifications: { ...verifications, [key]: { ok, remarks } },
    });
  };

  const vf = (key: string) => verifications[key] ?? { ok: null, remarks: '' };

  const addEvidence = (photos: Photo[]) => {
    setFormData({
      ...formData,
      productEvidencePhotos: [...(formData.productEvidencePhotos || []), ...photos],
    });
  };
  const removeEvidence = (idx: number) => {
    const next = [...(formData.productEvidencePhotos || [])];
    next.splice(idx, 1);
    setFormData({ ...formData, productEvidencePhotos: next });
  };

  const variants: any[] = Array.isArray(p.variants) ? p.variants : [];

  return (
    <ScrollView showsVerticalScrollIndicator={false} {...scrollNav}>
      <StepHeader
        title="Product Information Verification"
        subtitle="Verify each field against the physical product. Select Yes / No and add remarks when needed."
      />

      {!!errors.productVerifications && <ErrorBanner message={errors.productVerifications} />}
      {!!errors.productEvidencePhotos && !errors.productVerifications && (
        <ErrorBanner message={errors.productEvidencePhotos} />
      )}

      {/* 1. Basic Product Information */}
      <Card title="Basic Product Information" icon={<Package size={16} color="#e01a1b" />}>
        {notEmpty(p.name) && (
          <VerifyField fieldKey="pv_name" label="Product Name" value={p.name}
            verification={vf('pv_name')} onChange={(ok, r) => onVerify('pv_name', ok, r)}
            highlight={highlightKeys.has('pv_name')} />
        )}
        {notEmpty(p.category) && (
          <VerifyField fieldKey="pv_category" label="Category" value={p.category}
            verification={vf('pv_category')} onChange={(ok, r) => onVerify('pv_category', ok, r)}
            highlight={highlightKeys.has('pv_category')} />
        )}
        {notEmpty(p.singleUnitColor) && (
          <VerifyField fieldKey="pv_baseColor" label="Base Color"
            value={colorValue(p.singleUnitColor, p.singleUnitColorHex)}
            headerAction={colorSwatch(p.singleUnitColor, p.singleUnitColorHex)}
            verification={vf('pv_baseColor')} onChange={(ok, r) => onVerify('pv_baseColor', ok, r)}
            highlight={highlightKeys.has('pv_baseColor')} />
        )}
        {notEmpty(p.uom) && (
          <VerifyField fieldKey="pv_uom" label="Selling Unit (UOM)" value={UOM_LABELS[p.uom] || p.uom}
            verification={vf('pv_uom')} onChange={(ok, r) => onVerify('pv_uom', ok, r)}
            highlight={highlightKeys.has('pv_uom')} />
        )}
        {notEmpty(p.brand) && (
          <VerifyField fieldKey="pv_brand" label="Brand" value={p.brand}
            verification={vf('pv_brand')} onChange={(ok, r) => onVerify('pv_brand', ok, r)}
            highlight={highlightKeys.has('pv_brand')} />
        )}
        {notEmpty(p.description) && (
          <VerifyField fieldKey="pv_description" label="Product Description" value={p.description}
            verification={vf('pv_description')} onChange={(ok, r) => onVerify('pv_description', ok, r)}
            highlight={highlightKeys.has('pv_description')} />
        )}
      </Card>

      {/* 2. Product Images */}
      {Array.isArray(p.images) && p.images.length > 0 && (
        <Card title="Product Images" icon={<ImageIcon size={16} color="#e01a1b" />}>
          {p.images.map((img: any, i: number) => {
            const imgUrl = img.url || img.imageUrl;
            const imgLabel = `Product Image ${i + 1}${img.isPrimary ? ' (Primary)' : ''}`;
            const key = `pv_img_${i}`;
            return (
              <VerifyField
                key={i}
                fieldKey={key}
                label={imgLabel}
                imageUrl={imgUrl}
                verification={vf(key)}
                onChange={(ok, r) => onVerify(key, ok, r)}
                highlight={highlightKeys.has(key)}
                onView={imgUrl ? () => setLightbox({ url: imgUrl, label: imgLabel }) : undefined}
              />
            );
          })}
        </Card>
      )}

      {/* 3. Measurements & Specifications */}
      {(notEmpty(p.fabricType) || notEmpty(p.material) || notEmpty(p.fabricSpecifications)) && (
        <Card title="Measurements & Specifications" icon={<Ruler size={16} color="#e01a1b" />}>
          {notEmpty(p.fabricType) && (
            <VerifyField fieldKey="pv_fabricType" label="Fabric Type" value={p.fabricType}
              verification={vf('pv_fabricType')} onChange={(ok, r) => onVerify('pv_fabricType', ok, r)}
              highlight={highlightKeys.has('pv_fabricType')} />
          )}
          {notEmpty(p.material) && (
            <VerifyField fieldKey="pv_material" label="Material Description" value={p.material}
              verification={vf('pv_material')} onChange={(ok, r) => onVerify('pv_material', ok, r)}
              highlight={highlightKeys.has('pv_material')} />
          )}
          {p.fabricSpecifications &&
            typeof p.fabricSpecifications === 'object' &&
            Object.entries(p.fabricSpecifications)
              // `weightUnit` is always 'GSM' (implied by the GSM field) — hide it.
              .filter(([key]) => key !== 'basis' && key !== 'careInstructions' && key !== 'weightUnit')
              .filter(([, val]) => notEmpty(val))
              .map(([key, val]) => {
                const SPEC_LABEL_MAP: Record<string, string> = {
                  weightValue: 'Weight',
                  weave: 'Weave Type',
                  gsm: 'GSM',
                  length: 'Length',
                  breadth: 'Breadth',
                };
                const SPEC_UNIT_MAP: Record<string, string> = {
                  weightValue: 'g', length: 'cm', breadth: 'cm', gsm: 'GSM',
                };
                const label =
                  SPEC_LABEL_MAP[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                const unit = SPEC_UNIT_MAP[key];
                const displayVal = Array.isArray(val)
                  ? val.join(', ')
                  : unit && /^[\d.,\s]+$/.test(String(val).trim())
                  ? `${safe(val)} ${unit}`
                  : safe(val);
                const fieldKey = `pv_spec_${key}`;
                return (
                  <VerifyField
                    key={key}
                    fieldKey={fieldKey}
                    label={label}
                    value={displayVal}
                    verification={vf(fieldKey)}
                    onChange={(ok, r) => onVerify(fieldKey, ok, r)}
                    highlight={highlightKeys.has(fieldKey)}
                  />
                );
              })}
          {Array.isArray(p.fabricSpecifications?.careInstructions) &&
            p.fabricSpecifications.careInstructions.length > 0 && (
              <CareInstructionsVerifyBlock
                fieldKey="pv_spec_careInstructions"
                labels={p.fabricSpecifications.careInstructions}
                verification={vf('pv_spec_careInstructions')}
                onVerify={onVerify}
                needsHighlight={highlightKeys.has('pv_spec_careInstructions')}
              />
            )}
        </Card>
      )}

      {/* 4. Product Variants (no pricing) */}
      {variants.length > 0 && (
        <Card title="Product Variants" icon={<Layers size={16} color="#e01a1b" />}>
          {variants.map((variant: any, vi: number) => {
            const varLabel =
              [variant.color, variant.size, variant.material].filter(Boolean).join(' / ') || `Variant ${vi + 1}`;
            const varImg = Array.isArray(variant.images) ? variant.images[0] : undefined;
            return (
              <View key={vi} className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                <View className="bg-slate-50 border-b border-slate-200 px-3 py-2">
                  <Text className="text-sm font-bold text-slate-700">Variant {vi + 1}: {varLabel}</Text>
                </View>
                <View className="p-3">
                  {notEmpty(variant.color) && (
                    <VerifyField fieldKey={`pv_var${vi}_color`} label="Color"
                      value={colorValue(variant.color, variant.colorHex)}
                      headerAction={colorSwatch(variant.color, variant.colorHex)}
                      verification={vf(`pv_var${vi}_color`)} onChange={(ok, r) => onVerify(`pv_var${vi}_color`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_color`)} />
                  )}
                  {notEmpty(variant.size) && (
                    <VerifyField fieldKey={`pv_var${vi}_size`} label="Size" value={variant.size}
                      verification={vf(`pv_var${vi}_size`)} onChange={(ok, r) => onVerify(`pv_var${vi}_size`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_size`)} />
                  )}
                  {notEmpty(variant.material) && (
                    <VerifyField fieldKey={`pv_var${vi}_material`} label="Material" value={variant.material}
                      verification={vf(`pv_var${vi}_material`)} onChange={(ok, r) => onVerify(`pv_var${vi}_material`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_material`)} />
                  )}
                  {notEmpty(variant.variantName) && (
                    <VerifyField fieldKey={`pv_var${vi}_variantName`} label="Variant Name" value={variant.variantName}
                      verification={vf(`pv_var${vi}_variantName`)} onChange={(ok, r) => onVerify(`pv_var${vi}_variantName`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_variantName`)} />
                  )}
                  {varImg && (
                    <VerifyField fieldKey={`pv_var${vi}_image`} label="Variant Image"
                      imageUrl={varImg}
                      verification={vf(`pv_var${vi}_image`)} onChange={(ok, r) => onVerify(`pv_var${vi}_image`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_image`)}
                      onView={() => setLightbox({ url: varImg, label: `Variant ${vi + 1} Image` })} />
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* 5. Packaging Information */}
      {(notEmpty(p.packagingType) || notEmpty(p.packagingDetails) || notEmpty(p.packagingMaterial)) && (
        <Card title="Packaging Information" icon={<Box size={16} color="#e01a1b" />}>
          {notEmpty(p.packagingType) && (
            <VerifyField fieldKey="pv_packagingType" label="Packaging Type" value={p.packagingType}
              verification={vf('pv_packagingType')} onChange={(ok, r) => onVerify('pv_packagingType', ok, r)}
              highlight={highlightKeys.has('pv_packagingType')} />
          )}
          {notEmpty(p.packagingMaterial) && (
            <VerifyField fieldKey="pv_packagingMaterial" label="Packaging Material" value={p.packagingMaterial}
              verification={vf('pv_packagingMaterial')} onChange={(ok, r) => onVerify('pv_packagingMaterial', ok, r)}
              highlight={highlightKeys.has('pv_packagingMaterial')} />
          )}
          {notEmpty(p.packagingDetails) && (
            <VerifyField fieldKey="pv_packagingDetails" label="Packaging Details"
              value={typeof p.packagingDetails === 'object' ? JSON.stringify(p.packagingDetails) : p.packagingDetails}
              verification={vf('pv_packagingDetails')} onChange={(ok, r) => onVerify('pv_packagingDetails', ok, r)}
              highlight={highlightKeys.has('pv_packagingDetails')} />
          )}
        </Card>
      )}

      {/* 6. Labels & Markings */}
      {(notEmpty(p.labelInfo) || notEmpty(p.careLabel) || notEmpty(p.countryOfOrigin)) && (
        <Card title="Labels & Markings" icon={<Tag size={16} color="#e01a1b" />}>
          {notEmpty(p.careLabel) && (
            <VerifyField fieldKey="pv_careLabel" label="Care Label" value={p.careLabel}
              verification={vf('pv_careLabel')} onChange={(ok, r) => onVerify('pv_careLabel', ok, r)}
              highlight={highlightKeys.has('pv_careLabel')} />
          )}
          {notEmpty(p.countryOfOrigin) && (
            <VerifyField fieldKey="pv_countryOfOrigin" label="Country of Origin" value={p.countryOfOrigin}
              verification={vf('pv_countryOfOrigin')} onChange={(ok, r) => onVerify('pv_countryOfOrigin', ok, r)}
              highlight={highlightKeys.has('pv_countryOfOrigin')} />
          )}
          {notEmpty(p.labelInfo) && (
            <VerifyField fieldKey="pv_labelInfo" label="Label Information"
              value={typeof p.labelInfo === 'object' ? JSON.stringify(p.labelInfo) : p.labelInfo}
              verification={vf('pv_labelInfo')} onChange={(ok, r) => onVerify('pv_labelInfo', ok, r)}
              highlight={highlightKeys.has('pv_labelInfo')} />
          )}
        </Card>
      )}

      {/* 7. Shipping */}
      {(notEmpty(p.construction) || notEmpty(p.weight) || notEmpty(p.dispatchTimeline?.processingDays) || notEmpty(p.dispatchTimeline?.shippingDays)) && (
        <Card title="Shipping" icon={<Truck size={16} color="#e01a1b" />}>
          {notEmpty(p.construction) && (
            <VerifyField fieldKey="pv_construction" label="Construction" value={p.construction}
              verification={vf('pv_construction')} onChange={(ok, r) => onVerify('pv_construction', ok, r)}
              highlight={highlightKeys.has('pv_construction')} />
          )}
          {notEmpty(p.weight) && (
            <VerifyField fieldKey="pv_weight" label="Shipping Weight"
              value={SUPPORTED_WEIGHT_UNITS.includes(p.weightUnit ?? '') ? `${p.weight} ${p.weightUnit}` : p.weight}
              verification={vf('pv_weight')} onChange={(ok, r) => onVerify('pv_weight', ok, r)}
              highlight={highlightKeys.has('pv_weight')} />
          )}
          {notEmpty(p.dispatchTimeline?.processingDays) && (
            <VerifyField fieldKey="pv_processingDays" label="Processing Days"
              value={`${p.dispatchTimeline.processingDays} Day${p.dispatchTimeline.processingDays !== 1 ? 's' : ''}`}
              verification={vf('pv_processingDays')} onChange={(ok, r) => onVerify('pv_processingDays', ok, r)}
              highlight={highlightKeys.has('pv_processingDays')} />
          )}
          {notEmpty(p.dispatchTimeline?.shippingDays) && (
            <VerifyField fieldKey="pv_shippingDays" label="Shipping Days"
              value={`${p.dispatchTimeline.shippingDays} Day${p.dispatchTimeline.shippingDays !== 1 ? 's' : ''}`}
              verification={vf('pv_shippingDays')} onChange={(ok, r) => onVerify('pv_shippingDays', ok, r)}
              highlight={highlightKeys.has('pv_shippingDays')} />
          )}
        </Card>
      )}

      {/* Photo Evidence */}
      <InvalidAnchor errorKey="productEvidencePhotos" invalid={!!errors.productEvidencePhotos}>
        <Card title="Photo Evidence" icon={<Camera size={16} color="#e01a1b" />}>
          <PhotoGrid
            photos={formData.productEvidencePhotos || []}
            onAdd={addEvidence}
            onRemove={removeEvidence}
            addLabel="Upload product evidence photo"
            allowMultiple
            hasError={!!errors.productEvidencePhotos}
            inspectionType={inspectionType}
          />
        </Card>
      </InvalidAnchor>

      <View className="h-6" />

      <PhotoLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </ScrollView>
  );
}
