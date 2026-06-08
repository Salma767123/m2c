"use client"

import { useState, useEffect } from "react"
import { User, Loader2, Mail, Phone, MapPin, Shield, FileText, ExternalLink } from "lucide-react"
import { qcCheckerService, QCCheckerData } from "@/services/qcCheckerService"

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">{label}</label>
      <div className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/70 text-slate-800 text-sm min-h-[46px] flex items-center">
        {value !== undefined && value !== null && value !== "" ? value : <span className="text-slate-400">—</span>}
      </div>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200/60 bg-gradient-to-r from-brand-50/60 to-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-50 rounded-lg">
            <Icon className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-IN")
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<QCCheckerData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const localData = qcCheckerService.getCheckerData()
        try {
          const res = await qcCheckerService.getCheckerProfile()
          if (res.success && res.data) {
            setProfile(res.data)
          } else if (localData) {
            setProfile(localData)
          }
        } catch (apiError) {
          console.error("API Fetch Error:", apiError)
          if (localData) setProfile(localData)
          else console.error("Failed to load profile details")
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const statusStyle =
    profile?.status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : profile?.status === "SUSPENDED"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-slate-100 text-slate-600 border-slate-200"

  const isPdfIdProof = profile?.idProof?.startsWith("data:application/pdf") || profile?.idProof?.toLowerCase().endsWith(".pdf")

  return (
    <div className="min-h-screen font-sans bg-gradient-to-br from-slate-50 to-brand-50/30">
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Profile</h1>
          <p className="text-slate-600 text-lg">View your personal details and account information</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Identity header */}
            <SectionCard icon={User} title="Profile Information" subtitle="Your account identity">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="w-24 h-24 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shrink-0">
                  {profile?.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Field label="Checker ID" value={profile?.checkerId || "—"} />
                  <Field label="Full Name" value={profile?.name} />
                  <div>
                    <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">Status</label>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border text-sm font-semibold ${statusStyle}`}>
                      {profile?.status || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* Contact */}
            <SectionCard icon={Mail} title="Contact Information" subtitle="How we reach you">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Email Address" value={profile?.email} />
                <Field label="Phone Number" value={profile?.phone} />
                <Field label="Alternate Email" value={profile?.alternateEmail} />
                <Field label="Alternate Phone" value={profile?.alternatePhone} />
              </div>
            </SectionCard>

            {/* Personal */}
            <SectionCard icon={Phone} title="Personal Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
                <Field label="Joining Date" value={formatDate(profile?.joiningDate)} />
              </div>
            </SectionCard>

            {/* Address */}
            <SectionCard icon={MapPin} title="Address Information">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Street Address" value={profile?.address} />
                <Field label="City" value={profile?.city} />
                <Field label="State / Province" value={profile?.state} />
                <Field label="ZIP / Postal Code" value={profile?.zipCode} />
                <Field label="Country" value={profile?.country} />
              </div>
            </SectionCard>

            {/* Professional */}
            <SectionCard icon={Shield} title="Professional Information">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="Specialization" value={profile?.specialization} />
                <Field label="Years of Experience" value={profile?.experience} />
              </div>
              <div className="mt-6">
                <Field label="Certifications" value={profile?.certifications} />
              </div>
            </SectionCard>

            {/* Documents */}
            <SectionCard icon={FileText} title="Documents" subtitle="ID proof">
              <div>
                <label className="block text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wide">ID Proof</label>
                {profile?.idProof ? (
                  <a
                    href={profile.idProof}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors"
                  >
                    <FileText className="w-4 h-4" /> View ID Proof{isPdfIdProof ? " (PDF)" : ""} <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <div className="px-4 py-3 border border-dashed border-slate-200 rounded-xl text-sm text-slate-400">No ID proof uploaded</div>
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  )
}
