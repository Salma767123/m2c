import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Eye,
  Download, Clock,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { downloadProductReportPdf } from '@/lib/reportPdf';

const REMARK_LABELS: Record<string, string> = {
  shipperCartonRemark: 'Shipper Carton',
  innerCartonRemark: 'Inner Carton',
  retailPackagingRemark: 'Retail Packaging',
  productTypeRemark: 'Product Type',
  aqlWorkmanshipRemark: 'AQL Workmanship',
  onSiteTestsRemark: 'On-site Tests',
};

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  QC_APPROVED: { bg: '#d1fae5', text: '#065f46' },
  APPROVED: { bg: '#d1fae5', text: '#065f46' },
  REJECTED: { bg: '#fee2e2', text: '#991b1b' },
  REINSPECTION: { bg: '#fef3c7', text: '#92400e' },
  PENDING: { bg: '#f1f5f9', text: '#334155' },
};

const STATUS_LABELS: Record<string, string> = {
  QC_APPROVED: 'QC Approved', APPROVED: 'Approved', REJECTED: 'Rejected',
  REINSPECTION: 'Reinspection', PENDING: 'Pending',
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="py-2">
      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</Text>
      <Text className="text-sm text-slate-900" style={{ lineHeight: 20 }} selectable>{value ?? '—'}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
      <View className="px-4 py-3 border-b border-slate-100 bg-slate-50">
        <Text className="text-sm font-bold text-slate-900">{title}</Text>
      </View>
      <View className="p-4">{children}</View>
    </View>
  );
}

function PhotoGrid({ photos, label, onTap }: { photos: any[]; label: string; onTap: (uri: string) => void }) {
  if (!photos || photos.length === 0) return null;
  return (
    <View className="mt-3">
      <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {label} ({photos.length})
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {photos.map((p: any, i: number) => {
          const src = typeof p === 'string' ? p : p?.data || p?.url || null;
          return src && typeof src === 'string' && (src.startsWith('data:image') || src.startsWith('http')) ? (
            <TouchableOpacity key={i} onPress={() => onTap(src)} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
              <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View key={i} className="w-20 h-20 bg-slate-100 rounded-xl border border-dashed border-slate-300 items-center justify-center">
              <Text className="text-[9px] text-slate-500 text-center px-1">{(typeof p !== 'string' && p?.name) || `${i + 1}`}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function ProductReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [product, setProduct] = useState<any>(null);
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
    if (!id) return;
    (async () => {
      try {
        const res = await qcCheckerService.getProductDetails(id);
        if (res.success) setProduct(res.data.product);
        else setError('Product not found');
      } catch (e: any) {
        setError(e?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#222222" />
        <Text className="mt-4 text-slate-600 text-sm">Loading report...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-row items-center px-4 pb-3" style={{ paddingTop: insets.top + 8, backgroundColor: '#fff' }}>
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100">
            <ArrowLeft size={20} color="#0f172a" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <AlertCircle size={40} color="#f59e0b" />
          <Text className="mt-4 text-slate-600 text-center">{error || 'Not found'}</Text>
        </View>
      </View>
    );
  }

  const fd = (product.qcInspectionData || {}) as Record<string, any>;
  const status = product.approvalStatus || 'PENDING';
  const pill = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  const items = Array.isArray(fd.items) ? fd.items : [];
  const measurements = Array.isArray(fd.measurements) ? fd.measurements : [];
  const tests = Array.isArray(fd.tests) ? fd.tests : [];

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadProductReportPdf(product, { variant: 'canonical', checkerName });
    } catch (e: any) {
      Alert.alert('PDF Error', e?.message || 'Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handlePreviewPdf = async () => {
    setPreviewing(true);
    try {
      await downloadProductReportPdf(product, { variant: 'canonical', checkerName, preview: true });
    } catch (e: any) {
      Alert.alert('Preview Error', e?.message || 'Failed to preview PDF');
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-100 flex-row items-center justify-between px-4 pb-3" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100">
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-slate-900">Product Report</Text>
        <View className="rounded-full px-3 py-1" style={{ backgroundColor: pill.bg }}>
          <Text className="text-[10px] font-bold" style={{ color: pill.text }}>
            {STATUS_LABELS[status] || status}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Product name */}
        <Text className="text-xl font-extrabold text-slate-900 mb-0.5">{product.name}</Text>
        <Text className="text-xs text-slate-500 mb-4">SKU: {product.baseSku || 'N/A'}</Text>

        {/* Preview + Download PDF */}
        <View className="flex-row mb-4" style={{ columnGap: 8 }}>
          <TouchableOpacity onPress={handlePreviewPdf} disabled={previewing || downloading} activeOpacity={0.85}
            className="flex-row items-center justify-center rounded-xl py-3 border border-slate-300 bg-white"
            style={{ flex: 1, opacity: previewing || downloading ? 0.6 : 1 }}>
            <Eye size={16} color="#0f172a" />
            <Text className="text-slate-900 font-bold text-sm ml-2">{previewing ? 'Opening...' : 'Preview'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownloadPdf} disabled={downloading || previewing} activeOpacity={0.85}
            className="flex-row items-center justify-center rounded-xl py-3"
            style={{ flex: 1, backgroundColor: '#222', opacity: downloading || previewing ? 0.6 : 1 }}>
            <Download size={16} color="#fff" />
            <Text className="text-white font-bold text-sm ml-2">{downloading ? 'Generating...' : 'Download PDF'}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary banner */}
        <View className="rounded-2xl p-4 mb-4 flex-row flex-wrap" style={{ backgroundColor: '#222' }}>
          {[
            ['Product', product.name],
            ['Vendor', product.vendor?.companyName],
            ['Category', product.category],
            ['Inspected On', product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-IN') : '—'],
          ].map(([label, val], i) => (
            <View key={i} className="w-1/2 mb-3">
              <Text className="text-[10px] font-bold uppercase mb-0.5" style={{ color: '#9ca3af' }}>{label}</Text>
              <Text className="text-sm font-semibold text-white">{val || '—'}</Text>
            </View>
          ))}
        </View>

        {/* Rejection reason */}
        {product.rejectionReason ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <Text className="text-[10px] font-bold text-red-700 uppercase mb-1">Rejection Reason</Text>
            <Text className="text-sm text-red-900" selectable>{product.rejectionReason}</Text>
          </View>
        ) : null}

        {/* S1: General Information */}
        <Section title="Section 1 — General Information">
          <InfoRow label="Client" value={fd.client} />
          <InfoRow label="Vendor" value={fd.vendor} />
          <InfoRow label="Factory" value={fd.factory} />
          <InfoRow label="Service Location" value={fd.serviceLocation} />
          <InfoRow label="Service Start Date" value={fd.serviceStartDate} />
          <InfoRow label="Service Type" value={fd.serviceType} />
        </Section>

        {/* S2: Preparation */}
        <Section title="Section 2 — Preparation">
          {items.length > 0 ? items.map((it: any, i: number) => (
            <View key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-2">
              <Text className="text-sm font-semibold text-slate-900">{it.itemName || `Item ${i + 1}`}</Text>
              {it.itemDescription ? <Text className="text-xs text-slate-500 mt-0.5">{it.itemDescription}</Text> : null}
              <View className="flex-row mt-2" style={{ columnGap: 16 }}>
                <Text className="text-xs text-slate-600">Total: <Text className="font-bold">{it.totalQuantity ?? '—'}</Text></Text>
                <Text className="text-xs text-slate-600">Inspection: <Text className="font-bold">{it.inspectionQuantity ?? '—'}</Text></Text>
              </View>
            </View>
          )) : <Text className="text-sm text-slate-400">No items recorded.</Text>}
          <PhotoGrid photos={fd.warehousePhotoEvidences} label="Warehouse Photos" onTap={setLightboxUri} />
        </Section>

        {/* S3: Measurements */}
        <Section title="Section 3 — Measurements">
          {measurements.length > 0 ? measurements.map((m: any, i: number) => (
            <View key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200 mb-2">
              <Text className="text-xs font-bold text-slate-700 mb-1">{m.sampleName || `Sample #${i + 1}`}</Text>
              <View className="flex-row flex-wrap" style={{ columnGap: 12, rowGap: 4 }}>
                {[['Carton L', m.cartonLength], ['W', m.cartonWidth], ['H', m.cartonHeight],
                  ['Product L', m.productLength], ['W', m.productWidth],
                  ['Retail Wt', m.retailWeight], ['Gross Wt', m.cartonGrossWeight]].map(([l, v], j) => (
                  <Text key={j} className="text-[10px] text-slate-600">{l}: <Text className="font-bold">{v ?? '—'}</Text></Text>
                ))}
              </View>
            </View>
          )) : <Text className="text-sm text-slate-400">No measurements recorded.</Text>}
          <PhotoGrid photos={fd.measurementPhotos} label="Measurement Photos" onTap={setLightboxUri} />
        </Section>

        {/* S4: Packaging & Remarks */}
        <Section title="Section 4 — Packaging & Remarks">
          {Object.entries(REMARK_LABELS).map(([key, label]) => {
            const val = fd[key];
            const num = Number(val);
            const color = val ? (num >= 8 ? '#059669' : num >= 6 ? '#d97706' : '#dc2626') : '#94a3b8';
            return (
              <View key={key} className="flex-row items-center justify-between py-2.5 border-b border-slate-100">
                <Text className="text-sm text-slate-700 flex-1">{label}</Text>
                <Text className="text-sm font-bold" style={{ color }}>{val ? `${val}/10` : '—'}</Text>
              </View>
            );
          })}
          <PhotoGrid photos={fd.packagingPhotos} label="Packaging Photos" onTap={setLightboxUri} />
        </Section>

        {/* S5: Defects & AQL */}
        <Section title="Section 5 — Defects & AQL">
          <View className="flex-row mb-3" style={{ columnGap: 16 }}>
            <InfoRow label="Inspection Level" value={fd.inspectionLevel} />
            <InfoRow label="Sample Size" value={fd.sampleSize} />
          </View>
          {[
            { label: 'Critical', aql: fd.aqlCritical, max: fd.maxAllowedCritical, found: fd.criticalDefects, details: fd.criticalDefectDetails, detailColor: '#fee2e2' },
            { label: 'Major', aql: fd.aqlMajor, max: fd.maxAllowedMajor, found: fd.majorDefects, details: fd.majorDefectDetails, detailColor: '#fef3c7' },
            { label: 'Minor', aql: fd.aqlMinor, max: fd.maxAllowedMinor, found: fd.minorDefects, details: fd.minorDefectDetails, detailColor: '#f1f5f9' },
          ].map((r) => {
            const exceeded = r.found != null && r.max != null && Number(r.found) > Number(r.max);
            return (
              <View key={r.label} className="mb-2">
                <View className="flex-row items-center justify-between py-2 border-b border-slate-100">
                  <Text className="text-sm font-semibold text-slate-700 w-16">{r.label}</Text>
                  <Text className="text-xs text-slate-500">AQL: {r.aql ?? '—'}</Text>
                  <Text className="text-xs text-slate-500">Max: {r.max ?? '—'}</Text>
                  <Text className="text-xs font-bold text-slate-900">Found: {r.found ?? '—'}</Text>
                  {r.found != null ? (
                    exceeded
                      ? <XCircle size={14} color="#dc2626" />
                      : <CheckCircle size={14} color="#059669" />
                  ) : null}
                </View>
                {r.details ? (
                  <View className="rounded-lg p-3 mt-1" style={{ backgroundColor: r.detailColor }}>
                    <Text className="text-xs text-slate-900" selectable>{r.details}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
          <PhotoGrid photos={fd.defectPhotos} label="Defect Photos" onTap={setLightboxUri} />
        </Section>

        {/* S6: Testing */}
        <Section title="Section 6 — On-site Testing">
          {tests.length > 0 ? (
            <View style={{ rowGap: 10 }}>
              {tests.map((t: any, i: number) => (
                <View key={t.id || i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-semibold text-slate-900">{t.label || `Test ${i + 1}`}</Text>
                      {t.detail ? <Text className="text-xs text-slate-500 mt-0.5">{t.detail}</Text> : null}
                    </View>
                    {t.pass ? (
                      <View className="flex-row items-center bg-emerald-100 rounded-full px-2.5 py-1">
                        <CheckCircle size={12} color="#059669" />
                        <Text className="text-[10px] font-bold text-emerald-700 ml-1">PASS</Text>
                      </View>
                    ) : t.fail ? (
                      <View className="flex-row items-center bg-red-100 rounded-full px-2.5 py-1">
                        <XCircle size={12} color="#dc2626" />
                        <Text className="text-[10px] font-bold text-red-700 ml-1">FAIL</Text>
                      </View>
                    ) : <Text className="text-xs text-slate-400">No decision</Text>}
                  </View>
                  <PhotoGrid photos={t.rightPhotos} label="Correct Photos" onTap={setLightboxUri} />
                  <PhotoGrid photos={t.wrongPhotos} label="Incorrect Photos" onTap={setLightboxUri} />
                </View>
              ))}
            </View>
          ) : <Text className="text-sm text-slate-400">No tests recorded.</Text>}
          <PhotoGrid photos={fd.testingPhotos} label="General Testing Photos" onTap={setLightboxUri} />
        </Section>

        {/* S7: Documentation */}
        <Section title="Section 7 — Documentation">
          <InfoRow label="Inspector Signature" value={fd.inspectorSignature} />
          <PhotoGrid photos={fd.documentationPhotos} label="Documentation Photos" onTap={setLightboxUri} />
          <PhotoGrid photos={fd.photocopyDocuments} label="Photocopy Documents" onTap={setLightboxUri} />
          <PhotoGrid photos={fd.companyIdCards} label="Company ID Cards" onTap={setLightboxUri} />
        </Section>

        {/* S8: Selfie Verification */}
        {(fd.beforeSelfiePhoto || fd.afterSelfiePhoto) ? (
          <Section title="Selfie Verification">
            <View className="flex-row flex-wrap">
              {([
                { key: 'before', photo: fd.beforeSelfiePhoto, takenAt: fd.beforeSelfieTakenAt, label: 'Before Inspection' },
                { key: 'after',  photo: fd.afterSelfiePhoto,  takenAt: fd.afterSelfieTakenAt,  label: 'After Inspection'  },
              ] as const).map(({ key, photo, takenAt, label }) => {
                const src = photo?.data || photo?.url || (typeof photo === 'string' ? photo : null);
                if (!src) return null;
                return (
                  <View key={key} style={{ width: '44%', marginRight: 12, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setLightboxUri(src)}
                      activeOpacity={0.85}
                      className="rounded-2xl overflow-hidden border-2 border-violet-200"
                      style={{ aspectRatio: 0.85 }}
                    >
                      <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      {/* violet overlay label */}
                      <View className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ backgroundColor: 'rgba(109,40,217,0.65)' }}>
                        <Text className="text-white text-[10px] font-bold text-center">{label}</Text>
                      </View>
                    </TouchableOpacity>
                    {takenAt ? (
                      <View className="flex-row items-center mt-1.5">
                        <Clock size={10} color="#9ca3af" />
                        <Text className="text-[10px] text-slate-400 ml-1">
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

        {/* S9: Review & Decision */}
        <Section title="Section 8 — Review & Final Decision">
          <View className="flex-row items-center mb-3" style={{ columnGap: 10 }}>
            <Text className="text-sm text-slate-700">Final Decision:</Text>
            {fd.finalDecision === 'Approved' ? (
              <View className="flex-row items-center bg-emerald-100 rounded-full px-3 py-1">
                <CheckCircle size={14} color="#059669" />
                <Text className="text-sm font-bold text-emerald-700 ml-1.5">Approved</Text>
              </View>
            ) : fd.finalDecision === 'Rejected' ? (
              <View className="flex-row items-center bg-red-100 rounded-full px-3 py-1">
                <XCircle size={14} color="#dc2626" />
                <Text className="text-sm font-bold text-red-700 ml-1.5">Rejected</Text>
              </View>
            ) : <Text className="text-sm text-slate-400">{fd.finalDecision || '—'}</Text>}
          </View>
          {fd.reviewerRemarks ? (
            <View className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
              <Text className="text-[10px] font-bold text-neutral-700 uppercase mb-1">Reviewer Remarks</Text>
              <Text className="text-sm text-neutral-900" style={{ lineHeight: 20 }} selectable>{fd.reviewerRemarks}</Text>
            </View>
          ) : null}
        </Section>

        {/* Timestamps */}
        <View className="bg-white rounded-xl border border-slate-200 p-4">
          <InfoRow label="Product Listed" value={product.createdAt ? new Date(product.createdAt).toLocaleString('en-IN') : undefined} />
          <InfoRow label="Inspected On" value={product.updatedAt ? new Date(product.updatedAt).toLocaleString('en-IN') : undefined} />
          <InfoRow label="Approval Status" value={STATUS_LABELS[status] || status} />
        </View>
      </ScrollView>

      {/* Lightbox */}
      {lightboxUri ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLightboxUri(null)}>
          <TouchableOpacity activeOpacity={1} onPress={() => setLightboxUri(null)} className="flex-1 bg-black items-center justify-center">
            <TouchableOpacity onPress={() => setLightboxUri(null)} className="absolute top-12 right-4 w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <XCircle size={22} color="#fff" />
            </TouchableOpacity>
            <Image source={{ uri: lightboxUri }} style={{ width: '95%', height: '70%' }} resizeMode="contain" />
          </TouchableOpacity>
        </Modal>
      ) : null}
    </View>
  );
}
