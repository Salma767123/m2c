"use client";

import React, { useState, useMemo } from "react";
import Select from "react-select";
import countryList from "react-select-country-list";
import { Button } from "@/components/UI/Button";
import { Building2, Globe, Mail, Phone, MapPin, Image, Home, Building } from "lucide-react";
import { IconFile, IconFileText } from "@tabler/icons-react";

interface CompanyDetailsProps {
  onNext: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

interface FormData {
  businessType: string;
  companyName: string;
  gstNumber: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  sameAsWarehouse: boolean;
  logo: string | null;
  logoFile: File | null;
  gstDocument: string | null;
  gstFile: File | null;
  // Warehouse fields (populated when sameAsWarehouse is true)
  warehouseAddress?: string;
  warehouseCity?: string;
  warehouseState?: string;
  warehouseZip?: string;
  warehouseCountry?: string;
}

const businessTypes = [
  {
    id: "sole",
    label: "Sole Proprietorship",
    description: "Individual ownership",
  },
  { id: "partnership", label: "Partnership", description: "Multiple owners" },
  {
    id: "corporation",
    label: "Corporation",
    description: "Incorporated entity",
  },
  { id: "llc", label: "Limited Liability Company (LLC)", description: "Limited liability company" },
];

export default function CompanyDetails({
  onNext,
  onUpdateData,
  data,
}: CompanyDetailsProps) {
  const [formData, setFormData] = useState<FormData>({
    businessType: data.businessType || "",
    companyName: data.companyName || "",
    gstNumber: data.gstNumber || "",
    email: data.email || "",
    phone: data.phone || "",
    website: data.website || "",
    address: data.address || "",
    city: data.city || "",
    state: data.state || "",
    zipCode: data.zipCode || "",
    country: data.country || "India",
    sameAsWarehouse: data.sameAsWarehouse || false,
    logo: data.logo || null,
    logoFile: null,
    gstDocument: data.gstDocument || null,
    gstFile: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const [logoError, setLogoError] = useState<string | null>(null);
  const [gstError, setGstError] = useState<string | null>(null);

  const handleLogoFile = (file: File) => {
    const allowed = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/svg+xml",
    ];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowed.includes(file.type)) {
      setLogoError(
        "Unsupported file type. Please upload PNG / JPG / WEBP / SVG."
      );
      return;
    }

    if (file.size > maxSize) {
      setLogoError("File too large. Maximum size is 2MB.");
      return;
    }

    if (formData.logoFile && typeof formData.logo === "string") {
      URL.revokeObjectURL(formData.logo);
    }

    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, logoFile: file, logo: url }));
    setLogoError(null);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleRemoveLogo = () => {
    if (formData.logoFile && typeof formData.logo === "string") {
      URL.revokeObjectURL(formData.logo);
    }
    setFormData((prev) => ({ ...prev, logoFile: null, logo: null }));
    setLogoError(null);
  };

  const handleGstFile = (file: File) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowed.includes(file.type)) {
      setGstError(
        "Unsupported file type. Please upload PDF, PNG, JPG, WEBP, or DOC."
      );
      return;
    }

    if (file.size > maxSize) {
      setGstError("File too large. Maximum size is 5MB.");
      return;
    }

    if (formData.gstFile && typeof formData.gstDocument === "string") {
      URL.revokeObjectURL(formData.gstDocument);
    }

    const url = URL.createObjectURL(file);
    setFormData((prev) => ({ ...prev, gstFile: file, gstDocument: url }));
    setGstError(null);
  };

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleGstFile(file);
  };

  const handleGstDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleGstFile(file);
  };

  const handleRemoveGst = () => {
    if (formData.gstFile && typeof formData.gstDocument === "string") {
      URL.revokeObjectURL(formData.gstDocument);
    }
    setFormData((prev) => ({ ...prev, gstFile: null, gstDocument: null }));
    setGstError(null);
  };

  // Helper function to get file icon and color based on file type
  const getFileIcon = (file: File | null) => {
    if (!file) return { Icon: IconFileText, color: "text-gray-400" };

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      return { Icon: IconFile, color: "text-red-500" };
    } else if (
      fileType === "application/msword" ||
      fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      fileName.endsWith(".doc") ||
      fileName.endsWith(".docx")
    ) {
      return { Icon: IconFile, color: "text-blue-500" };
    } else if (fileType.startsWith("image/")) {
      return { Icon: Image, color: "text-green-500" };
    }

    return { Icon: IconFile, color: "text-gray-400" };
  };

  const options = useMemo(() => countryList().getData(), []);
  const selectedOption =
    options.find((opt: any) => opt.label === formData.country) || null;

  const handleNext = () => {
    // Validate required fields
    const newErrors: Record<string, string> = {};
    
    if (!formData.businessType) newErrors.businessType = 'Business Type is required';
    if (!formData.companyName) newErrors.companyName = 'Company Name is required';
    if (!formData.gstNumber) {
      newErrors.gstNumber = 'GST Number is required';
    } else if (!/^[A-Z0-9]{15}$/i.test(formData.gstNumber)) {
      newErrors.gstNumber = 'GST Number must be exactly 15 alphanumeric characters';
    }
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone is required';
    } else {
      // Remove spaces, hyphens, parentheses but keep the + sign
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
      // Check if it starts with + and has 11-16 digits, or has 10-15 digits without +
      if (!/^(\+?[0-9]{10,15})$/.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number (10-15 digits, optional + prefix)';
      }
    }
    if (!formData.address) newErrors.address = 'Address is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.state) newErrors.state = 'State is required';
    if (!formData.zipCode) newErrors.zipCode = 'ZIP Code is required';
    if (!formData.country) newErrors.country = 'Country is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Mark all fields as touched to show errors
      const allTouched: Record<string, boolean> = {};
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);
      
      // Scroll to first error
      const firstErrorField = Object.keys(newErrors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // If "Same as warehouse address" is checked, copy company address to warehouse fields
    const updatedData: FormData & { [key: string]: any } = { ...formData };
    
    if (formData.sameAsWarehouse) {
      updatedData.warehouseAddress = formData.address;
      updatedData.warehouseCity = formData.city;
      updatedData.warehouseState = formData.state;
      updatedData.warehouseZip = formData.zipCode;
      updatedData.warehouseCountry = formData.country;
    }
    
    onUpdateData(updatedData);
    onNext();
  };

  return (
    <div className="max-w-420 p-4 space-y-4 font-sans">

     {/* Header */}
          <div className="flex p-2 items-center gap-4 mb-4">
            <Building className="w-12 h-12 text-gray-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Company Details</h1>
              <p className="text-gray-600 mt-1">Tell us about your business entity and legal information</p>
            </div>
          </div>

      
        {/* Business Type Selection */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm ">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              Business Type <span className="text-red-500 text-lg ml-1">*</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Tell us about your business entity and legal information
            </p>
          </div>
          <div className="px-6 pb-6">
            <div className="flex flex-wrap gap-2">
              {businessTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => handleInputChange("businessType", type.id)}
                  className={`p-4 rounded-4xl cursor-pointer transition-colors ${
                    formData.businessType === type.id
                      ? "border-2 border-blue-600 bg-blue-50 text-blue-700 "
                      : errors.businessType && touched.businessType
                      ? "border-2 border-red-500 bg-red-50"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <div className="font-semibold text-base">{type.label}</div>
                </div>
              ))}
            </div>
            {errors.businessType && touched.businessType && (
              <p className="text-red-500 text-sm mt-2">{errors.businessType}</p>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Information */}
        <section className="max-w-3xl p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 ">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Company Information
            </h2>
          </div>
          <div className="px-6 pb-4 space-y-4">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Company Name <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  onBlur={() => handleBlur("companyName")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.companyName && touched.companyName
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="Enter Company Name"
                />
              </div>
              {errors.companyName && touched.companyName && (
                <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
              )}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                GST Number <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value.toUpperCase())}
                  onBlur={() => handleBlur("gstNumber")}
                  maxLength={15}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.gstNumber && touched.gstNumber
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">15 alphanumeric characters (e.g., 22AAAAA0000A1Z5)</p>
              {errors.gstNumber && touched.gstNumber && (
                <p className="text-red-500 text-sm mt-1">{errors.gstNumber}</p>
              )}
            </div>
 
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Business Email <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email && touched.email
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="company@example.com"
                />
              </div>
              {errors.email && touched.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Phone Number <span className="text-red-500 text-lg">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onBlur={() => handleBlur("phone")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone && touched.phone
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              {errors.phone && touched.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Website
              </label>
              <div className="relative">
                {/* <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" /> */}
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  className="w-full text-base font-medium px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="www.company.com"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Company Logo & GST Certificate */}
        <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          {/* Company Logo - Top */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">Company Logo</h2>
            <p className="text-muted-foreground mt-1">
              Upload your company logo (PNG, JPG, WEBP, SVG). Max 2MB.
            </p>

            <div
              className="w-md h-48 mt-4 mx-auto flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg p-4 hover:border-gray-300 transition"
              onDragOver={handleDragOver}
              onDrop={handleLogoDrop}
              role="region"
              aria-label="Logo upload dropzone"
            >
              {formData.logo ? (
                <>
                  <div className="w-32 h-32 bg-white rounded overflow-hidden flex items-center justify-center shadow-sm">
                    <img
                      src={formData.logo as string}
                      alt="Company Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-3 text-sm text-gray-700">
                    {formData.logoFile?.name}
                  </div>
                </>
              ) : (
                <>
                  
                  <div className="mt-2 text-base font-semibold text-gray-500 text-center">
                    <div className="inline-flex items-center gap-2 justify-center">
                      <Image className="w-6 h-6 text-gray-400" />
                      <span>Drop image here or use the upload button</span>
                    </div>
                  </div>
                </>
              )}

              <input
                id="logoUpload"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <div className="mt-4 flex items-center gap-2">
                <label
                  htmlFor="logoUpload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 cursor-pointer"
                >
                  Upload
                </label>
                {formData.logo && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="px-3 py-2 text-sm rounded border border-transparent text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              {logoError && (
                <div className="mt-3 text-sm text-red-600">{logoError}</div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-gray-200"></div>

          {/* GST Certificate - Bottom */}
          <div>
            <h2 className="text-xl font-bold text-gray-900">GST Certificate</h2>
            <p className="text-muted-foreground mt-1">
              Upload your GST document (PDF, PNG, JPG, WEBP, DOC). Max 5MB.
            </p>

            <div
              className="w-md h-56 mt-4 mx-auto flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 rounded-lg p-4 hover:border-gray-300 transition"
              onDragOver={handleDragOver}
              onDrop={handleGstDrop}
              role="region"
              aria-label="GST document upload dropzone"
            >
              {formData.gstDocument ? (
                <>
                  {formData.gstFile?.type.startsWith("image/") ? (
                    <div className="w-32 h-32 bg-white rounded overflow-hidden flex items-center justify-center shadow-sm">
                      <img
                        src={formData.gstDocument as string}
                        alt="GST Certificate"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div className="mt-3 text-base font-medium text-gray-700">
                    {formData.gstFile?.name}
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 text-base font-semibold text-gray-500 text-center">
                    <div className="inline-flex items-center gap-2 justify-center">
                      <IconFileText className="w-6 h-6 text-gray-400" />
                      <span>Drop document here or use the upload button</span>
                    </div>
                  </div>
                </>
              )}

              <input
                id="gstUpload"
                type="file"
                accept="application/pdf,image/*,.doc,.docx"
                onChange={handleGstChange}
                className="hidden"
              />
              <div className="mt-4 flex items-center gap-2">
                <label
                  htmlFor="gstUpload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 cursor-pointer"
                >
                  Upload
                </label>
                {formData.gstDocument && (
                  <button
                    type="button"
                    onClick={handleRemoveGst}
                    className="px-3 py-2 text-sm rounded border border-transparent text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>

              {gstError && (
                <div className="mt-3 text-sm text-red-600">{gstError}</div>
              )}
            </div>
          </div>
        </section>
        </div>

      
        
        {/* Legal Address */}
        <section className="max-w-3xl p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-6 py-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Legal Address
            </h2>
          </div>
          <div className="px-6 pb-4 space-y-6">
            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Street Address <span className="text-red-500 text-lg">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                onBlur={() => handleBlur("address")}
                className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.address && touched.address
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder="Enter Street Address"
              />
              {errors.address && touched.address && (
                <p className="text-red-500 text-sm mt-1">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  City <span className="text-red-500 text-lg">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  onBlur={() => handleBlur("city")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.city && touched.city
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="City"
                />
                {errors.city && touched.city && (
                  <p className="text-red-500 text-sm mt-1">{errors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  State/Province <span className="text-red-500 text-lg">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  onBlur={() => handleBlur("state")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.state && touched.state
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="State"
                />
                {errors.state && touched.state && (
                  <p className="text-red-500 text-sm mt-1">{errors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">
                  ZIP/Postal Code <span className="text-red-500 text-lg">*</span>
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  onBlur={() => handleBlur("zipCode")}
                  className={`w-full text-base font-medium px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.zipCode && touched.zipCode
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                  placeholder="ZIP Code"
                />
                {errors.zipCode && touched.zipCode && (
                  <p className="text-red-500 text-sm mt-1">{errors.zipCode}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                Country <span className="text-red-500 text-lg">*</span>
              </label>
              <Select
                options={options}
                value={selectedOption}
                onChange={(option: any) => {
                  handleInputChange("country", option ? option.label : "");
                  handleBlur("country");
                }}
                className="w-full"
                classNamePrefix="react-select"
                instanceId="company-country-select"
                isClearable
                styles={{
                  control: (base) => ({
                    ...base,
                    borderColor: errors.country && touched.country ? '#ef4444' : base.borderColor,
                    backgroundColor: errors.country && touched.country ? '#fef2f2' : base.backgroundColor,
                  })
                }}
              />
              {errors.country && touched.country && (
                <p className="text-red-500 text-sm mt-1">{errors.country}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="sameAsWarehouse"
                checked={formData.sameAsWarehouse}
                onChange={(e) =>
                  handleInputChange("sameAsWarehouse", e.target.checked)
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label
                htmlFor="sameAsWarehouse"
                className="ml-2 text-base font-semibold text-gray-700"
              >
                Same as warehouse address
              </label>
            </div>
          </div>
        </section>
 

      {/* Navigation */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={handleNext}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
