import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { getExpectedProductVerificationKeys } from '../validation';
import {
  StepHeader,
  Card,
  ErrorBanner,
  VerifyField,
  PhotoGrid,
  PhotoLightbox,
  Photo,
} from './piShared';

// ── Verifications type ────────────────────────────────────────────────────────
type Verification = { ok: boolean | null; remarks: string };
type Verifications = Record<string, Verification>;

const SUPPORTED_WEIGHT_UNITS = ['kg', 'g', 'lb', 'oz'];

function safe(val: any): string {
  if (val === null || val === undefined || val === '') return '';
  return String(val);
}
function notEmpty(val: any) {
  return val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0);
}

interface Props {
  formData: {
    productData: any;
    productVerifications: Verifications;
    productEvidencePhotos: Photo[];
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
}

export default function PI_Step2_ProductVerification({ formData, setFormData, errors = {} }: Props) {
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
    <ScrollView showsVerticalScrollIndicator={false}>
      <StepHeader
        title="Product Information Verification"
        subtitle="Verify each field against the physical product. Select Yes / No and add remarks when needed."
      />

      {!!errors.productVerifications && <ErrorBanner message={errors.productVerifications} />}
      {!!errors.productEvidencePhotos && !errors.productVerifications && (
        <ErrorBanner message={errors.productEvidencePhotos} />
      )}

      {/* 1. Basic Product Information */}
      <Card title="Basic Product Information">
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
        {notEmpty(p.subCategory) && (
          <VerifyField fieldKey="pv_subCategory" label="Sub-Category" value={p.subCategory}
            verification={vf('pv_subCategory')} onChange={(ok, r) => onVerify('pv_subCategory', ok, r)}
            highlight={highlightKeys.has('pv_subCategory')} />
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
        <Card title="Product Images">
          {p.images.map((img: any, i: number) => {
            const imgUrl = img.url || img.imageUrl;
            const imgLabel = img.alt || `Product Image ${i + 1}${img.isPrimary ? ' (Primary)' : ''}`;
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

      {/* 3. Material & Construction */}
      {(notEmpty(p.fabricType) || notEmpty(p.material) || notEmpty(p.construction)) && (
        <Card title="Material & Construction">
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

      {/* 4. Variants (no pricing) */}
      {variants.length > 0 && (
        <Card title="Product Variants">
          {variants.map((variant: any, vi: number) => {
            const varLabel =
              [variant.color, variant.size, variant.material].filter(Boolean).join(' / ') || `Variant ${vi + 1}`;
            return (
              <View key={vi} className="border border-slate-200 rounded-xl overflow-hidden mb-3">
                <View className="bg-slate-50 border-b border-slate-200 px-3 py-2">
                  <Text className="text-sm font-bold text-slate-700">Variant {vi + 1}: {varLabel}</Text>
                </View>
                <View className="p-3">
                  {notEmpty(variant.color) && (
                    <VerifyField fieldKey={`pv_var${vi}_color`} label="Color" value={variant.color}
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
                  {notEmpty(variant.sku) && (
                    <VerifyField fieldKey={`pv_var${vi}_sku`} label="SKU" value={variant.sku}
                      verification={vf(`pv_var${vi}_sku`)} onChange={(ok, r) => onVerify(`pv_var${vi}_sku`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_sku`)} />
                  )}
                  {notEmpty(variant.variantName) && (
                    <VerifyField fieldKey={`pv_var${vi}_variantName`} label="Variant Name" value={variant.variantName}
                      verification={vf(`pv_var${vi}_variantName`)} onChange={(ok, r) => onVerify(`pv_var${vi}_variantName`, ok, r)}
                      highlight={highlightKeys.has(`pv_var${vi}_variantName`)} />
                  )}
                </View>
              </View>
            );
          })}
        </Card>
      )}

      {/* 5. Measurements & Specifications */}
      {(notEmpty(p.dimensions) || notEmpty(p.fabricSpecifications)) && (
        <Card title="Measurements & Specifications">
          {notEmpty(p.dimensions) && (
            <VerifyField
              fieldKey="pv_dimensions"
              label="Dimensions"
              value={
                typeof p.dimensions === 'object'
                  ? Object.entries(p.dimensions).map(([k, val]) => `${k}: ${val}`).join(' | ')
                  : String(p.dimensions)
              }
              verification={vf('pv_dimensions')}
              onChange={(ok, r) => onVerify('pv_dimensions', ok, r)}
              highlight={highlightKeys.has('pv_dimensions')}
            />
          )}
          {p.fabricSpecifications &&
            typeof p.fabricSpecifications === 'object' &&
            Object.entries(p.fabricSpecifications)
              .filter(([key]) => key !== 'basis' && key !== 'careInstructions')
              .filter(([, val]) => notEmpty(val))
              .map(([key, val]) => {
                const SPEC_LABEL_MAP: Record<string, string> = {
                  weightValue: 'Weight Per Unit',
                  weave: 'Weave Type',
                };
                const label =
                  SPEC_LABEL_MAP[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
                const fieldKey = `pv_spec_${key}`;
                return (
                  <VerifyField
                    key={key}
                    fieldKey={fieldKey}
                    label={label}
                    value={Array.isArray(val) ? val.join(', ') : safe(val)}
                    verification={vf(fieldKey)}
                    onChange={(ok, r) => onVerify(fieldKey, ok, r)}
                    highlight={highlightKeys.has(fieldKey)}
                  />
                );
              })}
          {Array.isArray(p.fabricSpecifications?.careInstructions) &&
            p.fabricSpecifications.careInstructions.length > 0 && (
              <VerifyField
                fieldKey="pv_spec_careInstructions"
                label="Care Instructions"
                value={p.fabricSpecifications.careInstructions.join(', ')}
                verification={vf('pv_spec_careInstructions')}
                onChange={(ok, r) => onVerify('pv_spec_careInstructions', ok, r)}
                highlight={highlightKeys.has('pv_spec_careInstructions')}
              />
            )}
        </Card>
      )}

      {/* 6. Packaging Information */}
      {(notEmpty(p.packagingType) || notEmpty(p.packagingDetails) || notEmpty(p.packagingMaterial)) && (
        <Card title="Packaging Information">
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

      {/* 7. Labels & Markings */}
      {(notEmpty(p.labelInfo) || notEmpty(p.careLabel) || notEmpty(p.countryOfOrigin)) && (
        <Card title="Labels & Markings">
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

      {/* Photo Evidence */}
      <Card title="Photo Evidence">
        <PhotoGrid
          photos={formData.productEvidencePhotos || []}
          onAdd={addEvidence}
          onRemove={removeEvidence}
          addLabel="Upload product evidence photo"
          allowMultiple
          hasError={!!errors.productEvidencePhotos}
        />
      </Card>

      <View className="h-6" />

      <PhotoLightbox image={lightbox} onClose={() => setLightbox(null)} />
    </ScrollView>
  );
}
