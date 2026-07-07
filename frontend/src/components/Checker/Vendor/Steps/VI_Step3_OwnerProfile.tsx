'use client'

import { useEffect } from 'react'
import { UserCircle, Users, Image as ImageIcon } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import { formatLocalLandline, formatIntlLandline } from '@/components/VendorHub/FormUI'
import { buildFullName } from '@/lib/utils'

function getEmployeeCountLabel(val: string) {
  const map: Record<string, string> = {
    '10-20': '10–20 employees',
    '20-50': '20–50 employees',
    '50-100': '50–100 employees',
    '100+': 'More than 100 employees',
  }
  return map[val] || val
}

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step3_OwnerProfile({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const ownerFullName = buildFullName(v.ownerTitle, v.ownerFirstName, v.ownerMiddleName, v.ownerLastName, v.ownerName) || v.ownerName
  const localLandline = formatLocalLandline({ countryCode: '+91', std: v.ownerLocalLandlineStd, number: v.ownerLandline })
  const intlLandline = formatIntlLandline(v.ownerIntlLandline)

  const additionalOwners: any[] = Array.isArray(v.additionalOwners) ? v.additionalOwners : []

  useEffect(() => {
    const keys: string[] = [
      ...(v.ownerPhoto ? ['o_ownerPhoto'] : []),
      'o_ownerName',
      'o_designation',
      ...(v.designation === 'Others' && v.customDesignation ? ['o_customDesignation'] : []),
      'o_ownerPhone',
      ...(v.ownerPhone2 ? ['o_ownerPhone2'] : []),
      'o_ownerEmail',
      ...(v.ownerEmail2 ? ['o_ownerEmail2'] : []),
      ...(localLandline ? ['o_ownerLandline'] : []),
      ...(intlLandline ? ['o_ownerIntlLandline'] : []),
      'o_businessStartDate',
      'o_employeeCount',
      ...(v.ownerAddress ? ['o_ownerAddress'] : []),
      ...(v.ownerCity ? ['o_ownerCity'] : []),
      ...(v.ownerState ? ['o_ownerState'] : []),
      ...(v.ownerZipCode ? ['o_ownerZipCode'] : []),
      ...(v.ownerCountry ? ['o_ownerCountry'] : []),
      ...additionalOwners.flatMap((owner: any, idx: number) => {
        const ll = formatLocalLandline({ countryCode: '+91', std: owner.localLandlineStd, number: owner.localLandlineNumber })
        const il = owner.intlLandlineCountryCode && owner.intlLandlineStd && owner.intlLandlineNumber
          ? `${owner.intlLandlineCountryCode}-${owner.intlLandlineStd}-${owner.intlLandlineNumber}`
          : null
        return [
          `o_add_${idx}_name`,
          `o_add_${idx}_designation`,
          ...(owner.designation === 'Others' && owner.customDesignation ? [`o_add_${idx}_customDesignation`] : []),
          ...(owner.email ? [`o_add_${idx}_email`] : []),
          ...(owner.email2 ? [`o_add_${idx}_email2`] : []),
          ...(owner.phone ? [`o_add_${idx}_phone`] : []),
          ...(owner.phone2 ? [`o_add_${idx}_phone2`] : []),
          ...(ll ? [`o_add_${idx}_landline`] : []),
          ...(il ? [`o_add_${idx}_intl`] : []),
        ]
      }),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Owner Profile</h2>
        <p className="text-slate-500 text-sm">Verify the proprietor/owner identity, contact details, and business history.</p>
      </div>

      {/* Owner Photo */}
      {v.ownerPhoto && (
        <SectionBlock title="Owner Photo" icon={<ImageIcon className="w-4 h-4" />}>
          {vf('o_ownerPhoto', 'Owner Photo', v.ownerPhoto, 'image')}
        </SectionBlock>
      )}

      {/* Owner Identity */}
      <SectionBlock title="Owner Identity" icon={<UserCircle className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('o_ownerName', 'Owner Full Name', ownerFullName)}
          {vf('o_designation', 'Designation', v.designation)}
          {v.designation === 'Others' && v.customDesignation && vf('o_customDesignation', 'Custom Designation', v.customDesignation)}
          {vf('o_ownerPhone', 'Primary Phone', v.ownerPhone)}
          {v.ownerPhone2 && vf('o_ownerPhone2', 'Secondary Phone', v.ownerPhone2)}
          {vf('o_ownerEmail', 'Primary Email', v.ownerEmail)}
          {v.ownerEmail2 && vf('o_ownerEmail2', 'Secondary Email', v.ownerEmail2)}
          {localLandline && vf('o_ownerLandline', 'Local Landline', localLandline)}
          {intlLandline && vf('o_ownerIntlLandline', 'International Landline', intlLandline)}
          {vf('o_businessStartDate', 'Business Start Date', v.businessStartDate, 'date')}
          {vf('o_employeeCount', 'Number of Employees', getEmployeeCountLabel(v.employeeCount))}
        </div>
      </SectionBlock>

      {/* Owner Address */}
      {(v.ownerAddress || v.ownerCity || v.ownerState) && (
        <SectionBlock title="Owner Address">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {v.ownerAddress && vf('o_ownerAddress', 'Address', v.ownerAddress)}
            {v.ownerCity && vf('o_ownerCity', 'City', v.ownerCity)}
            {v.ownerState && vf('o_ownerState', 'State', v.ownerState)}
            {v.ownerZipCode && vf('o_ownerZipCode', 'ZIP Code', v.ownerZipCode)}
            {v.ownerCountry && vf('o_ownerCountry', 'Country', v.ownerCountry)}
          </div>
        </SectionBlock>
      )}

      {/* Additional Owners */}
      {additionalOwners.length > 0 && (
        <SectionBlock title="Additional Owners" icon={<Users className="w-4 h-4" />}>
          {additionalOwners.map((owner: any, idx: number) => {
            const name = buildFullName(owner.title, owner.firstName, owner.middleName, owner.lastName) || `${owner.firstName || ''} ${owner.lastName || ''}`.trim()
            const ll = formatLocalLandline({ countryCode: '+91', std: owner.localLandlineStd, number: owner.localLandlineNumber })
            const il = owner.intlLandlineCountryCode && owner.intlLandlineStd && owner.intlLandlineNumber
              ? `${owner.intlLandlineCountryCode}-${owner.intlLandlineStd}-${owner.intlLandlineNumber}`
              : null

            return (
              <div key={idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-4">
                <p className="text-sm font-bold text-slate-700">Owner #{idx + 2}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {vf(`o_add_${idx}_name`, 'Full Name', name)}
                  {vf(`o_add_${idx}_designation`, 'Designation', owner.designation)}
                  {owner.designation === 'Others' && owner.customDesignation && vf(`o_add_${idx}_customDesignation`, 'Custom Designation', owner.customDesignation)}
                  {owner.email && vf(`o_add_${idx}_email`, 'Email', owner.email)}
                  {owner.email2 && vf(`o_add_${idx}_email2`, 'Secondary Email', owner.email2)}
                  {owner.phone && vf(`o_add_${idx}_phone`, 'Phone', owner.phone)}
                  {owner.phone2 && vf(`o_add_${idx}_phone2`, 'Secondary Phone', owner.phone2)}
                  {ll && vf(`o_add_${idx}_landline`, 'Local Landline', ll)}
                  {il && vf(`o_add_${idx}_intl`, 'International Landline', il)}
                </div>
              </div>
            )
          })}
        </SectionBlock>
      )}
    </div>
  )
}
