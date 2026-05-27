'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/components/UI/Button';
import {
  Shield,
  ShieldCheck,
  Upload,
  Package,
  Award,
  CheckCircle,
  X,
  FileText,
  Download,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Leaf,
  Recycle,
  Users,
  BadgeCheck,
  Globe2,
  TreePine,
  HeartHandshake,
  Factory,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { handleUpload } from '@/lib/toast-utils';
import { AccordionSection } from '@/components/VendorHub/FormUI';

interface CertificationsLogisticsProps {
  onNext: () => void;
  onPrev: () => void;
  onUpdateData: (data: any) => void;
  data: any;
}

// ── Certification catalog ──────────────────────────────────────────────
// Each entry pairs a Lucide icon with a colour swatch so the cards are
// visually distinct at a glance (icon + 2-3 letter badge). Colours are
// hard-coded strings (not template-built) so Tailwind's content scanner
// picks them up at build time.
interface CertificationConfig {
  id: string;
  name: string;
  abbreviation: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconText: string;
  iconRing: string;
}

const CERTIFICATIONS: CertificationConfig[] = [
  {
    id: 'oeko-tex',
    name: 'OEKO-TEX',
    abbreviation: 'OT',
    description: 'Textile safety & harmful-substance testing (Standard 100).',
    icon: Shield,
    iconBg: 'bg-sky-50',
    iconText: 'text-sky-600',
    iconRing: 'ring-sky-200/60',
  },
  {
    id: 'gots',
    name: 'GOTS',
    abbreviation: 'GO',
    description: 'Global Organic Textile Standard for organic fibre.',
    icon: Leaf,
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    iconRing: 'ring-emerald-200/60',
  },
  {
    id: 'grs',
    name: 'GRS',
    abbreviation: 'GR',
    description: 'Global Recycled Standard for recycled material content.',
    icon: Recycle,
    iconBg: 'bg-teal-50',
    iconText: 'text-teal-600',
    iconRing: 'ring-teal-200/60',
  },
  {
    id: 'smeta',
    name: 'SMETA / Sedex',
    abbreviation: 'SM',
    description: 'Sedex Members Ethical Trade Audit — labour & ethics.',
    icon: Users,
    iconBg: 'bg-indigo-50',
    iconText: 'text-indigo-600',
    iconRing: 'ring-indigo-200/60',
  },
  {
    id: 'iso-9001',
    name: 'ISO 9001',
    abbreviation: 'ISO',
    description: 'Quality Management Systems.',
    icon: BadgeCheck,
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    iconRing: 'ring-blue-200/60',
  },
  {
    id: 'iso-14001',
    name: 'ISO 14001',
    abbreviation: '14K',
    description: 'Environmental Management Systems.',
    icon: Globe2,
    iconBg: 'bg-green-50',
    iconText: 'text-green-600',
    iconRing: 'ring-green-200/60',
  },
  {
    id: 'bsci',
    name: 'BSCI',
    abbreviation: 'BS',
    description: 'Business Social Compliance Initiative (amfori).',
    icon: ShieldCheck,
    iconBg: 'bg-purple-50',
    iconText: 'text-purple-600',
    iconRing: 'ring-purple-200/60',
  },
  {
    id: 'fsc',
    name: 'FSC',
    abbreviation: 'FSC',
    description: 'Forest Stewardship Council — responsible forestry.',
    icon: TreePine,
    iconBg: 'bg-lime-50',
    iconText: 'text-lime-600',
    iconRing: 'ring-lime-200/60',
  },
  {
    id: 'fair-trade',
    name: 'Fair Trade',
    abbreviation: 'FT',
    description: 'Fair Trade certified — equitable trade practices.',
    icon: HeartHandshake,
    iconBg: 'bg-pink-50',
    iconText: 'text-pink-600',
    iconRing: 'ring-pink-200/60',
  },
  {
    id: 'wrap',
    name: 'WRAP',
    abbreviation: 'WR',
    description: 'Worldwide Responsible Accredited Production.',
    icon: Factory,
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-600',
    iconRing: 'ring-orange-200/60',
  },
  {
    id: 'bci',
    name: 'BCI',
    abbreviation: 'BCI',
    description: 'Better Cotton Initiative — sustainable cotton.',
    icon: Sparkles,
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    iconRing: 'ring-amber-200/60',
  },
];

// File upload constraints (Change 12: KB)
const CERT_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const CERT_ALLOWED_LABEL = 'PDF, JPG, or PNG';
const CERT_MAX_BYTES = 10 * 1024 * 1024;
const CERT_MAX_LABEL = '10,240 KB';

interface OtherCertification {
  id: string; // local-only id (timestamp-random)
  name: string;
  description: string;
}

export default function CertificationsLogistics({ onNext, onPrev, onUpdateData, data }: CertificationsLogisticsProps) {
  const [formData, setFormData] = useState({
    selectedCertifications: data.selectedCertifications || [],
    certificationFiles: data.certificationFiles || {},
    certificationExpiryDates: data.certificationExpiryDates || {},
    otherCertifications: (data.otherCertifications as OtherCertification[]) || [],
    packagingCapabilities: data.packagingCapabilities || '',
    logisticsPartners: data.logisticsPartners || '',
    shippingMethods: data.shippingMethods || [],
    qualityControlProcess: data.qualityControlProcess || '',
    complianceStandards: data.complianceStandards || ''
  });

  const [uploadErrors, setUploadErrors] = useState<{[key: string]: string}>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Render-phase sync (Vercel §5.1) — avoids the
  // `react-hooks/set-state-in-effect` rule.
  const [prevData, setPrevData] = useState(data);
  if (data !== prevData) {
    setPrevData(data);
    setFormData({
      selectedCertifications: data.selectedCertifications || [],
      certificationFiles: data.certificationFiles || {},
      certificationExpiryDates: data.certificationExpiryDates || {},
      otherCertifications: (data.otherCertifications as OtherCertification[]) || [],
      packagingCapabilities: data.packagingCapabilities || '',
      logisticsPartners: data.logisticsPartners || '',
      shippingMethods: data.shippingMethods || [],
      qualityControlProcess: data.qualityControlProcess || '',
      complianceStandards: data.complianceStandards || '',
    });
  }

  // ── Accordion Section State ────────────────────────────────────────
  type SectionKey = 'certifications' | 'quality' | 'logistics';
  const [activeSection, setActiveSection] = useState<SectionKey>('certifications');

  const FIELD_SECTION_MAP: Record<string, SectionKey> = {
    qualityControlProcess: 'quality',
    complianceStandards: 'quality',
    packagingCapabilities: 'logistics',
    logisticsPartners: 'logistics',
    shippingMethods: 'logistics',
  };

  const getSectionStatus = (section: SectionKey): 'complete' | 'partial' | 'empty' => {
    if (section === 'certifications') {
      const hasSelected = formData.selectedCertifications.length > 0;
      const hasOther = formData.otherCertifications.length > 0;
      if (!hasSelected && !hasOther) return 'empty';
      const selectedComplete = formData.selectedCertifications.every((id: string) => !!formData.certificationFiles[id]);
      const otherComplete = formData.otherCertifications.every((c: OtherCertification) => !!formData.certificationFiles[c.id]);
      if (selectedComplete && otherComplete) return 'complete';
      return 'partial';
    }
    if (section === 'quality') {
      const required = [formData.qualityControlProcess, formData.complianceStandards];
      const filled = required.filter(Boolean).length;
      if (filled === required.length) return 'complete';
      if (filled > 0) return 'partial';
      return 'empty';
    }
    if (section === 'logistics') {
      const required = [formData.packagingCapabilities, formData.logisticsPartners];
      const hasShipping = formData.shippingMethods.length > 0;
      const filledText = required.filter(Boolean).length;
      if (filledText === required.length && hasShipping) return 'complete';
      if (filledText > 0 || hasShipping) return 'partial';
      return 'empty';
    }
    return 'empty';
  };

  const hasSectionErrors = (section: SectionKey): boolean => {
    const directErrors = Object.keys(errors).filter(
      (k) => FIELD_SECTION_MAP[k] === section && errors[k] && touched[k]
    );
    if (directErrors.length > 0) return true;
    if (section === 'certifications') {
      const hasCertErrors = formData.selectedCertifications.some((id: string) => 
        (errors[`certFile_${id}`] && touched[`certFile_${id}`]) ||
        (errors[`certExpiry_${id}`] && touched[`certExpiry_${id}`])
      );
      const hasOtherErrors = formData.otherCertifications.some((c: OtherCertification) => 
        (errors[`otherCertName_${c.id}`] && touched[`otherCertName_${c.id}`]) ||
        (errors[`otherCertFile_${c.id}`] && touched[`otherCertFile_${c.id}`]) ||
        (errors[`otherCertExpiry_${c.id}`] && touched[`otherCertExpiry_${c.id}`])
      );
      return hasCertErrors || hasOtherErrors;
    }
    if (section === 'logistics') {
      if (errors['shippingMethods'] && touched['shippingMethods']) return true;
    }
    return false;
  };

  // Spread into each <AccordionSection {...sectionProps('id')} ...> call.
  // The shared AccordionSection (FormUI) is stateless — this helper closes
  // over local state (activeSection, errors, status) for each section.
  const sectionProps = (id: SectionKey) => ({
    id,
    isOpen: activeSection === id,
    status: getSectionStatus(id),
    hasErrors: hasSectionErrors(id),
    onActivate: () => setActiveSection(id),
  });

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (errors[field]) {
      if (field === 'qualityControlProcess' && formData.qualityControlProcess.trim()) setErrors(p => ({ ...p, [field]: '' }));
      if (field === 'complianceStandards' && formData.complianceStandards.trim()) setErrors(p => ({ ...p, [field]: '' }));
      if (field === 'packagingCapabilities' && formData.packagingCapabilities.trim()) setErrors(p => ({ ...p, [field]: '' }));
      if (field === 'logisticsPartners' && formData.logisticsPartners.trim()) setErrors(p => ({ ...p, [field]: '' }));
    }
  };

  const clearError = (key: string) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCertificationToggle = useCallback((certId: string) => {
    setFormData(prev => {
      const isCurrentlySelected = prev.selectedCertifications.includes(certId);

      if (isCurrentlySelected) {
        // Remove certification and clean up associated data
        const newFiles = { ...prev.certificationFiles };
        const newExpiryDates = { ...prev.certificationExpiryDates };

        // Clean up file URL if it exists
        if (newFiles[certId] && newFiles[certId].url) {
          URL.revokeObjectURL(newFiles[certId].url);
        }

        delete newFiles[certId];
        delete newExpiryDates[certId];

        clearError(`certFile_${certId}`);
        clearError(`certExpiry_${certId}`);

        return {
          ...prev,
          selectedCertifications: prev.selectedCertifications.filter((id: string) => id !== certId),
          certificationFiles: newFiles,
          certificationExpiryDates: newExpiryDates,
        };
      } else {
        return {
          ...prev,
          selectedCertifications: [...prev.selectedCertifications, certId],
        };
      }
    });

    setUploadErrors(prev => {
      if (!prev[certId]) return prev;
      const next = { ...prev };
      delete next[certId];
      return next;
    });
  }, []);

  // ── Other Certifications (free-form list) ───────────────────────────
  const handleAddOtherCertification = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      otherCertifications: [
        ...prev.otherCertifications,
        {
          id: `other-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: '',
          description: '',
        },
      ],
    }));
  }, []);

  const handleOtherCertificationChange = useCallback(
    (id: string, field: 'name' | 'description', value: string) => {
      setFormData(prev => ({
        ...prev,
        otherCertifications: prev.otherCertifications.map((c: OtherCertification) =>
          c.id === id ? { ...c, [field]: value } : c,
        ),
      }));
      if (field === 'name' && value.trim()) clearError(`otherCertName_${id}`);
    },
    [],
  );

  const handleRemoveOtherCertification = useCallback((id: string) => {
    setFormData(prev => {
      const newFiles = { ...prev.certificationFiles };
      const newExpiry = { ...prev.certificationExpiryDates };
      if (newFiles[id]?.url) URL.revokeObjectURL(newFiles[id].url);
      delete newFiles[id];
      delete newExpiry[id];

      clearError(`otherCertName_${id}`);
      clearError(`otherCertFile_${id}`);
      clearError(`otherCertExpiry_${id}`);

      return {
        ...prev,
        otherCertifications: prev.otherCertifications.filter(
          (c: OtherCertification) => c.id !== id,
        ),
        certificationFiles: newFiles,
        certificationExpiryDates: newExpiry,
      };
    });
    setUploadErrors(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleShippingMethodToggle = (method: string) => {
    setFormData(prev => {
      const next = prev.shippingMethods.includes(method)
        ? prev.shippingMethods.filter((m: string) => m !== method)
        : [...prev.shippingMethods, method];
      if (next.length > 0) clearError('shippingMethods');
      return { ...prev, shippingMethods: next };
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (value.trim()) clearError(field);
  };

  const handleExpiryDateChange = (certId: string, date: string) => {
    setFormData(prev => ({
      ...prev,
      certificationExpiryDates: {
        ...prev.certificationExpiryDates,
        [certId]: date
      }
    }));
    if (date) {
      clearError(`certExpiry_${certId}`);
      clearError(`otherCertExpiry_${certId}`);
    }
  };

  // Check if certificate is expired or expiring soon
  const getCertificateStatus = (expiryDate: string) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return { status: 'expired', message: 'Expired', color: 'text-red-600 bg-red-50 border-red-200' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', message: `Expires in ${daysUntilExpiry} days`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
    } else if (daysUntilExpiry <= 90) {
      return { status: 'warning', message: `Expires in ${daysUntilExpiry} days`, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
    } else {
      return { status: 'valid', message: `Valid until ${expiry.toLocaleDateString()}`, color: 'text-green-600 bg-green-50 border-green-200' };
    }
  };

  // ── File upload (Change 12: KB, shared toast pipeline) ─────────────
  // Routes the validation through `handleUpload` so the success/error
  // toasts match every other upload flow in the app. Caller can pass a
  // human label (e.g. "GOTS certificate") for the toast title.
  const handleFileUpload = useCallback((certId: string, label: string, file: File) => {
    const result = handleUpload(file, {
      label: `${label} certificate`,
      allowedTypes: CERT_ALLOWED_TYPES,
      allowedLabel: CERT_ALLOWED_LABEL,
      maxBytes: CERT_MAX_BYTES,
      maxLabel: CERT_MAX_LABEL,
    });
    if (!result.ok) {
      setUploadErrors(prev => ({ ...prev, [certId]: result.message }));
      return;
    }

    clearError(`certFile_${certId}`);
    clearError(`otherCertFile_${certId}`);

    setUploadErrors(prev => {
      if (!prev[certId]) return prev;
      const next = { ...prev };
      delete next[certId];
      return next;
    });

    setFormData(prev => {
      // Revoke prior blob URL if replacing
      const prevFile = prev.certificationFiles[certId];
      if (prevFile?.url && !prevFile.isExisting) {
        URL.revokeObjectURL(prevFile.url);
      }
      return {
        ...prev,
        certificationFiles: {
          ...prev.certificationFiles,
          [certId]: {
            file,
            name: file.name,
            size: file.size,
            type: file.type,
            url: URL.createObjectURL(file),
            uploadedAt: new Date().toISOString(),
          },
        },
      };
    });
  }, []);

  const handleFileChange = useCallback(
    (certId: string, label: string, event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) handleFileUpload(certId, label, file);
      // Reset value so re-selecting the same file works
      event.target.value = '';
    },
    [handleFileUpload],
  );

  const handleFileDrop = useCallback(
    (certId: string, label: string, event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) handleFileUpload(certId, label, file);
    },
    [handleFileUpload],
  );

  const handleDragOver = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const removeFile = (certId: string) => {
    // Clean up blob URLs to prevent memory leaks (skip for existing Cloudinary URLs)
    const fileData = formData.certificationFiles[certId];
    if (fileData && fileData.url && !fileData.isExisting) {
      URL.revokeObjectURL(fileData.url);
    }

    setFormData(prev => {
      const newFiles = { ...prev.certificationFiles };
      delete newFiles[certId];
      return {
        ...prev,
        certificationFiles: newFiles
      };
    });

    clearError(`certFile_${certId}`);
    clearError(`otherCertFile_${certId}`);

    // Clear any errors for this certification
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[certId];
      return newErrors;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.qualityControlProcess.trim()) {
      newErrors.qualityControlProcess = 'Quality Control Process description is required';
    }
    if (!formData.complianceStandards.trim()) {
      newErrors.complianceStandards = 'Compliance Standards are required';
    }

    formData.selectedCertifications.forEach((certId: string) => {
      if (!formData.certificationFiles[certId]) {
        newErrors[`certFile_${certId}`] = 'Certificate file is required';
      }
      if (!formData.certificationExpiryDates[certId]) {
        newErrors[`certExpiry_${certId}`] = 'Expiry date is required';
      }
    });

    formData.otherCertifications.forEach((cert: OtherCertification) => {
      if (!cert.name.trim()) {
        newErrors[`otherCertName_${cert.id}`] = 'Certification Name is required';
      }
      if (!formData.certificationFiles[cert.id]) {
        newErrors[`otherCertFile_${cert.id}`] = 'Certificate file is required';
      }
      if (!formData.certificationExpiryDates[cert.id]) {
        newErrors[`otherCertExpiry_${cert.id}`] = 'Expiry date is required';
      }
    });

    if (!formData.packagingCapabilities.trim()) {
      newErrors.packagingCapabilities = 'Packaging Capabilities are required';
    }
    if (!formData.logisticsPartners.trim()) {
      newErrors.logisticsPartners = 'Logistics Partners are required';
    }
    if (formData.shippingMethods.length === 0) {
      newErrors.shippingMethods = 'Select at least one shipping method';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const allTouched: Record<string, boolean> = { ...touched };
      Object.keys(newErrors).forEach(key => {
        allTouched[key] = true;
      });
      setTouched(allTouched);

      // Auto-expand the first failing section
      if (Object.keys(newErrors).some(k => k.startsWith('certFile_') || k.startsWith('certExpiry_') || k.startsWith('otherCert'))) {
        setActiveSection('certifications');
      } else if (newErrors.qualityControlProcess || newErrors.complianceStandards) {
        setActiveSection('quality');
      } else if (newErrors.packagingCapabilities || newErrors.logisticsPartners || newErrors.shippingMethods) {
        setActiveSection('logistics');
      }

      setTimeout(() => {
        const firstErrorKey = Object.keys(newErrors)[0];
        let element = document.getElementById(firstErrorKey) || document.querySelector(`[name="${firstErrorKey}"]`);
        
        if (firstErrorKey === 'shippingMethods') {
          element = document.getElementById('shippingMethodsContainer');
        } else if (firstErrorKey.startsWith('certFile_') || firstErrorKey.startsWith('otherCertFile_')) {
          const id = firstErrorKey.replace('certFile_', '').replace('otherCertFile_', '');
          element = document.getElementById(`file-${id}`);
        }
        
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.focus({ preventScroll: true });
        }
      }, 50);
      return;
    }

    onUpdateData(formData);
    onNext();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-6 space-y-5 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center gap-3 pb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-50 text-brand-600 shrink-0">
          <Shield className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-headline-md text-gray-900 leading-tight" style={{ textWrap: "balance" as any }}>
            Quality, Certifications & Logistics
          </h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Showcase your quality standards and logistics capabilities
          </p>
        </div>
      </div>

      {/* Certifications */}
      <AccordionSection
        {...sectionProps('certifications')}
        icon={<Award className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Certifications & Uploads"
        subtitle="Pick the standards your facility holds and upload your certificates."
      >
        <div className="flex flex-col gap-8">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3">Available Certifications</h4>
            {/* Standard cert grid — 3-col on lg, 2-col on md, 1-col mobile */}
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              role="group"
              aria-label="Standard certifications"
            >
            {CERTIFICATIONS.map((cert) => {
              const Icon = cert.icon;
              const isSelected = formData.selectedCertifications.includes(cert.id);
              return (
                <button
                  key={cert.id}
                  type="button"
                  onClick={() => handleCertificationToggle(cert.id)}
                  aria-pressed={isSelected}
                  className={`group relative text-left p-3.5 border rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 ${
                    isSelected
                      ? 'border-brand-500/40 bg-brand-50/30 shadow-sm shadow-brand-500/5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Colored icon chip — distinct per cert */}
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-md ring-1 shrink-0 ${cert.iconBg} ${cert.iconText} ${cert.iconRing}`}
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold text-slate-900 truncate">{cert.name}</p>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-brand-600 shrink-0" aria-hidden="true" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-snug mt-0.5">{cert.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Details for selected certs — appears below the grid in a
              clean list, not inline inside each card (cleaner scanning). */}
          {formData.selectedCertifications.length > 0 && (
            <div className="space-y-3 mt-8">
              <h4 className="text-sm font-semibold text-slate-800">
                Upload certificates ({formData.selectedCertifications.length} selected)
              </h4>
              {formData.selectedCertifications.map((certId: string) => {
                const cert = CERTIFICATIONS.find((c) => c.id === certId);
                if (!cert) return null;
                const Icon = cert.icon;
                const file = formData.certificationFiles[cert.id];
                const expiry = formData.certificationExpiryDates[cert.id];
                const status = expiry ? getCertificateStatus(expiry) : null;
                const inputId = `file-${cert.id}`;
                return (
                  <div
                    key={cert.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-md ring-1 shrink-0 ${cert.iconBg} ${cert.iconText} ${cert.iconRing}`}
                        aria-hidden="true"
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900">{cert.name}</p>
                        <p className="text-xs text-slate-500 truncate">{cert.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCertificationToggle(cert.id)}
                        aria-label={`Deselect ${cert.name}`}
                        className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        <X className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Expiry Date */}
                      <div>
                        <label
                          htmlFor={`expiry-${cert.id}`}
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden="true" />
                          Expiry Date
                        </label>
                        <input
                          id={`expiry-${cert.id}`}
                          type="date"
                          value={formData.certificationExpiryDates[cert.id] || ''}
                          onChange={(e) => handleExpiryDateChange(cert.id, e.target.value)}
                          onBlur={() => handleBlur(`certExpiry_${cert.id}`)}
                          className={`w-full px-3 py-2 text-sm border rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 transition-colors ${
                            errors[`certExpiry_${cert.id}`] && touched[`certExpiry_${cert.id}`]
                              ? 'border-red-500 bg-red-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        {errors[`certExpiry_${cert.id}`] && touched[`certExpiry_${cert.id}`] && (
                          <p className="text-red-500 text-xs mt-1 font-medium">{errors[`certExpiry_${cert.id}`]}</p>
                        )}
                        {status && (
                          <div className={`mt-1.5 text-xs px-2 py-1 rounded border ${status.color} inline-block`}>
                            {status.message}
                          </div>
                        )}
                      </div>

                      {/* Upload Field */}
                      <div>
                        <label
                          htmlFor={inputId}
                          className="block text-xs font-medium text-slate-700 mb-1.5"
                        >
                          Certificate File <span className="text-red-500">*</span>
                        </label>
                        {file ? (
                          <div className={`flex items-center justify-between gap-2 p-2 border rounded-md ${errors[`certFile_${cert.id}`] ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50/40'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {file.type === 'application/pdf' ? (
                                <FileText className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
                              ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={file.url}
                                  alt={`${cert.name} preview`}
                                  className="w-5 h-5 object-cover rounded shrink-0"
                                />
                              )}
                              <p className="text-xs font-medium text-slate-700 truncate" title={file.name}>
                                {file.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <label
                                htmlFor={inputId}
                                className="cursor-pointer text-xs font-medium text-brand-700 hover:text-brand-600 px-1.5 py-0.5 rounded focus-within:ring-2 focus-within:ring-brand-500/40"
                              >
                                Replace
                              </label>
                              <button
                                type="button"
                                onClick={() => removeFile(cert.id)}
                                aria-label={`Remove ${cert.name} certificate`}
                                className="text-red-600 hover:text-red-700 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                              >
                                <X className="w-3.5 h-3.5" aria-hidden="true" />
                              </button>
                            </div>
                            <input
                              id={inputId}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(cert.id, cert.name, e)}
                              className="sr-only"
                            />
                          </div>
                        ) : (
                          <label
                            htmlFor={inputId}
                            onDrop={(e) => handleFileDrop(cert.id, cert.name, e)}
                            onDragOver={handleDragOver}
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed rounded-md cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-500/40 ${
                              errors[`certFile_${cert.id}`]
                                ? 'border-red-500 bg-red-50 hover:bg-red-100'
                                : 'border-slate-300 hover:border-brand-500/40 hover:bg-brand-50/20'
                            }`}
                          >
                            <Upload className="w-4 h-4 text-slate-400" aria-hidden="true" />
                            <span className="font-medium text-brand-700">Upload</span>
                            <span className="text-slate-500">or drag &amp; drop</span>
                            <input
                              id={inputId}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFileChange(cert.id, cert.name, e)}
                              className="sr-only"
                            />
                          </label>
                        )}
                        {errors[`certFile_${cert.id}`] && (
                          <p className="text-red-500 text-xs mt-1 font-medium">{errors[`certFile_${cert.id}`]}</p>
                        )}
                        {uploadErrors[cert.id] && (
                          <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
                            {uploadErrors[cert.id]}
                          </p>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                          {CERT_ALLOWED_LABEL} · up to {CERT_MAX_LABEL}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Other Certifications — user-defined certs not in the catalog ── */}
          <div className="border-t border-slate-100 pt-8">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  Other Certifications
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Holding a certification we haven&rsquo;t listed? Add it here.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddOtherCertification}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-brand-700 bg-brand-50 border border-brand-500/30 rounded-md hover:bg-brand-100 hover:border-brand-500/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Add Other Certification
              </button>
            </div>
            {formData.otherCertifications.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                No other certifications added. Use the button above to add one.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.otherCertifications.map((other: OtherCertification, idx: number) => {
                  const file = formData.certificationFiles[other.id];
                  const expiry = formData.certificationExpiryDates[other.id];
                  const status = expiry ? getCertificateStatus(expiry) : null;
                  const inputId = `file-${other.id}`;
                  const label = other.name || `Other Certification ${idx + 1}`;
                  return (
                    <div
                      key={other.id}
                      className="rounded-lg border border-slate-200 bg-white p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold text-slate-700">
                          Other Certification {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOtherCertification(other.id)}
                          aria-label={`Remove ${label}`}
                          className="text-red-600 hover:text-red-700 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor={`other-name-${other.id}`}
                            className="block text-xs font-medium text-slate-700 mb-1.5"
                          >
                            Certification Name <span className="text-red-500" aria-hidden="true">*</span>
                          </label>
                          <input
                            id={`other-name-${other.id}`}
                            name={`otherCertName_${other.id}`}
                            type="text"
                            value={other.name}
                            onChange={(e) =>
                              handleOtherCertificationChange(other.id, 'name', e.target.value)
                            }
                            onBlur={() => handleBlur(`otherCertName_${other.id}`)}
                            placeholder="e.g. ZDHC, Cradle to Cradle, etc."
                            className={`w-full px-3 py-2 text-sm border rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 transition-colors ${
                              errors[`otherCertName_${other.id}`] && touched[`otherCertName_${other.id}`]
                                ? 'border-red-500 bg-red-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          />
                          {errors[`otherCertName_${other.id}`] && touched[`otherCertName_${other.id}`] && (
                            <p className="text-red-500 text-xs mt-1 font-medium">{errors[`otherCertName_${other.id}`]}</p>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={`other-desc-${other.id}`}
                            className="block text-xs font-medium text-slate-700 mb-1.5"
                          >
                            Description{' '}
                            <span className="text-gray-400 text-[10px] font-normal">(optional)</span>
                          </label>
                          <input
                            id={`other-desc-${other.id}`}
                            type="text"
                            value={other.description}
                            onChange={(e) =>
                              handleOtherCertificationChange(other.id, 'description', e.target.value)
                            }
                            placeholder="Short description"
                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 hover:border-slate-300 transition-colors"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor={`expiry-${other.id}`}
                            className="block text-xs font-medium text-slate-700 mb-1.5"
                          >
                            <Calendar className="w-3.5 h-3.5 inline mr-1 -mt-0.5" aria-hidden="true" />
                            Expiry Date
                          </label>
                          <input
                            id={`expiry-${other.id}`}
                            name={`otherCertExpiry_${other.id}`}
                            type="date"
                            value={formData.certificationExpiryDates[other.id] || ''}
                            onChange={(e) => handleExpiryDateChange(other.id, e.target.value)}
                            onBlur={() => handleBlur(`otherCertExpiry_${other.id}`)}
                            className={`w-full px-3 py-2 text-sm border rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 transition-colors ${
                              errors[`otherCertExpiry_${other.id}`] && touched[`otherCertExpiry_${other.id}`]
                                ? 'border-red-500 bg-red-50'
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                            min={new Date().toISOString().split('T')[0]}
                          />
                          {errors[`otherCertExpiry_${other.id}`] && touched[`otherCertExpiry_${other.id}`] && (
                            <p className="text-red-500 text-xs mt-1 font-medium">{errors[`otherCertExpiry_${other.id}`]}</p>
                          )}
                          {status && (
                            <div className={`mt-1.5 text-xs px-2 py-1 rounded border ${status.color} inline-block`}>
                              {status.message}
                            </div>
                          )}
                        </div>
                        <div>
                          <label
                            htmlFor={inputId}
                            className="block text-xs font-medium text-slate-700 mb-1.5"
                          >
                            Certificate File <span className="text-red-500">*</span>
                          </label>
                          {file ? (
                            <div className={`flex items-center justify-between gap-2 p-2 border rounded-md ${errors[`otherCertFile_${other.id}`] ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-slate-50/40'}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                {file.type === 'application/pdf' ? (
                                  <FileText className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
                                ) : (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={file.url}
                                    alt={`${label} preview`}
                                    className="w-5 h-5 object-cover rounded shrink-0"
                                  />
                                )}
                                <p className="text-xs font-medium text-slate-700 truncate" title={file.name}>
                                  {file.name}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <label
                                  htmlFor={inputId}
                                  className="cursor-pointer text-xs font-medium text-brand-700 hover:text-brand-600 px-1.5 py-0.5 rounded focus-within:ring-2 focus-within:ring-brand-500/40"
                                >
                                  Replace
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeFile(other.id)}
                                  aria-label={`Remove ${label} certificate`}
                                  className="text-red-600 hover:text-red-700 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                                >
                                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </div>
                              <input
                                id={inputId}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileChange(other.id, label, e)}
                                className="sr-only"
                              />
                            </div>
                          ) : (
                            <label
                              htmlFor={inputId}
                              onDrop={(e) => handleFileDrop(other.id, label, e)}
                              onDragOver={handleDragOver}
                              className={`flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed rounded-md cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-500/40 ${
                                errors[`otherCertFile_${other.id}`]
                                  ? 'border-red-500 bg-red-50 hover:bg-red-100'
                                  : 'border-slate-300 hover:border-brand-500/40 hover:bg-brand-50/20'
                              }`}
                            >
                              <Upload className="w-4 h-4 text-slate-400" aria-hidden="true" />
                              <span className="font-medium text-brand-700">Upload</span>
                              <span className="text-slate-500">or drag &amp; drop</span>
                              <input
                                id={inputId}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => handleFileChange(other.id, label, e)}
                                className="sr-only"
                              />
                            </label>
                          )}
                          {errors[`otherCertFile_${other.id}`] && (
                            <p className="text-red-500 text-xs mt-1 font-medium">{errors[`otherCertFile_${other.id}`]}</p>
                          )}
                          {uploadErrors[other.id] && (
                            <p className="text-xs text-red-600 mt-1 font-medium" role="alert">
                              {uploadErrors[other.id]}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </div> {/* Closes the Available Certifications wrapper */}

          {/* Uploaded Files Summary */}
          {Object.keys(formData.certificationFiles).length > 0 && (
            <div className="mt-8">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-slate-500 shrink-0" aria-hidden="true" />
                  Uploaded Certificates ({Object.keys(formData.certificationFiles).length})
                </h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(formData.certificationFiles).map(([certId, fileData]: [string, any]) => {
                const cert = CERTIFICATIONS.find((c) => c.id === certId);
                const otherCert = formData.otherCertifications.find(
                  (o: OtherCertification) => o.id === certId,
                );
                const displayName = cert?.name || otherCert?.name || 'Other Certification';
                const expiryDate = formData.certificationExpiryDates[certId];
                const status = expiryDate ? getCertificateStatus(expiryDate) : null;

                return (
                  <div key={certId} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div className="shrink-0">
                          {fileData.type === 'application/pdf' ? (
                            <FileText className="w-6 h-6 text-red-500" aria-hidden="true" />
                          ) : (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={fileData.url}
                              alt={`${displayName} preview`}
                              className="w-6 h-6 object-cover rounded"
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {fileData.name} • {formatFileSize(fileData.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(certId)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {/* Expiry Status */}
                    {status && (
                      <div className={`text-xs px-2 py-1 rounded border ${status.color} inline-block`}>
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {status.message}
                      </div>
                    )}
                    
                    {expiryDate && !status && (
                      <div className="text-xs text-gray-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Expires: {new Date(expiryDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {/* Quality Control */}
      <AccordionSection
        {...sectionProps('quality')}
        icon={<CheckCircle className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Quality Control Process"
        subtitle="Describe your testing procedures and compliance standards"
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quality Control Process Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="qualityControlProcess"
              name="qualityControlProcess"
              value={formData.qualityControlProcess}
              onChange={(e) => handleInputChange('qualityControlProcess', e.target.value)}
              onBlur={() => handleBlur('qualityControlProcess')}
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                errors.qualityControlProcess && touched.qualityControlProcess
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              placeholder="Describe your quality control processes, testing procedures, and standards..."
            />
            {errors.qualityControlProcess && touched.qualityControlProcess && (
              <p className="text-red-500 text-sm mt-1">{errors.qualityControlProcess}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Standards <span className="text-red-500">*</span>
            </label>
            <input
              id="complianceStandards"
              name="complianceStandards"
              type="text"
              value={formData.complianceStandards}
              onChange={(e) => handleInputChange('complianceStandards', e.target.value)}
              onBlur={() => handleBlur('complianceStandards')}
              className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                errors.complianceStandards && touched.complianceStandards
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              placeholder="ISO 9001, ISO 14001, etc."
            />
            {errors.complianceStandards && touched.complianceStandards && (
              <p className="text-red-500 text-sm mt-1">{errors.complianceStandards}</p>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* Packaging & Logistics */}
      <AccordionSection
        {...sectionProps('logistics')}
        icon={<Package className="w-4.5 h-4.5" aria-hidden="true" />}
        title="Packaging & Logistics"
        subtitle="Detail your packaging capabilities and shipping methods"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Packaging Capabilities <span className="text-red-500">*</span>
              </label>
              <textarea
                id="packagingCapabilities"
                name="packagingCapabilities"
                value={formData.packagingCapabilities}
                onChange={(e) => handleInputChange('packagingCapabilities', e.target.value)}
                onBlur={() => handleBlur('packagingCapabilities')}
                rows={3}
                className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                  errors.packagingCapabilities && touched.packagingCapabilities
                    ? 'border-red-500 bg-red-50'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
                placeholder="Custom packaging, eco-friendly options, bulk packaging..."
              />
              {errors.packagingCapabilities && touched.packagingCapabilities && (
                <p className="text-red-500 text-sm mt-1">{errors.packagingCapabilities}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logistics Partners <span className="text-red-500">*</span>
            </label>
            <input
              id="logisticsPartners"
              name="logisticsPartners"
              type="text"
              value={formData.logisticsPartners}
              onChange={(e) => handleInputChange('logisticsPartners', e.target.value)}
              onBlur={() => handleBlur('logisticsPartners')}
              className={`w-full px-4 py-3 border rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-brand-500 focus-visible:border-brand-500 transition-colors text-slate-900 ${
                errors.logisticsPartners && touched.logisticsPartners
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              placeholder="DHL, FedEx, UPS, Local carriers..."
            />
            {errors.logisticsPartners && touched.logisticsPartners && (
              <p className="text-red-500 text-sm mt-1">{errors.logisticsPartners}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Shipping Methods <span className="text-red-500">*</span>
            </label>
            <div id="shippingMethodsContainer" className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {['Air Freight', 'Sea Freight', 'Road Transport', 'Express Delivery'].map((method) => (
                <label key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.shippingMethods.includes(method)}
                    onChange={() => handleShippingMethodToggle(method)}
                    className="w-4 h-4 accent-brand-500 rounded border-slate-300 focus-visible:ring-2 focus-visible:ring-brand-500/40 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">{method}</span>
                </label>
              ))}
            </div>
            {errors.shippingMethods && touched.shippingMethods && (
              <p className="text-red-500 text-sm mt-2">{errors.shippingMethods}</p>
            )}
          </div>
        </div>
      </AccordionSection>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 gap-3">
        <Button
          onClick={onPrev}
          className="inline-flex items-center gap-2 h-11 px-5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          className="inline-flex items-center gap-2 h-11 px-6 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-sm shadow-brand-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
        >
          Save &amp; Continue
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}