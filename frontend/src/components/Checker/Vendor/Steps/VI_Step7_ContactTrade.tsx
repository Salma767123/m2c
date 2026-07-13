'use client'

import { useEffect } from 'react'
import { Globe, User } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import { buildFullName } from '@/lib/utils'
import { formatLocalLandline, formatIntlLandline } from '@/components/VendorHub/FormUI'
import { Country } from 'country-state-city'

// Contact landlines are stored either as separate parts (localLandlineStd +
// localLandline, intlLandlineCountryCode/Std/Number) or as a legacy assembled
// string (landline, intlLandline). Mirror the checker VendorDetail view so
// both shapes render. Returns '' when the contact has no landline.
function contactLocalLandline(contact: any): string {
  return formatLocalLandline({
    countryCode: '+91',
    std: contact.localLandlineStd,
    number: contact.localLandline || contact.landline,
  })
}
function contactIntlLandline(contact: any): string {
  return formatIntlLandline(
    contact.intlLandlineNumber
      ? `+${contact.intlLandlineCountryCode || ''} ${contact.intlLandlineStd || ''} ${contact.intlLandlineNumber}`.trim()
      : contact.intlLandline,
  )
}

// Build name → ISO-code map once at module level. We render flag *images*
// (via flagcdn) rather than flag emoji, which don't display on Windows.
const COUNTRY_ISO: Record<string, string> = {}
Country.getAllCountries().forEach(c => { COUNTRY_ISO[c.name] = c.isoCode })

function withFlags(countries: string[]): { flagIso: string; label: string }[] {
  return countries.map(name => ({ flagIso: COUNTRY_ISO[name] || '', label: name }))
}

interface Props {
  vendor: any
  verifications: Verifications
  onChange: (key: string, ok: boolean | null, remarks: string) => void
  onRegisterFields: (keys: string[]) => void
}

export default function VI_Step7_ContactTrade({ vendor: v, verifications, onChange, onRegisterFields }: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  )

  const mainContact = v.mainContact || null
  const alternateContacts: any[] = Array.isArray(v.alternateContacts) ? v.alternateContacts : []

  useEffect(() => {
    const keys: string[] = [
      ...(mainContact ? [
        ...(mainContact.photo ? ['ct_mainContact_photo'] : []),
        'ct_mainContact_name',
        ...(mainContact.designation ? ['ct_mainContact_designation'] : []),
        ...(mainContact.designation === 'Others' && mainContact.customDesignation ? ['ct_mainContact_customDesignation'] : []),
        ...(mainContact.department ? ['ct_mainContact_department'] : []),
        ...(mainContact.department === 'Others' && mainContact.customDepartment ? ['ct_mainContact_customDepartment'] : []),
        ...(mainContact.phone1 ? ['ct_mainContact_phone1'] : []),
        ...(mainContact.phone2 ? ['ct_mainContact_phone2'] : []),
        ...(mainContact.email1 ? ['ct_mainContact_email1'] : []),
        ...(mainContact.email2 ? ['ct_mainContact_email2'] : []),
        ...(contactLocalLandline(mainContact) ? ['ct_mainContact_localLandline'] : []),
        ...(contactIntlLandline(mainContact) ? ['ct_mainContact_intlLandline'] : []),
      ] : []),
      ...alternateContacts.flatMap((contact: any, idx: number) => {
        const prefix = `ct_alt_${idx}`
        return [
          ...(contact.photo ? [`${prefix}_photo`] : []),
          `${prefix}_name`,
          ...(contact.designation ? [`${prefix}_designation`] : []),
          ...(contact.designation === 'Others' && contact.customDesignation ? [`${prefix}_customDesignation`] : []),
          ...(contact.department ? [`${prefix}_department`] : []),
          ...(contact.department === 'Others' && contact.customDepartment ? [`${prefix}_customDepartment`] : []),
          ...(contact.phone1 ? [`${prefix}_phone1`] : []),
          ...(contact.phone2 ? [`${prefix}_phone2`] : []),
          ...(contact.email1 ? [`${prefix}_email1`] : []),
          ...(contact.email2 ? [`${prefix}_email2`] : []),
          ...(contactLocalLandline(contact) ? [`${prefix}_localLandline`] : []),
          ...(contactIntlLandline(contact) ? [`${prefix}_intlLandline`] : []),
        ]
      }),
      ...(v.hasImportExport ? ['ct_hasImportExport'] : []),
      ...(v.importCountries?.length > 0 ? ['ct_importCountries'] : []),
      ...(v.exportCountries?.length > 0 ? ['ct_exportCountries'] : []),
    ]
    onRegisterFields(keys)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Contact & Trade Information</h2>
        <p className="text-slate-500 text-sm">Verify contact persons, trade information, import/export experience, and banking details.</p>
      </div>

      {/* Main Contact Person — Photo first, then fields in Vendor Registration order */}
      {mainContact && (
        <SectionBlock title="Main Contact Person" icon={<User className="w-4 h-4" />}>
          {mainContact.photo && (
            <div className="mb-4">
              {vf('ct_mainContact_photo', 'Profile Photo', mainContact.photo, 'image')}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vf('ct_mainContact_name', 'Full Name', buildFullName(mainContact.title, mainContact.firstName, mainContact.middleName, mainContact.lastName))}
            {mainContact.designation && vf('ct_mainContact_designation', 'Designation', mainContact.designation)}
            {mainContact.designation === 'Others' && mainContact.customDesignation && vf('ct_mainContact_customDesignation', 'Custom Designation', mainContact.customDesignation)}
            {mainContact.department && vf('ct_mainContact_department', 'Department', mainContact.department)}
            {mainContact.department === 'Others' && mainContact.customDepartment && vf('ct_mainContact_customDepartment', 'Custom Department', mainContact.customDepartment)}
            {mainContact.phone1 && vf('ct_mainContact_phone1', 'Primary Phone', mainContact.phone1)}
            {mainContact.phone2 && vf('ct_mainContact_phone2', 'Secondary Phone', mainContact.phone2)}
            {mainContact.email1 && vf('ct_mainContact_email1', 'Primary Email', mainContact.email1)}
            {mainContact.email2 && vf('ct_mainContact_email2', 'Secondary Email', mainContact.email2)}
            {contactLocalLandline(mainContact) && vf('ct_mainContact_localLandline', 'Local Landline Number', contactLocalLandline(mainContact))}
            {contactIntlLandline(mainContact) && vf('ct_mainContact_intlLandline', 'International Landline Number', contactIntlLandline(mainContact))}
          </div>
        </SectionBlock>
      )}

      {/* Additional Contact Persons */}
      {alternateContacts.length > 0 && (
        <SectionBlock title={`Additional Contact Person${alternateContacts.length > 1 ? 's' : ''}`} icon={<User className="w-4 h-4" />}>
          <div className="space-y-4">
            {alternateContacts.map((contact: any, idx: number) => {
              const prefix = `ct_alt_${idx}`
              return (
                <div key={idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-bold text-slate-600">Contact Person {idx + 2}</p>
                  {contact.photo && (
                    <div className="mb-2">
                      {vf(`${prefix}_photo`, 'Profile Photo', contact.photo, 'image')}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vf(`${prefix}_name`, 'Full Name', buildFullName(contact.title, contact.firstName, contact.middleName, contact.lastName))}
                    {contact.designation && vf(`${prefix}_designation`, 'Designation', contact.designation)}
                    {contact.designation === 'Others' && contact.customDesignation && vf(`${prefix}_customDesignation`, 'Custom Designation', contact.customDesignation)}
                    {contact.department && vf(`${prefix}_department`, 'Department', contact.department)}
                    {contact.department === 'Others' && contact.customDepartment && vf(`${prefix}_customDepartment`, 'Custom Department', contact.customDepartment)}
                    {contact.phone1 && vf(`${prefix}_phone1`, 'Primary Phone', contact.phone1)}
                    {contact.phone2 && vf(`${prefix}_phone2`, 'Secondary Phone', contact.phone2)}
                    {contact.email1 && vf(`${prefix}_email1`, 'Primary Email', contact.email1)}
                    {contact.email2 && vf(`${prefix}_email2`, 'Secondary Email', contact.email2)}
                    {contactLocalLandline(contact) && vf(`${prefix}_localLandline`, 'Local Landline Number', contactLocalLandline(contact))}
                    {contactIntlLandline(contact) && vf(`${prefix}_intlLandline`, 'International Landline Number', contactIntlLandline(contact))}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionBlock>
      )}

      {/* Import/Export Information — mirrors registration "Import/Export Information" */}
      {(v.hasImportExport || v.importCountries?.length > 0 || v.exportCountries?.length > 0) && (
        <SectionBlock title="Import/Export Information" icon={<Globe className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {v.hasImportExport && vf('ct_hasImportExport', 'Do you engage in import/export activities?', v.hasImportExport === 'yes' ? 'Yes' : v.hasImportExport === 'no' ? 'No' : v.hasImportExport)}
            {v.importCountries?.length > 0 && vf('ct_importCountries', 'Import Countries', withFlags(v.importCountries), 'list')}
            {v.exportCountries?.length > 0 && vf('ct_exportCountries', 'Export Countries', withFlags(v.exportCountries), 'list')}
          </div>
        </SectionBlock>
      )}
    </div>
  )
}
