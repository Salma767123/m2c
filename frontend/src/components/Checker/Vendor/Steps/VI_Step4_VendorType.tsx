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

  // Collect all category product photos
  const categoryPhotos: Array<{ label: string; url: string; catKey: string; idx: number }> = []
  if (v.categoryProducts && typeof v.categoryProducts === 'object') {
    Object.entries(v.categoryProducts as Record<string, any[]>).forEach(([cat, products]) => {
      const catName = categoryNameMap[cat] || ''
      ;(Array.isArray(products) ? products : []).forEach((p: any, pIdx: number) => {
        ;(Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
          const url = ph?.url || ph?.preview
          const prodName = p?.name || `Product ${pIdx + 1}`
          if (url) categoryPhotos.push({ label: catName ? `${catName} · ${prodName}` : prodName, url, catKey: cat, idx: categoryPhotos.length })
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

  useEffect(() => {
    const keys: string[] = [
      'vt_vendorTypes',
      'vt_productCategories',
      ...(v.categoryRemarks ? ['vt_categoryRemarks'] : []),
      ...(v.primaryMarkets?.length > 0 ? ['vt_primaryMarkets'] : []),
      ...categoryPhotos.map((_, idx) => `vt_catPhoto_${idx}`),
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
                documentUrl={photo.url || undefined}
              />
            ))}
          </div>
        </SectionBlock>
      )}

    </div>
  )
}
