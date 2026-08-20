import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FileText,
  PenLine,
  CheckCircle2,
  Download,
  Upload,
  Eye,
  Trash2,
  X,
} from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { StepHeader } from './piShared';
import { pickPhotos, Photo } from './piShared';
import { InvalidAnchor } from './piValidation';
import SignaturePad from '@/components/General/SignaturePad';
import { WebView } from 'react-native-webview';
import { generateReportPdfDataUri, buildReportHtml, reportFileName, ReportMeta } from './piReportHtml';
import { computeInspectionDurations } from '@/lib/inspectionDuration';
import { GEOFENCE_DISABLED, getCurrentCoords, type CheckerCoords } from '@/lib/checkerLocation';
import { formatCheckerName } from '@/components/Vendor/Steps/fieldHelpers';
import qcCheckerService from '@/services/qcCheckerService';
import * as DocumentPicker from 'expo-document-picker';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import type { ScrollNavHandlers } from '@/components/General/ScrollNav';

interface Props {
  formData: any;
  setFormData: (data: any) => void;
  errors?: Record<string, string>;
  scrollNav?: ScrollNavHandlers;
  /** 'VIRTUAL' allows gallery uploads; 'PHYSICAL' is camera-only. */
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}

// Share a PDF data URI via the OS share sheet (open / print / save).
async function shareDataUri(dataUri: string, fileName: string) {
  try {
    const base64 = dataUri.split(',')[1];
    const path = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    }
  } catch {
    /* ignore */
  }
}

export default function Documentation({ formData, setFormData, errors = {}, scrollNav, inspectionType }: Props) {
  const [showDocModal, setShowDocModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [confirmRemoveDoc, setConfirmRemoveDoc] = useState(false);
  const [confirmRemoveReport, setConfirmRemoveReport] = useState(false);
  const [previewReport, setPreviewReport] = useState(false);
  // Uploaded scan preview — the manual path's twin of previewReport.
  const [previewDoc, setPreviewDoc] = useState(false);
  // Canonical (unsigned) report preview, opened from the Document Center.
  const [previewCanonical, setPreviewCanonical] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  // Position for the report's Location row. Best-effort — a failure must never
  // block report generation; the submit path captures its own reading and is
  // what actually enforces the geofence.
  const [coords, setCoords] = useState<CheckerCoords | null>(null);
  // Cached checker record, for the report's inspector identity rows. Read once
  // — AsyncStorage is async, unlike the web's synchronous localStorage.
  const [cachedChecker, setCachedChecker] = useState<any>(null);

  useEffect(() => {
    if (GEOFENCE_DISABLED) return;
    let active = true;
    getCurrentCoords()
      .then((c) => { if (active) setCoords(c); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    qcCheckerService
      .getCheckerData()
      .then((d) => { if (active && d) setCachedChecker(d); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const signedDocs: Photo[] = formData.signedDocuments || [];
  const signedReport: any[] = formData.signedReport || [];
  const hasSignedDoc = signedDocs.length > 0;
  const hasSignedReport = signedReport.length > 0;

  const buildMeta = (): ReportMeta => {
    // Live report: the inspection is not submitted yet, so "now" is the end anchor.
    const now = new Date();
    const d = computeInspectionDurations(
      {
        startedAt: formData?.inspectionStartedAt,
        submittedAt: now.toISOString(),
        totalPausedMs: formData?.totalPausedMs || 0,
        pausedAt: formData?.pausedAt || null,
        estimatedDuration: formData?.productData?.qcAssignment?.estimatedDuration,
      },
      now,
    );
    // Prefer the live assignedQc from the product API response (always current
    // from the DB); fall back to the cached login record.
    const liveQc = formData?.productData?.assignedQc || null;
    const checker = liveQc || cachedChecker;
    return {
      productName: formData?.productData?.name || formData?.items?.[0]?.itemName || formData?.vendor || 'Product',
      vendorName: formData?.vendorData?.companyName || formData?.vendor || '',
      inspectorName: formData?.inspectorSignature || '',
      checker: checker
        ? {
            name: formatCheckerName(checker) || checker.name,
            checkerId: checker.checkerId,
            email: checker.email,
            phone: checker.phone || checker.mobile || checker.businessPhone,
          }
        : null,
      location: coords,
      inspectionStartedAt: formData?.inspectionStartedAt,
      inspectionCompletedAt: now.toISOString(),
      generatedAt: now,
      ...(d.totalMs > 0
        ? {
            activeDurationMs: d.activeMs,
            pausedDurationMs: d.pausedMs,
            totalDurationMs: d.totalMs,
            scheduledDurationMs: d.scheduledMs,
            exceededSchedule: d.exceeded,
          }
        : {}),
    };
  };

  // Show the report inside the app rather than pushing a PDF straight to the OS
  // share sheet — the checker reads what they are about to print, and saving the
  // PDF is the action inside that preview.
  const handleDownloadReport = () => {
    setPreviewCanonical(true);
    // The upload step below unlocks once the checker has seen the report.
    setHasDownloaded(true);
  };

  // Save / print the previewed report as a PDF (the original share-sheet path).
  const handleSaveReportPdf = async () => {
    setDownloading(true);
    try {
      const meta = buildMeta();
      const dataUri = await generateReportPdfDataUri(formData, meta, null);
      await shareDataUri(dataUri, reportFileName(meta, false));
    } catch (e: any) {
      showErrorToast('Report Error', e?.message || 'Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };

  const attachSignedDoc = (doc: { name: string; data: string; isPdf?: boolean }) => {
    setFormData({ ...formData, signedDocuments: [doc] });
    setShowDocModal(false);
    setHasDownloaded(false);
    showSuccessToast('Uploaded', 'Signed document uploaded successfully.');
  };

  const handleUploadSignedCopy = () => {
    pickPhotos((photos) => {
      if (photos.length === 0) return;
      attachSignedDoc({ name: photos[0].name, data: photos[0].data });
    }, false, { allowGallery: inspectionType === 'VIRTUAL' });
  };

  /**
   * Attach a scanned PDF. Web accepts PDF/PNG/JPG on this upload; the app only
   * offered the camera roll, so a checker who scanned the signed copy to PDF —
   * what most scanner apps produce — had no way to attach it.
   */
  const handleUploadSignedPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      attachSignedDoc({
        name: asset.name || 'signed-document.pdf',
        data: `data:application/pdf;base64,${base64}`,
        isPdf: true,
      });
    } catch (e: any) {
      showErrorToast('Upload Failed', e?.message || 'Could not attach that PDF.');
    }
  };

  // Both sign-off paths preview in-app. This one used to write the file to
  // cache and hand it to the OS share sheet — a "View" that asked where to send
  // the document, while the digital path opened a preview right here.
  const viewManualDoc = () => {
    if (!hasSignedDoc) return;
    setPreviewDoc(true);
  };

  const removeManualDoc = () => {
    setFormData({ ...formData, signedDocuments: [] });
    setConfirmRemoveDoc(false);
  };

  const handleConfirmSignature = useCallback(async () => {
    if (!drawnSignature) return;
    setGenerating(true);
    try {
      const meta = buildMeta();
      const pdfDataUri = await generateReportPdfDataUri(formData, meta, drawnSignature);
      setFormData({
        ...formData,
        clientSignature: drawnSignature,
        signedReport: [{ name: reportFileName(meta, true), data: pdfDataUri }],
      });
      setShowSignModal(false);
      setDrawnSignature(null);
    } catch (e: any) {
      showErrorToast('Report Error', e?.message || 'Failed to generate signed report.');
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnSignature, formData]);

  // Show the report inside the app instead of handing the PDF to the OS share
  // sheet. Rebuilt from the same builder the PDF is printed from, because
  // Android's WebView cannot render a PDF — a data:application/pdf source is
  // simply blank there.
  const viewSignedReport = () => {
    if (!hasSignedReport) return;
    setPreviewReport(true);
  };

  const removeSignedReport = () => {
    setFormData({ ...formData, clientSignature: '', signedReport: [] });
    setConfirmRemoveReport(false);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} {...scrollNav}>
      <StepHeader
        title="Final Documentation & Sign-off"
        subtitle="Generate the inspection report, capture the client's signature, and submit."
      />

      {/* ── Manual Signed Document ── */}
      <View className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedReport ? 'opacity-40' : ''}`} pointerEvents={hasSignedReport ? 'none' : 'auto'}>
        <View className="flex-row items-start mb-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
            <FileText size={18} color="#e01a1b" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900">Manual Signed Document</Text>
            <Text className="text-sm text-slate-600">Download the report, get it signed, then upload the scanned copy.</Text>
          </View>
        </View>

        {hasSignedDoc ? (
          <View>
            <View className="flex-row items-center p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-sm font-bold text-emerald-800 ml-2">Final Signed Document Uploaded</Text>
            </View>
            {confirmRemoveDoc ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700 mb-2">Remove this document?</Text>
                <View className="flex-row" style={{ columnGap: 8 }}>
                  <TouchableOpacity onPress={removeManualDoc} className="flex-1 py-2.5 rounded-lg bg-red-600 items-center">
                    <Text className="text-white text-sm font-semibold">Yes, Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmRemoveDoc(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white items-center">
                    <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row" style={{ columnGap: 8 }}>
                <TouchableOpacity onPress={viewManualDoc} className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-brand-500">
                  <Eye size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm ml-1.5">View</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmRemoveDoc(true)} className="px-3 py-2.5 rounded-xl border border-red-200 bg-red-50">
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowDocModal(true)} className="flex-row items-center justify-center py-2.5 rounded-xl bg-brand-500">
            <FileText size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm ml-1.5">Open Document Center</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Digital Signed Report ── */}
      <View className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedDoc ? 'opacity-40' : ''}`} pointerEvents={hasSignedDoc ? 'none' : 'auto'}>
        <View className="flex-row items-start mb-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
            <PenLine size={18} color="#e01a1b" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900">Digital Signed Report</Text>
            <Text className="text-sm text-slate-600">Draw the client&apos;s signature on-screen to auto-generate a digitally-signed report.</Text>
          </View>
        </View>

        {hasSignedReport ? (
          <View>
            <View className="flex-row items-center mb-3">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-sm font-semibold text-emerald-600 ml-2">Signed report generated</Text>
            </View>
            {confirmRemoveReport ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700 mb-2">Remove signed report and signature?</Text>
                <View className="flex-row" style={{ columnGap: 8 }}>
                  <TouchableOpacity onPress={removeSignedReport} className="flex-1 py-2.5 rounded-lg bg-red-600 items-center">
                    <Text className="text-white text-sm font-semibold">Yes, Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmRemoveReport(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 bg-white items-center">
                    <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row" style={{ columnGap: 8 }}>
                <TouchableOpacity onPress={viewSignedReport} className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-brand-500">
                  <Eye size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm ml-1.5">View Signed Report</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setConfirmRemoveReport(true)} className="px-3 py-2.5 rounded-xl border border-red-200 bg-red-50">
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowSignModal(true)} className="flex-row items-center justify-center py-2.5 rounded-xl border border-brand-200 bg-brand-50">
            <PenLine size={16} color="#c41617" />
            <Text className="text-brand-700 font-semibold text-sm ml-1.5">Open Signature Center</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Status hint */}
      <InvalidAnchor
        errorKey="signedDocuments"
        invalid={!hasSignedDoc && !hasSignedReport && !!errors.signedDocuments}
      >
        <View
          className={`rounded-xl px-4 py-3 border ${
            hasSignedDoc || hasSignedReport
              ? 'bg-emerald-50 border-emerald-200'
              : errors.signedDocuments
              ? 'bg-red-50 border-red-300'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          <Text
            className={`text-sm ${
              hasSignedDoc || hasSignedReport ? 'text-emerald-700' : errors.signedDocuments ? 'text-red-700' : 'text-amber-700'
            }`}
          >
            {hasSignedDoc || hasSignedReport
              ? 'A signed document is attached. You can submit the inspection.'
              : errors.signedDocuments ||
                'At least one signed document is required — upload a signed copy or generate the digitally-signed report.'}
          </Text>
        </View>
      </InvalidAnchor>

      <View className="h-6" />

      {/* ── Preview: uploaded signed document (manual path) ──
          Same shell as the signed-report preview so both paths look identical.
          A scanned image renders directly; a PDF goes to the WebView, which
          renders it on iOS and falls back to the platform handling on Android. */}
      <Modal visible={previewDoc && hasSignedDoc} animationType="slide" onRequestClose={() => setPreviewDoc(false)}>
        <View className="flex-1 bg-slate-900">
          <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
            <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
              {(signedDocs[0] as any)?.name || 'Signed Document'}
            </Text>
            <TouchableOpacity
              onPress={() => setPreviewDoc(false)}
              hitSlop={12}
              accessibilityLabel="Close preview"
              className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 bg-white">
            {(() => {
              const doc: any = signedDocs[0];
              if (!doc?.data) return null;
              const isPdf = doc.isPdf || String(doc.name || '').toLowerCase().endsWith('.pdf')
                || String(doc.data).startsWith('data:application/pdf');
              return isPdf ? (
                <WebView
                  source={{ uri: doc.data }}
                  originWhitelist={['*']}
                  style={{ flex: 1 }}
                  startInLoadingState
                  renderLoading={() => (
                    <View className="absolute inset-0 items-center justify-center bg-white">
                      <ActivityIndicator size="large" color="#e01a1b" />
                    </View>
                  )}
                />
              ) : (
                <Image source={{ uri: doc.data }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── Preview: canonical (unsigned) report, opened from "View Report" ── */}
      <Modal visible={previewCanonical} animationType="slide" onRequestClose={() => setPreviewCanonical(false)}>
        <View className="flex-1 bg-slate-900">
          <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
            <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
              Inspection Report
            </Text>
            <TouchableOpacity
              onPress={handleSaveReportPdf}
              disabled={downloading}
              hitSlop={8}
              accessibilityLabel="Save report as PDF"
              className="flex-row items-center rounded-full bg-white/10 px-3 mr-2"
              style={{ height: 36, columnGap: 6, opacity: downloading ? 0.6 : 1 }}
            >
              {downloading ? <ActivityIndicator size="small" color="#ffffff" /> : <Download size={16} color="#ffffff" />}
              <Text className="text-white text-xs font-bold">{downloading ? 'Saving…' : 'Save PDF'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPreviewCanonical(false)}
              hitSlop={12}
              accessibilityLabel="Close preview"
              className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 bg-white">
            <WebView
              source={{ html: buildReportHtml(formData, buildMeta(), null) }}
              originWhitelist={['*']}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View className="absolute inset-0 items-center justify-center bg-white">
                  <ActivityIndicator size="large" color="#e01a1b" />
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── Preview: digitally-signed report ──
          Rendered from the report builder rather than the stored PDF, since
          Android's WebView has no PDF renderer. */}
      <Modal visible={previewReport && hasSignedReport} animationType="slide" onRequestClose={() => setPreviewReport(false)}>
        <View className="flex-1 bg-slate-900">
          <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
            <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
              {signedReport[0]?.name || 'Signed Report'}
            </Text>
            <TouchableOpacity
              onPress={() => setPreviewReport(false)}
              hitSlop={12}
              accessibilityLabel="Close preview"
              className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
            >
              <X size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 bg-white">
            <WebView
              source={{ html: buildReportHtml(formData, buildMeta(), formData.clientSignature || null) }}
              originWhitelist={['*']}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => (
                <View className="absolute inset-0 items-center justify-center bg-white">
                  <ActivityIndicator size="large" color="#e01a1b" />
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── Document Center modal ── */}
      <Modal visible={showDocModal} transparent animationType="fade" onRequestClose={() => setShowDocModal(false)}>
        <Pressable className="flex-1 bg-black/50 justify-center px-5" onPress={() => setShowDocModal(false)}>
          <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
              <Text className="font-bold text-slate-900">Document Center</Text>
              <TouchableOpacity onPress={() => setShowDocModal(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View className="p-5">
              {/* Step 1 */}
              <View className="flex-row items-center mb-2">
                <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">1</Text>
                </View>
                <Text className="text-sm font-bold text-slate-800">View Inspection Report</Text>
              </View>
              <Text className="text-xs text-slate-500 mb-2 ml-8">
                Read the report, then save it as a PDF to print, have it signed by the client, and scan it.
              </Text>
              <View className="ml-8 mb-4">
                <TouchableOpacity
                  onPress={handleDownloadReport}
                  className="flex-row items-center self-start px-4 py-2.5 rounded-xl bg-brand-500"
                >
                  <Eye size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm ml-1.5">View Report</Text>
                </TouchableOpacity>
                {hasDownloaded && (
                  <View className="flex-row items-center mt-2">
                    <CheckCircle2 size={13} color="#059669" />
                    <Text className="text-xs text-emerald-600 font-semibold ml-1">Report viewed</Text>
                  </View>
                )}
              </View>

              {/* Step 2 */}
              {hasDownloaded && (
                <View className="border-t border-slate-100 pt-4">
                  <View className="flex-row items-center mb-2">
                    <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mr-2">
                      <Text className="text-white text-xs font-bold">2</Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-800">Upload Signed Copy</Text>
                  </View>
                  <Text className="text-xs text-slate-500 mb-2 ml-8">
                    Upload the scanned, signed copy. Accepted formats: PDF, PNG, JPG.
                  </Text>
                  <TouchableOpacity
                    onPress={handleUploadSignedCopy}
                    className="ml-8 border-2 border-dashed border-brand-200 rounded-xl p-5 items-center"
                  >
                    <Upload size={22} color="#f24344" />
                    <Text className="text-slate-700 font-medium text-sm mt-1.5">Tap to upload photo / scan</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">PNG, JPG</Text>
                  </TouchableOpacity>
                  {/* Scanner apps produce PDFs — the image picker can't see them,
                      so the PDF path gets its own action. */}
                  <TouchableOpacity
                    onPress={handleUploadSignedPdf}
                    className="ml-8 mt-2 flex-row items-center justify-center rounded-xl border border-slate-200 bg-white py-2.5"
                    style={{ columnGap: 6 }}
                  >
                    <FileText size={16} color="#475569" />
                    <Text className="text-slate-700 font-semibold text-sm">Upload a PDF instead</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Signature Center sheet ──
          Full-screen rather than a centred dialog: the pad is portrait now and
          needs the whole sheet, and a full-screen surface also removes the
          tap-outside-to-dismiss that could throw away a signature mid-stroke. */}
      <Modal
        visible={showSignModal}
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowSignModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
            <View>
              <Text className="font-bold text-slate-900">Signature Center</Text>
              <Text className="text-xs text-slate-500 mt-0.5">Draw signature using finger or stylus</Text>
            </View>
            <TouchableOpacity onPress={() => setShowSignModal(false)} hitSlop={10} accessibilityLabel="Close">
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 p-5">
            <SignaturePad value={drawnSignature} onChange={setDrawnSignature} fill label="Sign below" />
          </View>
          <View className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex-row" style={{ columnGap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowSignModal(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center"
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmSignature}
              disabled={generating || !drawnSignature}
              className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-brand-500"
              style={{ opacity: generating || !drawnSignature ? 0.6 : 1 }}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <CheckCircle2 size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm ml-1.5">Confirm & Generate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}
