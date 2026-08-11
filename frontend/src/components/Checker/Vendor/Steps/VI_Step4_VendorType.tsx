'use client'

import { useEffect, useState } from 'react'
import { Tags, Globe, Image as ImageIcon } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import { categoryService } from '@/services/categoryService'

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step4_VendorType({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const [categoryNameMap, setCategoryNameMap] = useState<Record<string, string>>({})

  useEffect(() => {
    categoryService.getCategoryTree({ status: 'ACTIVE', includeInactive: false })
      .then((res: any) => {
        const map: Record<string, string> = {}
        ;(res.data || []).forEach((cat: any) => { map[cat.id] = cat.name })
        setCategoryNameMap(map)
      })
      .catch(() => {})
  }, [])

  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const capFirst = (s: any) => (typeof s === 'string' && s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s)
  const vendorTypesDisplay = Array.isArray(v.vendorTypes) ? v.vendorTypes.map(capFirst) : v.vendorTypes

  // Collect category product photos, grouped by category so each category
  // renders as a single card (like "Active Facilities") with its products
  // laid out inside. A running global index keeps field keys stable.
  type CatGroup = { key: string; name: string; photos: Array<{ label: string; url: string; fieldIdx: number }> }
  const categoryGroups: CatGroup[] = []
  let photoIdx = 0
  const groupFor = (key: string, name: string) => {
    let g = categoryGroups.find((x) => x.key === key)
    if (!g) { g = { key, name, photos: [] }; categoryGroups.push(g) }
    return g
  }
  if (v.categoryProducts && typeof v.categoryProducts === 'object') {
    Object.entries(v.categoryProducts as Record<string, any[]>).forEach(([cat, products]) => {
      const catName = categoryNameMap[cat] || 'Category'
      ;(Array.isArray(products) ? products : []).forEach((p: any, pIdx: number) => {
        ;(Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview
          const prodName = p?.name || `Product ${pIdx + 1}`
          if (url) groupFor(cat, catName).photos.push({ label: prodName, url, fieldIdx: photoIdx++ })
        })
      })
    })
  }
  if (Array.isArray(v.additionalCategories)) {
    v.additionalCategories.forEach((cat: any) => {
      const catName = cat?.name || 'Custom'
      ;(Array.isArray(cat?.products) ? cat.products : []).forEach((p: any, pIdx: number) => {
        ;(Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview
          if (url) groupFor(`add_${catName}`, catName).photos.push({ label: p?.name || `Product ${pIdx + 1}`, url, fieldIdx: photoIdx++ })
        })
      })
    })
  }
  const totalPhotos = photoIdx

  useEffect(() => {
    const keys: string[] = [
      'vt_vendorTypes',
      'vt_productCategories',
      ...(v.categoryRemarks ? ['vt_categoryRemarks'] : []),
      ...(v.primaryMarkets?.length > 0 ? ['vt_primaryMarkets'] : []),
      ...Array.from({ length: totalPhotos }, (_, idx) => `vt_catPhoto_${idx}`),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Vendor Type & Products</h2>
        <p className="text-slate-500 text-sm">Verify vendor type, product categories, and market focus.</p>
      </div>

      {/* Vendor Classification */}
      <SectionBlock title="Vendor Classification" icon={<Tags className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('vt_vendorTypes', 'Vendor Types', vendorTypesDisplay, 'list')}
          {vf('vt_productCategories', 'Product Categories', v.productCategories, 'list')}
        </div>
        {v.categoryRemarks && (
          <div className="mt-4">{vf('vt_categoryRemarks', 'General Remarks', v.categoryRemarks)}</div>
        )}
      </SectionBlock>

      {/* Market Focus */}
      {v.primaryMarkets?.length > 0 && (
        <SectionBlock title="Market Focus" icon={<Globe className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vf('vt_primaryMarkets', 'Market Focus', v.primaryMarkets.map(capFirst), 'list')}
          </div>
        </SectionBlock>
      )}

      {/* Category Product Photos — one card per category, products inside */}
      {categoryGroups.length > 0 && (
        <SectionBlock title="Product Photos (by Category)" icon={<ImageIcon className="w-4 h-4" />}>
          <div className="space-y-6">
            {categoryGroups.map((group) => (
              <div key={group.key} className="bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  <p className="text-sm font-bold text-slate-800">{group.name}</p>
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full">
                    {group.photos.length} {group.photos.length === 1 ? 'Photo' : 'Photos'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {group.photos.map((photo) => (
                    <VerifyField
                      key={photo.fieldIdx}
                      fieldKey={`vt_catPhoto_${photo.fieldIdx}`}
                      label={photo.label}
                      value={photo.url}
                      type="image"
                      verifications={verifications}
                      onChange={onChange}
                      documentUrl={photo.url || undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

    </div>
  )
}
