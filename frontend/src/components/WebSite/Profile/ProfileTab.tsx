"use client";

import {
  User,
  Phone,
  Mail,
  User2,
  Info,
  MessageCircle,
} from "lucide-react";
import Dropdown from "@/components/UI/Dropdown";
import CountryCodeSelect from "@/components/UI/CountryCodeSelect";
import type { UserProfile } from "./types";

interface ProfileTabProps {
  editedProfile: UserProfile;
  setEditedProfile: (profile: UserProfile) => void;
  isEditing: boolean;
}

const TITLE_OPTIONS = [
  { value: "Mr", label: "Mr" },
  { value: "Mrs", label: "Mrs" },
  { value: "Ms", label: "Ms" },
  { value: "Miss", label: "Miss" },
  { value: "Dr", label: "Dr" },
  { value: "Mx", label: "Mx" },
];

const inputCls =
  "w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] disabled:bg-slate-50 disabled:text-slate-500";

export default function ProfileTab({
  editedProfile,
  setEditedProfile,
  isEditing,
}: ProfileTabProps) {
  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile({
      ...editedProfile,
      [field]: value,
    });
  };

  // Country-code select + number input, combined into one control.
  const renderPhoneField = ({
    label,
    icon,
    code,
    number,
    codeField,
    numberField,
    placeholder,
  }: {
    label: string;
    icon: React.ReactNode;
    code: string;
    number: string;
    codeField: keyof UserProfile;
    numberField: keyof UserProfile;
    placeholder: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {icon}
        {label}
      </label>
      <div className="flex">
        <div className="shrink-0 w-[112px]">
          <CountryCodeSelect
            value={code || "+91"}
            onChange={(v) => handleInputChange(codeField, v)}
            disabled={!isEditing}
            buttonClassName="px-3 py-3 rounded-l-xl rounded-r-none"
          />
        </div>
        <input
          type="tel"
          value={number}
          onChange={(e) => handleInputChange(numberField, e.target.value)}
          disabled={!isEditing}
          placeholder={placeholder}
          className="w-full px-4 py-3 border border-l-0 border-slate-300 rounded-r-xl focus:outline-none focus:ring-2 focus:ring-[#e01a1b]/40 focus:border-[#e01a1b] disabled:bg-slate-50 disabled:text-slate-500"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 border border-slate-200 p-4 sm:p-5 lg:p-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-5 sm:mb-6">
        <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#e01a1b]" />
        <h2 className="font-playfair text-lg sm:text-xl font-semibold text-[#1a1a1a]">Profile Information</h2>
      </div>

      <div className="border-2 border-dashed border-slate-200 p-4 sm:p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <User2 className="w-5 h-5 text-[#e01a1b]" />
          <h3 className="text-base sm:text-lg font-semibold text-slate-900">Personal Information</h3>
        </div>

        {/* Name group: Title · First · Middle · Last */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-5 mb-4 sm:mb-5">
          <div>
            <Dropdown
              label="Title"
              value={editedProfile.title || ""}
              options={TITLE_OPTIONS}
              onChange={(value) => handleInputChange("title", value as string)}
              placeholder="Title"
              disabled={!isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
            <input
              type="text"
              value={editedProfile.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              disabled={!isEditing}
              placeholder="First name"
              autoComplete="given-name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Middle Name</label>
            <input
              type="text"
              value={editedProfile.middleName || ""}
              onChange={(e) => handleInputChange("middleName", e.target.value)}
              disabled={!isEditing}
              placeholder="Middle name"
              autoComplete="additional-name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
            <input
              type="text"
              value={editedProfile.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              disabled={!isEditing}
              placeholder="Last name"
              autoComplete="family-name"
              className={inputCls}
            />
          </div>
        </div>

        {/* Contact group */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <input
              type="email"
              value={editedProfile.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your email address"
              autoComplete="email"
              className={inputCls}
            />
          </div>

          {renderPhoneField({
            label: "Phone Number",
            icon: <Phone className="w-4 h-4 inline mr-2" />,
            code: editedProfile.phoneCode || "+91",
            number: editedProfile.phone,
            codeField: "phoneCode",
            numberField: "phone",
            placeholder: "Phone number",
          })}

          {renderPhoneField({
            label: "WhatsApp Number",
            icon: <MessageCircle className="w-4 h-4 inline mr-2" />,
            code: editedProfile.whatsappCode || "+91",
            number: editedProfile.whatsapp || "",
            codeField: "whatsappCode",
            numberField: "whatsapp",
            placeholder: "WhatsApp number",
          })}

          <div>
            <Dropdown
              label="Gender"
              value={editedProfile.gender}
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
              onChange={(value) => handleInputChange("gender", value as string)}
              placeholder="Select gender"
              disabled={!isEditing}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Looking for your shipping addresses?</p>
          <p className="text-blue-700 mt-0.5">
            Manage your saved addresses in the <span className="font-semibold">Saved Addresses</span> tab.
          </p>
        </div>
      </div>
    </div>
  );
}
