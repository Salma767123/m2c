import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity, ActivityIndicator,
  Image, Modal, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, AlertTriangle, Eye,
  Download, Clock, ClipboardList, Box, Bug, FlaskConical, Star,
  FileText, Camera, AlarmClockOff,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import { downloadProductReportPdf } from '@/lib/reportPdf';
import { computeInspectionDurations } from '@/lib/inspectionDuration';
import { verificationLabel, isTestOptional } from '@/components/Products/PI_data';
import { formatDateDMY } from '@/components/Products/Steps/piShared';
import { ManufacturerInfoCard, hasManufacturerInfo } from '@/components/Products/ManufacturerInfoCard';
import { AppText, SectionCard, StatusBadge, Button } from '@/components/UI';
import { brand, colors, success, danger, amber, slate } from '@/constants/design';

// Packaging remark-code → label (matches the inspection form + PDF generator).
const REMARK_LABELS: Record<number, string> = {
  1: 'Critical Defect', 2: 'Major Defect', 3: 'Functional Fail',
  4: 'Safety Issue', 5: 'Non-Conformance', 6: 'Minor Issue',
  7: 'Re-inspection', 8: 'Acceptable', 9: 'Good', 10: 'Excellent',
};

// Friendly status labels — mirror the web checker portal.
const STATUS_LABELS: Record<string, string> = {
  QC_SUBMITTED: 'Submitted',
  QC_APPROVED: 'Approved by QC',
  APPROVED: 'Approved by Admin',
  REJECTED: 'Rejected',
  REINSPECTION: 'Reinspection',
  PENDING: 'Pending',
};

// Humanize an additional-evidence key (camelCase / snake_case → Title Case),
// mirroring web's humanizeEvidenceKey (e.g. "factoryFrontView" → "Factory Front View").
function humanizeEvidenceKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="py-2">
      <AppText variant="labelSm" color={colors.textFaint} style={{ textTransform: 'uppercase' }}>
        {label}
      </AppText>
      <AppText variant="bodyMd" color={colors.text} style={{ marginTop: 2 }} selectable>
        {value ?? '—'}
      </AppText>
    </View>
  );
}

// A green/red/muted pill used across the verification + packaging rows.
function OkPill({
  ok, yesLabel, noLabel, nullLabel,
}: { ok: boolean | null | undefined; yesLabel: string; noLabel: string; nullLabel: string }) {
  if (ok === true) {
    return (
      <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: success[50] }}>
        <CheckCircle size={12} color={success[600]} />
        <AppText variant="labelSm" color={success[600]} style={{ marginLeft: 4 }}>{yesLabel}</AppText>
      </View>
    );
  }
  if (ok === false) {
    return (
      <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: danger[50] }}>
        <XCircle size={12} color={danger[500]} />
        <AppText variant="labelSm" color={danger[500]} style={{ marginLeft: 4 }}>{noLabel}</AppText>
      </View>
    );
  }
  return <AppText variant="labelSm" color={colors.textFaint}>{nullLabel}</AppText>;
}

function PhotoGrid({ photos, label, onTap }: { photos: any[] | undefined | null; label: string; onTap: (uri: string) => void }) {
  if (!photos || photos.length === 0) return null;
  return (
    <View className="mt-3">
      <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 8 }}>
        {label} ({photos.length})
      </AppText>
      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {photos.map((p: any, i: number) => {
          const src = typeof p === 'string' ? p : p?.data || p?.url || null;
          return src && typeof src === 'string' && (src.startsWith('data:image') || src.startsWith('http')) ? (
            <TouchableOpacity key={i} onPress={() => onTap(src)} className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200">
              <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <View key={i} className="w-20 h-20 bg-slate-100 rounded-xl border border-dashed border-slate-300 items-center justify-center">
              <AppText variant="labelSm" color={colors.textMuted} numberOfLines={2} style={{ textAlign: 'center', paddingHorizontal: 4 }}>
                {(typeof p !== 'string' && p?.name) || `${i + 1}`}
              </AppText>
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
        <ActivityIndicator size="large" color={brand[500]} />
        <AppText variant="bodyMd" color={colors.textSecondary} style={{ marginTop: 16 }}>Loading report…</AppText>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View className="flex-1 bg-white">
        <View className="flex-row items-center px-4 pb-3" style={{ paddingTop: insets.top + 8, backgroundColor: '#fff' }}>
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-slate-100">
            <ArrowLeft size={20} color={slate[900]} />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <AlertCircle size={40} color={amber[500]} />
          <AppText variant="bodyMd" color={colors.textSecondary} style={{ marginTop: 16, textAlign: 'center' }}>
            {error || 'Not found'}
          </AppText>
        </View>
      </View>
    );
  }

  const fd = (product.qcInspectionData || {}) as Record<string, any>;
  const status = product.approvalStatus || 'PENDING';
  const statusLabel = STATUS_LABELS[status] || status;

  // Did the active work run past the booked window? The timestamps live on the
  // stored inspection payload, the scheduled length on the assignment.
  const overtime = computeInspectionDurations({
    startedAt: fd.inspectionStartedAt,
    submittedAt: fd.inspectionCompletedAt,
    totalPausedMs: fd.totalPausedMs || 0,
    estimatedDuration: product.qcAssignment?.estimatedDuration,
  }).exceeded;

  // ── New-schema inspection data (matches the 7-step form + PDF generator) ────
  const productVerifications: [string, any][] = Object.entries(fd.productVerifications || {});
  const packagingItems: any[] = Array.isArray(fd.packagingItems) ? fd.packagingItems : [];
  const testGroups: any[] = Array.isArray(fd.testGroups) ? fd.testGroups : [];
  const additionalEvidence: Record<string, any[]> =
    fd.additionalEvidence && typeof fd.additionalEvidence === 'object' ? fd.additionalEvidence : {};

  // The checker's actual decision (Review step).
  const inspectionStatus: string = fd.inspectionStatus || '';

  // Sign-off artifacts from the rebuilt Documentation step.
  const signedDocuments = Array.isArray(fd.signedDocuments) ? fd.signedDocuments : [];
  const signedReport = Array.isArray(fd.signedReport) ? fd.signedReport : [];
  const companyIdCards = Array.isArray(fd.companyIdCards) ? fd.companyIdCards : [];
  const documentationPhotos = Array.isArray(fd.documentationPhotos) ? fd.documentationPhotos : [];

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
          <ArrowLeft size={20} color={slate[900]} />
        </TouchableOpacity>
        <AppText variant="titleLg" color={colors.text}>Product Report</AppText>
        <StatusBadge status={status} label={statusLabel} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Title + product name subtitle */}
        <AppText variant="headlineLg" color={colors.text}>Product Inspection Report</AppText>
        <AppText variant="bodySm" color={colors.textMuted} style={{ marginBottom: 16, marginTop: 2 }}>
          {product.name}
        </AppText>

        {/* Overtime flag. Web shows this beside the status badge in the header
            row; on a phone that row has no space left, so it sits under the
            title instead. */}
        {overtime ? (
          <View
            className="flex-row items-center self-start rounded-full border px-2.5 py-1 mb-3"
            style={{ backgroundColor: danger[50], borderColor: danger[100] }}
          >
            <AlarmClockOff size={13} color={danger[700]} />
            <AppText variant="labelSm" color={danger[700]} style={{ marginLeft: 5 }}>
              Exceeded schedule
            </AppText>
          </View>
        ) : null}

        {/* Preview + Download PDF */}
        <View className="flex-row mb-4" style={{ columnGap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={previewing ? 'Opening…' : 'Preview'}
              icon={Eye}
              variant="secondary"
              fullWidth
              loading={previewing}
              disabled={downloading}
              onPress={handlePreviewPdf}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={downloading ? 'Generating…' : 'Download PDF'}
              icon={Download}
              variant="primary"
              fullWidth
              loading={downloading}
              disabled={previewing}
              onPress={handleDownloadPdf}
            />
          </View>
        </View>

        {/* Summary banner */}
        <View className="rounded-2xl p-4 mb-4 flex-row flex-wrap" style={{ backgroundColor: brand[500] }}>
          {[
            ['Product', product.name],
            ['Vendor', product.vendor?.companyName],
            ['Category', product.category],
            ['Inspected On', product.updatedAt ? new Date(product.updatedAt).toLocaleDateString('en-IN') : '—'],
          ].map(([label, val], i) => (
            <View key={i} className="w-1/2 mb-3">
              <AppText variant="labelSm" color="rgba(255,255,255,0.75)" style={{ textTransform: 'uppercase' }}>{label}</AppText>
              <AppText variant="titleMd" color="#fff" style={{ marginTop: 2 }}>{val || '—'}</AppText>
            </View>
          ))}
        </View>

        {/* Rejection reason */}
        {product.rejectionReason ? (
          <View className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <AppText variant="labelSm" color={danger[700]} style={{ textTransform: 'uppercase', marginBottom: 4 }}>Rejection Reason</AppText>
            <AppText variant="bodyMd" color={danger[700]} selectable>{product.rejectionReason}</AppText>
          </View>
        ) : null}

        <View style={{ rowGap: 16 }}>
          {/* S1: General Information */}
          <SectionCard icon={ClipboardList} title="Section 1 — General Information">
            <InfoRow label="Client" value={fd.client} />
            <InfoRow label="Vendor" value={fd.vendor} />
            <InfoRow label="Factory" value={fd.factory} />
            <InfoRow label="Service Location" value={fd.serviceLocation} />
            <InfoRow label="Service Start Date" value={formatDateDMY(fd.serviceStartDate)} />
            <InfoRow label="Service Type" value={fd.serviceType} />
          </SectionCard>

          {/* Manufacturer — from the product snapshot captured at inspection time,
              falling back to the live product record for older reports. */}
          {hasManufacturerInfo(fd.productData?.manufacturerInfo || product.manufacturerInfo) ? (
            <SectionCard icon={ClipboardList} title="Manufacturer Information">
              <ManufacturerInfoCard info={fd.productData?.manufacturerInfo || product.manufacturerInfo} />
            </SectionCard>
          ) : null}

          {/* S2: Product Verification */}
          <SectionCard icon={ClipboardList} title="Section 2 — Product Verification">
            {productVerifications.length > 0 ? (
              <View>
                {/* header row */}
                <View className="flex-row items-center pb-2 border-b border-slate-200">
                  <AppText variant="labelSm" color={colors.textMuted} style={{ flex: 2, textTransform: 'uppercase' }}>Field</AppText>
                  <AppText variant="labelSm" color={colors.textMuted} style={{ width: 92, textTransform: 'uppercase' }}>Status</AppText>
                </View>
                {productVerifications.map(([key, entry]) => (
                  <View key={key} className="py-2.5 border-b border-slate-100">
                    <View className="flex-row items-center">
                      <AppText variant="titleMd" color={colors.text} style={{ flex: 2 }}>{verificationLabel(key)}</AppText>
                      <View style={{ width: 92 }}>
                        <OkPill ok={entry?.ok} yesLabel="Verified" noLabel="Not Verified" nullLabel="Not Checked" />
                      </View>
                    </View>
                    {entry?.remarks ? (
                      <AppText variant="bodySm" color={colors.textSecondary} style={{ marginTop: 4 }}>{entry.remarks}</AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="bodyMd" color={colors.textFaint}>No product fields were verified.</AppText>
            )}
            <PhotoGrid photos={fd.productEvidencePhotos} label="Product Evidence Photos" onTap={setLightboxUri} />
          </SectionCard>

          {/* S3: Packaging Inspection */}
          <SectionCard icon={Box} title="Section 3 — Packaging Inspection">
            {packagingItems.length > 0 ? (
              <View>
                {packagingItems.map((item: any, i: number) => (
                  <View key={i} className="py-2.5 border-b border-slate-100">
                    <View className="flex-row items-center justify-between">
                      <AppText variant="titleMd" color={colors.text} style={{ flex: 1, marginRight: 8 }}>
                        {(item.label || '').split('—')[0].trim() || `Item ${i + 1}`}
                      </AppText>
                      <OkPill ok={item.verified} yesLabel="Yes" noLabel="No" nullLabel="—" />
                    </View>
                    <View className="flex-row mt-1.5" style={{ columnGap: 12 }}>
                      <AppText variant="bodySm" color={colors.textSecondary}>
                        Remark Code: <AppText variant="labelMd" color={colors.text}>
                          {item.remarkCode != null ? `${item.remarkCode} — ${REMARK_LABELS[item.remarkCode] || ''}` : '—'}
                        </AppText>
                      </AppText>
                    </View>
                    {item.remarks ? (
                      <AppText variant="bodySm" color={colors.textSecondary} style={{ marginTop: 4 }}>{item.remarks}</AppText>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <AppText variant="bodyMd" color={colors.textFaint}>No packaging items recorded.</AppText>
            )}
            <PhotoGrid photos={fd.packagingPhotos} label="Packaging Photos" onTap={setLightboxUri} />
          </SectionCard>

          {/* S4: Defects & AQL */}
          <SectionCard icon={Bug} title="Section 4 — Defects & AQL">
            <View className="flex-row mb-3" style={{ columnGap: 24 }}>
              <InfoRow label="Inspection Level" value={fd.inspectionLevel} />
              <InfoRow label="Sample Size" value={fd.sampleSize} />
            </View>

            {/* table header */}
            <View className="flex-row items-center pb-2 border-b border-slate-200">
              <AppText variant="labelSm" color={colors.textMuted} style={{ flex: 1.4, textTransform: 'uppercase' }}>Type</AppText>
              <AppText variant="labelSm" color={colors.textMuted} style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}>AQL</AppText>
              <AppText variant="labelSm" color={colors.textMuted} style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}>Max</AppText>
              <AppText variant="labelSm" color={colors.textMuted} style={{ flex: 1, textAlign: 'center', textTransform: 'uppercase' }}>Found</AppText>
              <AppText variant="labelSm" color={colors.textMuted} style={{ flex: 1.6, textTransform: 'uppercase' }}>Status</AppText>
            </View>
            {[
              { label: 'Critical', aql: fd.aqlCritical, max: fd.maxAllowedCritical, found: fd.criticalDefects },
              { label: 'Major', aql: fd.aqlMajor, max: fd.maxAllowedMajor, found: fd.majorDefects },
              { label: 'Minor', aql: fd.aqlMinor, max: fd.maxAllowedMinor, found: fd.minorDefects },
            ].map((row) => {
              const exceeded = row.found != null && row.max != null && Number(row.found) > Number(row.max);
              return (
                <View key={row.label} className="flex-row items-center py-2.5 border-b border-slate-100">
                  <AppText variant="titleMd" color={colors.text} style={{ flex: 1.4 }}>{row.label}</AppText>
                  <AppText variant="bodySm" color={colors.textSecondary} style={{ flex: 1, textAlign: 'center' }}>{row.aql ?? '—'}</AppText>
                  <AppText variant="bodySm" color={colors.textSecondary} style={{ flex: 1, textAlign: 'center' }}>{row.max ?? '—'}</AppText>
                  <AppText variant="bodySm" color={colors.textSecondary} style={{ flex: 1, textAlign: 'center' }}>{row.found ?? '—'}</AppText>
                  <View style={{ flex: 1.6 }}>
                    {row.found != null ? (
                      exceeded ? (
                        <View className="flex-row items-center">
                          <XCircle size={13} color={danger[500]} />
                          <AppText variant="labelSm" color={danger[500]} style={{ marginLeft: 3 }}>Exceeded</AppText>
                        </View>
                      ) : (
                        <View className="flex-row items-center">
                          <CheckCircle size={13} color={success[600]} />
                          <AppText variant="labelSm" color={success[600]} style={{ marginLeft: 3 }}>Within Limit</AppText>
                        </View>
                      )
                    ) : (
                      <AppText variant="labelSm" color={colors.textFaint}>—</AppText>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Defect details blocks */}
            {(fd.criticalDefectDetails || fd.majorDefectDetails || fd.minorDefectDetails) ? (
              <View className="mt-3" style={{ rowGap: 8 }}>
                {fd.criticalDefectDetails ? (
                  <View className="rounded-lg p-3 border border-red-100" style={{ backgroundColor: danger[50] }}>
                    <AppText variant="labelSm" color={danger[700]} style={{ textTransform: 'uppercase', marginBottom: 4 }}>Critical Defect Details</AppText>
                    <AppText variant="bodySm" color={danger[700]} selectable>{fd.criticalDefectDetails}</AppText>
                  </View>
                ) : null}
                {fd.majorDefectDetails ? (
                  <View className="rounded-lg p-3 border border-amber-100" style={{ backgroundColor: amber[50] }}>
                    <AppText variant="labelSm" color={amber[700]} style={{ textTransform: 'uppercase', marginBottom: 4 }}>Major Defect Details</AppText>
                    <AppText variant="bodySm" color={amber[700]} selectable>{fd.majorDefectDetails}</AppText>
                  </View>
                ) : null}
                {fd.minorDefectDetails ? (
                  <View className="rounded-lg p-3 border border-slate-200" style={{ backgroundColor: slate[50] }}>
                    <AppText variant="labelSm" color={colors.textSecondary} style={{ textTransform: 'uppercase', marginBottom: 4 }}>Minor Defect Details</AppText>
                    <AppText variant="bodySm" color={colors.text} selectable>{fd.minorDefectDetails}</AppText>
                  </View>
                ) : null}
              </View>
            ) : null}
            <PhotoGrid photos={fd.defectPhotos} label="Defect Photos" onTap={setLightboxUri} />
          </SectionCard>

          {/* S5: On-site Testing */}
          <SectionCard icon={FlaskConical} title="Section 5 — On-site Testing">
            {testGroups.length > 0 ? (
              <View style={{ rowGap: 20 }}>
                {testGroups.map((group: any, gi: number) => {
                  const groupTests: any[] = Array.isArray(group.tests) ? group.tests : [];
                  const gPass = groupTests.filter((t) => t.pass).length;
                  const gFail = groupTests.filter((t) => t.fail).length;
                  return (
                    <View key={gi}>
                      <View className="flex-row items-center flex-wrap mb-2" style={{ columnGap: 10, rowGap: 2 }}>
                        <AppText variant="titleMd" color={colors.text}>{group.label || `Group ${gi + 1}`}</AppText>
                        <AppText variant="labelSm" color={success[600]}>{gPass} passed</AppText>
                        <AppText variant="labelSm" color={danger[500]}>{gFail} failed</AppText>
                      </View>
                      <View style={{ rowGap: 10 }}>
                        {groupTests.map((test: any, i: number) => {
                          const passed = test.pass === true;
                          const failed = test.fail === true;
                          // Optional tests may be left undecided — say so, rather
                          // than reading as an omission the checker forgot.
                          const optional = !test.isOther && isTestOptional(test.id, group.packagingType);
                          return (
                            <View key={test.id || i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <View className="flex-row items-center justify-between">
                                <View className="flex-1 mr-2">
                                  <View className="flex-row items-center flex-wrap" style={{ columnGap: 6, rowGap: 2 }}>
                                    <AppText variant="titleMd" color={colors.text}>
                                      {test.label || (test.isOther ? test.subject : '') || `Test ${i + 1}`}
                                    </AppText>
                                    {test.isOther ? (
                                      <View className="rounded border border-brand-100 bg-brand-50 px-1.5 py-0.5">
                                        <AppText variant="labelSm" color={brand[600]} style={{ fontSize: 10, letterSpacing: 0.5 }}>CUSTOM</AppText>
                                      </View>
                                    ) : null}
                                    {optional ? (
                                      <View className="rounded bg-slate-100 px-1.5 py-0.5">
                                        <AppText variant="labelSm" color={colors.textMuted} style={{ fontSize: 10, letterSpacing: 0.5 }}>OPTIONAL</AppText>
                                      </View>
                                    ) : null}
                                  </View>
                                  {test.isOther && test.subject ? (
                                    <AppText variant="bodySm" color={colors.textMuted} style={{ marginTop: 2 }}>Subject: {test.subject}</AppText>
                                  ) : null}
                                  {test.remarks ? (
                                    <AppText variant="bodySm" color={colors.textMuted} style={{ marginTop: 2 }}>{test.remarks}</AppText>
                                  ) : null}
                                </View>
                                {passed ? (
                                  <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: success[100] }}>
                                    <CheckCircle size={12} color={success[600]} />
                                    <AppText variant="labelSm" color={success[600]} style={{ marginLeft: 4 }}>PASS</AppText>
                                  </View>
                                ) : failed ? (
                                  <View className="flex-row items-center rounded-full px-2.5 py-1" style={{ backgroundColor: danger[100] }}>
                                    <XCircle size={12} color={danger[500]} />
                                    <AppText variant="labelSm" color={danger[500]} style={{ marginLeft: 4 }}>FAIL</AppText>
                                  </View>
                                ) : (
                                  <AppText variant="labelSm" color={colors.textFaint}>
                                    {optional ? 'Optional — not tested' : 'No decision'}
                                  </AppText>
                                )}
                              </View>
                              <PhotoGrid photos={test.rightPhotos} label="Right/Correct Photos" onTap={setLightboxUri} />
                              <PhotoGrid photos={test.wrongPhotos} label="Wrong/Incorrect Photos" onTap={setLightboxUri} />
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}

                {/* Additional evidence photos */}
                {Object.entries(additionalEvidence).some(([, ph]) => Array.isArray(ph) && ph.length > 0) ? (
                  <View>
                    <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 8 }}>Additional Evidence</AppText>
                    {Object.entries(additionalEvidence)
                      .filter(([, ph]) => Array.isArray(ph) && ph.length > 0)
                      .map(([key, ph]) => (
                        <PhotoGrid key={key} photos={ph as any[]} label={humanizeEvidenceKey(key)} onTap={setLightboxUri} />
                      ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <AppText variant="bodyMd" color={colors.textFaint}>No tests recorded.</AppText>
            )}
          </SectionCard>

          {/* S6: Review & Final Decision */}
          <SectionCard icon={Star} title="Section 6 — Review & Final Decision">
            <View style={{ rowGap: 12 }}>
              <View className="rounded-xl border border-slate-200 p-4">
                <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 8 }}>Inspector&apos;s Decision</AppText>
                {inspectionStatus === 'Approved' ? (
                  <View className="flex-row items-center self-start rounded-full px-3 py-1.5" style={{ backgroundColor: success[100] }}>
                    <CheckCircle size={16} color={success[600]} />
                    <AppText variant="titleMd" color={success[600]} style={{ marginLeft: 6 }}>Approved</AppText>
                  </View>
                ) : inspectionStatus === 'Rejected' ? (
                  <View className="flex-row items-center self-start rounded-full px-3 py-1.5" style={{ backgroundColor: danger[100] }}>
                    <XCircle size={16} color={danger[500]} />
                    <AppText variant="titleMd" color={danger[500]} style={{ marginLeft: 6 }}>Rejected</AppText>
                  </View>
                ) : inspectionStatus ? (
                  <View className="flex-row items-center self-start rounded-full px-3 py-1.5" style={{ backgroundColor: amber[100] }}>
                    <AlertTriangle size={16} color={amber[600]} />
                    <AppText variant="titleMd" color={amber[600]} style={{ marginLeft: 6 }}>{inspectionStatus}</AppText>
                  </View>
                ) : (
                  <AppText variant="bodyMd" color={colors.textFaint}>—</AppText>
                )}
              </View>
              <View className="rounded-xl border border-slate-200 p-4">
                <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 8 }}>Final Status</AppText>
                <StatusBadge status={status} label={statusLabel} />
              </View>
            </View>

            {fd.reviewerRemarks ? (
              <View className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3">
                <AppText variant="labelSm" color={colors.textSecondary} style={{ textTransform: 'uppercase', marginBottom: 4 }}>Reviewer Remarks</AppText>
                <AppText variant="bodyMd" color={colors.text} selectable>{fd.reviewerRemarks}</AppText>
              </View>
            ) : null}
          </SectionCard>

          {/* S7: Documentation & Sign-off */}
          <SectionCard icon={FileText} title="Section 7 — Documentation & Sign-off">
            {/* Client signature */}
            <View className="mb-4">
              <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 8 }}>Client Signature</AppText>
              {fd.clientSignature ? (
                <TouchableOpacity onPress={() => setLightboxUri(fd.clientSignature)} className="self-start border border-slate-200 rounded-lg bg-white px-3 py-2">
                  <Image source={{ uri: fd.clientSignature }} style={{ width: 180, height: 72 }} resizeMode="contain" />
                </TouchableOpacity>
              ) : (
                <AppText variant="bodyMd" color={colors.textFaint}>Not captured</AppText>
              )}
            </View>

            {/* Digitally-signed report (PDF) */}
            {signedReport.length > 0 ? (
              <View className="mb-4">
                <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', marginBottom: 8 }}>Digitally-Signed Report</AppText>
                <View style={{ rowGap: 8 }}>
                  {signedReport.map((doc: any, i: number) => (
                    <View key={i} className="flex-row items-center bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
                      <FileText size={14} color={brand[600]} />
                      <AppText variant="labelMd" color={brand[600]} style={{ marginLeft: 8 }} numberOfLines={1}>
                        {doc?.name || `Signed Report ${i + 1}`}
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Manually-signed document scans */}
            <PhotoGrid photos={signedDocuments} label="Signed Documents" onTap={setLightboxUri} />
            {/* Company ID cards */}
            <PhotoGrid photos={companyIdCards} label="Company ID Cards" onTap={setLightboxUri} />
            {/* Legacy general documentation photos (older reports only) */}
            {documentationPhotos.length > 0 ? (
              <PhotoGrid photos={documentationPhotos} label="General Documentation Photos" onTap={setLightboxUri} />
            ) : null}

            {signedReport.length === 0 && signedDocuments.length === 0 && companyIdCards.length === 0 && !fd.clientSignature && documentationPhotos.length === 0 ? (
              <AppText variant="bodyMd" color={colors.textFaint}>No documentation captured.</AppText>
            ) : null}
          </SectionCard>

          {/* Selfie Verification */}
          {(fd.beforeSelfiePhoto || fd.afterSelfiePhoto) ? (
            <SectionCard icon={Camera} title="Selfie Verification">
              <View className="flex-row flex-wrap">
                {([
                  { key: 'before', photo: fd.beforeSelfiePhoto, takenAt: fd.beforeSelfieTakenAt, label: 'Before Inspection' },
                  { key: 'after', photo: fd.afterSelfiePhoto, takenAt: fd.afterSelfieTakenAt, label: 'After Inspection' },
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
                        <View className="absolute bottom-0 left-0 right-0 px-2 py-1" style={{ backgroundColor: 'rgba(109,40,217,0.65)' }}>
                          <AppText variant="labelSm" color="#fff" style={{ textAlign: 'center' }}>{label}</AppText>
                        </View>
                      </TouchableOpacity>
                      {takenAt ? (
                        <View className="flex-row items-center mt-1.5">
                          <Clock size={10} color={colors.textFaint} />
                          <AppText variant="labelSm" color={colors.textFaint} style={{ marginLeft: 4 }}>
                            {new Date(takenAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </SectionCard>
          ) : null}

          {/* Timestamps */}
          <View className="bg-white rounded-xl border border-slate-200 p-4">
            <InfoRow label="Product Listed" value={product.createdAt ? new Date(product.createdAt).toLocaleString('en-IN') : undefined} />
            <InfoRow label="Inspected On" value={product.updatedAt ? new Date(product.updatedAt).toLocaleString('en-IN') : undefined} />
            <InfoRow label="Approval Status" value={statusLabel} />
          </View>
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
