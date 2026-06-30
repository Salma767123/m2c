'use client'

import { useEffect } from 'react'
import { Phone, FileText, Globe, Landmark, User } from 'lucide-react'
import VerifyField, { SectionBlock, Verifications } from './VI_VerifyField'
import { formatLocalLandline, formatIntlLandline } from '@/components/VendorHub/FormUI'
import { buildFullName } from '@/lib/utils'
import { Country } from 'country-state-city'

// Build name → flag emoji map once at module level
const COUNTRY_FLAG: Record<string, string> = {}
Country.getAllCountries().forEach(c => { if (c.flag) COUNTRY_FLAG[c.name] = c.flag })

function withFlags(countries: string[]): string[] {
  return countries.map(name => {
    const flag = COUNTRY_FLAG[name]
    return flag ? `${flag} ${name}` : name
  })
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

  const localLandline = formatLocalLandline({ countryCode: '+91', std: v.localLandlineStd, number: v.landlineNumber })
  const intlLandline = formatIntlLandline(v.intlLandline)
  const mainContact = v.mainContact || null
  const alternateContacts: any[] = Array.isArray(v.alternateContacts) ? v.alternateContacts : []
  const bankDetails = v.bankDetails || null

  useEffect(() => {
    const keys: string[] = [
      'ct_businessPhone',
      ...(v.phoneNumber2 ? ['ct_phoneNumber2'] : []),
      'ct_businessEmail',
      ...(v.businessEmail2 ? ['ct_businessEmail2'] : []),
      ...(localLandline ? ['ct_landline'] : []),
      ...(intlLandline ? ['ct_intlLandline'] : []),
      ...(v.businessAddress ? ['ct_businessAddress'] : []),
      ...(v.addressLine2 ? ['ct_addressLine2'] : []),
      ...(v.addressLine3 ? ['ct_addressLine3'] : []),
      ...(v.landmark ? ['ct_landmark'] : []),
      ...(v.businessCity ? ['ct_businessCity'] : []),
      ...(v.businessState ? ['ct_businessState'] : []),
      ...(v.businessZipCode ? ['ct_businessZipCode'] : []),
      ...(v.businessCountry ? ['ct_businessCountry'] : []),
      ...(mainContact ? [
        'ct_mainContact_name',
        ...(mainContact.designation ? ['ct_mainContact_designation'] : []),
        ...(mainContact.department ? ['ct_mainContact_department'] : []),
        ...(mainContact.email1 ? ['ct_mainContact_email1'] : []),
        ...(mainContact.email2 ? ['ct_mainContact_email2'] : []),
        ...(mainContact.phone1 ? ['ct_mainContact_phone1'] : []),
        ...(mainContact.phone2 ? ['ct_mainContact_phone2'] : []),
        ...(mainContact.photo ? ['ct_mainContact_photo'] : []),
      ] : []),
      ...alternateContacts.flatMap((contact: any, idx: number) => {
        const prefix = `ct_alt_${idx}`
        return [
          `${prefix}_name`,
          ...(contact.designation ? [`${prefix}_designation`] : []),
          ...(contact.department ? [`${prefix}_department`] : []),
          ...(contact.email1 ? [`${prefix}_email1`] : []),
          ...(contact.phone1 ? [`${prefix}_phone1`] : []),
          ...(contact.photo ? [`${prefix}_photo`] : []),
        ]
      }),
      ...(v.tradeLicenseNumber ? ['ct_tradeLicense'] : []),
      ...(v.businessRegistrationNumber ? ['ct_businessRegNumber'] : []),
      ...(v.taxIdentificationNumber ? ['ct_taxId'] : []),
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
        <p className="text-slate-500 text-sm">Verify business contact details, trade information, import/export experience, and banking details.</p>
      </div>

      {/* Business Contact */}
      <SectionBlock title="Business Contact Details" icon={<Phone className="w-4 h-4" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vf('ct_businessPhone', 'Primary Phone', v.businessPhone)}
          {v.phoneNumber2 && vf('ct_phoneNumber2', 'Secondary Phone', v.phoneNumber2)}
          {vf('ct_businessEmail', 'Primary Email', v.businessEmail)}
          {v.businessEmail2 && vf('ct_businessEmail2', 'Secondary Email', v.businessEmail2)}
          {localLandline && vf('ct_landline', 'Local Landline', localLandline)}
          {intlLandline && vf('ct_intlLandline', 'International Landline', intlLandline)}
        </div>
      </SectionBlock>

      {/* Factory Site / Legal Address */}
      {(v.businessAddress || v.businessCity) && (
        <SectionBlock title="Factory Site / Legal Address">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {v.businessAddress && vf('ct_businessAddress', 'Address Line 1', v.businessAddress)}
            {v.addressLine2 && vf('ct_addressLine2', 'Address Line 2', v.addressLine2)}
            {v.addressLine3 && vf('ct_addressLine3', 'Address Line 3', v.addressLine3)}
            {v.landmark && vf('ct_landmark', 'Landmark', v.landmark)}
            {v.businessCity && vf('ct_businessCity', 'City', v.businessCity)}
            {v.businessState && vf('ct_businessState', 'State', v.businessState)}
            {v.businessZipCode && vf('ct_businessZipCode', 'ZIP / Postal Code', v.businessZipCode)}
            {v.businessCountry && vf('ct_businessCountry', 'Country', v.businessCountry)}
          </div>
        </SectionBlock>
      )}

      {/* Main Contact Person */}
      {mainContact && (
        <SectionBlock title="Main Contact Person" icon={<User className="w-4 h-4" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vf('ct_mainContact_name', 'Contact Name', buildFullName(mainContact.title, mainContact.firstName, mainContact.middleName, mainContact.lastName))}
            {mainContact.designation && vf('ct_mainContact_designation', 'Designation', mainContact.designation)}
            {mainContact.department && vf('ct_mainContact_department', 'Department', mainContact.department)}
            {mainContact.email1 && vf('ct_mainContact_email1', 'Primary Email', mainContact.email1)}
            {mainContact.email2 && vf('ct_mainContact_email2', 'Secondary Email', mainContact.email2)}
            {mainContact.phone1 && vf('ct_mainContact_phone1', 'Primary Phone', mainContact.phone1)}
            {mainContact.phone2 && vf('ct_mainContact_phone2', 'Secondary Phone', mainContact.phone2)}
          </div>
          {mainContact.photo && vf('ct_mainContact_photo', 'Contact Photo', mainContact.photo, 'image')}
        </SectionBlock>
      )}

      {/* Contact Person 2 (and onwards) */}
      {alternateContacts.length > 0 && (
        <SectionBlock title="Contact Person 2" icon={<User className="w-4 h-4" />}>
          <div className="space-y-4">
            {alternateContacts.map((contact: any, idx: number) => {
              const prefix = `ct_alt_${idx}`
              return (
                <div key={idx} className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-bold text-slate-600">Contact Person {idx + 2}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vf(`${prefix}_name`, 'Name', buildFullName(contact.title, contact.firstName, contact.middleName, contact.lastName))}
                    {contact.designation && vf(`${prefix}_designation`, 'Designation', contact.designation)}
                    {contact.department && vf(`${prefix}_department`, 'Department', contact.department)}
                    {contact.email1 && vf(`${prefix}_email1`, 'Primary Email', contact.email1)}
                    {contact.phone1 && vf(`${prefix}_phone1`, 'Primary Phone', contact.phone1)}
                  </div>
                  {contact.photo && vf(`${prefix}_photo`, 'Photo', contact.photo, 'image')}
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

        {(v.importExperience !== undefined || v.exportExperience !== undefined) && (
          <SectionBlock title="Import / Export Experience" icon={<Globe className="w-4 h-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
