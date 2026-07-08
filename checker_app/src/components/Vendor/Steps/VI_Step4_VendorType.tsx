// RN port of VI_Step4_VendorType.tsx — Vendor Type & Products verification.

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Tags, Globe, Image as ImageIcon, ShoppingBag } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField';

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
}

export default function VI_Step4_VendorType({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  );

  const categoryPhotos: Array<{ label: string; url: string; catKey: string; idx: number }> = [];
  if (v.categoryProducts && typeof v.categoryProducts === 'object') {
    Object.entries(v.categoryProducts as Record<string, any[]>).forEach(([cat, products]) => {
      (Array.isArray(products) ? products : []).forEach((p: any, pIdx: number) => {
        (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview;
          if (url) categoryPhotos.push({ label: `${cat} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat, idx: categoryPhotos.length });
        });
      });
    });
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => {
      (Array.isArray(cat?.products) ? cat.products : []).forEach((p: any, pIdx: number) => {
        (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview;
          if (url) categoryPhotos.push({ label: `${cat?.name || 'Custom'} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat?.name, idx: categoryPhotos.length });
        });
      });
    });
  }

  const products: any[] = Array.isArray(v.products) ? v.products : [];

  useEffect(() => {
    const keys: string[] = [
      'vt_vendorTypes',
      'vt_productCategories',
      ...(v.qualityControl ? ['vt_qualityControl'] : []),
      ...(v.categoryRemarks ? ['vt_categoryRemarks'] : []),
      ...(v.marketFocus ? ['vt_marketFocus'] : []),
      ...(v.primaryMarkets?.length > 0 ? ['vt_primaryMarkets'] : []),
      ...(v.domesticMarkets?.length > 0 ? ['vt_domesticMarkets'] : []),
      ...categoryPhotos.map((_, idx) => `vt_catPhoto_${idx}`),
      ...products.flatMap((product: any, pIdx: number) => {
        const prefix = `vt_prod_${pIdx}`;
        const images: any[] = Array.isArray(product.images) ? product.images : [];
        const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
        const specs =
          product.fabricSpecifications && typeof product.fabricSpecifications === 'object'
            ? Object.keys(product.fabricSpecifications).map((k) => `${prefix}_spec_${k}`)
            : [];
        return [
          `${prefix}_name`,
          `${prefix}_category`,
          ...(product.subCategory ? [`${prefix}_subCategory`] : []),
          `${prefix}_baseSku`,
          `${prefix}_basePrice`,
          ...(product.originalPrice ? [`${prefix}_originalPrice`] : []),
          ...(product.discount ? [`${prefix}_discount`] : []),
          `${prefix}_gstPercentage`,
          `${prefix}_uom`,
          ...(product.fabricType ? [`${prefix}_fabricType`] : []),
          ...(product.material ? [`${prefix}_material`] : []),
          ...(product.weight ? [`${prefix}_weight`] : []),
          ...(product.dimensions ? [`${prefix}_dimensions`] : []),
          ...specs,
          `${prefix}_totalStock`,
          `${prefix}_lowStockThreshold`,
          ...(product.dispatchTimeline?.standard ? [`${prefix}_dispatchStd`] : []),
          ...(product.dispatchTimeline?.express ? [`${prefix}_dispatchExpress`] : []),
          ...(product.logisticsConfig?.mode ? [`${prefix}_logMode`] : []),
          ...(product.logisticsConfig?.weightKg ? [`${prefix}_logWeight`] : []),
          ...(product.logisticsConfig?.dimensionsCm ? [`${prefix}_logDims`] : []),
          ...images.map((_: any, iIdx: number) => `${prefix}_img_${iIdx}`),
          ...variants.flatMap((variant: any, vIdx: number) => [
            ...(variant.variantName ? [`${prefix}_var_${vIdx}_name`] : []),
            ...(variant.sku ? [`${prefix}_var_${vIdx}_sku`] : []),
            ...(variant.color ? [`${prefix}_var_${vIdx}_color`] : []),
            ...(variant.size ? [`${prefix}_var_${vIdx}_size`] : []),
            `${prefix}_var_${vIdx}_price`,
            `${prefix}_var_${vIdx}_stock`,
          ]),
        ];
      }),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Vendor Type & Products</Text>
        <Text className="text-slate-500 text-sm">Verify vendor type, product categories, market focus, and quality control measures.</Text>
      </View>

      <SectionBlock title="Vendor Classification" icon={<Tags size={16} color="#2563eb" />}>
        <View style={{ rowGap: 16 }}>
          {vf('vt_vendorTypes', 'Vendor Types', v.vendorTypes, 'list')}
          {vf('vt_productCategories', 'Product Categories', v.productCategories, 'list')}
          {v.categoryRemarks && vf('vt_categoryRemarks', 'Category Remarks', v.categoryRemarks)}
          {v.qualityControl && vf('vt_qualityControl', 'Quality Control Measures', v.qualityControl)}
        </View>
      </SectionBlock>

      <SectionBlock title="Market Focus" icon={<Globe size={16} color="#2563eb" />}>
        <View style={{ rowGap: 16 }}>
          {v.marketFocus && vf('vt_marketFocus', 'Market Focus', v.marketFocus)}
          {v.primaryMarkets?.length > 0 && vf('vt_primaryMarkets', 'Primary Markets', v.primaryMarkets, 'list')}
          {v.domesticMarkets?.length > 0 && vf('vt_domesticMarkets', 'Domestic Markets', v.domesticMarkets, 'list')}
        </View>
      </SectionBlock>

      {categoryPhotos.length > 0 && (
        <SectionBlock title="Product Photos (by Category)" icon={<ImageIcon size={16} color="#2563eb" />}>
          <View style={{ rowGap: 16 }}>
            {categoryPhotos.map((photo) => (
              <VerifyField
                key={photo.idx}
                fieldKey={`vt_catPhoto_${photo.idx}`}
                label={photo.label}
                value={photo.url}
                type="image"
                verifications={verifications}
                onChange={onChange}
              />
            ))}
          </View>
        </SectionBlock>
      )}

      {products.length > 0 && (
        <SectionBlock title="Registered Products" icon={<ShoppingBag size={16} color="#2563eb" />}>
          <View style={{ rowGap: 24 }}>
            {products.map((product: any, pIdx: number) => {
              const prefix = `vt_prod_${pIdx}`;
              const images: any[] = Array.isArray(product.images) ? product.images : [];
              const variants: any[] = Array.isArray(product.variants) ? product.variants : [];
              return (
                <View key={product.id || pIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-4" style={{ rowGap: 16 }}>
                  <Text className="text-sm font-bold text-slate-700">Product #{pIdx + 1}: {product.name}</Text>
                  {vf(`${prefix}_name`, 'Product Name', product.name)}
                  {vf(`${prefix}_category`, 'Category', product.category)}
                  {product.subCategory && vf(`${prefix}_subCategory`, 'Sub-Category', product.subCategory)}
                  {vf(`${prefix}_baseSku`, 'Base SKU', product.baseSku)}
                  {vf(`${prefix}_basePrice`, 'Base Price (₹)', product.basePrice)}
                  {product.originalPrice && vf(`${prefix}_originalPrice`, 'Original Price (₹)', product.originalPrice)}
                  {product.discount && vf(`${prefix}_discount`, 'Discount (%)', product.discount)}
                  {vf(`${prefix}_gstPercentage`, 'GST %', product.gstPercentage)}
                  {vf(`${prefix}_uom`, 'Unit of Measure', product.uom)}
                  {product.fabricType && vf(`${prefix}_fabricType`, 'Fabric Type', product.fabricType)}
                  {product.material && vf(`${prefix}_material`, 'Material Composition', product.material)}
                  {product.weight && vf(`${prefix}_weight`, 'Weight', product.weight)}
                  {product.dimensions && vf(`${prefix}_dimensions`, 'Dimensions', product.dimensions)}
                  {product.fabricSpecifications &&
                    typeof product.fabricSpecifications === 'object' &&
                    Object.entries(product.fabricSpecifications).map(([specKey, specVal]) =>
                      vf(`${prefix}_spec_${specKey}`, specKey.charAt(0).toUpperCase() + specKey.slice(1), specVal as any),
                    )}
                  {vf(`${prefix}_totalStock`, 'Total Stock', product.totalStock)}
                  {vf(`${prefix}_lowStockThreshold`, 'Low Stock Threshold', product.lowStockThreshold)}
                  {product.dispatchTimeline?.standard && vf(`${prefix}_dispatchStd`, 'Standard Dispatch', product.dispatchTimeline.standard)}
                  {product.dispatchTimeline?.express && vf(`${prefix}_dispatchExpress`, 'Express Dispatch', product.dispatchTimeline.express)}
                  {product.logisticsConfig?.mode && vf(`${prefix}_logMode`, 'Logistics Mode', product.logisticsConfig.mode)}
                  {product.logisticsConfig?.weightKg && vf(`${prefix}_logWeight`, 'Package Weight (kg)', product.logisticsConfig.weightKg)}
                  {product.logisticsConfig?.dimensionsCm && vf(`${prefix}_logDims`, 'Package Dimensions', product.logisticsConfig.dimensionsCm)}
                  {images.length > 0 && (
                    <View style={{ rowGap: 12 }}>
                      <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Product Images</Text>
                      {images.map((img: any, iIdx: number) => (
                        <VerifyField
                          key={iIdx}
                          fieldKey={`${prefix}_img_${iIdx}`}
                          label={img.alt || `Image ${iIdx + 1}${img.isPrimary ? ' (Cover)' : ''}`}
                          value={img.url}
                          type="image"
                          verifications={verifications}
                          onChange={onChange}
                        />
                      ))}
                    </View>
                  )}
                  {variants.length > 0 && (
                    <View style={{ rowGap: 12 }}>
                      <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Variants ({variants.length})</Text>
                      {variants.map((variant: any, vIdx: number) => (
                        <View key={variant.id || vIdx} className="bg-white border border-slate-200 rounded-lg p-3" style={{ rowGap: 12 }}>
                          <Text className="text-xs font-bold text-slate-600">Variant: {variant.variantName || variant.color || `#${vIdx + 1}`}</Text>
                          {variant.variantName && vf(`${prefix}_var_${vIdx}_name`, 'Variant Name', variant.variantName)}
                          {variant.sku && vf(`${prefix}_var_${vIdx}_sku`, 'SKU', variant.sku)}
                          {variant.color && vf(`${prefix}_var_${vIdx}_color`, 'Color', variant.color)}
                          {variant.size && vf(`${prefix}_var_${vIdx}_size`, 'Size', variant.size)}
                          {vf(`${prefix}_var_${vIdx}_price`, 'Price (₹)', variant.price)}
                          {vf(`${prefix}_var_${vIdx}_stock`, 'Stock', variant.stock)}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </SectionBlock>
      )}
    </View>
  );
}
