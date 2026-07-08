'use client'

import { useEffect } from 'react'
import { FileText, Globe, Landmark, User } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import { buildFullName } from '@/lib/utils'
import { Country } from 'country-state-city'

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
  const bankDetails = v.bankDetails || null

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
        ]
      }),
      ...(v.tradeLicenseNumber ? ['ct_tradeLicense'] : []),
      ...(v.businessRegistrationNumber ? ['ct_businessRegNumber'] : []),
      ...(v.taxIdentificationNumber ? ['ct_taxId'] : []),
      ...(v.hasImportExport ? ['ct_hasImportExport'] : []),
      ...(v.importExperience !== undefined ? ['ct_importExp'] : []),
      ...(v.importCountries?.length > 0 ? ['ct_importCountries'] : []),
      ...(v.exportExperience !== undefined ? ['ct_exportExp'] : []),
      ...(v.exportCountries?.length > 0 ? ['ct_exportCountries'] : []),
      ...(bankDetails ? [
        'ct_bankName',
        'ct_accountType',
        'ct_accountHolderName',
        ...(bankDetails.accountNumber ? ['ct_accountNumber'] : []),
        'ct_ifscCode',
        ...(bankDetails.swiftCode ? ['ct_swiftCode'] : []),
        ...(bankDetails.branchName ? ['ct_branchName'] : []),
        ...(bankDetails.branchAddress ? ['ct_branchAddress'] : []),
      ] : []),
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
                  </div>
                </div>
              )
            })}
          </div>
        </SectionBlock>
      )}

      {/* Trade & Regulatory + Import/Export — grouped to reduce spacing */}
      <div className="space-y-6">
        {(v.tradeLicenseNumber || v.businessRegistrationNumber || v.taxIdentificationNumber) && (
          <SectionBlock title="Trade & Regulatory Details" icon={<FileText className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {v.tradeLicenseNumber && vf('ct_tradeLicense', 'Trade License Number', v.tradeLicenseNumber)}
              {v.businessRegistrationNumber && vf('ct_businessRegNumber', 'Business Registration Number', v.businessRegistrationNumber)}
              {v.taxIdentificationNumber && vf('ct_taxId', 'Tax Identification Number', v.taxIdentificationNumber)}
            </div>
          </SectionBlock>
        )}

        {(v.hasImportExport || v.importExperience !== undefined || v.exportExperience !== undefined) && (
          <SectionBlock title="Import / Export Experience" icon={<Globe className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {v.hasImportExport && vf('ct_hasImportExport', 'Import/Export Activities (Step 1)', v.hasImportExport === 'yes' ? 'Yes' : v.hasImportExport === 'no' ? 'No' : v.hasImportExport)}
              {v.importExperience !== undefined && vf('ct_importExp', 'Import Experience', v.importExperience ? 'Yes' : 'No')}
              {v.importCountries?.length > 0 && vf('ct_importCountries', 'Import Countries', withFlags(v.importCountries), 'list')}
              {v.exportExperience !== undefined && vf('ct_exportExp', 'Export Experience', v.exportExperience ? 'Yes' : 'No')}
              {v.exportCountries?.length > 0 && vf('ct_exportCountries', 'Export Countries', withFlags(v.exportCountries), 'list')}
            </div>
          </SectionBlock>
        )}
      </div>

      {/* Banking Details */}
      {bankDetails && (
        <SectionBlock title="Banking Details" icon={<Landmark className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vf('ct_bankName', 'Bank Name', bankDetails.bankName)}
            {vf('ct_accountType', 'Account Type', bankDetails.accountType)}
            {vf('ct_accountHolderName', 'Account Holder Name', bankDetails.accountHolderName)}
            {bankDetails.accountNumber && vf('ct_accountNumber', 'Account Number', `****${String(bankDetails.accountNumber).slice(-4)}`)}
            {vf('ct_ifscCode', 'IFSC Code', bankDetails.ifscCode)}
            {bankDetails.swiftCode && vf('ct_swiftCode', 'SWIFT Code', bankDetails.swiftCode)}
            {bankDetails.branchName && vf('ct_branchName', 'Branch Name', bankDetails.branchName)}
            {bankDetails.branchAddress && vf('ct_branchAddress', 'Branch Address', bankDetails.branchAddress)}
          </div>
        </SectionBlock>
      )}
    </div>
  )
}
