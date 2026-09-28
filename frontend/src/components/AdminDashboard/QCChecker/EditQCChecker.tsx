"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Shield, Camera, FileText, Upload, X, RefreshCw, Plus, Trash2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "../../UI/Card";
import Dropdown from "../../UI/Dropdown";
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils";
import { centerNotice } from "@/components/UI/CenterNotice";
import { qcCheckerService } from "@/services/qcCheckerService";
import ImageCropModal from "@/components/UI/ImageCropModal";
import { PhoneInput, validatePhoneE164 } from "@/components/VendorHub/FormUI";

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const INPUT_CLASS =
  "w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all bg-white";

function toDateInputValue(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EditQCChecker() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loadingData, setLoadingData] = useState(true);
  const [checkerId, setCheckerId] = useState("");
  const [idProofName, setIdProofName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TITLE_OPTIONS = ['Mr.', 'Mrs.', 'Miss']

  const [formData, setFormData] = useState({
    title: "",
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    alternatePhone: "",
    alternateEmail: "",
    address: "",
    addressLine2: "",
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
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const idProofInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  // Certifications: up to 5 rows of { name, document }. `documentUrl` is the
  // already-stored URL for existing certs; `document` is a newly-picked base64 file.
  type CertRow = { name: string; document?: string; documentUrl?: string; documentName?: string };
  const MAX_CERTS = 5;
  const [certs, setCerts] = useState<CertRow[]>([{ name: "" }]);
  const [certSubmitAttempted, setCertSubmitAttempted] = useState(false);
  const addCert = () => setCerts((c) => (c.length >= MAX_CERTS ? c : [...c, { name: "" }]));
  const removeCert = (i: number) => setCerts((c) => (c.length <= 1 ? [{ name: "" }] : c.filter((_, idx) => idx !== i)));
  const setCertName = (i: number, name: string) => setCerts((c) => c.map((row, idx) => (idx === i ? { ...row, name } : row)));
  const uploadCertDoc = async (i: number, file: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showErrorToast("File too large", "Document must be under 5MB."); return; }
    const dataUrl = await readFileAsDataUrl(file);
    setCerts((c) => c.map((row, idx) => (idx === i ? { ...row, document: dataUrl, documentName: file.name } : row)));
  };
  const clearCertDoc = (i: number) => setCerts((c) => c.map((row, idx) => (idx === i ? { ...row, document: undefined, documentUrl: undefined, documentName: undefined } : row)));

  // Contact validation (primary email is read-only here).
  const [errors, setErrors] = useState<{ alternateEmail?: string; phone?: string; alternatePhone?: string }>({});
  const validateContact = (): boolean => {
    const next: typeof errors = {};
    if (formData.alternateEmail.trim() && !isValidEmail(formData.alternateEmail)) next.alternateEmail = "Enter a valid email address";
    const phoneErr = validatePhoneE164(formData.phone, { label: "Phone number", required: true });
    if (phoneErr) next.phone = phoneErr;
    const altPhoneErr = validatePhoneE164(formData.alternatePhone, { label: "Secondary phone number", isSecondaryPhone: true });
    if (altPhoneErr) next.alternatePhone = altPhoneErr;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoadingData(true);
      try {
        const result = await qcCheckerService.getQCCheckerById(id);
        const c = result.data;
        setCheckerId(c.checkerId || "");
        // Split stored name into parts for individual fields
        const nameParts = (c.name || "").trim().split(/\s+/).filter(Boolean)
        const firstName = nameParts[0] || ""
        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ""
        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : ""
        setFormData({
          title: c.title || "",
          firstName,
          middleName,
          lastName,
          email: c.email || "",
          phone: c.phone || "",
          alternatePhone: c.alternatePhone || "",
          alternateEmail: c.alternateEmail || "",
          address: c.address || "",
          addressLine2: c.addressLine2 || "",
          city: c.city || "",
          state: c.state || "",
          zipCode: c.zipCode || "",
          country: c.country || "",
          dateOfBirth: toDateInputValue(c.dateOfBirth),
          joiningDate: toDateInputValue(c.joiningDate),
          status: (c.status || "ACTIVE").toLowerCase(),
          specialization: c.specialization || "",
          experience: c.experience != null ? String(c.experience) : "",
          certifications: "",
          profilePhoto: c.profilePhoto || "",
          idProof: c.idProof || "",
        });
        // Seed the certification rows from the stored value (array of {name,
        // documentUrl}); a legacy string becomes one name-only row.
        const certList: CertRow[] = Array.isArray(c.certifications)
          ? c.certifications.map((x: any) => ({ name: x?.name || "", documentUrl: x?.documentUrl || undefined, documentName: x?.documentUrl ? "Current document" : undefined }))
          : (typeof c.certifications === "string" && c.certifications ? [{ name: c.certifications }] : []);
        setCerts(certList.length ? certList : [{ name: "" }]);
        if (c.idProof) setIdProofName("Current ID proof");
      } catch (error: any) {
        showErrorToast("Load Failed", error.message || "Failed to load QC Checker data");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDropdownChange = (name: string) => (value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [name]: value as string }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showErrorToast("Invalid file", "Profile photo must be an image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File too large", "Profile photo must be under 5MB.");
      return;
    }
    setCropSrc(URL.createObjectURL(file));
  };

  const applyProfilePhoto = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    setFormData((prev) => ({ ...prev, profilePhoto: dataUrl }));
    centerNotice.success('Photo Uploaded', 'Profile photo updated successfully.');
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
    centerNotice.success('Document Uploaded', `${file.name} uploaded successfully.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCertSubmitAttempted(true);
    const contactOk = validateContact();
    // A named certificate must carry a document (a new upload or an existing one).
    const certMissingDoc = certs.some((c) => c.name.trim() && !c.document && !c.documentUrl);
    if (!contactOk || certMissingDoc) {
      showErrorToast(
        "Check the form",
        certMissingDoc ? "Please upload a document for each certificate you named." : "Please fix the highlighted email / phone fields.",
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const fullName = [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(' ').trim()
      await qcCheckerService.updateQCChecker(id, {
        name: fullName,
        title: formData.title || undefined,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone || undefined,
        alternateEmail: formData.alternateEmail || undefined,
        address: formData.address || undefined,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zipCode: formData.zipCode || undefined,
        country: formData.country || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        joiningDate: formData.joiningDate || undefined,
        status: formData.status,
        specialization: formData.specialization || undefined,
        experience: formData.experience || undefined,
        certifications: certs
          .filter((c) => c.name.trim())
          .map((c) => ({ name: c.name.trim(), document: c.document, documentUrl: c.documentUrl })),
        profilePhoto: formData.profilePhoto || undefined,
        idProof: formData.idProof || undefined,
      });
      showSuccessToast("Changes Saved!", "QC Checker profile has been updated successfully.");
      router.push("/admin/dashboard/qc-checker");
    } catch (error: any) {
      showErrorToast("Update Failed", error.message || "Failed to update QC Checker. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <p className="text-sm font-medium">Loading checker data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <ImageCropModal
        src={cropSrc}
        title="Crop Profile Photo"
        onCancel={() => {
          if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
        onCropped={async (file) => {
          await applyProfilePhoto(file);
          if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
          setCropSrc(null);
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/dashboard/qc-checker"
          className="text-slate-500 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edit QC Checker</h1>
          <p className="text-slate-600 mt-1">
            Updating profile for{" "}
            <span className="font-semibold text-brand-600 font-mono">{checkerId}</span>
          </p>
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
                      <Upload className="w-4 h-4" /> {formData.profilePhoto ? "Replace" : "Upload"}
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
                      <span className="truncate">{idProofName || "ID proof on file"}</span>
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
              {/* Title + First Name */}
              <div className="flex gap-3">
                <div className="w-28 shrink-0">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                  <select
                    name="title"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">—</option>
                    {TITLE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    First Name <span className="text-brand-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First name"
                    className={INPUT_CLASS}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last name"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Middle Name <span className="font-normal text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleInputChange}
                  placeholder="Middle name"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className={`${INPUT_CLASS} bg-slate-50 text-slate-500 cursor-not-allowed`}
                  title="Email cannot be changed"
                />
                <p className="text-xs text-slate-400 mt-1">Email address cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Phone Number <span className="text-brand-500">*</span>
                </label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(e164) => { setFormData((p) => ({ ...p, phone: e164 })); if (errors.phone) setErrors((p) => ({ ...p, phone: undefined })); }}
                  onBlur={() => setErrors((p) => ({ ...p, phone: validatePhoneE164(formData.phone, { label: "Phone number", required: true }) || undefined }))}
                  invalid={!!errors.phone}
                  placeholder="9876543210"
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Secondary Email</label>
                <input
                  type="email"
                  name="alternateEmail"
                  value={formData.alternateEmail}
                  onChange={handleInputChange}
                  onBlur={() => setErrors((p) => ({ ...p, alternateEmail: formData.alternateEmail.trim() && !isValidEmail(formData.alternateEmail) ? "Enter a valid email address" : undefined }))}
                  placeholder="alternate@example.com"
                  className={`${INPUT_CLASS} ${errors.alternateEmail ? "border-red-400" : ""}`}
                />
                {errors.alternateEmail && <p className="text-xs text-red-500 mt-1">{errors.alternateEmail}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Secondary Phone Number</label>
                <PhoneInput
                  value={formData.alternatePhone}
                  onChange={(e164) => { setFormData((p) => ({ ...p, alternatePhone: e164 })); if (errors.alternatePhone) setErrors((p) => ({ ...p, alternatePhone: undefined })); }}
                  onBlur={() => setErrors((p) => ({ ...p, alternatePhone: validatePhoneE164(formData.alternatePhone, { label: "Secondary phone number", isSecondaryPhone: true }) || undefined }))}
                  invalid={!!errors.alternatePhone}
                  placeholder="9876543210"
                />
                {errors.alternatePhone && <p className="text-xs text-red-500 mt-1">{errors.alternatePhone}</p>}
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Address Line 1</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="House / building / street"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Address Line 2 <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input
                  type="text"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleInputChange}
                  placeholder="Apartment, suite, floor"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} placeholder="Enter city" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">State/Province</label>
                  <input type="text" name="state" value={formData.state} onChange={handleInputChange} placeholder="Enter state" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">PIN / ZIP Code</label>
                  <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} placeholder="Enter PIN / ZIP code" className={INPUT_CLASS} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Country</label>
                  <input type="text" name="country" value={formData.country} onChange={handleInputChange} placeholder="Enter country" className={INPUT_CLASS} />
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Joining Date</label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Specialization</label>
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
                <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Experience</label>
                <input
                  type="number"
                  name="experience"
                  value={formData.experience || ''}
                  onChange={handleInputChange}
                  placeholder="Enter years"
                  className={INPUT_CLASS}
                  min="0"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Certifications <span className="font-normal text-slate-400">(up to {MAX_CERTS})</span>
                </label>
                <div className="space-y-3">
                  {certs.map((cert, i) => {
                    const hasDoc = !!(cert.documentName || cert.documentUrl);
                    const docMissing = certSubmitAttempted && !!cert.name.trim() && !hasDoc;
                    return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) => setCertName(i, e.target.value)}
                        placeholder={`Certification ${i + 1} name`}
                        className={`${INPUT_CLASS} flex-1`}
                      />
                      <div className="sm:w-64">
                        {hasDoc ? (
                          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{cert.documentName || "Document attached"}</span>
                            <button type="button" onClick={() => clearCertDoc(i)} aria-label="Remove document" className="shrink-0 text-emerald-600 hover:text-emerald-800">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 ${docMissing ? "border-red-400 text-red-600" : "border-slate-300 text-slate-600"}`}>
                            <Upload className="h-4 w-4" /> Upload document{cert.name.trim() ? " *" : ""}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={(e) => { uploadCertDoc(i, e.target.files?.[0] || null); e.target.value = ''; }}
                            />
                          </label>
                        )}
                        {docMissing && <p className="mt-1 text-xs text-red-500">Document required for a named certificate</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCert(i)}
                        aria-label="Remove certification"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    );
                  })}
                </div>
                {certs.length < MAX_CERTS && (
                  <button
                    type="button"
                    onClick={addCert}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-600 hover:bg-brand-100 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Certificate
                  </button>
                )}
                <p className="mt-1.5 text-xs text-slate-500">Each certificate: enter a name and optionally attach its document (image or PDF, up to 5MB).</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
            {isSubmitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
