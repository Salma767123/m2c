"use client";

import {
  User,
  Phone,
  Mail,
  User2,
  Info,
} from "lucide-react";
import Dropdown from "@/components/UI/Dropdown";
import type { UserProfile } from "./types";

interface ProfileTabProps {
  editedProfile: UserProfile;
  setEditedProfile: (profile: UserProfile) => void;
  isEditing: boolean;
}

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-gray-600" />
        <h2 className="text-xl font-bold text-slate-900">Profile Information</h2>
      </div>

      <div className="border-2 border-dashed border-slate-200 p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <User2 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-slate-900">Personal Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">First Name</label>
            <input
              type="text"
              value={editedProfile.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your first name"
              autoComplete="given-name"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Last Name</label>
            <input
              type="text"
              value={editedProfile.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your last name"
              autoComplete="family-name"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            <input
              type="tel"
              value={editedProfile.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              disabled={!isEditing}
              placeholder="Enter your phone number"
              autoComplete="tel"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
          </div>
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
