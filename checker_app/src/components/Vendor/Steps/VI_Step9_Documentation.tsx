// // RN port of frontend/src/components/Checker/Vendor/VendorDocumentation.tsx —
// // Step 9 "Documentation & Sign-off" of the factory (vendor) inspection.
// //
// // Field/label/payload parity with the web VendorDocumentation:
// //   VendorDocData = { signedDocuments: any[]; signedReport: any[]; clientSignature: string }
// //   • "Manual Document" path  → download the report, get it signed & stamped,
// //     upload the scanned copy → stored in signedDocuments as { name, data }.
// //   • "Digital Signed Report" path → draw the client signature on-screen, which
// //     generates a digitally-signed report PDF → stored in signedReport as
// //     { name, data }, and the drawn signature stored to clientSignature.
// // The two paths are mutually exclusive (each dims + disables the other once the
// // counterpart is filled), exactly like web.
// //
// // Uses the app's own utilities (imagePicker + imageCompress for the uploaded
// // signed-doc photo; SignaturePad for the drawn client signature;
// // downloadFactoryReportPdf for the "Download report" preview/generate action).

// import React, { useCallback, useState } from 'react';
// import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
// import {
//   FileText,
//   PenLine,
//   CheckCircle2,
//   Download,
//   Upload,
//   Eye,
//   Trash2,
//   X,
// } from 'lucide-react-native';
// import * as Print from 'expo-print';
// import * as Sharing from 'expo-sharing';
// import * as FileSystem from 'expo-file-system/legacy';
// import SignaturePad from '@/components/General/SignaturePad';
// import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
// import { compressImage } from '@/utils/imageCompress';
// import { downloadFactoryReportPdf } from '@/lib/reportPdf';
// import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
// import type { Verifications } from './VI_VerifyField';
// import type { InspectorMeta } from './VI_Step8_FinalReview';

// export interface VendorDocData {
//   signedDocuments: any[];
//   signedReport: any[];
//   clientSignature: string;
// }

// interface Props {
//   vendor: any;
//   verifications: Verifications;
//   meta: InspectorMeta;
//   docData: VendorDocData;
//   onDocDataChange: (patch: Partial<VendorDocData>) => void;
//   checkerName?: string;
//   errors?: Record<string, string>;
//   factoryEvidence?: any;
// }

// // Modal footers pair a secondary and a primary action. The primary label is
// // always longer, so an even 50/50 split squeezes it into two lines and the two
// // buttons stop lining up — hence the weighted flex and the shared min height.
// const FOOTER_BTN_HEIGHT = 46;

// // Share a PDF data URI via the OS share sheet (open / print / save).
// async function shareDataUri(dataUri: string, fileName: string) {
//   try {
//     const base64 = dataUri.split(',')[1];
//     const path = `${FileSystem.cacheDirectory}${fileName}`;
//     await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
//     if (await Sharing.isAvailableAsync()) {
//       await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
//     }
//   } catch {
//     /* ignore */
//   }
// }

// // Assemble the report object the way completeInspection persists it, so the
// // generated PDF matches the submitted record (reportPdf reads report.vendor +
// // report.itemsToInspect.{verifications,inspectorName,...}).
// function buildReport(vendor: any, verifications: Verifications, meta: InspectorMeta) {
//   return {
//     vendor,
//     result: meta.overallResult === 'Approved' ? 'PASSED' : meta.overallResult === 'Rejected' ? 'FAILED' : undefined,
//     itemsToInspect: {
//       verifications,
//       inspectorName: meta.inspectorName,
//       inspectionDate: meta.inspectionDate,
//       inspectionStatus: meta.overallResult,
//       inspectorRemarks: meta.inspectorRemarks,
//     },
//   };
// }

// export default function VI_Step9_Documentation({
//   vendor,
//   verifications,
//   meta,
//   docData,
//   onDocDataChange,
//   checkerName,
//   errors = {},
// }: Props) {
//   const [showDocModal, setShowDocModal] = useState(false);
//   const [showSignModal, setShowSignModal] = useState(false);
//   const [generating, setGenerating] = useState(false);
//   const [downloading, setDownloading] = useState(false);
//   const [hasDownloaded, setHasDownloaded] = useState(false);
//   const [confirmRemoveDoc, setConfirmRemoveDoc] = useState(false);
//   const [confirmRemoveReport, setConfirmRemoveReport] = useState(false);
//   const [drawnSignature, setDrawnSignature] = useState<string | null>(null);

//   const signedDocs: any[] = docData.signedDocuments || [];
//   const signedReport: any[] = docData.signedReport || [];
//   const hasSignedDoc = signedDocs.length > 0;
//   const hasSignedReport = signedReport.length > 0;

//   // ── Manual Document path ───────────────────────────────────────────────────
//   const handleDownloadReport = async () => {
//     setDownloading(true);
//     try {
//       const report = buildReport(vendor, verifications, meta);
//       await downloadFactoryReportPdf(report, { variant: 'canonical', checkerName });
//       setHasDownloaded(true);
//     } catch (e: any) {
//       showErrorToast('Report Error', e?.message || 'Failed to generate report.');
//     } finally {
//       setDownloading(false);
//     }
//   };

//   const handleUploadSignedCopy = () => {
//     showImagePickerOptions(async (images: ImagePickerResult[]) => {
//       const img = images[0];
//       if (!img) return;
//       let data = img.data || img.uri;
//       try {
//         data = await compressImage(img.uri || img.data);
//       } catch {
//         /* fall back to the picker's base64 data */
//       }
//       onDocDataChange({ signedDocuments: [{ name: img.name || 'signed-doc.jpg', data }] });
//       setShowDocModal(false);
//       setHasDownloaded(false);
//       showSuccessToast('Uploaded', 'Signed document uploaded successfully.');
//     }, false);
//   };

//   const viewManualDoc = async () => {
//     const doc = signedDocs[0];
//     if (!doc?.data) return;
//     try {
//       const base64 = String(doc.data).split(',')[1];
//       const path = `${FileSystem.cacheDirectory}${doc.name || 'signed-doc.jpg'}`;
//       await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
//       if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
//     } catch {
//       /* ignore */
//     }
//   };

//   const removeManualDoc = () => {
//     onDocDataChange({ signedDocuments: [] });
//     setConfirmRemoveDoc(false);
//   };

//   // ── Digital Signed Report path ─────────────────────────────────────────────
//   const handleConfirmSignature = useCallback(async () => {
//     if (!drawnSignature) return;
//     setGenerating(true);
//     try {
//       // Generate the signed report PDF as a base64 data URI so the stored
//       // signedReport entry has the same { name, data } shape as web.
//       const vendorName = vendor?.companyName || 'Report';
//       const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
//         <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#1e293b">
//           <h1 style="font-size:20px;margin:0 0 4px">Factory Inspection Report — Signed</h1>
//           <p style="font-size:12px;color:#6b7280;margin:0 0 16px">${vendorName} &bull; ${meta.inspectionDate || ''}</p>
//           <p style="font-size:13px">Overall Result: <strong>${meta.overallResult || '—'}</strong></p>
//           <p style="font-size:13px">Inspector: <strong>${meta.inspectorName || '—'}</strong></p>
//           <p style="font-size:13px;white-space:pre-wrap">${(meta.inspectorRemarks || '').replace(/</g, '&lt;')}</p>
//           <div style="margin-top:32px">
//             <p style="font-size:12px;font-weight:700;margin:0 0 8px">Client Signature:</p>
//             <img src="${drawnSignature}" style="height:80px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:6px" alt="Client signature"/>
//           </div>
//           <p style="font-size:9px;color:#94a3b8;margin-top:24px">Generated on ${new Date().toLocaleString('en-IN')}</p>
//         </body></html>`;
//       const { uri } = await Print.printToFileAsync({ html, base64: true });
//       const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
//       const pdfDataUri = `data:application/pdf;base64,${base64}`;
//       const name = `Factory_Report_${vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_signed.pdf`;
//       onDocDataChange({
//         clientSignature: drawnSignature,
//         signedReport: [{ name, data: pdfDataUri }],
//       });
//       setShowSignModal(false);
//       setDrawnSignature(null);
//     } catch (e: any) {
//       showErrorToast('Report Error', e?.message || 'Failed to generate signed report.');
//     } finally {
//       setGenerating(false);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [drawnSignature, vendor, verifications, meta]);

//   const viewSignedReport = async () => {
//     const report = signedReport[0];
//     if (!report?.data) return;
//     await shareDataUri(report.data, report.name || 'signed-report.pdf');
//   };

//   const removeSignedReport = () => {
//     onDocDataChange({ clientSignature: '', signedReport: [] });
//     setConfirmRemoveReport(false);
//   };

//   return (
//     <View style={{ rowGap: 0 }}>
//       <View className="border-b border-slate-200 pb-4 mb-4">
//         <Text className="text-2xl font-bold text-slate-900 mb-1">Documentation & Sign-off</Text>
//         <Text className="text-slate-500 text-sm">
//           Generate the factory inspection report, capture the inspector&apos;s signature, and finalise.
//         </Text>
//       </View>

//       {/* ── Manual Document ── */}
//       <View
//         className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedReport ? 'opacity-40' : ''}`}
//         pointerEvents={hasSignedReport ? 'none' : 'auto'}
//       >
//         <View className="flex-row items-start mb-3">
//           <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
//             <FileText size={18} color="#e01a1b" />
//           </View>
//           <View className="flex-1">
//             <Text className="font-bold text-slate-900">Manual Document</Text>
//             <Text className="text-sm text-slate-600">Download the report, get it signed and stamped, then upload the scanned copy.</Text>
//           </View>
//         </View>

//         {hasSignedDoc ? (
//           <View>
//             <View className="flex-row items-center p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-3">
//               <CheckCircle2 size={16} color="#059669" />
//               <Text className="text-sm font-bold text-emerald-800 ml-2 flex-1">Final Signed Document Uploaded</Text>
//             </View>
//             {confirmRemoveDoc ? (
//               <View className="rounded-xl border border-red-200 bg-red-50 p-3">
//                 <Text className="text-sm font-semibold text-red-700 mb-2">Remove this document?</Text>
//                 <View className="flex-row" style={{ columnGap: 8 }}>
//                   <TouchableOpacity
//                     onPress={removeManualDoc}
//                     className="flex-1 rounded-lg bg-red-600 items-center justify-center"
//                     style={{ minHeight: 42 }}
//                   >
//                     <Text className="text-white text-sm font-semibold">Yes, Remove</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     onPress={() => setConfirmRemoveDoc(false)}
//                     className="flex-1 rounded-lg border border-slate-200 bg-white items-center justify-center"
//                     style={{ minHeight: 42 }}
//                   >
//                     <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             ) : (
//               <View className="flex-row" style={{ columnGap: 8 }}>
//                 <TouchableOpacity
//                   onPress={viewManualDoc}
//                   className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-500"
//                   style={{ minHeight: 44, columnGap: 6 }}
//                 >
//                   <Eye size={16} color="#fff" />
//                   <Text className="text-white font-semibold text-sm">View</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setConfirmRemoveDoc(true)}
//                   accessibilityLabel="Remove signed document"
//                   className="px-3 rounded-xl border border-red-200 bg-red-50 items-center justify-center"
//                   style={{ minHeight: 44 }}
//                 >
//                   <Trash2 size={16} color="#dc2626" />
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         ) : (
//           <TouchableOpacity
//             onPress={() => setShowDocModal(true)}
//             className="flex-row items-center justify-center rounded-xl bg-brand-500"
//             style={{ minHeight: 44, columnGap: 6 }}
//           >
//             <FileText size={16} color="#fff" />
//             <Text className="text-white font-semibold text-sm">Open Document Center</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* ── Digital Signed Report ── */}
//       <View
//         className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedDoc ? 'opacity-40' : ''}`}
//         pointerEvents={hasSignedDoc ? 'none' : 'auto'}
//       >
//         <View className="flex-row items-start mb-3">
//           <View className="w-10 h-10 rounded-xl bg-brand-50 items-center justify-center mr-3">
//             <PenLine size={18} color="#e01a1b" />
//           </View>
//           <View className="flex-1">
//             <Text className="font-bold text-slate-900">Digital Signed Report</Text>
//             <Text className="text-sm text-slate-600">Draw your signature on-screen to auto-generate a digitally-signed report.</Text>
//           </View>
//         </View>

//         {hasSignedReport ? (
//           <View>
//             <View className="flex-row items-center mb-3">
//               <CheckCircle2 size={16} color="#059669" />
//               <Text className="text-sm font-semibold text-emerald-600 ml-2 flex-1">Signed report generated</Text>
//             </View>
//             {confirmRemoveReport ? (
//               <View className="rounded-xl border border-red-200 bg-red-50 p-3">
//                 <Text className="text-sm font-semibold text-red-700 mb-2">Remove signed report and signature?</Text>
//                 <View className="flex-row" style={{ columnGap: 8 }}>
//                   <TouchableOpacity
//                     onPress={removeSignedReport}
//                     className="flex-1 rounded-lg bg-red-600 items-center justify-center"
//                     style={{ minHeight: 42 }}
//                   >
//                     <Text className="text-white text-sm font-semibold">Yes, Remove</Text>
//                   </TouchableOpacity>
//                   <TouchableOpacity
//                     onPress={() => setConfirmRemoveReport(false)}
//                     className="flex-1 rounded-lg border border-slate-200 bg-white items-center justify-center"
//                     style={{ minHeight: 42 }}
//                   >
//                     <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
//                   </TouchableOpacity>
//                 </View>
//               </View>
//             ) : (
//               <View className="flex-row" style={{ columnGap: 8 }}>
//                 <TouchableOpacity
//                   onPress={viewSignedReport}
//                   className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-500 px-3"
//                   style={{ minHeight: 44, columnGap: 6 }}
//                 >
//                   <Eye size={16} color="#fff" />
//                   <Text className="text-white font-semibold text-sm" numberOfLines={1}>
//                     View Signed Report
//                   </Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity
//                   onPress={() => setConfirmRemoveReport(true)}
//                   accessibilityLabel="Remove signed report"
//                   className="px-3 rounded-xl border border-red-200 bg-red-50 items-center justify-center"
//                   style={{ minHeight: 44 }}
//                 >
//                   <Trash2 size={16} color="#dc2626" />
//                 </TouchableOpacity>
//               </View>
//             )}
//           </View>
//         ) : (
//           <TouchableOpacity
//             onPress={() => setShowSignModal(true)}
//             className="flex-row items-center justify-center rounded-xl border border-brand-200 bg-brand-50"
//             style={{ minHeight: 44, columnGap: 6 }}
//           >
//             <PenLine size={16} color="#c41617" />
//             <Text className="text-brand-700 font-semibold text-sm">Open Signature Center</Text>
//           </TouchableOpacity>
//         )}
//       </View>

//       {/* Status hint */}
//       <View
//         className={`rounded-xl px-4 py-3 border ${
//           hasSignedDoc || hasSignedReport
//             ? 'bg-emerald-50 border-emerald-200'
//             : errors.signedDocuments
//             ? 'bg-red-50 border-red-300'
//             : 'bg-amber-50 border-amber-200'
//         }`}
//       >
//         <Text
//           className={`text-sm ${
//             hasSignedDoc || hasSignedReport ? 'text-emerald-700' : errors.signedDocuments ? 'text-red-700' : 'text-amber-700'
//           }`}
//         >
//           {hasSignedDoc || hasSignedReport
//             ? 'A signed document is attached. You can submit the inspection.'
//             : errors.signedDocuments ||
//               'At least one signed document is required — upload a signed copy or generate the digitally-signed report.'}
//         </Text>
//       </View>

//       {/* ── Document Center modal ── */}
//       <Modal visible={showDocModal} transparent animationType="fade" onRequestClose={() => setShowDocModal(false)}>
//         <Pressable className="flex-1 bg-black/50 justify-center px-5" onPress={() => setShowDocModal(false)}>
//           <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
//             <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
//               <Text className="font-bold text-slate-900 flex-1 mr-3">Document Center</Text>
//               <TouchableOpacity onPress={() => setShowDocModal(false)} hitSlop={10} accessibilityLabel="Close">
//                 <X size={18} color="#64748b" />
//               </TouchableOpacity>
//             </View>
//             <View className="p-5">
//               {/* Step 1 — Download Report */}
//               <View className="flex-row items-center mb-2">
//                 <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mr-2">
//                   <Text className="text-white text-xs font-bold">1</Text>
//                 </View>
//                 <Text className="text-sm font-bold text-slate-800 flex-1">Download Inspection Report</Text>
//               </View>
//               <Text className="text-xs text-slate-500 mb-2 ml-8">
//                 Download the generated report, print it, have it signed by the client and stamped with their seal, then scan it.
//               </Text>
//               <View className="ml-8 mb-4">
//                 <TouchableOpacity
//                   onPress={handleDownloadReport}
//                   disabled={downloading}
//                   className="flex-row items-center justify-center self-stretch rounded-xl bg-brand-500 px-4"
//                   style={{ minHeight: 44, columnGap: 6, opacity: downloading ? 0.6 : 1 }}
//                 >
//                   {downloading ? <ActivityIndicator size="small" color="#fff" /> : <Download size={16} color="#fff" />}
//                   <Text className="text-white font-semibold text-sm" numberOfLines={1}>
//                     {downloading ? 'Preparing…' : 'Download Report'}
//                   </Text>
//                 </TouchableOpacity>
//                 {hasDownloaded && (
//                   <View className="flex-row items-center mt-2">
//                     <CheckCircle2 size={13} color="#059669" />
//                     <Text className="text-xs text-emerald-600 font-semibold ml-1">Report downloaded</Text>
//                   </View>
//                 )}
//               </View>

//               {/* Step 2 — Upload Signed Copy */}
//               {hasDownloaded && (
//                 <View className="border-t border-slate-100 pt-4">
//                   <View className="flex-row items-center mb-2">
//                     <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mr-2">
//                       <Text className="text-white text-xs font-bold">2</Text>
//                     </View>
//                     <Text className="text-sm font-bold text-slate-800 flex-1">Upload Signed Copy</Text>
//                   </View>
//                   <Text className="text-xs text-slate-500 mb-2 ml-8">
//                     Upload the scanned, signed copy. Accepted formats: PDF, PNG, JPG.
//                   </Text>
//                   <TouchableOpacity
//                     onPress={handleUploadSignedCopy}
//                     className="ml-8 border-2 border-dashed border-brand-200 rounded-xl p-5 items-center"
//                   >
//                     <Upload size={22} color="#f24344" />
//                     <Text className="text-slate-700 font-medium text-sm mt-1.5">Tap to upload signed copy</Text>
//                     <Text className="text-slate-400 text-xs mt-0.5">PDF, PNG, JPG</Text>
//                   </TouchableOpacity>
//                 </View>
//               )}
//             </View>
//           </Pressable>
//         </Pressable>
//       </Modal>

//       {/* ── Signature Center modal ── */}
//       <Modal visible={showSignModal} transparent animationType="fade" onRequestClose={() => setShowSignModal(false)}>
//         <Pressable className="flex-1 bg-black/50 justify-center px-5" onPress={() => setShowSignModal(false)}>
//           <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
//             <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
//               <View className="flex-1 mr-3">
//                 <Text className="font-bold text-slate-900">Signature Center</Text>
//                 <Text className="text-xs text-slate-500 mt-0.5">Draw signature using finger or stylus</Text>
//               </View>
//               <TouchableOpacity onPress={() => setShowSignModal(false)} hitSlop={10} accessibilityLabel="Close">
//                 <X size={18} color="#64748b" />
//               </TouchableOpacity>
//             </View>
//             <View className="p-5">
//               <SignaturePad value={drawnSignature} onChange={setDrawnSignature} height={200} label="Sign below" />
//             </View>
//             {/* Weighted split: the primary action needs roughly twice the width
//                 of "Cancel" to keep its label on one line. Both share a min
//                 height so a spinner-only state can't shrink one of them. */}
//             <View className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex-row" style={{ columnGap: 10 }}>
//               <TouchableOpacity
//                 onPress={() => setShowSignModal(false)}
//                 className="rounded-xl border border-slate-200 bg-white items-center justify-center"
//                 style={{ flex: 1, minHeight: FOOTER_BTN_HEIGHT }}
//               >
//                 <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={handleConfirmSignature}
//                 disabled={generating || !drawnSignature}
//                 className="flex-row items-center justify-center rounded-xl bg-brand-500 px-3"
//                 style={{
//                   flex: 2,
//                   minHeight: FOOTER_BTN_HEIGHT,
//                   columnGap: 6,
//                   opacity: generating || !drawnSignature ? 0.6 : 1,
//                 }}
//               >
//                 {generating ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={16} color="#fff" />}
//                 <Text className="text-white font-semibold text-sm" numberOfLines={1}>
//                   {generating ? 'Generating…' : 'Confirm & Generate'}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </Pressable>
//         </Pressable>
//       </Modal>
//     </View>
//   );
// }

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
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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
import * as FileSystem from 'expo-file-system/legacy';
import SignaturePad from '@/components/General/SignaturePad';
import { showImagePickerOptions, ImagePickerResult } from '@/utils/imagePicker';
import { compressImage } from '@/utils/imageCompress';
import { downloadFactoryReportPdf, buildFactoryHtml } from '@/lib/reportPdf';
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
  /** Full inspection row — drives the report's active/paused/total duration. */
  inspection?: any;
  /**
   * When the inspection actually started. The backend only stamps startedAt on
   * the SCHEDULED→IN_PROGRESS transition, so it can be null; the form passes the
   * time it opened as a fallback so the report always shows a start time.
   */
  inspectionStartedAt?: string | null;
  inspectionType?: 'PHYSICAL' | 'VIRTUAL' | null;
}

// Modal footers pair a secondary and a primary action. The primary label is
// always longer, so an even 50/50 split squeezes it into two lines and the two
// buttons stop lining up — hence the weighted flex and the shared min height.
const FOOTER_BTN_HEIGHT = 46;

const escapeHtml = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The signed-report markup, kept as a pure function of the data so the preview
// can rebuild it on demand. Previewing the generated PDF instead would mean
// rendering a PDF in a WebView, which Android's WebView can't do — and holding
// the markup in state would lose it whenever the step remounts.
function buildSignedReportHtml(vendorName: string, meta: InspectorMeta, signature: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    </head>
    <body style="font-family:-apple-system,Helvetica,Arial,sans-serif;padding:24px;color:#1e293b">
      <h1 style="font-size:20px;margin:0 0 4px">Factory Inspection Report — Signed</h1>
      <p style="font-size:12px;color:#6b7280;margin:0 0 16px">${escapeHtml(vendorName)} &bull; ${escapeHtml(meta.inspectionDate || '')}</p>
      <p style="font-size:13px">Overall Result: <strong>${escapeHtml(meta.overallResult || '—')}</strong></p>
      <p style="font-size:13px">Inspector: <strong>${escapeHtml(meta.inspectorName || '—')}</strong></p>
      <p style="font-size:13px;white-space:pre-wrap">${escapeHtml(meta.inspectorRemarks || '')}</p>
      <div style="margin-top:32px">
        <p style="font-size:12px;font-weight:700;margin:0 0 8px">Client Signature:</p>
        <img src="${signature}" style="height:80px;object-fit:contain;border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:6px" alt="Client signature"/>
      </div>
      <p style="font-size:9px;color:#94a3b8;margin-top:24px">Generated on ${new Date().toLocaleString('en-IN')}</p>
    </body></html>`;
}

// Assemble the report object the way completeInspection persists it, so the
// generated PDF matches the submitted record (reportPdf reads report.vendor +
// report.itemsToInspect.{verifications,inspectorName,...}).
function buildReport(
  vendor: any,
  verifications: Verifications,
  meta: InspectorMeta,
  timing: {
    inspection?: any;
    inspectionStartedAt?: string | null;
    inspectionType?: string | null;
  } = {},
) {
  // Live report: the inspection isn't submitted yet, so "now" is the end anchor.
  const now = new Date();
  return {
    vendor,
    result: meta.overallResult === 'Approved' ? 'PASSED' : meta.overallResult === 'Rejected' ? 'FAILED' : undefined,
    estimatedDuration: timing.inspection?.estimatedDuration,
    itemsToInspect: {
      verifications,
      inspectorName: meta.inspectorName,
      inspectionDate: meta.inspectionDate,
      inspectionStatus: meta.overallResult,
      inspectorRemarks: meta.inspectorRemarks,
      // Timing + type feed section K of the generated PDF (Inspection Type,
      // start/complete times, and the active/paused/total duration breakdown).
      inspectionType: timing.inspectionType,
      inspectionStartedAt: timing.inspectionStartedAt ?? timing.inspection?.startedAt ?? undefined,
      inspectionCompletedAt: now.toISOString(),
      totalPausedMs: timing.inspection?.totalPausedMs ?? 0,
    },
  };
}

// Shared shell for the preview surfaces.
function PreviewModal({
  visible,
  title,
  onClose,
  action,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  /** Optional header action (e.g. save the previewed report as a PDF). */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900">
        <View className="flex-row items-center justify-between px-4 pt-14 pb-3">
          <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
            {title}
          </Text>
          {action}
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            accessibilityLabel="Close preview"
            className="w-9 h-9 rounded-full bg-white/10 items-center justify-center"
          >
            <X size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
        <View className="flex-1 bg-white">{children}</View>
      </View>
    </Modal>
  );
}

export default function VI_Step9_Documentation({
  vendor,
  verifications,
  meta,
  docData,
  onDocDataChange,
  checkerName,
  errors = {},
  inspection,
  inspectionStartedAt,
  inspectionType,
}: Props) {
  const [showDocModal, setShowDocModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [previewReport, setPreviewReport] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(false);
  // Canonical (unsigned) report preview — built on demand from the same HTML the
  // PDF is printed from, and held so the WebView isn't rebuilt on every render.
  const [previewCanonical, setPreviewCanonical] = useState(false);
  const [canonicalHtml, setCanonicalHtml] = useState<string | null>(null);
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
  const vendorName = vendor?.companyName || 'Report';
  // A virtual inspection is done remotely, so the client can't sign on the
  // checker's screen — the digital path is closed and only a scanned, signed
  // copy uploaded through the Manual Document path counts.
  const isVirtual = String(inspectionType || '').toUpperCase() === 'VIRTUAL';

  // ── Manual Document path ───────────────────────────────────────────────────
  // Tapping the report shows it inside the app first, rather than pushing a PDF
  // straight to the OS share sheet — the checker can read what they are about to
  // print. Saving/printing the PDF is the action inside that preview.
  const handleDownloadReport = () => {
    try {
      const report = buildReport(vendor, verifications, meta, { inspection, inspectionStartedAt, inspectionType });
      setCanonicalHtml(buildFactoryHtml(report, 'canonical', checkerName));
      setPreviewCanonical(true);
      // The upload step below unlocks once the checker has seen the report.
      setHasDownloaded(true);
    } catch (e: any) {
      showErrorToast('Report Error', e?.message || 'Failed to generate report.');
    }
  };

  // Save / print the previewed report as a PDF (the original share-sheet path).
  const handleSaveReportPdf = async () => {
    setDownloading(true);
    try {
      const report = buildReport(vendor, verifications, meta, { inspection, inspectionStartedAt, inspectionType });
      await downloadFactoryReportPdf(report, { variant: 'canonical', checkerName });
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
      const html = buildSignedReportHtml(vendorName, meta, drawnSignature);
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
  }, [drawnSignature, vendorName, verifications, meta]);

  const removeSignedReport = () => {
    onDocDataChange({ clientSignature: '', signedReport: [] });
    setConfirmRemoveReport(false);
  };

  const manualDoc = signedDocs[0];
  const manualDocIsImage = typeof manualDoc?.data === 'string' && manualDoc.data.startsWith('data:image');

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
              <Text className="text-sm font-bold text-emerald-800 ml-2 flex-1">Final Signed Document Uploaded</Text>
            </View>
            {confirmRemoveDoc ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700 mb-2">Remove this document?</Text>
                <View className="flex-row" style={{ columnGap: 8 }}>
                  <TouchableOpacity
                    onPress={removeManualDoc}
                    className="flex-1 rounded-lg bg-red-600 items-center justify-center"
                    style={{ minHeight: 42 }}
                  >
                    <Text className="text-white text-sm font-semibold">Yes, Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setConfirmRemoveDoc(false)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white items-center justify-center"
                    style={{ minHeight: 42 }}
                  >
                    <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row" style={{ columnGap: 8 }}>
                <TouchableOpacity
                  onPress={() => setPreviewDoc(true)}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-500"
                  style={{ minHeight: 44, columnGap: 6 }}
                >
                  <Eye size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm">View</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConfirmRemoveDoc(true)}
                  accessibilityLabel="Remove signed document"
                  className="px-3 rounded-xl border border-red-200 bg-red-50 items-center justify-center"
                  style={{ minHeight: 44 }}
                >
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowDocModal(true)}
            className="flex-row items-center justify-center rounded-xl bg-brand-500"
            style={{ minHeight: 44, columnGap: 6 }}
          >
            <FileText size={16} color="#fff" />
            <Text className="text-white font-semibold text-sm">Open Document Center</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Digital Signed Report ── */}
      <View
        className={`rounded-2xl border border-slate-200 bg-white p-4 mb-4 ${hasSignedDoc || isVirtual ? 'opacity-40' : ''}`}
        pointerEvents={hasSignedDoc || isVirtual ? 'none' : 'auto'}
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

        {isVirtual ? (
          <View className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Text className="text-sm font-medium text-slate-500">
              Not available for virtual inspections — use the Manual Document path to upload a signed copy.
            </Text>
          </View>
        ) : hasSignedReport ? (
          <View>
            <View className="flex-row items-center mb-3">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-sm font-semibold text-emerald-600 ml-2 flex-1">Signed report generated</Text>
            </View>
            {confirmRemoveReport ? (
              <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700 mb-2">Remove signed report and signature?</Text>
                <View className="flex-row" style={{ columnGap: 8 }}>
                  <TouchableOpacity
                    onPress={removeSignedReport}
                    className="flex-1 rounded-lg bg-red-600 items-center justify-center"
                    style={{ minHeight: 42 }}
                  >
                    <Text className="text-white text-sm font-semibold">Yes, Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setConfirmRemoveReport(false)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white items-center justify-center"
                    style={{ minHeight: 42 }}
                  >
                    <Text className="text-slate-700 text-sm font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row" style={{ columnGap: 8 }}>
                <TouchableOpacity
                  onPress={() => setPreviewReport(true)}
                  className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-500 px-3"
                  style={{ minHeight: 44, columnGap: 6 }}
                >
                  <Eye size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                    View Signed Report
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConfirmRemoveReport(true)}
                  accessibilityLabel="Remove signed report"
                  className="px-3 rounded-xl border border-red-200 bg-red-50 items-center justify-center"
                  style={{ minHeight: 44 }}
                >
                  <Trash2 size={16} color="#dc2626" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowSignModal(true)}
            className="flex-row items-center justify-center rounded-xl border border-brand-200 bg-brand-50"
            style={{ minHeight: 44, columnGap: 6 }}
          >
            <PenLine size={16} color="#c41617" />
            <Text className="text-brand-700 font-semibold text-sm">Open Signature Center</Text>
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
              (isVirtual
                ? 'A signed document is required — upload a signed copy via the Manual Document path.'
                : 'At least one signed document is required — upload a signed copy or generate the digitally-signed report.')}
        </Text>
      </View>

      {/* ── Preview: uploaded signed document ── */}
      <PreviewModal
        visible={previewDoc && hasSignedDoc}
        title={manualDoc?.name || 'Signed Document'}
        onClose={() => setPreviewDoc(false)}
      >
        {manualDocIsImage ? (
          <Image source={{ uri: manualDoc.data }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        ) : manualDoc?.data ? (
          <WebView
            source={{ uri: manualDoc.data }}
            originWhitelist={['*']}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View className="absolute inset-0 items-center justify-center bg-white">
                <ActivityIndicator size="large" color="#e01a1b" />
              </View>
            )}
          />
        ) : null}
      </PreviewModal>

      {/* ── Preview: canonical (unsigned) report, opened from "View Report" ── */}
      <PreviewModal
        visible={previewCanonical && !!canonicalHtml}
        title={`Inspection Report — ${vendorName}`}
        onClose={() => setPreviewCanonical(false)}
        action={
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
        }
      >
        <WebView
          source={{ html: canonicalHtml || '' }}
          originWhitelist={['*']}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <View className="absolute inset-0 items-center justify-center bg-white">
              <ActivityIndicator size="large" color="#e01a1b" />
            </View>
          )}
        />
      </PreviewModal>

      {/* ── Preview: digitally-signed report ──
          Rebuilt from the stored signature rather than rendering the stored
          PDF, since Android's WebView has no PDF renderer. */}
      <PreviewModal
        visible={previewReport && hasSignedReport}
        title={signedReport[0]?.name || 'Signed Report'}
        onClose={() => setPreviewReport(false)}
      >
        <WebView
          source={{ html: buildSignedReportHtml(vendorName, meta, docData.clientSignature || '') }}
          originWhitelist={['*']}
          style={{ flex: 1 }}
          startInLoadingState
          renderLoading={() => (
            <View className="absolute inset-0 items-center justify-center bg-white">
              <ActivityIndicator size="large" color="#e01a1b" />
            </View>
          )}
        />
      </PreviewModal>

      {/* ── Document Center modal ── */}
      <Modal visible={showDocModal} transparent animationType="fade" onRequestClose={() => setShowDocModal(false)}>
        <Pressable className="flex-1 bg-black/50 justify-center px-5" onPress={() => setShowDocModal(false)}>
          <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row items-center justify-between px-5 py-4 border-b border-slate-100">
              <Text className="font-bold text-slate-900 flex-1 mr-3">Document Center</Text>
              <TouchableOpacity onPress={() => setShowDocModal(false)} hitSlop={10} accessibilityLabel="Close">
                <X size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View className="p-5">
              {/* Step 1 — Download Report */}
              <View className="flex-row items-center mb-2">
                <View className="w-6 h-6 rounded-full bg-brand-500 items-center justify-center mr-2">
                  <Text className="text-white text-xs font-bold">1</Text>
                </View>
                <Text className="text-sm font-bold text-slate-800 flex-1">View Inspection Report</Text>
              </View>
              <Text className="text-xs text-slate-500 mb-2 ml-8">
                Read the generated report, then save it as a PDF to print, have it signed by the client and stamped with their seal, and scan it.
              </Text>
              <View className="ml-8 mb-4">
                <TouchableOpacity
                  onPress={handleDownloadReport}
                  className="flex-row items-center justify-center self-stretch rounded-xl bg-brand-500 px-4"
                  style={{ minHeight: 44, columnGap: 6 }}
                >
                  <Eye size={16} color="#fff" />
                  <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                    View Report
                  </Text>
                </TouchableOpacity>
                {hasDownloaded && (
                  <View className="flex-row items-center mt-2">
                    <CheckCircle2 size={13} color="#059669" />
                    <Text className="text-xs text-emerald-600 font-semibold ml-1">Report viewed</Text>
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
                    <Text className="text-sm font-bold text-slate-800 flex-1">Upload Signed Copy</Text>
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
            <View className="flex-1 mr-3">
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
          {/* Weighted split: the primary action needs roughly twice the width
              of "Cancel" to keep its label on one line. Both share a min
              height so a spinner-only state can't shrink one of them. */}
          <View className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex-row" style={{ columnGap: 10 }}>
            <TouchableOpacity
              onPress={() => setShowSignModal(false)}
              className="rounded-xl border border-slate-200 bg-white items-center justify-center"
              style={{ flex: 1, minHeight: FOOTER_BTN_HEIGHT }}
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmSignature}
              disabled={generating || !drawnSignature}
              className="flex-row items-center justify-center rounded-xl bg-brand-500 px-3"
              style={{
                flex: 2,
                minHeight: FOOTER_BTN_HEIGHT,
                columnGap: 6,
                opacity: generating || !drawnSignature ? 0.6 : 1,
              }}
            >
              {generating ? <ActivityIndicator size="small" color="#fff" /> : <CheckCircle2 size={16} color="#fff" />}
              <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                {generating ? 'Generating…' : 'Confirm & Generate'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}