import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Linking, Modal } from 'react-native';
// Section headings are plain text in the report's style, so the per-section
// icons this screen used to render are gone along with their imports.
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, AlertCircle,
  Download, ExternalLink, Clock, Eye,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { downloadFactoryReportPdf } from '@/lib/reportPdf';
import { withUnit } from '@/components/Vendor/Steps/fieldHelpers';
import { matchedAddressLabel, LOCATION_THRESHOLD_METERS } from '@/lib/inspectionSchedule';
import { computeInspectionDurations, formatDuration } from '@/lib/inspectionDuration';

interface ViewReportProps {
  reportId: string;
  onBack?: () => void;
}

// ── Label maps (mirror web ReportDetail.tsx) ────────────────────────────────
const BIZ_TYPE: Record<string, string> = {
  proprietorship: 'Proprietorship',
  'pvt-ltd': 'Private Limited Company',
  'partnership-firm': 'Partnership Firm',
  llp: 'Limited Liability Partnership (LLP)',
  unregistered: 'Unregistered',
};
const OWN_TYPE: Record<string, string> = { owned: 'Owned', rented: 'Rented', lease: 'Lease' };
const EMP_COUNT: Record<string, string> = {
  '10-20': '10–20 employees', '20-50': '20–50 employees',
  '50-100': '50–100 employees', '100+': 'More than 100 employees',
};
const FACILITY_LABELS: Record<string, string> = {
  spinning: 'Spinning', weaving: 'Weaving', dyeing: 'Dyeing',
  printing: 'Printing', stitching: 'Stitching', finishing: 'Finishing',
};

function stepForKey(key: string): string {
  if (key.startsWith('certDoc_') || key.startsWith('cert_')) return 'Step 6 – Certifications';
  if (key.startsWith('vt_')) return 'Step 4 – Vendor & Products';
  if (key.startsWith('mf_')) return 'Step 5 – Manufacturing';
  if (key.startsWith('ct_')) return 'Step 7 – Contact & Trade';
  if (key.startsWith('c_')) return 'Step 1 – Company Info';
  if (key.startsWith('w_')) return 'Step 2 – Warehouse & Factory';
  if (key.startsWith('o_')) return 'Step 3 – Owner Profile';
  return 'Other';
}

function fieldLabelForKey(key: string): string {
  const rest = key.replace(/^(certDoc_|cert_|vt_|mf_|ct_|c_|w_|o_)/, '');
  const spaced = rest.replace(/_/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const WORD: Record<string, string> = {
    wh: 'Warehouse', legal: 'Legal', prod: 'Product', img: 'Image',
    cat: 'Category', photo: 'Photo', spec: 'Spec', var: 'Variant',
    std: 'Standard', dims: 'Dimensions', sku: 'SKU', uom: 'UOM',
    gst: 'GST', id: 'ID', qc: 'QC',
  };
  const words = spaced.split(/\s+/).filter(Boolean).map((w) => {
    const lower = w.toLowerCase();
    if (WORD[lower]) return WORD[lower];
    if (/^\d+$/.test(w)) return String(Number(w) + 1);
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
  const deduped = words.filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase());
  return deduped.join(' ') || key;
}

function buildName(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ').trim() || '—';
}

type VF = Record<string, { ok: boolean | null; remarks?: string }>;

// ── Small presentational helpers ────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value?: string | null }) => (
  <View className="mb-3">
    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</Text>
    <Text className="text-sm font-semibold text-gray-900" selectable>{value || '—'}</Text>
  </View>
);

const InfoCard = ({ label, value }: { label: string; value?: string | null }) => (
  <View className="bg-slate-50 rounded-xl p-3 border border-slate-100 mb-2" style={{ width: '48%', marginRight: '2%' }}>
    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</Text>
    <Text className="text-sm font-semibold text-slate-900" selectable>{value || '—'}</Text>
  </View>
);

// ── PDF-matching status badge for individual fields ────────────────────────
function VerBadge({ k, vf }: { k: string; vf: VF }) {
  const v = vf[k];
  if (!v) return null;
  if (v.ok === true) return (
    <View className="flex-row items-center bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" style={{ columnGap: 3 }}>
      <CheckCircle2 size={10} color="#047857" />
      <Text className="text-[10px] font-bold text-emerald-700">Verified</Text>
    </View>
  );
  if (v.ok === false) return (
    <View className="flex-row items-center bg-red-50 px-1.5 py-0.5 rounded border border-red-200" style={{ columnGap: 3 }}>
      <XCircle size={10} color="#b91c1c" />
      <Text className="text-[10px] font-bold text-red-700">Issue</Text>
    </View>
  );
  return (
    <View className="bg-slate-100 px-1.5 py-0.5 rounded">
      <Text className="text-[10px] font-bold text-slate-400">Pending</Text>
    </View>
  );
}

// ── Field column width matches PDF exactly (42%) ────────────────────────────
const FIELD_COL_WIDTH = '42%';

// ── Field/Value row with verification badge ────────────────────────────────
function VCard({ label, value, k, vf }: { label: string; value?: string | string[] | null; k?: string; vf?: VF }) {
  const ver = k && vf ? vf[k] : null;
  const display = Array.isArray(value) ? (value.length === 0 ? '—' : value.join(', ')) : (value || '—');
  return (
    <View className="flex-row border-b border-slate-200">
      <View className="px-3 py-2.5 border-r border-slate-200 bg-slate-50" style={{ width: FIELD_COL_WIDTH }}>
        <Text className="text-xs font-medium text-slate-700">{label}</Text>
      </View>
      <View className="flex-1 px-3 py-2.5 bg-white">
        <View className="flex-row items-start" style={{ columnGap: 8 }}>
          <Text className="text-xs font-medium text-slate-900 flex-1" selectable>{display}</Text>
          {k && vf ? <VerBadge k={k} vf={vf} /> : null}
        </View>
        {ver?.ok === false && ver.remarks ? (
          <Text className="text-[11px] text-red-600 mt-1 italic">{ver.remarks}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ── Section status badge ("Issues Found" / "Verified" / "Pending") ─────────
function StepBadge({ prefixes, vf }: { prefixes: string[]; vf: VF }) {
  const entries = Object.entries(vf).filter(([k]) => prefixes.some((p) => k.startsWith(p)));
  if (!entries.length) return null;
  const ok = entries.filter(([, v]) => v.ok === true).length;
  const fail = entries.filter(([, v]) => v.ok === false).length;
  if (fail > 0) return <Text className="text-xs font-bold text-red-600">Issues Found</Text>;
  if (ok === entries.length) return <Text className="text-xs font-bold text-emerald-600">Verified</Text>;
  return <Text className="text-xs font-bold text-amber-600">Pending</Text>;
}

function StatusChip({ value }: { value: string }) {
  const v = (value || '').toLowerCase();
  const isPass = ['yes', 'pass', 'passed', 'approved'].includes(v);
  const isFail = ['no', 'fail', 'failed', 'rejected'].includes(v);
  const Icon = isPass ? CheckCircle2 : isFail ? XCircle : AlertCircle;
  const color = isPass ? '#15803d' : isFail ? '#b91c1c' : '#b45309';
  const bg = isPass ? 'bg-green-50 border-green-200' : isFail ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const tx = isPass ? 'text-green-700' : isFail ? 'text-red-700' : 'text-amber-700';
  return (
    <View className={`flex-row items-center px-2.5 py-1 rounded-full border ${bg}`} style={{ columnGap: 4 }}>
      <Icon size={13} color={color} />
      <Text className={`text-xs font-semibold ${tx}`}>{value}</Text>
    </View>
  );
}

const YesNoRow = ({ label, value }: { label: string; value?: string }) => (
  <View className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
    <Text className="text-sm text-slate-700 flex-1">{label}</Text>
    {value ? <StatusChip value={value} /> : <Text className="text-slate-400 text-xs">—</Text>}
  </View>
);

// ── Subsection title (e.g., "Legal Address & Factory Site") ────────────────
// Single captioned photo (Company Logo / Owner Profile Photo / Main Contact
// Photo), laid out beside its caption the way the report prints them. Tapping
// opens the same lightbox the galleries use.
const InlinePhoto = ({ src, caption, onTap }: { src?: string | null; caption: string; onTap?: (u: string) => void }) => {
  if (!src || typeof src !== 'string') return null;
  return (
    <TouchableOpacity
      activeOpacity={onTap ? 0.85 : 1}
      onPress={() => onTap?.(src)}
      className="flex-row items-center my-3"
      style={{ columnGap: 12 }}
    >
      <Image source={{ uri: src }} style={{ width: 72, height: 72, borderRadius: 6 }} className="border border-slate-200" resizeMode="cover" />
      <Text className="text-[11px] text-slate-500 italic flex-1">{caption}</Text>
    </TouchableOpacity>
  );
};

const SubHead = ({ title }: { title: string }) => (
  <Text className="text-xs font-bold text-slate-600 uppercase tracking-wider mt-3 mb-2 pb-1 border-b border-slate-200">{title}</Text>
);

// ── Section heading matching PDF: red title + red underline + status badge ──
const Section = ({ title, badge, children }: {
  title: string; icon?: any; accent?: { bg: string; iconColor: string; text: string };
  badge?: React.ReactNode; children: React.ReactNode;
}) => (
  <View className="mb-6">
    {/* Red underline below title, matching PDF exactly */}
    <View className="pb-2 mb-3" style={{ borderBottomWidth: 2, borderBottomColor: '#c41617' }}>
      <View className="flex-row items-center justify-between">
        <Text className="font-bold text-[16px] text-red-700 flex-1">{title}</Text>
        {badge ? <View className="ml-2">{badge}</View> : null}
      </View>
    </View>
    <View>{children}</View>
  </View>
);

// ── Table wrapper: header strip + bordered box ──────────────────────────────
const CardGrid = ({ headers = ['Field', 'Value'], children }: {
  headers?: [string, string];
  children: React.ReactNode;
}) => (
  <View
    className="rounded-lg overflow-hidden mb-3"
    style={{ borderColor: '#cbd5e1', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 }}
  >
    <View className="flex-row bg-slate-100 border-b border-slate-200">
      <Text
        className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-3 py-2.5"
        style={{ width: FIELD_COL_WIDTH }}
      >
        {headers[0]}
      </Text>
      <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-3 py-2.5 flex-1">
        {headers[1]}
      </Text>
    </View>
    {children}
  </View>
);

// ── Three-column certifications table (Name | Expiry Date | Description) ────
const CertTable = ({ rows }: {
  rows: { name: string; expiry: string; description: string; issuedBy?: string; badge?: React.ReactNode }[];
}) => (
  <View
    className="rounded-lg overflow-hidden mb-3"
    style={{ borderColor: '#cbd5e1', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 }}
  >
    <View className="flex-row bg-slate-100 border-b border-slate-300">
      <Text className="text-[10px] font-bold text-brand-600 uppercase tracking-wider px-3 py-2" style={{ width: '40%' }}>Certificate Name</Text>
      <Text className="text-[10px] font-bold text-brand-600 uppercase tracking-wider px-3 py-2" style={{ width: '28%' }}>Expiry Date</Text>
      <Text className="text-[10px] font-bold text-brand-600 uppercase tracking-wider px-3 py-2 flex-1">Description</Text>
    </View>
    {rows.map((r, i) => (
      <View key={i} className="flex-row border-b border-slate-300">
        <View className="px-3 py-2.5 border-r border-slate-300" style={{ width: '40%' }}>
          <View className="flex-row items-start" style={{ columnGap: 6 }}>
            <Text className="text-xs font-medium text-slate-900 flex-1">{r.name}</Text>
            {r.badge}
          </View>
          {/* Issued-by has no column in the report, but dropping it would lose
              data the vendor supplied — it rides under the name. */}
          {r.issuedBy ? <Text className="text-[10px] text-slate-500 mt-0.5">Issued by {r.issuedBy}</Text> : null}
        </View>
        <Text className="text-xs text-slate-600 px-3 py-2.5 border-r border-slate-300" style={{ width: '28%' }}>{r.expiry}</Text>
        <Text className="text-xs text-slate-600 px-3 py-2.5 flex-1">{r.description}</Text>
      </View>
    ))}
  </View>
);

// ── Three-column Issues table (Step | Field | Remarks) ──────────────────────
const IssueTable = ({ rows }: { rows: { step: string; field: string; remarks: string }[] }) => (
  <View
    className="rounded-lg overflow-hidden mb-3"
    style={{ borderColor: '#cbd5e1', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1 }}
  >
    <View className="flex-row bg-slate-100 border-b border-slate-200">
      <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-3 py-2.5" style={{ width: '40%' }}>Step</Text>
      <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-3 py-2.5" style={{ width: '34%' }}>Field</Text>
      <Text className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-3 py-2.5 flex-1">Remarks</Text>
    </View>
    {rows.map((r, i) => (
      <View key={i} className="flex-row border-b border-slate-200">
        <Text className="text-xs text-slate-700 px-3 py-2.5 border-r border-slate-200 bg-slate-50" style={{ width: '40%' }}>{r.step}</Text>
        <Text className="text-xs text-slate-900 px-3 py-2.5 border-r border-slate-200 bg-white" style={{ width: '34%' }}>{r.field}</Text>
        <Text className="text-xs text-slate-700 px-3 py-2.5 flex-1 bg-white">{r.remarks || '—'}</Text>
      </View>
    ))}
  </View>
);

// ── Photo tile for gallery ────────────────────────────────────────────────
const PhotoTile = ({ src, label, onPress }: { src: string; label?: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    className="rounded-lg overflow-hidden border border-slate-300 mb-2"
    style={{ width: '31%', aspectRatio: 1, marginRight: '2%' }}>
    <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    {label ? (
      <View className="absolute bottom-0 left-0 right-0 bg-black px-1 py-0.5" style={{ opacity: 0.7 }}>
        <Text className="text-white text-[8px] font-semibold text-center" numberOfLines={1}>{label}</Text>
      </View>
    ) : null}
  </TouchableOpacity>
);

function PhotoGallery({ photos, onTap }: { photos: { src: string; caption: string; isImage: boolean }[]; onTap: (uri: string) => void }) {
  return (
    <View className="flex-row flex-wrap">
      {photos.map((p, i) =>
        p.isImage ? (
          <PhotoTile key={i} src={p.src} label={p.caption} onPress={() => onTap(p.src)} />
        ) : (
          <View key={i} className="rounded-lg border border-dashed border-slate-300 bg-slate-100 items-center justify-center mb-2"
            style={{ width: '31%', aspectRatio: 1, marginRight: '2%' }}>
            <Text className="text-[9px] text-slate-500 text-center px-1" numberOfLines={2}>{p.caption}</Text>
          </View>
        ),
      )}
    </View>
  );
}

export function ViewReport({ reportId, onBack }: ViewReportProps) {
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [checkerName, setCheckerName] = useState<string | undefined>(undefined);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  useEffect(() => {
    qcCheckerService.getCheckerData().then((d) => { if (d?.name) setCheckerName(d.name); }).catch(() => {});
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await qcCheckerService.getMyInspectionById(reportId);
        if (mounted) {
          if (res.success) setInspection(res.inspection);
          else setError('Report not found');
        }
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load report');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [reportId]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#991b1b" />
        <Text className="mt-4 text-slate-600 font-medium">Loading report...</Text>
      </View>
    );
  }

  if (error || !inspection) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <AlertCircle size={48} color="#dc2626" />
        <Text className="mt-4 text-slate-700 text-sm text-center font-medium">{error || 'Inspection not found'}</Text>
        {onBack ? (
          <TouchableOpacity onPress={onBack} className="mt-6 px-4 py-2 bg-red-700 rounded-lg">
            <Text className="text-white text-sm font-semibold">Go Back</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const rawItems = inspection.itemsToInspect;
  const isFormData = rawItems && !Array.isArray(rawItems) && typeof rawItems === 'object';
  const fd: Record<string, any> = isFormData ? rawItems : {};
  const assignedItems: any[] = Array.isArray(rawItems) ? rawItems : [];
  const isNewFormat = isFormData && typeof fd.verifications === 'object' && fd.verifications !== null;
  const vf: VF = isNewFormat ? (fd.verifications as VF) : {};
  const vendor: Record<string, any> = inspection.vendor || {};

  const getResultStyle = (result: string) => {
    switch (result) {
      case 'PASSED': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      case 'FAILED': return { bg: 'bg-red-100', text: 'text-red-800' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-800' };
    }
  };
  const resultStyle = inspection.result ? getResultStyle(inspection.result) : { bg: 'bg-slate-100', text: 'text-slate-800' };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'COMPLETED': return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
      case 'IN_PROGRESS': return { bg: 'bg-red-100', text: 'text-red-800' };
      case 'SCHEDULED': return { bg: 'bg-amber-100', text: 'text-amber-800' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-800' };
    }
  };
  const statusStyle = inspection.status ? getStatusStyle(inspection.status) : null;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadFactoryReportPdf(inspection, { variant: 'canonical', checkerName });
    } catch (err: any) {
      Alert.alert('PDF Error', err?.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreviewPdf = async () => {
    setPreviewing(true);
    try {
      await downloadFactoryReportPdf(inspection, { variant: 'canonical', checkerName, preview: true });
    } catch (err: any) {
      Alert.alert('Preview Error', err?.message || 'Failed to preview PDF');
    } finally {
      setPreviewing(false);
    }
  };

  const toPhotos = (arr: any[] | undefined | null, labelBase: string) =>
    (Array.isArray(arr) ? arr : []).map((p: any, i: number) => {
      const src = typeof p === 'string' ? p : p?.data || p?.url || null;
      const caption = (typeof p !== 'string' && (p?.label || p?.name)) || `${labelBase} ${i + 1}`;
      const isImage = !!src && typeof src === 'string' && (src.startsWith('data:image') || src.startsWith('http'));
      return { src: src || '', caption, isImage };
    });

  return (
    <>
      <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-1">
            {onBack ? (
              <TouchableOpacity onPress={onBack} className="mb-3 w-10 h-10 items-center justify-center bg-slate-100 rounded-lg">
                <ArrowLeft size={18} color="#374151" />
              </TouchableOpacity>
            ) : null}
            <Text className="text-3xl font-bold text-red-700 mb-1">Factory Inspection Report</Text>
            <Text className="text-slate-600 text-xs font-medium">
              {vendor.companyName || fd.vendorName || 'Unknown'} · Inspector: {fd.inspectorName || inspection.checker?.name || '—'}
            </Text>
            <Text className="text-slate-400 text-xs mt-0.5">
              Generated: {new Date().toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
              })}
            </Text>
          </View>
          <View className="flex-row items-center" style={{ columnGap: 8 }}>
            {statusStyle ? (
              <View className={`px-2.5 py-1.5 rounded-lg ${statusStyle.bg}`}>
                <Text className={`text-[10px] font-bold ${statusStyle.text}`}>{inspection.status}</Text>
              </View>
            ) : null}
            {inspection.result ? (
              <View className={`px-2.5 py-1.5 rounded-lg ${resultStyle.bg} flex-row items-center`}>
                {inspection.result === 'PASSED' ? <CheckCircle2 size={11} color="#059669" /> : null}
                {inspection.result === 'FAILED' ? <XCircle size={11} color="#dc2626" /> : null}
                <Text className={`text-[10px] font-bold ml-1 ${resultStyle.text}`}>{inspection.result}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row mb-5" style={{ columnGap: 10 }}>
          <TouchableOpacity onPress={handlePreviewPdf} disabled={previewing || downloading} activeOpacity={0.8}
            className="flex-row items-center justify-center rounded-lg py-2.5 border border-slate-300 bg-white flex-1"
            style={{ opacity: previewing || downloading ? 0.6 : 1 }}>
            <Eye size={15} color="#1f2937" />
            <Text className="text-slate-900 font-semibold text-xs ml-1.5">{previewing ? 'Opening...' : 'Preview'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownloadPdf} disabled={downloading || previewing} activeOpacity={0.8}
            className="flex-row items-center justify-center rounded-lg py-2.5 flex-1"
            style={{ backgroundColor: '#991b1b', opacity: downloading || previewing ? 0.6 : 1 }}>
            <Download size={15} color="#ffffff" />
            <Text className="text-white font-semibold text-xs ml-1.5">{downloading ? 'Generating...' : 'Download PDF'}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Banner */}
        <View className="rounded-lg p-4 mb-6 flex-row flex-wrap bg-slate-900">
          {[
            ['Vendor', vendor.companyName || fd.vendorName || '—'],
            ['Client', inspection.clientName || '—'],
            ['Completed On', inspection.completedAt ? new Date(inspection.completedAt).toLocaleDateString('en-IN') : '—'],
            ['Priority', inspection.priority || '—'],
          ].map(([label, value], i) => (
            <View key={i} className="w-1/2 mb-3">
              <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</Text>
              <Text className="font-semibold text-white text-xs">{value}</Text>
            </View>
          ))}
        </View>

        {/* ── NEW FORMAT (8-step vendor verification form) ── */}
        {isNewFormat ? (
          <>
            {/* A. Company Information */}
            <Section title="A. Company Information" badge={<StepBadge prefixes={['c_']} vf={vf} />}>
              <CardGrid>
                <VCard label="Company Name" value={vendor.companyName} k="c_companyName" vf={vf} />
                <VCard label="Business Type" value={BIZ_TYPE[vendor.businessType] || vendor.businessType} k="c_businessType" vf={vf} />
                {vendor.gstNumber
                  ? <VCard label="GST Number" value={vendor.gstNumber} k="c_gstNumber" vf={vf} />
                  : <VCard label="GST Status" value="Unregistered — no GST number" k="c_unregistered" vf={vf} />}
                {vendor.panNumber ? <VCard label="PAN Number" value={vendor.panNumber} k="c_panNumber" vf={vf} /> : null}
                {vendor.companyIdNumber ? <VCard label="Company ID Number" value={vendor.companyIdNumber} k="c_companyIdNumber" vf={vf} /> : null}
                {vendor.iecCode ? <VCard label="IEC Code" value={vendor.iecCode} k="c_iecCode" vf={vf} /> : null}
                {vendor.aadhaarNumber ? <VCard label="Aadhaar Number" value={vendor.aadhaarNumber} k="c_aadhaarNumber" vf={vf} /> : null}
                {vendor.website ? <VCard label="Website" value={vendor.website} k="c_website" vf={vf} /> : null}
              </CardGrid>
              <InlinePhoto src={vendor.companyLogo} caption="Company Logo" onTap={setLightboxUri} />
              {/* The business phone/email pair belongs to this section in the
                  report — H carries the named contact person and trade profile. */}
              <SubHead title="Business Contact Details" />
              <CardGrid>
                <VCard label="Primary Phone" value={vendor.businessPhone} k="ct_businessPhone" vf={vf} />
                {vendor.phoneNumber2 ? <VCard label="Secondary Phone" value={vendor.phoneNumber2} k="ct_phoneNumber2" vf={vf} /> : null}
                <VCard label="Primary Email" value={vendor.businessEmail} k="ct_businessEmail" vf={vf} />
                {vendor.businessEmail2 ? <VCard label="Secondary Email" value={vendor.businessEmail2} k="ct_businessEmail2" vf={vf} /> : null}
                {vendor.landlineNumber ? <VCard label="Local Landline" value={vendor.landlineNumber} k="ct_landline" vf={vf} /> : null}
                {vendor.intlLandline ? <VCard label="International Landline" value={vendor.intlLandline} k="ct_intlLandline" vf={vf} /> : null}
              </CardGrid>
            </Section>

            {/* B. Warehouse & Factory Details */}
            {(() => {
              const factoryImgs = Array.isArray(vendor.documents)
                ? vendor.documents.filter((d: any) => d.type === 'OTHER' && d.documentUrl) : [];
              const hasFactory = vendor.factoryAddress || vendor.factoryCity || vendor.factoryState
                || vendor.factoryOwnershipType || vendor.factorySize || vendor.mapLink || factoryImgs.length > 0
                || vendor.warehouseAddress || vendor.warehouseCity || vendor.warehouseSize || vendor.ownershipType;
              if (!hasFactory) return null;
              const photos = factoryImgs.map((d: any, i: number) => ({
                src: d.documentUrl, caption: d.name || `Photo ${i + 1}`,
                isImage: /\.(png|jpe?g|gif|webp)(\?|$)/i.test(d.documentUrl),
              }));
              return (
                <Section title="B. Warehouse & Factory Details" badge={<StepBadge prefixes={['w_']} vf={vf} />}>
                  <SubHead title="Legal Address & Factory Site" />
                  <CardGrid>
                    {(vendor.factoryOwnershipType || vendor.ownershipType)
                      ? <VCard label="Ownership Type" value={OWN_TYPE[vendor.factoryOwnershipType || vendor.ownershipType] || (vendor.factoryOwnershipType || vendor.ownershipType)} k="w_ownershipType" vf={vf} /> : null}
                    {vendor.factorySize ? <VCard label="Warehousing Capacity" value={withUnit(vendor.factorySize, 'sq ft')} k="w_factorySize" vf={vf} /> : null}
                    {vendor.factoryAddress ? <VCard label="Address Line 1" value={vendor.factoryAddress} k="w_factoryAddress" vf={vf} /> : null}
                    {vendor.addressLine2 ? <VCard label="Address Line 2" value={vendor.addressLine2} k="w_addressLine2" vf={vf} /> : null}
                    {vendor.addressLine3 ? <VCard label="Address Line 3" value={vendor.addressLine3} k="w_addressLine3" vf={vf} /> : null}
                    {vendor.landmark ? <VCard label="Landmark" value={vendor.landmark} k="w_landmark" vf={vf} /> : null}
                    {vendor.factoryCity ? <VCard label="City" value={vendor.factoryCity} k="w_factoryCity" vf={vf} /> : null}
                    {vendor.factoryState ? <VCard label="State" value={vendor.factoryState} k="w_factoryState" vf={vf} /> : null}
                    {vendor.factoryZipCode ? <VCard label="ZIP / Postal Code" value={vendor.factoryZipCode} k="w_factoryZipCode" vf={vf} /> : null}
                    {vendor.factoryCountry ? <VCard label="Country" value={vendor.factoryCountry} k="w_factoryCountry" vf={vf} /> : null}
                    {vendor.mapLink ? <VCard label="Map / Location Link" value={vendor.mapLink} k="w_mapLink" vf={vf} /> : null}
                  </CardGrid>
                  <SubHead title="Warehouse Address" />
                  <CardGrid>
                    <VCard label="Ownership Type" value={OWN_TYPE[vendor.ownershipType] || vendor.ownershipType} k="w_ownershipType" vf={vf} />
                    <VCard label="Warehousing Capacity" value={withUnit(vendor.warehouseSize, 'sq ft')} k="w_warehouseSize" vf={vf} />
                    {vendor.warehouseAddress ? <VCard label="Address Line 1" value={vendor.warehouseAddress} k="w_warehouseAddress" vf={vf} /> : null}
                    {vendor.warehouseAddressLine2 ? <VCard label="Address Line 2" value={vendor.warehouseAddressLine2} k="w_warehouseAddressLine2" vf={vf} /> : null}
                    {vendor.warehouseAddressLine3 ? <VCard label="Address Line 3" value={vendor.warehouseAddressLine3} k="w_warehouseAddressLine3" vf={vf} /> : null}
                    {vendor.warehouseLandmark ? <VCard label="Landmark" value={vendor.warehouseLandmark} k="w_warehouseLandmark" vf={vf} /> : null}
                    {vendor.warehouseCity ? <VCard label="City" value={vendor.warehouseCity} k="w_warehouseCity" vf={vf} /> : null}
                    {vendor.warehouseState ? <VCard label="State" value={vendor.warehouseState} k="w_warehouseState" vf={vf} /> : null}
                    {vendor.warehouseZipCode ? <VCard label="ZIP / Postal Code" value={vendor.warehouseZipCode} k="w_warehouseZipCode" vf={vf} /> : null}
                    {vendor.warehouseCountry ? <VCard label="Country" value={vendor.warehouseCountry} k="w_warehouseCountry" vf={vf} /> : null}
                  </CardGrid>
                  {photos.length > 0 ? (
                    <>
                      <SubHead title="Warehouse Images" />
                      <PhotoGallery photos={photos} onTap={setLightboxUri} />
                    </>
                  ) : null}
                </Section>
              );
            })()}

            {/* C. Owner Profile */}
            <Section title="C. Owner Profile" badge={<StepBadge prefixes={['o_']} vf={vf} />}>
              <SubHead title="Owner Identity" />
              <CardGrid>
                <VCard label="Owner Full Name"
                  value={buildName(vendor.ownerTitle, vendor.ownerFirstName, vendor.ownerMiddleName, vendor.ownerLastName) || vendor.ownerName}
                  k="o_ownerName" vf={vf} />
                <VCard label="Designation" value={vendor.designation} k="o_designation" vf={vf} />
                <VCard label="Primary Phone" value={vendor.ownerPhone} k="o_ownerPhone" vf={vf} />
                {vendor.ownerPhone2 ? <VCard label="Secondary Phone" value={vendor.ownerPhone2} k="o_ownerPhone2" vf={vf} /> : null}
                <VCard label="Primary Email" value={vendor.ownerEmail} k="o_ownerEmail" vf={vf} />
                {vendor.ownerEmail2 ? <VCard label="Secondary Email" value={vendor.ownerEmail2} k="o_ownerEmail2" vf={vf} /> : null}
                {vendor.ownerLocalLandline ? <VCard label="Local Landline" value={vendor.ownerLocalLandline} k="o_ownerLocalLandline" vf={vf} /> : null}
                {vendor.ownerIntlLandline ? <VCard label="International Landline" value={vendor.ownerIntlLandline} k="o_ownerIntlLandline" vf={vf} /> : null}
                <VCard label="Business Start Date" value={vendor.businessStartDate} k="o_businessStartDate" vf={vf} />
                <VCard label="Number of Employees" value={EMP_COUNT[vendor.employeeCount] || vendor.employeeCount} k="o_employeeCount" vf={vf} />
              </CardGrid>
              <InlinePhoto src={vendor.ownerPhoto} caption="Owner Profile Photo" onTap={setLightboxUri} />
              {Array.isArray(vendor.additionalOwners) && vendor.additionalOwners.length > 0 ? (
                <>
                  <SubHead title="Additional Owners" />
                  {vendor.additionalOwners.map((owner: any, idx: number) => (
                    <View key={idx} className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-3">
                      <Text className="text-xs font-bold text-slate-700 mb-2">Owner #{idx + 2}</Text>
                      <CardGrid>
                        <VCard label="Full Name" value={buildName(owner.title, owner.firstName, owner.middleName, owner.lastName)} k={`o_add_${idx}_name`} vf={vf} />
                        <VCard label="Designation" value={owner.designation} k={`o_add_${idx}_designation`} vf={vf} />
                        {owner.email ? <VCard label="Email" value={owner.email} k={`o_add_${idx}_email`} vf={vf} /> : null}
                        {owner.phone ? <VCard label="Phone" value={owner.phone} k={`o_add_${idx}_phone`} vf={vf} /> : null}
                        {owner.localLandline ? <VCard label="Local Landline" value={owner.localLandline} k={`o_add_${idx}_localLandline`} vf={vf} /> : null}
                        {owner.intlLandline ? <VCard label="International Landline" value={owner.intlLandline} k={`o_add_${idx}_intlLandline`} vf={vf} /> : null}
                      </CardGrid>
                    </View>
                  ))}
                </>
              ) : null}
            </Section>

            {/* D. Vendor Classification */}
            <Section title="D. Vendor Classification" badge={<StepBadge prefixes={['vt_']} vf={vf} />}>
              <CardGrid>
                <VCard label="Vendor Types" value={Array.isArray(vendor.vendorTypes) ? vendor.vendorTypes.map((s: any) => (typeof s === 'string' && s ? s.charAt(0).toUpperCase() + s.slice(1) : s)) : vendor.vendorTypes} k="vt_vendorTypes" vf={vf} />
                <VCard label="Product Categories" value={vendor.productCategories} k="vt_productCategories" vf={vf} />
                {vendor.categoryRemarks ? <VCard label="Category Remarks" value={vendor.categoryRemarks} k="vt_categoryRemarks" vf={vf} /> : null}
                {vendor.qualityControl ? <VCard label="Quality Control Measures" value={vendor.qualityControl} k="vt_qualityControl" vf={vf} /> : null}
              </CardGrid>
              {Array.isArray(vendor.products) && vendor.products.length > 0 ? (
                <>
                  <SubHead title={`Registered Products (${vendor.products.length})`} />
                  {vendor.products.map((product: any, pIdx: number) => {
                    const prefix = `vt_prod_${pIdx}`;
                    return (
                      <View key={product.id || pIdx} className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-3">
                        <Text className="text-xs font-bold text-slate-800 mb-2">#{pIdx + 1} — {product.name || '—'}</Text>
                        <CardGrid>
                          <VCard label="Category" value={product.category} k={`${prefix}_category`} vf={vf} />
                          <VCard label="Base SKU" value={product.baseSku} k={`${prefix}_baseSku`} vf={vf} />
                          <VCard label="Base Price" value={product.basePrice ? `₹${product.basePrice}` : undefined} k={`${prefix}_basePrice`} vf={vf} />
                          <VCard label="Total Stock" value={product.totalStock} k={`${prefix}_totalStock`} vf={vf} />
                        </CardGrid>
                      </View>
                    );
                  })}
                </>
              ) : null}
            </Section>

            {/* E. Market Focus */}
            {(vendor.marketFocus || vendor.primaryMarkets?.length > 0 || vendor.domesticMarkets?.length > 0) ? (
              <Section title="E. Market Focus" badge={<StepBadge prefixes={['vt_marketFocus', 'vt_primaryMarkets', 'vt_domesticMarkets']} vf={vf} />}>
                <CardGrid>
                  {vendor.marketFocus ? <VCard label="Market Type" value={vendor.marketFocus} k="vt_marketFocus" vf={vf} /> : null}
                  {vendor.primaryMarkets?.length > 0 ? <VCard label="Primary Markets" value={vendor.primaryMarkets} k="vt_primaryMarkets" vf={vf} /> : null}
                  {vendor.domesticMarkets?.length > 0 ? <VCard label="Domestic Markets" value={vendor.domesticMarkets} k="vt_domesticMarkets" vf={vf} /> : null}
                </CardGrid>
              </Section>
            ) : null}

            {/* F. Manufacturing Facilities */}
            {(() => {
              const enabledFacilities: Record<string, boolean> = vendor.enabledFacilities || {};
              const facilityDetails: Record<string, any> = vendor.facilityDetails || {};
              const active = Object.keys(FACILITY_LABELS).filter((f) => enabledFacilities[f]);
              if (!vendor.productionCapacity && active.length === 0) return null;
              return (
                <Section title="F. Manufacturing Facilities" badge={<StepBadge prefixes={['mf_']} vf={vf} />}>
                  {vendor.productionCapacity ? (
                    <>
                      <SubHead title="Overall Production Capacity" />
                      <CardGrid>
                        <VCard label="Monthly Production Capacity" value={vendor.productionCapacity} k="mf_productionCapacity" vf={vf} />
                      </CardGrid>
                    </>
                  ) : null}
                  {active.length > 0 ? (
                    <>
                      <SubHead title="Active Facilities" />
                      {active.map((facilityKey) => {
                        const details = facilityDetails[facilityKey] || {};
                        const prefix = `mf_${facilityKey}`;
                        return (
                          <View key={facilityKey} className="bg-slate-50 border border-slate-300 rounded-lg p-3 mb-3">
                            <View className="flex-row items-center mb-2 pb-2 border-b border-slate-300" style={{ columnGap: 8 }}>
                              <View className="w-2 h-2 rounded-full bg-emerald-600" />
                              <Text className="text-sm font-bold text-slate-800 flex-1">{FACILITY_LABELS[facilityKey]}</Text>
                              <VerBadge k={`${prefix}_active`} vf={vf} />
                            </View>
                            <CardGrid headers={['Detail', 'Value']}>
                              {/* The report opens every facility table with this row,
                                  so a facility the vendor declared but left blank
                                  still says what it is. */}
                              <VCard label="Facility Status" value="Active — declared" k={`${prefix}_active`} vf={vf} />
                              {Object.entries(details).map(([key, dv]) => {
                                if (!dv || key === 'remarks') return null;
                                return <VCard key={key} label={key.replace(/([A-Z])/g, ' $1').trim()} value={String(dv)} k={`${prefix}_${key}`} vf={vf} />;
                              })}
                              {details.remarks ? <VCard label="Remarks" value={details.remarks} k={`${prefix}_remarks`} vf={vf} /> : null}
                            </CardGrid>
                          </View>
                        );
                      })}
                    </>
                  ) : null}
                </Section>
              );
            })()}

            {/* G. Certifications & Quality Control */}
            {(() => {
              const certifications: any[] = Array.isArray(vendor.certifications) ? vendor.certifications : [];
              if (!certifications.length && !vendor.complianceStandards && !vendor.packagingCapabilities) return null;
              return (
                <Section title="G. Certifications & Quality Control" badge={<StepBadge prefixes={['cert_', 'certDoc_']} vf={vf} />}>
                  {certifications.length > 0 ? (
                    <>
                      <SubHead title="Quality Certifications" />
                      {/* One row per certificate — Certificate Name / Expiry Date /
                          Description — instead of a card each, as the report prints it. */}
                      <CertTable
                        rows={certifications.map((cert: any, idx: number) => ({
                          name: cert.name || '—',
                          expiry: cert.expiryDate || '—',
                          description: cert.description || '—',
                          issuedBy: cert.issuedBy || '',
                          badge: <VerBadge k={`cert_${idx}_name`} vf={vf} />,
                        }))}
                      />
                    </>
                  ) : null}
                  {(vendor.complianceStandards || vendor.packagingCapabilities) ? (
                    <>
                      <SubHead title="Standards & Packaging" />
                      <CardGrid>
                        {vendor.complianceStandards ? <VCard label="Compliance Standards" value={vendor.complianceStandards} k="cert_complianceStandards" vf={vf} /> : null}
                        {vendor.packagingCapabilities ? <VCard label="Packaging Capabilities" value={vendor.packagingCapabilities} k="cert_packagingCapabilities" vf={vf} /> : null}
                      </CardGrid>
                    </>
                  ) : null}
                </Section>
              );
            })()}

            {/* H. Contact & Trade Information */}
            <Section title="H. Contact & Trade Information" badge={<StepBadge prefixes={['ct_']} vf={vf} />}>
              {vendor.mainContact ? (
                <>
                  <SubHead title="Main Contact Person" />
                  <CardGrid>
                    <VCard label="Contact Name"
                      value={buildName(vendor.mainContact.title, vendor.mainContact.firstName, vendor.mainContact.middleName, vendor.mainContact.lastName)}
                      k="ct_mainContact_name" vf={vf} />
                    {vendor.mainContact.designation ? <VCard label="Designation" value={vendor.mainContact.designation} k="ct_mainContact_designation" vf={vf} /> : null}
                    {vendor.mainContact.department ? <VCard label="Department" value={vendor.mainContact.department} k="ct_mainContact_department" vf={vf} /> : null}
                    {vendor.mainContact.email1 || vendor.mainContact.email
                      ? <VCard label="Primary Email" value={vendor.mainContact.email1 || vendor.mainContact.email} k="ct_mainContact_email1" vf={vf} /> : null}
                    {vendor.mainContact.email2 ? <VCard label="Secondary Email" value={vendor.mainContact.email2} k="ct_mainContact_email2" vf={vf} /> : null}
                    {vendor.mainContact.phone1 || vendor.mainContact.phone
                      ? <VCard label="Primary Phone" value={vendor.mainContact.phone1 || vendor.mainContact.phone} k="ct_mainContact_phone1" vf={vf} /> : null}
                    {vendor.mainContact.phone2 ? <VCard label="Secondary Phone" value={vendor.mainContact.phone2} k="ct_mainContact_phone2" vf={vf} /> : null}
                  </CardGrid>
                  <InlinePhoto src={vendor.mainContact.photo} caption="Main Contact Photo" onTap={setLightboxUri} />
                </>
              ) : null}

              {/* Alternate contacts — the report lists every contact the vendor
                  registered, not just the main one. */}
              {Array.isArray(vendor.alternateContacts) && vendor.alternateContacts.length > 0
                ? vendor.alternateContacts.map((c: any, idx: number) => (
                    <React.Fragment key={idx}>
                      <SubHead title={`Contact Person ${idx + 2}`} />
                      <CardGrid>
                        <VCard label="Contact Name" value={buildName(c.title, c.firstName, c.middleName, c.lastName)} k={`ct_alt_${idx}_name`} vf={vf} />
                        {c.designation ? <VCard label="Designation" value={c.designation} k={`ct_alt_${idx}_designation`} vf={vf} /> : null}
                        {c.department ? <VCard label="Department" value={c.department} k={`ct_alt_${idx}_department`} vf={vf} /> : null}
                        {c.email1 || c.email ? <VCard label="Primary Email" value={c.email1 || c.email} k={`ct_alt_${idx}_email1`} vf={vf} /> : null}
                        {c.phone1 || c.phone ? <VCard label="Primary Phone" value={c.phone1 || c.phone} k={`ct_alt_${idx}_phone1`} vf={vf} /> : null}
                      </CardGrid>
                    </React.Fragment>
                  ))
                : null}

              {/* Import / export profile — printed in the report, missing here entirely. */}
              {(vendor.importExperience != null || vendor.exportExperience != null
                || vendor.importCountries?.length > 0 || vendor.exportCountries?.length > 0) ? (
                <>
                  <SubHead title="Import / Export Experience" />
                  <CardGrid>
                    {vendor.importExperience != null ? <VCard label="Import Experience" value={vendor.importExperience ? 'Yes' : 'No'} k="ct_importExperience" vf={vf} /> : null}
                    {vendor.importCountries?.length > 0 ? <VCard label="Import Countries" value={vendor.importCountries} k="ct_importCountries" vf={vf} /> : null}
                    {vendor.exportExperience != null ? <VCard label="Export Experience" value={vendor.exportExperience ? 'Yes' : 'No'} k="ct_exportExperience" vf={vf} /> : null}
                    {vendor.exportCountries?.length > 0 ? <VCard label="Export Countries" value={vendor.exportCountries} k="ct_exportCountries" vf={vf} /> : null}
                  </CardGrid>
                </>
              ) : null}
            </Section>

            {/* Bank Details */}
            {vendor.bankDetails ? (
              <Section title="Bank Details">
                <CardGrid>
                  {vendor.bankDetails.accountHolderName ? <VCard label="Account Holder Name" value={vendor.bankDetails.accountHolderName} k="ct_accountHolderName" vf={vf} /> : null}
                  <VCard label="Bank Name" value={vendor.bankDetails.bankName} k="ct_bankName" vf={vf} />
                  {vendor.bankDetails.accountNumber ? <VCard label="Account Number" value={`****${String(vendor.bankDetails.accountNumber).slice(-4)}`} k="ct_accountNumber" vf={vf} /> : null}
                  <VCard label="Account Type" value={vendor.bankDetails.accountType} k="ct_accountType" vf={vf} />
                  <VCard label="IFSC Code" value={vendor.bankDetails.ifscCode} k="ct_ifscCode" vf={vf} />
                  {vendor.bankDetails.swiftCode ? <VCard label="SWIFT / BIC" value={vendor.bankDetails.swiftCode} k="ct_swiftCode" vf={vf} /> : null}
                  {vendor.bankDetails.iban ? <VCard label="IBAN" value={vendor.bankDetails.iban} k="ct_iban" vf={vf} /> : null}
                </CardGrid>
              </Section>
            ) : null}

            {/* I. Verification Summary */}
            {(() => {
              const allEntries = Object.entries(vf);
              if (!allEntries.length) return null;
              const ok = allEntries.filter(([, v]) => v.ok === true).length;
              const fail = allEntries.filter(([, v]) => v.ok === false).length;
              const pending = allEntries.filter(([, v]) => v.ok === null).length;
              const total = allEntries.length;
              const pct = total === 0 ? 0 : Math.round((ok / total) * 100);
              return (
                <Section title="I. Verification Summary">
                  <CardGrid headers={['Metric', 'Count']}>
                    <VCard label="Total Fields" value={String(total)} />
                    <VCard label="Verified OK" value={String(ok)} />
                    <VCard label="Issues Found" value={String(fail)} />
                    <VCard label="Pending" value={String(pending)} />
                    <VCard label="Verification %" value={`${pct}%`} />
                  </CardGrid>
                </Section>
              );
            })()}

            {/* J. Issues Found */}
            {(() => {
              const issues = Object.entries(vf).filter(([, v]) => v.ok === false);
              if (!issues.length) return null;
              return (
                <Section title="J. Issues Found">
                  <IssueTable
                    rows={issues.map(([key, v]) => ({
                      step: stepForKey(key),
                      field: fieldLabelForKey(key),
                      remarks: v.remarks || '—',
                    }))}
                  />
                </Section>
              );
            })()}

            {/* K. Inspection Details */}
            {(() => {
              const checker: any = inspection.checker || {};
              const d = computeInspectionDurations(inspection);
              const fmtClock = (v: any) => {
                if (!v) return '—';
                const dt = new Date(v);
                return isNaN(dt.getTime()) ? '—' : dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              };
              const isVirtual = String(fd.inspectionType || inspection.inspectionType || '').toUpperCase() === 'VIRTUAL';
              return (
                <Section title="K. Inspection Details">
                  <CardGrid>
                    <VCard label="Inspector Name" value={fd.inspectorName || checker.name} />
                    <VCard label="Checker ID" value={checker.checkerId} />
                    <VCard label="Inspector Email" value={checker.email} />
                    <VCard label="Inspector Phone" value={checker.phone || checker.mobile} />
                    <VCard label="Inspection Type" value={isVirtual ? 'Virtual Inspection' : 'Physical Inspection'} />
                    <VCard label="Inspection Date" value={fd.inspectionDate} />
                    <VCard label="Inspection Start Time" value={fmtClock(inspection.startedAt)} />
                    <VCard label="Inspection Complete Time" value={fmtClock(inspection.submittedAt || inspection.completedAt)} />
                    {d.totalMs > 0 ? <VCard label="Active Duration" value={formatDuration(d.activeMs)} /> : null}
                    {d.totalMs > 0 ? <VCard label="Paused Duration" value={formatDuration(d.pausedMs)} /> : null}
                    {d.totalMs > 0 ? (
                      <VCard
                        label="Total Duration"
                        value={`${formatDuration(d.totalMs)}${d.exceeded ? '  (exceeded scheduled duration)' : ''}`}
                      />
                    ) : null}
                    <VCard label="Overall Result" value={fd.inspectionStatus || inspection.result} />
                    <VCard label="Inspector Remarks" value={fd.inspectorRemarks || inspection.notes} />
                  </CardGrid>
                  {d.exceeded ? (
                    <Text className="text-[11px] font-bold text-red-700 mt-2">
                      ⚠ Exceeded scheduled duration (scheduled {formatDuration(d.scheduledMs)}) — active work took {formatDuration(d.activeMs)}.
                    </Text>
                  ) : null}
                </Section>
              );
            })()}
          </>
        ) : null}

        {/* ── OLD FORMAT fallback (legacy 7-step form) ── */}
        {isFormData && !isNewFormat ? (
          <>
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <Text className="text-sm text-amber-800 font-medium">This inspection was submitted using the legacy form format.</Text>
            </View>

            <Section title="Section 1 — Factory Details">
              <View className="flex-row flex-wrap">
                <View className="w-1/2 pr-2"><InfoRow label="Vendor Name" value={fd.vendorName} /></View>
                <View className="w-1/2"><InfoRow label="Factory Name" value={fd.factoryName} /></View>
                <View className="w-1/2 pr-2"><InfoRow label="Factory Address" value={fd.factoryAddress} /></View>
                <View className="w-1/2"><InfoRow label="Contact Person" value={fd.contactPersonName} /></View>
                <View className="w-1/2 pr-2"><InfoRow label="Contact Phone" value={fd.contactPhoneNumber} /></View>
              </View>
            </Section>

            <Section title="Section 2 — Legal & Registration">
              <View className="flex-row flex-wrap">
                <View className="w-1/2 pr-2"><InfoRow label="Business Reg. No." value={fd.businessRegistrationNumber} /></View>
                <View className="w-1/2"><InfoRow label="GST / Tax ID" value={fd.gstTaxId} /></View>
                <View className="w-full"><InfoRow label="Factory License No." value={fd.factoryLicenseNumber} /></View>
              </View>
            </Section>

            <Section title="Section 3 — Production Info">
              <View className="flex-row flex-wrap">
                <View className="w-1/2 pr-2"><InfoRow label="Products Manufactured" value={fd.productsManufactured} /></View>
                <View className="w-1/2"><InfoRow label="Monthly Capacity" value={fd.monthlyProductionCapacity} /></View>
                <View className="w-1/2 pr-2"><InfoRow label="Production Workers" value={fd.numberOfProductionWorkers} /></View>
                <View className="w-1/2"><InfoRow label="Category to Inspect" value={fd.categoryToInspect} /></View>
              </View>
            </Section>

            <Section title="Section 4 — Basic Infrastructure">
              <YesNoRow label="Machinery Available" value={fd.machineryAvailable} />
              <YesNoRow label="Electricity Available" value={fd.electricityAvailable} />
              <YesNoRow label="Water Available" value={fd.waterAvailable} />
              <YesNoRow label="Storage Area Available" value={fd.storageAreaAvailable} />
            </Section>

            <Section title="Section 5 — Quality & Safety">
              <YesNoRow label="Quality Check Process in Place" value={fd.qualityCheckProcess} />
              <YesNoRow label="Safety Equipment Available" value={fd.safetyEquipment} />
              <YesNoRow label="Clean Working Environment" value={fd.cleanWorkingEnvironment} />
            </Section>

            <Section title="Section 6 — Inspection Info">
              <View className="flex-row flex-wrap mb-2">
                <View className="w-1/2 pr-2"><InfoRow label="Inspection Date" value={fd.inspectionDate} /></View>
                <View className="w-1/2"><InfoRow label="Inspector Name" value={fd.inspectorName || inspection.checker?.name} /></View>
                <View className="w-1/2 pr-2"><InfoRow label="Inspection Status" value={fd.inspectionStatus} /></View>
              </View>
              {(fd.inspectorRemarks || inspection.notes) ? (
                <View className="bg-slate-50 border border-slate-300 rounded-lg p-3 mt-2">
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">Remarks</Text>
                  <Text className="text-sm text-slate-900" selectable>{fd.inspectorRemarks || inspection.notes}</Text>
                </View>
              ) : null}
            </Section>

            {((fd.factoryPhotos?.length > 0) || (fd.documentsUpload?.length > 0)) ? (
              <Section title="Section 7 — Evidence">
                {fd.factoryPhotos?.length > 0 ? (
                  <View className="mb-4">
                    <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Factory Photos ({fd.factoryPhotos.length})</Text>
                    <PhotoGallery photos={toPhotos(fd.factoryPhotos, 'Photo')} onTap={setLightboxUri} />
                  </View>
                ) : null}
                {fd.documentsUpload?.length > 0 ? (
                  <View>
                    <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-3">Documents ({fd.documentsUpload.length})</Text>
                    <View style={{ rowGap: 8 }}>
                      {fd.documentsUpload.map((doc: any, i: number) => {
                        const src = doc?.data || doc?.url || null;
                        const canOpen = src && typeof src === 'string' && src.startsWith('http');
                        return (
                          <TouchableOpacity key={i} activeOpacity={canOpen ? 0.7 : 1}
                            onPress={() => canOpen && Linking.openURL(src)}
                            className="flex-row items-center bg-slate-50 border border-slate-300 rounded-lg px-3 py-2.5">
                            <FileText size={14} color="#475569" />
                            <Text className="text-xs font-medium text-slate-700 ml-2 flex-1" selectable>{doc?.name || `Document ${i + 1}`}</Text>
                            {canOpen ? <ExternalLink size={12} color="#94a3b8" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
              </Section>
            ) : null}
          </>
        ) : null}

        {/* Selfie Verification */}
        {(fd.beforeSelfiePhoto || fd.afterSelfiePhoto) ? (
          <Section title="Selfie Verification">
            <View className="flex-row flex-wrap">
              {[
                { key: 'before', photo: fd.beforeSelfiePhoto, takenAt: fd.beforeSelfieTakenAt, label: 'Before Inspection' },
                { key: 'after', photo: fd.afterSelfiePhoto, takenAt: fd.afterSelfieTakenAt, label: 'After Inspection' },
              ].map(({ key, photo, takenAt, label }) => {
                const src = photo?.data || photo?.url || (typeof photo === 'string' ? photo : null);
                if (!src) return null;
                return (
                  <View key={key} className="mr-3 mb-3" style={{ width: '44%' }}>
                    <TouchableOpacity onPress={() => setLightboxUri(src)} activeOpacity={0.8}
                      className="rounded-lg overflow-hidden border-2 border-slate-300" style={{ aspectRatio: 0.85 }}>
                      <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </TouchableOpacity>
                    <Text className="text-xs font-bold text-slate-800 mt-1.5">{label}</Text>
                    {takenAt ? (
                      <View className="flex-row items-center mt-0.5">
                        <Clock size={10} color="#9ca3af" />
                        <Text className="text-[10px] text-slate-500 ml-1">
                          {new Date(takenAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </Section>
        ) : null}

        {/* Location Verification */}
        {(inspection.locationVerified !== undefined || inspection.checkerLatitude != null) ? (
          <Section title="Location Verification">
            <View className="flex-row items-center mb-4" style={{ columnGap: 10 }}>
              {inspection.locationVerified ? (
                <View className="flex-row items-center bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-300" style={{ columnGap: 6 }}>
                  <CheckCircle2 size={13} color="#047857" />
                  <Text className="text-xs font-bold text-emerald-800">Location Verified ✓</Text>
                </View>
              ) : (
                <View className="flex-row items-center bg-red-100 px-3 py-1.5 rounded-lg border border-red-300" style={{ columnGap: 6 }}>
                  <XCircle size={13} color="#b91c1c" />
                  <Text className="text-xs font-bold text-red-800">Location Mismatch</Text>
                </View>
              )}
              {inspection.locationDistanceM != null ? (
                <Text className="text-xs text-slate-600">
                  Distance: {inspection.locationDistanceM}m (allowed: {LOCATION_THRESHOLD_METERS}m)
                </Text>
              ) : null}
            </View>
            {matchedAddressLabel(inspection.locationMatchedAddress) ? (
              <Text className="text-xs text-slate-700 mb-3">
                Verified at:{' '}
                <Text className="font-bold text-slate-900">
                  {matchedAddressLabel(inspection.locationMatchedAddress)}
                </Text>
              </Text>
            ) : null}
            <View className="flex-row flex-wrap">
              <InfoCard label="Checker Latitude" value={inspection.checkerLatitude?.toFixed?.(6)} />
              <InfoCard label="Checker Longitude" value={inspection.checkerLongitude?.toFixed?.(6)} />
              <InfoCard label="Vendor Latitude" value={inspection.vendorLatitude?.toFixed?.(6)} />
              <InfoCard label="Vendor Longitude" value={inspection.vendorLongitude?.toFixed?.(6)} />
            </View>
          </Section>
        ) : null}

        {/* Assigned Items */}
        {assignedItems.length > 0 ? (
          <Section title="Items Assigned for Inspection">
            <View style={{ rowGap: 10 }}>
              {assignedItems.map((item: any, i: number) => (
                <View key={i} className="flex-row items-start p-3 bg-slate-50 rounded-lg border border-slate-300">
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-900 text-sm">{item.itemName}</Text>
                    {item.description ? <Text className="text-xs text-slate-600 mt-0.5">{item.description}</Text> : null}
                  </View>
                  {item.aqlLevel ? (
                    <View className="items-center ml-3">
                      <Text className="font-bold text-red-700 text-sm">{item.aqlLevel}</Text>
                      <Text className="text-[10px] text-slate-600">AQL</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        {/* Timestamps */}
        <View className="bg-white rounded-lg border border-slate-300 px-4 py-3 mb-6">
          <View className="flex-row flex-wrap">
            <View className="w-1/2 pr-2 mb-2"><InfoRow label="Scheduled Date" value={inspection.scheduledDate} /></View>
            <View className="w-1/2 mb-2"><InfoRow label="Started At" value={inspection.startedAt ? new Date(inspection.startedAt).toLocaleString('en-IN') : undefined} /></View>
            <View className="w-1/2 pr-2"><InfoRow label="Completed At" value={inspection.completedAt ? new Date(inspection.completedAt).toLocaleString('en-IN') : undefined} /></View>
          </View>
        </View>
      </ScrollView>

      {/* Photo Lightbox */}
      {lightboxUri ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setLightboxUri(null)} className="flex-1 bg-black items-center justify-center">
            <TouchableOpacity onPress={() => setLightboxUri(null)} className="absolute top-12 right-4 w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <XCircle size={20} color="#ffffff" />
            </TouchableOpacity>
            <Image source={{ uri: lightboxUri }} style={{ width: '95%', height: '70%' }} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      ) : null}
    </>
  );
}