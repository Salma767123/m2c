// RN port of frontend/src/components/Checker/Vendor/VendorDocumentation.tsx —
// Step 9 "Documentation & Sign-off" of the factory (vendor) inspection.
//
// Field/label/payload parity with the web VendorDocumentation:
//   VendorDocData = { signedDocuments: any[]; signedReport: any[]; clientSignature: string }
//   • "Manual Document" path  → download the report, get it signed & stamped,
//     upload the scanned copy → stored in signedDocuments as { name, data }.
//   • "Digital Signed Report" path → draw the client signature on-screen, which
//     generates a digitally-signed report PDF → stored in signedReport as
//     { name, data }, and the drawn signature stored to clientSignature.
// The two paths are mutually exclusive (each dims + disables the other once the
// counterpart is filled), exactly like web.
//
// Uses the app's own utilities (imagePicker + imageCompress for the uploaded
// signed-doc photo; SignaturePad for the drawn client signature;
// downloadFactoryReportPdf for the "Download report" preview/generate action).

import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
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
import SignaturePad from '@/components/General/SignaturePad';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { compressImage } from '@/utils/imageCompress';
import { downloadFactoryReportPdf } from '@/lib/reportPdf';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import type { Verifications } from './VI_VerifyField';
import type { InspectorMeta } from './VI_Step8_FinalReview';

export interface VendorDocData {
  signedDocuments: any[];
  signedReport: any[];
  clientSignature: string;
}

interface Props {
  vendor: any;
  verifications: Verifications;
  meta: InspectorMeta;
  docData: VendorDocData;
  onDocDataChange: (patch: Partial<VendorDocData>) => void;
  checkerName?: string;
  errors?: Record<string, string>;
  factoryEvidence?: any;
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

// Assemble the report object the way completeInspection persists it, so the
// generated PDF matches the submitted record (reportPdf reads report.vendor +
// report.itemsToInspect.{verifications,inspectorName,...}).
function buildReport(vendor: any, verifications: Verifications, meta: InspectorMeta) {
  return {
    vendor,
    result: meta.overallResult === 'Approved' ? 'PASSED' : meta.overallResult === 'Rejected' ? 'FAILED' : undefined,
    itemsToInspect: {
      verifications,
      inspectorName: meta.inspectorName,
      inspectionDate: meta.inspectionDate,
      inspectionStatus: meta.overallResult,
      inspectorRemarks: meta.inspectorRemarks,
    },
  };
}

export default function VI_Step9_Documentation({
  vendor,
  verifications,
  meta,
  docData,
  onDocDataChange,
  checkerName,
  errors = {},
}: Props) {
  const [showDocModal, setShowDocModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [confirmRemoveDoc, setConfirmRemoveDoc] = useState(false);
  const [confirmRemoveReport, setConfirmRemoveReport] = useState(false);
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);

  const signedDocs: any[] = docData.signedDocuments || [];
  const signedReport: any[] = docData.signedReport || [];
  const hasSignedDoc = signedDocs.length > 0;
  const hasSignedReport = signedReport.length > 0;

  // ── Manual Document path ───────────────────────────────────────────────────
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const report = buildReport(vendor, verifications, meta);
      await downloadFactoryReportPdf(report, { variant: 'canonical', checkerName });
      setHasDownloaded(true);
    } catch (e: any) {
      showErrorToast('Report Error', e?.message || 'Failed to generate report.');
    } finally {
      setDownloading(false);
    }
  };

  const handleUploadSignedCopy = () => {
    showImagePickerOptions(async (images: ImagePickerResult[]) => {
      const img = images[0];
      if (!img) return;
      let data = img.data || img.uri;
      try {
        data = await compressImage(img.uri || img.data);
      } catch {
        /* fall back to the picker's base64 data */
      }
      onDocDataChange({ signedDocuments: [{ name: img.name || 'signed-doc.jpg', data }] });
      setShowDocModal(false);
      setHasDownloaded(false);
      showSuccessToast('Uploaded', 'Signed document uploaded successfully.');
    }, false);
  };

  const viewManualDoc = async () => {
    const doc = signedDocs[0];
    if (!doc?.data) return;
    try {
      const base64 = String(doc.data).split(',')[1];
      const path = `${FileSystem.cacheDirectory}${doc.name || 'signed-doc.jpg'}`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
    } catch {
      /* ignore */
    }
  };

  const removeManualDoc = () => {
    onDocDataChange({ signedDocuments: [] });
    setConfirmRemoveDoc(false);
  };

  // ── Digital Signed Report path ─────────────────────────────────────────────
  const handleConfirmSignature = useCallback(async () => {
    if (!drawnSignature) return;
    setGenerating(true);
    try {
      // Generate the signed report PDF as a base64 data URI so the stored
      // signedReport entry has the same { name, data } shape as web.
      const vendorName = vendor?.companyName || 'Report';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#1e293b">
          <h1 style="font-size:20px;margin:0 0 4px">Factory Inspection Report — Signed</h1>
          <p style="font-size:12px;color:#6b7280;margin:0 0 16px">${vendorName} &bull; ${meta.inspectionDate || ''}</p>
          <p style="font-size:13px">Overall Result: <strong>${meta.overallResult || '—'}</strong></p>
          <p style="font-size:13px">Inspector: <strong>${meta.inspectorName || '—'}</strong></p>
          <p style="font-size:13px;white-space:pre-wrap">${(meta.inspectorRemarks || '').replace(/</g, '&lt;')}</p>
          <div style="margin-top:32px">
            <p style="font-size:12px;font-weight:700;margin:0 0 8px">Client Signature:</p>
            <img src="${drawnSignature}" style="height:80px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:6px" alt="Client signature"/>
          </div>
          <p style="font-size:9px;color:#94a3b8;margin-top:24px">Generated on ${new Date().toLocaleString('en-IN')}</p>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: true });
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const pdfDataUri = `data:application/pdf;base64,${base64}`;
      const name = `Factory_Report_${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_signed.pdf`;
      onDocDataChange({
        clientSignature: drawnSignature,
        signedReport: [{ name, data: pdfDataUri }],
      });
      setShowSignModal(false);
      setDrawnSignature(null);
    } catch (e: any) {
      showErrorToast('Report Error', e?.message || 'Failed to generate signed report.');
    } finally {
      setGenerating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawnSignature, vendor, verifications, meta]);

  const viewSignedReport = async () => {
    const report = signedReport[0];
    if (!report?.data) return;
    await shareDataUri(report.data, report.name || 'signed-report.pdf');
  };

  const removeSignedReport = () => {
    onDocDataChange({ clientSignature: '', signedReport: [] });
    setConfirmRemoveReport(false);
  };

  return (
    <View style={{ rowGap: 0 }}>
      <View className="border-b border-slate-200 pb-4 mb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Documentation & Sign-off</Text>
        <Text className="text-slate-500 text-sm">
          Generate the factory inspection report, capture the inspector&apos;s signature, and finalise.
        </Text>
      </View>

      {/* ── Manual Document ── */}
      <View
        className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedReport ? 'opacity-40' : ''}`}
        pointerEvents={hasSignedReport ? 'none' : 'auto'}
      >
        <View className="flex-row items-start mb-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
            <FileText size={18} color="#e01a1b" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900">Manual Document</Text>
            <Text className="text-sm text-slate-600">Download the report, get it signed and stamped, then upload the scanned copy.</Text>
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
      <View
        className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedDoc ? 'opacity-40' : ''}`}
        pointerEvents={hasSignedDoc ? 'none' : 'auto'}
      >
        <View className="flex-row items-start mb-3">
          <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
            <PenLine size={18} color="#e01a1b" />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-slate-900">Digital Signed Report</Text>
            <Text className="text-sm text-slate-600">Draw your signature on-screen to auto-generate a digitally-signed report.</Text>
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
              {/* Step 1 — Download Report */}
              <View className="flex-row items-center mb-2">
                <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">1</Text>
                </View>
                <Text className="text-sm font-bold text-slate-800">Download Inspection Report</Text>
              </View>
              <Text className="text-xs text-slate-500 mb-2 ml-8">
                Download the generated report, print it, have it signed by the client and stamped with their seal, then scan it.
              </Text>
              <View className="ml-8 mb-4">
                <TouchableOpacity
                  onPress={handleDownloadReport}
                  disabled={downloading}
                  className="flex-row items-center self-start px-4 py-2.5 rounded-xl bg-brand-500"
                  style={{ opacity: downloading ? 0.6 : 1 }}
                >
                  {downloading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Download size={16} color="#fff" />
                      <Text className="text-white font-semibold text-sm ml-1.5">Download Inspection Report</Text>
                    </>
                  )}
                </TouchableOpacity>
                {hasDownloaded && (
                  <View className="flex-row items-center mt-2">
                    <CheckCircle2 size={13} color="#059669" />
                    <Text className="text-xs text-emerald-600 font-semibold ml-1">Report downloaded</Text>
                  </View>
                )}
              </View>

              {/* Step 2 — Upload Signed Copy */}
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
                    <Text className="text-slate-700 font-medium text-sm mt-1.5">Tap to upload signed copy</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">PDF, PNG, JPG</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Signature Center modal ── */}
      <Modal visible={showSignModal} transparent animationType="fade" onRequestClose={() => setShowSignModal(false)}>
        <Pressable className="flex-1 bg-black/50 justify-center px-5" onPress={() => setShowSignModal(false)}>
          <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
              <View>
                <Text className="font-bold text-slate-900">Signature Center</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Draw signature using finger or stylus</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSignModal(false)}>
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View className="p-5">
              <SignaturePad value={drawnSignature} onChange={setDrawnSignature} height={200} label="Sign below" />
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
                    <Text className="text-white font-semibold text-sm ml-1.5">Confirm & Generate Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
