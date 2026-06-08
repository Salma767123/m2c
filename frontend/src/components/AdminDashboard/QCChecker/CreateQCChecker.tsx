"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Shield, Camera, FileText, Upload, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { Breadcrumb } from "../Breadcrumb/Breadcrumb";
import { qcCheckerService } from "@/services/qcCheckerService";

const INPUT_CLASS =
  "w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all bg-white";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  alternatePhone: "",
  alternateEmail: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  country: "",
  dateOfBirth: "",
  joiningDate: "",
  status: "active",
  specialization: "",
  experience: "",
  certifications: "",
  profilePhoto: "",
  idProof: "",
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function CreateQCChecker() {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [idProofName, setIdProofName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name: string) => (value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [name]: value as string }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showErrorToast("Invalid file", "Profile photo must be an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File too large", "Profile photo must be under 5MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setFormData((prev) => ({ ...prev, profilePhoto: dataUrl }));
  };

  const handleIdProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      showErrorToast("Invalid file", "ID proof must be an image or PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File too large", "ID proof must be under 5MB.");
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    setFormData((prev) => ({ ...prev, idProof: dataUrl }));
    setIdProofName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await qcCheckerService.createQCChecker({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone || undefined,
        alternateEmail: formData.alternateEmail || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        country: formData.country || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        joiningDate: formData.joiningDate || undefined,
        status: formData.status,
        specialization: formData.specialization || undefined,
        experience: formData.experience || undefined,
        certifications: formData.certifications || undefined,
        profilePhoto: formData.profilePhoto || undefined,
        idProof: formData.idProof || undefined,
      });

      showSuccessToast(
        "QC Checker Created!",
        result.message || "The QC checker has been successfully added. Login credentials have been sent to their email."
      );

      setFormData({ ...EMPTY_FORM });
      setIdProofName("");
    } catch (error: any) {
      showErrorToast("Creation Failed", error.message || "Failed to create QC checker. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Breadcrumb />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/dashboard/qc-checker"
          className="text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Add QC Checker</h1>
          <p className="text-slate-600 mt-1">Create a new quality control checker profile. Login credentials will be automatically sent to their email.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Profile Photo & ID Proof */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900">Profile Photo & ID Proof</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile photo */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {formData.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.profilePhoto} alt="Profile preview" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Profile Photo</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                    {formData.profilePhoto && (
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, profilePhoto: "" }))}
                        className="flex items-center gap-1 px-2 py-2 text-sm text-slate-500 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">JPG/PNG, up to 5MB</p>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>
              </div>

              {/* ID proof */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">ID Proof (Aadhaar / PAN / etc.)</label>
                {formData.idProof ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border border-brand-200 bg-brand-50 rounded-xl">
                    <span className="flex items-center gap-2 text-sm text-brand-700 truncate">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{idProofName || "ID proof uploaded"}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => { setFormData((prev) => ({ ...prev, idProof: "" })); setIdProofName(""); }}
                      className="text-slate-500 hover:text-red-600 transition-colors shrink-0"
                      aria-label="Remove ID proof"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => idProofInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload ID proof (image or PDF)
                  </button>
                )}
                <p className="text-xs text-slate-400 mt-1">Image or PDF, up to 5MB</p>
                <input ref={idProofInputRef} type="file" accept="image/*,application/pdf" onChange={handleIdProofChange} className="hidden" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Full Name <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter full name"
                  className={INPUT_CLASS}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900">Contact Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email Address <span className="text-brand-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="checker@example.com"
                  className={INPUT_CLASS}
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Login credentials will be sent to this email</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number <span className="text-brand-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className={INPUT_CLASS}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Alternate Email
                </label>
                <input
                  type="email"
                  name="alternateEmail"
                  value={formData.alternateEmail}
                  onChange={handleInputChange}
                  placeholder="alternate@example.com"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Alternate Phone Number
                </label>
                <input
                  type="tel"
                  name="alternatePhone"
                  value={formData.alternatePhone}
                  onChange={handleInputChange}
                  placeholder="+91 9876543210"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900">Address Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter street address"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Enter city"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    State/Province
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="Enter state"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    placeholder="Enter ZIP code"
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Enter country"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-5 w-5 text-brand-500" />
              <h2 className="text-lg font-semibold text-slate-900">Professional Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Joining Date
                </label>
                <input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleInputChange}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <Dropdown
                  label="Status"
                  value={formData.status}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "suspended", label: "Suspended" },
                  ]}
                  onChange={handleDropdownChange("status")}
                  placeholder="Select status"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Specialization
                </label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  placeholder="e.g., Textile Quality, Manufacturing"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  placeholder="Enter years"
                  className={INPUT_CLASS}
                  min="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Certifications
                </label>
                <textarea
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleInputChange}
                  placeholder="List any relevant certifications..."
                  rows={3}
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Note */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-brand-800">Auto-generated Credentials</h3>
              <p className="text-sm text-brand-700/80 mt-1">
                A unique Checker ID and password will be automatically generated and sent to the email address provided above.
                The QC checker can use these credentials to log in to the QC Portal.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <Link
            href="/admin/dashboard/qc-checker"
            className="flex items-center justify-center px-6 py-2.5 text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 disabled:bg-slate-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-xs shadow-brand-500/10"
          >
            <Save className="h-4 w-4" />
            {isSubmitting ? "Creating..." : "Create QC Checker"}
          </button>
        </div>
      </form>
    </div>
  );
}
