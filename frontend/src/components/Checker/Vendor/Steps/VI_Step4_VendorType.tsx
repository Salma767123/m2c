'use client'

import { useEffect, useState } from 'react'
import { Tags, Globe, Image as ImageIcon, ShoppingBag, Eye } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import DocViewerModal from '@/components/UI/DocViewerModal'

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step4_VendorType({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const [viewerImg, setViewerImg] = useState<{ url: string; name: string } | null>(null)

  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const capFirst = (s: any) => (typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  const vendorTypesDisplay = Array.isArray(v.vendorTypes) ? v.vendorTypes.map(capFirst) : v.vendorTypes

  // Collect all category product photos
  const categoryPhotos: Array<{ label: string; url: string; catKey: string; idx: number }> = []
  if (v.categoryProducts && typeof v.categoryProducts === 'object') {
    Object.entries(v.categoryProducts as Record<string, any[]>).forEach(([cat, products]) => {
      ;(Array.isArray(products) ? products : []).forEach((p: any, pIdx: number) => {
        ;(Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview
          if (url) categoryPhotos.push({ label: `${cat} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat, idx: categoryPhotos.length })
        })
      })
    })
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => {
      ;(Array.isArray(cat?.products) ? cat.products : []).forEach((p: any, pIdx: number) => {
        ;(Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview
          if (url) categoryPhotos.push({ label: `${cat?.name || 'Custom'} · ${p?.name || `Product ${pIdx + 1}`}`, url, catKey: cat?.name, idx: categoryPhotos.length })
        })
      })
    })
  }

  const products: any[] = Array.isArray(v.products) ? v.products : []

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
        const prefix = `vt_prod_${pIdx}`
        const images: any[] = Array.isArray(product.images) ? product.images : []
        const variants: any[] = Array.isArray(product.variants) ? product.variants : []
        const specs = product.fabricSpecifications && typeof product.fabricSpecifications === 'object'
          ? Object.keys(product.fabricSpecifications).map(k => `${prefix}_spec_${k}`)
          : []
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
        ]
      }),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Vendor Type & Products</h2>
        <p className="text-slate-500 text-sm">Verify vendor type, product categories, market focus, and quality control measures.</p>
      </div>

      {/* Vendor Classification */}
      <SectionBlock title="Vendor Classification" icon={<Tags className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('vt_vendorTypes', 'Vendor Types', vendorTypesDisplay, 'list')}
          {vf('vt_productCategories', 'Product Categories', v.productCategories, 'list')}
        </div>
        {v.categoryRemarks && (
          <div className="mt-4">{vf('vt_categoryRemarks', 'Category Remarks', v.categoryRemarks)}</div>
        )}
        {v.qualityControl && (
          <div className="mt-4">{vf('vt_qualityControl', 'Quality Control Measures', v.qualityControl)}</div>
        )}
      </SectionBlock>

      {/* Market Focus */}
      <SectionBlock title="Market Focus" icon={<Globe className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {v.marketFocus && vf('vt_marketFocus', 'Market Focus', v.marketFocus)}
          {v.primaryMarkets?.length > 0 && vf('vt_primaryMarkets', 'Primary Markets', v.primaryMarkets.map(capFirst), 'list')}
          {v.domesticMarkets?.length > 0 && vf('vt_domesticMarkets', 'Domestic Markets', v.domesticMarkets.map(capFirst), 'list')}
        </div>
      </SectionBlock>

      {/* Category Product Photos */}
      {categoryPhotos.length > 0 && (
        <SectionBlock title="Product Photos (by Category)" icon={<ImageIcon className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryPhotos.map((photo) => (
              <VerifyField
                key={photo.idx}
                fieldKey={`vt_catPhoto_${photo.idx}`}
                label={photo.label}
                value={photo.url}
                type="image"
                verifications={verifications}
                onChange={onChange}
                headerAction={photo.url ? (
                  <button
                    type="button"
                    onClick={() => setViewerImg({ url: photo.url, name: photo.label })}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors shrink-0"
                  >
                    <Eye className="w-3 h-3" /> View
                  </button>
                ) : undefined}
              />
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Actual Product Records */}
      {products.length > 0 && (
        <SectionBlock title="Registered Products" icon={<ShoppingBag className="w-4 h-4" />}>
          <div className="space-y-6">
            {products.map((product: any, pIdx: number) => {
              const prefix = `vt_prod_${pIdx}`
              const images: any[] = Array.isArray(product.images) ? product.images : []
              const variants: any[] = Array.isArray(product.variants) ? product.variants : []
              return (
                <div key={product.id || pIdx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-5">
                  <p className="text-sm font-bold text-slate-700">Product #{pIdx + 1}: {product.name}</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vf(`${prefix}_name`, 'Product Name', product.name)}
                    {vf(`${prefix}_category`, 'Category', product.category)}
                    {product.subCategory && vf(`${prefix}_subCategory`, 'Sub-Category', product.subCategory)}
                    {vf(`${prefix}_baseSku`, 'Base SKU', product.baseSku)}
                    {vf(`${prefix}_basePrice`, 'Base Price (₹)', product.basePrice)}
                    {product.originalPrice && vf(`${prefix}_originalPrice`, 'Original Price (₹)', product.originalPrice)}
                    {product.discount && vf(`${prefix}_discount`, 'Discount (%)', product.discount)}
                    {vf(`${prefix}_gstPercentage`, 'GST %', product.gstPercentage)}
                    {vf(`${prefix}_uom`, 'Unit of Measure', product.uom)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {product.fabricType && vf(`${prefix}_fabricType`, 'Fabric Type', product.fabricType)}
                    {product.material && vf(`${prefix}_material`, 'Material Composition', product.material)}
                    {product.weight && vf(`${prefix}_weight`, 'Weight', product.weight)}
                    {product.dimensions && vf(`${prefix}_dimensions`, 'Dimensions', product.dimensions)}
                  </div>

                  {product.fabricSpecifications && typeof product.fabricSpecifications === 'object' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(product.fabricSpecifications).map(([specKey, specVal]) => (
                        vf(`${prefix}_spec_${specKey}`, specKey.charAt(0).toUpperCase() + specKey.slice(1), specVal as any)
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vf(`${prefix}_totalStock`, 'Total Stock', product.totalStock)}
                    {vf(`${prefix}_lowStockThreshold`, 'Low Stock Threshold', product.lowStockThreshold)}
                  </div>

                  {(product.dispatchTimeline || product.logisticsConfig) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.dispatchTimeline?.standard && vf(`${prefix}_dispatchStd`, 'Standard Dispatch', product.dispatchTimeline.standard)}
                      {product.dispatchTimeline?.express && vf(`${prefix}_dispatchExpress`, 'Express Dispatch', product.dispatchTimeline.express)}
                      {product.logisticsConfig?.mode && vf(`${prefix}_logMode`, 'Logistics Mode', product.logisticsConfig.mode)}
                      {product.logisticsConfig?.weightKg && vf(`${prefix}_logWeight`, 'Package Weight (kg)', product.logisticsConfig.weightKg)}
                      {product.logisticsConfig?.dimensionsCm && vf(`${prefix}_logDims`, 'Package Dimensions', product.logisticsConfig.dimensionsCm)}
                    </div>
                  )}

                  {images.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Product Images</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {images.map((img: any, iIdx: number) => {
                          const imgLabel = img.alt || `Image ${iIdx + 1}${img.isPrimary ? ' (Cover)' : ''}`
                          return (
                            <VerifyField
                              key={iIdx}
                              fieldKey={`${prefix}_img_${iIdx}`}
                              label={imgLabel}
                              value={img.url}
                              type="image"
                              verifications={verifications}
                              onChange={onChange}
                              headerAction={img.url ? (
                                <button
                                  type="button"
                                  onClick={() => setViewerImg({ url: img.url, name: imgLabel })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors shrink-0"
                                >
                                  <Eye className="w-3 h-3" /> View
                                </button>
                              ) : undefined}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {variants.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">Variants ({variants.length})</p>
                      <div className="space-y-4">
                        {variants.map((variant: any, vIdx: number) => (
                          <div key={variant.id || vIdx} className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                            <p className="text-xs font-bold text-slate-600">Variant: {variant.variantName || variant.color || `#${vIdx + 1}`}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {variant.variantName && vf(`${prefix}_var_${vIdx}_name`, 'Variant Name', variant.variantName)}
                              {variant.sku && vf(`${prefix}_var_${vIdx}_sku`, 'SKU', variant.sku)}
                              {variant.color && vf(`${prefix}_var_${vIdx}_color`, 'Color', variant.color)}
                              {variant.size && vf(`${prefix}_var_${vIdx}_size`, 'Size', variant.size)}
                              {vf(`${prefix}_var_${vIdx}_price`, 'Price (₹)', variant.price)}
                              {vf(`${prefix}_var_${vIdx}_stock`, 'Stock', variant.stock)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </SectionBlock>
      )}
      {viewerImg && (
        <DocViewerModal
          url={viewerImg.url}
          name={viewerImg.name}
          readOnly
          onClose={() => setViewerImg(null)}
        />
      )}
    </div>
  )
}
