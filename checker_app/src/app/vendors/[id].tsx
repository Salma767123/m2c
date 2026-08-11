// import React, { useCallback, useEffect, useState } from 'react';
// import { useFocusEffect } from '@react-navigation/native';
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   RefreshControl,
//   Linking,
//   StatusBar,
//   Image,
//   Modal,
//   Alert,
// } from 'react-native';
// import { useSafeAreaInsets } from 'react-native-safe-area-context';
// import * as WebBrowser from 'expo-web-browser';
// import { useLocalSearchParams, router } from 'expo-router';
// import {
//   ArrowLeft,
//   Calendar,
//   Clock,
//   MapPin,
//   Factory,
//   Phone,
//   Mail,
//   CheckCircle,
//   Play,
//   BarChart3,
//   Globe,
//   Briefcase,
//   Package,
//   Warehouse,
//   Award,
//   FileText,
//   AlertCircle,
//   RefreshCw,
//   Eye,
//   X as XIcon,
//   ExternalLink,
//   Landmark,
//   UserCircle,
// } from 'lucide-react-native';
// import qcCheckerService from '../../services/qcCheckerService';
// import {
//   buildFullName,
//   formatLocalLandline,
//   formatIntlLandline,
//   getOwnershipTypeLabel,
//   FACILITY_META,
//   withUnit,
// } from '../../components/Vendor/Steps/fieldHelpers';
// import { AppText, SectionCard, Button } from '@/components/UI';
// import { brand, colors, elevation } from '@/constants/design';

// type TabId = 'overview' | 'history' | 'upcoming';
// const TABS: { id: TabId; label: string }[] = [
//   { id: 'overview', label: 'Overview' },
//   { id: 'history', label: 'Inspection History' },
//   { id: 'upcoming', label: 'Upcoming Inspections' },
// ];

// // ── Document helpers (mirror web docDownload) ────────────────────────────────
// const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
// const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf|zip)(\?|$)/i;

// // Decide whether a document URL points at an image (mirrors web isImageUrl).
// const isImageDoc = (url?: string | null, name?: string | null): boolean => {
//   const n = (name || '').toLowerCase();
//   if (DOC_EXT.test(n)) return false;
//   if (IMAGE_EXT.test(n)) return true;
//   const u = (url || '').toLowerCase();
//   if (DOC_EXT.test(u)) return false;
//   if (IMAGE_EXT.test(u)) return true;
//   if (u.includes('/raw/upload/')) return false;
//   if (u.includes('/image/upload/')) return true;
//   return false;
// };

// // Build the backend document-proxy URL for Cloudinary-hosted files (mirrors web
// // cloudinaryProxyUrl), so PDFs open through our API rather than hitting
// // Cloudinary directly. Non-Cloudinary URLs are returned untouched.
// const proxiedDocUrl = (url: string): string => {
//   try {
//     const host = new URL(url).hostname;
//     if (/^res\.cloudinary\.com$/i.test(host)) {
//       const base = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
//       return `${base}/document-proxy?url=${encodeURIComponent(url)}`;
//     }
//   } catch {
//     /* non-URL string: return as-is */
//   }
//   return url;
// };

// // Registration document types shown in the Documents tab (mirror web —
// // includes TRADE_LICENSE and EXPORT_LICENSE so those uploads aren't dropped).
// const COMPANY_DOC_TYPES = [
//   'GST_CERTIFICATE',
//   'PAN_CARD',
//   'COMPANY_REGISTRATION',
//   'AADHAAR_CARD',
//   'TRADE_LICENSE',
//   'EXPORT_LICENSE',
// ];

// const DOC_TYPE_LABELS: Record<string, string> = {
//   GST_CERTIFICATE: 'GST Certificate',
//   PAN_CARD: 'PAN Card',
//   COMPANY_REGISTRATION: 'Company Registration',
//   AADHAAR_CARD: 'Aadhaar Card',
//   TRADE_LICENSE: 'Trade License',
//   EXPORT_LICENSE: 'Export License (IEC)',
//   OTHER: 'Factory Image',
// };

// const priorityStyle = (p: string) => {
//   const key = (p || '').toLowerCase();
//   const map: Record<string, { bg: string; text: string }> = {
//     high: { bg: '#fee2e2', text: '#991b1b' },
//     medium: { bg: '#fef3c7', text: '#92400e' },
//     low: { bg: '#d1fae5', text: '#065f46' },
//   };
//   return map[key] || map.medium;
// };

// const safeExternalUrl = (url?: string | null) => {
//   if (!url) return null;
//   const trimmed = String(url).trim();
//   return /^https?:\/\//i.test(trimmed) ? trimmed : null;
// };

// const formatDate = (input?: string | Date | null) => {
//   if (!input) return '';
//   const d = typeof input === 'string' ? new Date(input) : input;
//   if (isNaN(d.getTime())) return '';
//   return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
// };

// const formatAddress = (...parts: Array<string | null | undefined>) =>
//   parts.map((p) => (p ?? '').toString().trim()).filter((p) => p.length > 0).join(', ');

// // Date + 12-hour time — used for inspection start / completed timestamps (mirror web formatDateTime).
// const formatDateTime = (input?: string | Date | null): string => {
//   if (!input) return '';
//   const d = typeof input === 'string' ? new Date(input) : input;
//   if (isNaN(d.getTime())) return '';
//   return d.toLocaleString('en-IN', {
//     day: '2-digit', month: 'short', year: 'numeric',
//     hour: '2-digit', minute: '2-digit', hour12: true,
//   });
// };

// // Convert a "HH:MM" clock string (or Date/ISO) into 12-hour format (mirror web formatTime12).
// const formatTime12 = (time?: string | Date | null): string => {
//   if (!time) return '';
//   let hours: number;
//   let minutes: number;
//   if (time instanceof Date) {
//     hours = time.getHours();
//     minutes = time.getMinutes();
//   } else {
//     const clock = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
//     if (clock) {
//       hours = Number(clock[1]);
//       minutes = Number(clock[2]);
//     } else {
//       const parsed = new Date(time);
//       if (Number.isNaN(parsed.getTime())) return time;
//       hours = parsed.getHours();
//       minutes = parsed.getMinutes();
//     }
//   }
//   if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
//     return typeof time === 'string' ? time : '';
//   }
//   const period = hours >= 12 ? 'PM' : 'AM';
//   const h12 = hours % 12 === 0 ? 12 : hours % 12;
//   return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
// };

// // ── Derived vendor status (mirror web getNewMainStatus / getNewInspectionStatus) ──
// // The raw DB status alone doesn't tell the checker where the assignment stands;
// // these fold the latest inspection's lifecycle into a human "main status" and a
// // separate "inspection status", exactly like the web QC-checker detail screen.
// const getNewMainStatus = (
//   dbStatus: string,
//   latestInspection?: { status?: string | null; result?: string | null; cycleNumber?: number | null } | null,
// ): string => {
//   const status = dbStatus?.toUpperCase() || 'PENDING';
//   if (status === 'APPROVED') return 'Approved';
//   if (status === 'REJECTED') return 'Rejected';
//   if (status === 'REINSPECTION') return 'Re-Inspection';
//   if (status === 'UNDER_REVIEW') {
//     if (latestInspection) {
//       const inspStatus = latestInspection.status?.toUpperCase();
//       const cycle = latestInspection.cycleNumber ?? 1;
//       if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
//         return cycle > 1 ? 'Re-Inspection' : 'New Assignment';
//       }
//       if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
//         return cycle > 1 ? 'Re-Inspection Under Review by Admin' : 'Under Review by Admin';
//       }
//     }
//     return 'Under Review by Admin';
//   }
//   if (status === 'PENDING') return 'New Assignment';
//   return status.replace(/_/g, ' ').toLowerCase();
// };

// const getNewInspectionStatus = (
//   dbStatus: string,
//   latestInspection?: { status?: string | null; result?: string | null } | null,
// ): string => {
//   const status = dbStatus?.toUpperCase() || 'PENDING';
//   if (status === 'APPROVED') return 'Completed';
//   if (status === 'REJECTED') {
//     if (latestInspection && latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
//     return 'Completed';
//   }
//   if (status === 'REINSPECTION') return 'Pending';
//   if (status === 'UNDER_REVIEW') {
//     if (latestInspection) {
//       const inspStatus = latestInspection.status?.toUpperCase();
//       if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') return 'Pending';
//       if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
//         if (latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
//         return 'Submitted';
//       }
//     }
//     return 'Pending';
//   }
//   return 'Pending';
// };

// // Badge colours for the derived main status (mirror web MAIN_STATUS_COLORS).
// const MAIN_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
//   'New Assignment': { bg: '#eff6ff', text: '#1d4ed8' },
//   'Under Review by Admin': { bg: '#fff7ed', text: '#c2410c' },
//   'Re-Inspection': { bg: '#fff7ed', text: '#c2410c' },
//   'Re-Inspection Under Review by Admin': { bg: '#fffbeb', text: '#b45309' },
//   'Re-Inspection Under Review': { bg: '#fffbeb', text: '#b45309' },
//   Approved: { bg: '#ecfdf5', text: '#047857' },
//   Rejected: { bg: '#fef2f2', text: '#b91c1c' },
// };
// const mainStatusStyle = (s: string) => MAIN_STATUS_STYLE[s] || { bg: '#fffbeb', text: '#b45309' };

// // Badge colours for the derived inspection status (mirror web INSPECTION_STATUS_COLORS).
// const INSPECTION_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
//   Pending: { bg: '#f8fafc', text: '#334155' },
//   Submitted: { bg: '#eff6ff', text: '#1d4ed8' },
//   Rejected: { bg: '#fef2f2', text: '#b91c1c' },
//   Completed: { bg: '#ecfdf5', text: '#047857' },
// };
// const inspectionStatusStyle = (s?: string | null) =>
//   INSPECTION_STATUS_STYLE[s || 'Pending'] || INSPECTION_STATUS_STYLE.Pending;

// // Lifecycle-aware badge for an inspection-history row (mirror web getInspectionRowBadge).
// // The Pass/Fail verdict is only final once COMPLETED; while SUBMITTED / under admin
// // review the row must reflect that lifecycle state, not the proposed result.
// const getInspectionRowBadge = (insp: any): { label: string; bg: string; text: string } => {
//   const status = (insp.status || '').toUpperCase();
//   const result = (insp.result || '').toUpperCase();
//   switch (status) {
//     case 'COMPLETED':
//       if (result === 'PASSED') return { label: 'Passed', bg: '#ecfdf5', text: '#047857' };
//       if (result === 'FAILED') return { label: 'Failed', bg: '#fef2f2', text: '#b91c1c' };
//       return { label: 'Completed', bg: '#ecfdf5', text: '#047857' };
//     case 'SUBMITTED':
//     case 'UNDER_ADMIN_REVIEW':
//       return { label: 'Under Review by Admin', bg: '#eff6ff', text: '#1d4ed8' };
//     case 'SCHEDULED':
//       return { label: 'Scheduled', bg: '#f8fafc', text: '#475569' };
//     case 'IN_PROGRESS':
//       return { label: 'In Progress', bg: '#fffbeb', text: '#b45309' };
//     case 'REJECTED':
//       return { label: 'Rejected', bg: '#fef2f2', text: '#b91c1c' };
//     case 'REINSPECTION':
//       return { label: 'Re-Inspection', bg: '#fffbeb', text: '#b45309' };
//     case 'CANCELLED':
//       return { label: 'Cancelled', bg: '#f8fafc', text: '#64748b' };
//     default:
//       return { label: status ? status.replace(/_/g, ' ') : 'Pending', bg: '#f8fafc', text: '#475569' };
//   }
// };

// // ── Vendor DETAIL label maps (distinct from the Step-1/Step-3 form maps) ─────
// // The web DETAIL screen uses its own Business Type / Company ID label maps that
// // differ from the inspection-form step maps, so we replicate them locally here
// // instead of reusing getBusinessTypeLabel / getCompanyIdLabel from fieldHelpers.
// const getDetailBusinessTypeLabel = (type: string): string => {
//   const map: Record<string, string> = {
//     proprietorship: 'Proprietorship',
//     'pvt-ltd': 'Pvt Ltd',
//     'partnership-firm': 'Partnership Firm',
//     llp: 'LLP',
//     sole: 'Sole Proprietorship',
//     partnership: 'Partnership',
//     corporation: 'Corporation',
//     llc: 'Limited Liability Company (LLC)',
//   };
//   return map[type] || type;
// };

// const getDetailCompanyIdLabel = (businessType: string): string => {
//   const map: Record<string, string> = {
//     proprietorship: 'IEC Code',
//     'pvt-ltd': 'CIN Number',
//     'partnership-firm': 'Partnership Deed',
//     llp: 'LLPIN Number',
//   };
//   return map[businessType] || 'Business Registration ID';
// };

// // Employee-count label — the web DETAIL map uses plain hyphens and "100+
// // employees", which differs from fieldHelpers.getEmployeeCountLabel (en-dashes
// // + "More than 100 employees"), so replicate the DETAIL variant locally.
// const getDetailEmployeeCountLabel = (count: string): string => {
//   const map: Record<string, string> = {
//     '10-20': '10-20 employees',
//     '20-50': '20-50 employees',
//     '50-100': '50-100 employees',
//     '100+': '100+ employees',
//   };
//   return map[count] || count;
// };

// // Owner designation code → label. Main owner shows the RAW designation; the
// // additional owners are resolved through this map (mirrors web VendorDetail).
// const resolveOwnerDesignation = (val?: string | null): string => {
//   if (!val) return '';
//   const map: Record<string, string> = {
//     proprietor: 'Proprietor',
//     ceo: 'CEO',
//     director: 'Director',
//     'managing-director': 'Managing Director',
//     founder: 'Founder',
//     other: 'Other',
//   };
//   return map[val] || val;
// };

// // Facility sub-card titles — mirror the WEB FACILITY_META labels (finishing →
// // "Final Packing and Dispatch"), which differ from the mobile fieldHelpers
// // FACILITY_META (left untouched because the inspection form depends on it).
// const FACILITY_TITLE: Record<string, string> = {
//   spinning: 'Spinning',
//   weaving: 'Weaving',
//   dyeing: 'Dyeing',
//   printing: 'Printing',
//   stitching: 'Stitching',
//   finishing: 'Final Packing and Dispatch',
// };

// // "Active Facilities" chip labels (finishing → "Finishing", per web).
// const FACILITY_CHIP: Record<string, string> = {
//   spinning: 'Spinning',
//   weaving: 'Weaving',
//   dyeing: 'Dyeing',
//   printing: 'Printing',
//   stitching: 'Stitching',
//   finishing: 'Finishing',
// };

// // Country name → ISO2 for common countries so we can render a flag image via
// // flagcdn. Unmappable names fall back to a plain (flag-less) chip.
// const COUNTRY_ISO: Record<string, string> = {
//   India: 'IN', 'United States': 'US', 'United States of America': 'US',
//   'United Kingdom': 'GB', China: 'CN', Germany: 'DE', France: 'FR', Italy: 'IT',
//   Spain: 'ES', Canada: 'CA', Australia: 'AU', Japan: 'JP', Bangladesh: 'BD',
//   Pakistan: 'PK', 'Sri Lanka': 'LK', Nepal: 'NP', 'United Arab Emirates': 'AE',
//   'Saudi Arabia': 'SA', Singapore: 'SG', Malaysia: 'MY', Thailand: 'TH',
//   Vietnam: 'VN', Indonesia: 'ID', Netherlands: 'NL', Belgium: 'BE',
//   Switzerland: 'CH', Sweden: 'SE', Norway: 'NO', Denmark: 'DK', Poland: 'PL',
//   Turkey: 'TR', Russia: 'RU', Brazil: 'BR', Mexico: 'MX', 'South Africa': 'ZA',
//   Egypt: 'EG', Nigeria: 'NG', Kenya: 'KE', 'South Korea': 'KR',
//   'New Zealand': 'NZ', Ireland: 'IE', Portugal: 'PT', Austria: 'AT',
//   Greece: 'GR', Israel: 'IL', Qatar: 'QA', Kuwait: 'KW', Bahrain: 'BH',
//   Oman: 'OM', 'Hong Kong': 'HK', Taiwan: 'TW', Philippines: 'PH',
// };

// // Non-empty check for scalars/arrays (mirrors web hasData).
// const hasVal = (v: any): boolean => {
//   if (v === null || v === undefined || v === '') return false;
//   if (Array.isArray(v)) return v.length > 0;
//   return true;
// };

// // Capitalize the first letter of each word (mirrors CSS `capitalize`).
// const capitalizeWords = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase());
// // Capitalize only the first character (mirrors web vendorTypes transform).
// const capitalizeFirst = (s: string): string =>
//   typeof s === 'string' && s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// // Certification expiry badge (mirrors web getCertificateStatus — 4 tiers).
// // Returns null only for a missing/invalid date; otherwise always a badge.
// const certExpiryStatus = (
//   expiryDate?: string | null,
// ): { label: string; bg: string; text: string } | null => {
//   if (!expiryDate) return null;
//   const expiry = new Date(expiryDate);
//   if (isNaN(expiry.getTime())) return null;
//   const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
//   if (days < 0) return { label: 'Expired', bg: '#fee2e2', text: '#991b1b' };
//   if (days <= 30) return { label: `Expires in ${days} days`, bg: '#fef3c7', text: '#92400e' };
//   if (days <= 90) return { label: `Expires in ${days} days`, bg: '#fef9c3', text: '#854d0e' };
//   return { label: `Valid until ${formatDate(expiryDate)}`, bg: '#d1fae5', text: '#047857' };
// };

// export default function VendorDetailScreen() {
//   const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
//   const insets = useSafeAreaInsets();
//   const [activeTab, setActiveTab] = useState<TabId>('overview');
//   const [fullVendor, setFullVendor] = useState<any>(null);
//   const [stats, setStats] = useState<any>(null);
//   const [recentInspections, setRecentInspections] = useState<any[]>([]);
//   const [upcomingList, setUpcomingList] = useState<any[]>([]);
//   const [historyMeta, setHistoryMeta] = useState<{ total: number; returned: number; hasMore: boolean } | null>(null);
//   const [historyLimit, setHistoryLimit] = useState(10);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   // Fullscreen image lightbox (registered document images).
//   const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

//   const loadAll = useCallback(async (limitOverride?: number) => {
//     if (!id) return;
//     const limit = limitOverride ?? historyLimit;
//     setError(null);
//     if (!fullVendor) setLoading(true);
//     try {
//       const res = await qcCheckerService.getVendorDetails(id, limit);
//       if (res.success) {
//         setFullVendor(res.data.vendor);
//         setStats(res.data.stats);
//         setRecentInspections(res.data.recentInspections || []);
//         setUpcomingList(res.data.upcomingInspections || []);
//         if (res.data.recentInspectionsMeta) setHistoryMeta(res.data.recentInspectionsMeta);
//       }
//     } catch (err: any) {
//       setError(err?.message || 'Failed to load vendor details');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   }, [id, historyLimit, fullVendor]);

//   // Refetch vendor + audit trail every time this screen is focused, so the
//   // status / history reflects any inspection action the checker just took.
//   useFocusEffect(
//     useCallback(() => {
//       loadAll();
//       // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [id]),
//   );

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     loadAll();
//   }, [loadAll]);

//   const actualUpcoming = upcomingList.filter(
//     (i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS',
//   );
//   const firstUpcoming = actualUpcoming[0];
//   const isContinuing = firstUpcoming?.status === 'IN_PROGRESS';

//   // Derived main / inspection status (mirror web) — folds the latest inspection's
//   // lifecycle into the badges shown in the header, instead of the raw DB status.
//   const latestInspection =
//     upcomingList.length > 0 ? upcomingList[0] : recentInspections.length > 0 ? recentInspections[0] : null;
//   const currentMainStatus = fullVendor
//     ? getNewMainStatus(fullVendor.status, latestInspection)
//     : '';
//   const currentInspectionStatus = fullVendor
//     ? getNewInspectionStatus(fullVendor.status, latestInspection)
//     : '';
//   // Once the assignment is completed, the QC checker only needs a compact summary.
//   const isCompleted = currentInspectionStatus === 'Completed';

//   const handleLoadMoreHistory = () => {
//     const nextLimit = Math.min(historyLimit + 20, 50);
//     setHistoryLimit(nextLimit);
//     loadAll(nextLimit);
//   };

//   const handleStartInspectionFlow = () => {
//     router.push({
//       pathname: '/vendors/[id]/inspection' as any,
//       params: { id: id!, name: fullVendor?.companyName || name || '' },
//     });
//   };

//   // ── Registered documents (mirror web VendorDetail Documents grouping) ──────
//   const allDocs: any[] = Array.isArray(fullVendor?.documents) ? fullVendor.documents : [];
//   const companyDocs = allDocs.filter((d) => COMPANY_DOC_TYPES.includes(d.type));
//   const factoryImages = allDocs
//     .filter((d) => d.type === 'OTHER')
//     .map((d) => ({ label: d.name || 'Factory Image', url: d.documentUrl }));
//   const companyLogo = fullVendor?.companyLogo || null;

//   // Open a registered document: images go to the in-app lightbox, everything
//   // else (PDFs/docs) opens through the document-proxy in the system browser
//   // (mirrors web: images → lightbox, PDFs → open in browser).
//   const openDoc = useCallback(async (url?: string | null, docName?: string | null) => {
//     if (!url) return;
//     if (isImageDoc(url, docName)) {
//       setLightbox({ url, name: docName || 'Document' });
//       return;
//     }
//     try {
//       await WebBrowser.openBrowserAsync(proxiedDocUrl(url));
//     } catch {
//       Alert.alert('Unable to open', 'Could not open this document.');
//     }
//   }, []);

//   // Skeleton only on initial load
//   if (loading && !fullVendor) {
//     return <VendorDetailSkeleton onBack={() => router.back()} insetsTop={insets.top} />;
//   }

//   if (error && !fullVendor) {
//     return (
//       <View className="flex-1 bg-white">
//         <Header onBack={() => router.back()} insetsTop={insets.top} />
//         <View className="flex-1 items-center justify-center px-8">
//           <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
//             <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
//           </View>
//           <AppText variant="headlineSm" color={colors.text} style={{ marginBottom: 8, textAlign: 'center' }}>
//             Something went wrong
//           </AppText>
//           <AppText variant="bodyMd" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 24 }}>{error}</AppText>
//           <Button label="Try Again" icon={RefreshCw} onPress={() => loadAll()} />
//         </View>
//       </View>
//     );
//   }

//   const companyName = fullVendor?.companyName || name || 'Vendor';
//   const location =
//     formatAddress(fullVendor?.factoryCity, fullVendor?.factoryState) || 'Location not provided';
//   const productCategories: string[] = fullVendor?.productCategories || [];
//   const certifications: any[] = fullVendor?.certifications || [];
//   const additionalOwners: any[] = Array.isArray(fullVendor?.additionalOwners)
//     ? fullVendor.additionalOwners
//     : [];
//   const bank = fullVendor?.bankDetails || null;
//   const websiteSafe = safeExternalUrl(fullVendor?.website);

//   // ── Overview derived data (mirror web renderOverviewTab) ───────────────────
//   // Factory Site photos belong to the Legal Address & Factory Site; the rest
//   // are Warehouse photos (web splits on the "Factory Site" name prefix).
//   const legalSiteImages = factoryImages.filter((m) => (m.label || '').startsWith('Factory Site'));
//   const warehousePhotoImages = factoryImages.filter((m) => !(m.label || '').startsWith('Factory Site'));

//   // Product photos across registered category products + custom categories.
//   const productPhotos: { label: string; url: string }[] = [];
//   const collectProductPhotos = (catLabel: string, products: any) => {
//     (Array.isArray(products) ? products : []).forEach((p: any, i: number) => {
//       (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
//         const url = ph?.url || ph?.preview;
//         if (url) {
//           productPhotos.push({
//             label: [catLabel, p?.name || `Product ${i + 1}`].filter(Boolean).join(' · '),
//             url,
//           });
//         }
//       });
//     });
//   };
//   if (fullVendor?.categoryProducts && typeof fullVendor.categoryProducts === 'object') {
//     Object.values(fullVendor.categoryProducts).forEach((products: any) => collectProductPhotos('', products));
//   }
//   if (Array.isArray(fullVendor?.additionalCategories)) {
//     fullVendor.additionalCategories.forEach((cat: any) =>
//       collectProductPhotos(cat?.name || 'Custom Category', cat?.products),
//     );
//   }

//   // Contact persons (main + alternates) for the Contact & Trade section.
//   const mainContactPerson =
//     fullVendor?.mainContact && typeof fullVendor.mainContact === 'object' ? fullVendor.mainContact : null;
//   const alternateContactsList: any[] = Array.isArray(fullVendor?.alternateContacts)
//     ? fullVendor.alternateContacts
//     : [];
//   const contactPersons = [
//     ...(mainContactPerson ? [{ ...mainContactPerson, _label: 'Contact Person 1 (Main)' }] : []),
//     ...alternateContactsList.map((c: any, i: number) => ({ ...c, _label: `Contact Person ${i + 2}` })),
//   ];

//   // Warehouse "same as factory" detection (mirrors web).
//   const _wEq = (a: any, b: any) => (a || '').toString().trim() === (b || '').toString().trim();
//   const warehouseSameAsFactory =
//     (!fullVendor?.warehouseAddress && !fullVendor?.warehouseCity) ||
//     (_wEq(fullVendor?.warehouseAddress, fullVendor?.factoryAddress) &&
//       _wEq(fullVendor?.warehouseCity, fullVendor?.factoryCity) &&
//       _wEq(fullVendor?.warehouseState, fullVendor?.factoryState) &&
//       _wEq(fullVendor?.warehouseZipCode, fullVendor?.factoryZipCode) &&
//       _wEq(fullVendor?.warehouseCountry, fullVendor?.factoryCountry));

//   // Shared inline renderers for the overview sections.
//   const imageStrip = (items: { label: string; url: string }[]) => (
//     <View className="flex-row flex-wrap" style={{ columnGap: 10, rowGap: 12 }}>
//       {items.map((m, i) => (
//         <DocTile key={`${m.label}-${i}`} url={m.url} name={m.label} onOpen={() => openDoc(m.url, m.label)} />
//       ))}
//     </View>
//   );
//   const countryChips = (list: string[]) => (
//     <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
//       {list.map((nm, i) => {
//         const iso = COUNTRY_ISO[nm];
//         return (
//           <View
//             key={i}
//             className="flex-row items-center rounded-lg px-2.5 py-1"
//             style={{ backgroundColor: '#f1f5f9' }}
//           >
//             {iso ? (
//               <Image
//                 source={{ uri: `https://flagcdn.com/24x18/${iso.toLowerCase()}.png` }}
//                 style={{ width: 16, height: 12, marginRight: 6, borderRadius: 2 }}
//                 resizeMode="cover"
//               />
//             ) : null}
//             <Text className="text-xs font-semibold" style={{ color: '#334155' }}>
//               {nm}
//             </Text>
//           </View>
//         );
//       })}
//     </View>
//   );

//   const renderOverview = () => {
//     if (!fullVendor) return null;
//     const fv = fullVendor;
//     const bt: string = fv.businessType;

//     // ── Facilities ──
//     const enabledFacilities = fv.enabledFacilities || {};
//     const detailsMap = fv.facilityDetails || {};
//     const enabledList: string[] = Object.entries(enabledFacilities)
//       .filter(([, en]) => !!en)
//       .map(([k]) => FACILITY_CHIP[k] || k);
//     const facilityCards = Object.entries(detailsMap)
//       .filter(([fid]) => enabledFacilities[fid])
//       .map(([fid, details]: [string, any]) => {
//         const rows = (FACILITY_META[fid]?.detailFields ?? []).filter(
//           ({ key }) => (details || {})[key] !== null && (details || {})[key] !== undefined && (details || {})[key] !== '',
//         );
//         return { fid, rows, details };
//       })
//       .filter((c) => c.rows.length > 0);
//     const hasFacilitiesData = (fv.enabledFacilities || fv.facilityDetails) && (enabledList.length > 0 || facilityCards.length > 0);

//     // ── Section presence flags ──
//     const s2Fields =
//       hasVal(fv.businessPhone) || hasVal(fv.phoneNumber2) || hasVal(fv.businessEmail) || hasVal(fv.businessEmail2) ||
//       !!formatLocalLandline({ countryCode: '+91', std: fv.localLandlineStd, number: fv.landlineNumber }) ||
//       !!formatIntlLandline(fv.intlLandline) || hasVal(fv.businessAddress) || hasVal(fv.addressLine2) ||
//       hasVal(fv.addressLine3) || hasVal(fv.landmark) || hasVal(fv.businessCity) || hasVal(fv.businessState) ||
//       hasVal(fv.businessZipCode) || hasVal(fv.businessCountry);

//     const ownerFullName = buildFullName(fv.ownerTitle, fv.ownerFirstName, fv.ownerMiddleName, fv.ownerLastName, fv.ownerName);
//     const ownerLocalLL = formatLocalLandline({ countryCode: '+91', std: fv.ownerLocalLandlineStd, number: fv.ownerLandline });
//     const ownerIntlLL = formatIntlLandline(fv.ownerIntlLandline);
//     const s3Fields =
//       hasVal(ownerFullName) || hasVal(fv.designation) || hasVal(fv.ownerPhone) || hasVal(fv.ownerPhone2) ||
//       hasVal(fv.ownerEmail) || hasVal(fv.ownerEmail2) || !!ownerLocalLL || !!ownerIntlLL ||
//       hasVal(fv.businessStartDate) || hasVal(fv.employeeCount);
//     const s3Custom = !!fv.ownerPhoto || (Array.isArray(fv.additionalOwners) && fv.additionalOwners.length > 0);

//     const s4Fields =
//       hasVal(fv.factoryOwnershipType) || hasVal(fv.factorySize) || hasVal(fv.factoryAddress) || hasVal(fv.addressLine2) ||
//       hasVal(fv.addressLine3) || hasVal(fv.landmark) || hasVal(fv.factoryCity) || hasVal(fv.factoryState) ||
//       hasVal(fv.factoryZipCode) || hasVal(fv.factoryCountry);
//     const hasWarehouseSection = !!(fv.warehouseAddress || fv.warehouseCity || fv.factoryAddress || fv.factoryCity);
//     const s4Custom = hasWarehouseSection || legalSiteImages.length > 0 || warehousePhotoImages.length > 0;

//     const vendorTypeChips: string[] = Array.isArray(fv.vendorTypes) ? fv.vendorTypes.map(capitalizeFirst) : [];
//     const s5 = vendorTypeChips.length > 0 || (Array.isArray(fv.productCategories) && fv.productCategories.length > 0) ||
//       hasVal(fv.categoryRemarks) || productPhotos.length > 0;

//     const s7Fields = hasVal(fv.complianceStandards) || hasVal(fv.packagingCapabilities) || hasVal(fv.logisticsPartners) ||
//       (Array.isArray(fv.shippingMethods) && fv.shippingMethods.length > 0);
//     const certs: any[] = Array.isArray(fv.certifications) ? fv.certifications : [];

//     const s8Fields =
//       (fv.importExperience !== undefined && fv.importExperience !== null) ||
//       (fv.exportExperience !== undefined && fv.exportExperience !== null) ||
//       (Array.isArray(fv.importCountries) && fv.importCountries.length > 0) ||
//       (Array.isArray(fv.exportCountries) && fv.exportCountries.length > 0);

//     const bank = fv.bankDetails || null;

//     return (
//       <View className="mx-4" style={{ rowGap: 14 }}>
//         {/* ── SECTION 1 · Company Details ─────────────────────────── */}
//         <SectionCard icon={Briefcase} title="Company Details">
//           <InfoRow label="Company Name" value={fv.companyName} />
//           {hasVal(fv.companyType) ? (
//             <View className="py-3 border-b border-slate-100">
//               <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Company Type</AppText>
//               <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: brand[50] }}>
//                 <AppText variant="labelSm" color={brand[600]}>
//                   {capitalizeWords(String(fv.companyType).replace(/_/g, ' ').toLowerCase())}
//                 </AppText>
//               </View>
//             </View>
//           ) : null}
//           {hasVal(bt) ? <InfoRow label="Business Type" value={getDetailBusinessTypeLabel(bt)} /> : null}
//           {hasVal(fv.factoryOwnershipType) ? (
//             <InfoRow label="Factory Ownership Type" value={getOwnershipTypeLabel(fv.factoryOwnershipType)} />
//           ) : null}
//           <InfoRow label="Year Established" value={fv.establishedYear} />
//           {fv.gstNumber ? <InfoRow label="GST Number" value={fv.gstNumber} /> : null}
//           {!fv.gstNumber ? <InfoRow label="Vendor Type" value="Unregistered — identified by email" /> : null}
//           {fv.companyIdNumber ? <InfoRow label={getDetailCompanyIdLabel(bt)} value={fv.companyIdNumber} /> : null}
//           {fv.iecCode ? <InfoRow label="IEC Code" value={fv.iecCode} /> : null}
//           <InfoRow label={bt === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number'} value={fv.panNumber} />
//           {fv.aadhaarNumber ? <InfoRow label="Aadhaar Number" value={fv.aadhaarNumber} /> : null}
//           {hasVal(fv.website) ? (
//             <View className="py-3 border-b border-slate-100">
//               <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Website</AppText>
//               {websiteSafe ? (
//                 <TouchableOpacity onPress={() => Linking.openURL(websiteSafe)} className="flex-row items-center">
//                   <Globe size={14} color={brand[500]} />
//                   <AppText variant="bodySm" color={brand[600]} style={{ marginLeft: 6, flexShrink: 1, textDecorationLine: 'underline' }}>{fv.website}</AppText>
//                 </TouchableOpacity>
//               ) : (
//                 <View className="flex-row items-center">
//                   <Globe size={14} color="#94a3b8" />
//                   <AppText variant="bodySm" color={colors.text} style={{ marginLeft: 6, flexShrink: 1 }}>{fv.website}</AppText>
//                 </View>
//               )}
//             </View>
//           ) : null}
//           {companyLogo ? (
//             <View className="pt-3">
//               <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Company Logo</AppText>
//               <TouchableOpacity onPress={() => openDoc(companyLogo, 'Company Logo')} activeOpacity={0.85}>
//                 <Image
//                   source={{ uri: companyLogo }}
//                   style={{ width: 96, height: 96, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}
//                   resizeMode="cover"
//                 />
//               </TouchableOpacity>
//             </View>
//           ) : null}
//           {companyDocs.length > 0 ? (
//             <View className="pt-3">
//               <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>
//                 Registration Documents ({companyDocs.length})
//               </AppText>
//               <View className="flex-row flex-wrap" style={{ columnGap: 10, rowGap: 12 }}>
//                 {companyDocs.map((doc: any, idx: number) => (
//                   <DocTile
//                     key={doc.id || idx}
//                     url={doc.documentUrl}
//                     name={doc.name || DOC_TYPE_LABELS[doc.type] || 'Document'}
//                     typeLabel={DOC_TYPE_LABELS[doc.type] || doc.type}
//                     onOpen={() => openDoc(doc.documentUrl, doc.name)}
//                   />
//                 ))}
//               </View>
//             </View>
//           ) : null}
//         </SectionCard>

//         {/* ── SECTION 2 · Contact & Communication Details ─────────── */}
//         {s2Fields ? (
//           <SectionCard icon={Phone} title="Contact & Communication Details">
//             <InfoRow label="Primary Phone" value={fv.businessPhone} />
//             <InfoRow label="Secondary Phone" value={fv.phoneNumber2} />
//             <InfoRow label="Primary Email" value={fv.businessEmail} />
//             <InfoRow label="Secondary Email" value={fv.businessEmail2} />
//             <InfoRow
//               label="Local Landline Number"
//               value={formatLocalLandline({ countryCode: '+91', std: fv.localLandlineStd, number: fv.landlineNumber })}
//             />
//             <InfoRow label="International Landline Number" value={formatIntlLandline(fv.intlLandline)} />
//             <InfoRow label="Address Line 1" value={fv.businessAddress} />
//             <InfoRow label="Address Line 2" value={fv.addressLine2} />
//             <InfoRow label="Address Line 3" value={fv.addressLine3} />
//             <InfoRow label="Landmark" value={fv.landmark} />
//             <InfoRow label="City" value={fv.businessCity} />
//             <InfoRow label="State" value={fv.businessState} />
//             <InfoRow label="ZIP / Postal Code" value={fv.businessZipCode} />
//             <InfoRow label="Country" value={fv.businessCountry} />
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 3 · Owner Profile ───────────────────────────── */}
//         {s3Fields || s3Custom ? (
//           <SectionCard icon={UserCircle} title="Owner Profile">
//             <View className="flex-row items-start mb-1">
//               {fv.ownerPhoto ? (
//                 <TouchableOpacity onPress={() => openDoc(fv.ownerPhoto, 'Owner Photo')} activeOpacity={0.85}>
//                   <Image
//                     source={{ uri: fv.ownerPhoto }}
//                     style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}
//                     resizeMode="cover"
//                   />
//                 </TouchableOpacity>
//               ) : (
//                 <View className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center">
//                   <UserCircle size={40} color="#cbd5e1" />
//                 </View>
//               )}
//               <View className="flex-1 ml-3">
//                 <InfoRow label="Owner Full Name" value={ownerFullName} />
//                 <InfoRow label="Designation" value={fv.designation} />
//                 <InfoRow label="Primary Phone" value={fv.ownerPhone} />
//                 <InfoRow label="Secondary Phone" value={fv.ownerPhone2} />
//               </View>
//             </View>
//             <InfoRow label="Primary Email" value={fv.ownerEmail} />
//             <InfoRow label="Secondary Email" value={fv.ownerEmail2} />
//             <InfoRow label="Local Landline" value={ownerLocalLL} />
//             <InfoRow label="International Landline" value={ownerIntlLL} />
//             <InfoRow label="Business Start Date" value={fv.businessStartDate ? formatDate(fv.businessStartDate) : null} />
//             <InfoRow
//               label="Number of Employees"
//               value={fv.employeeCount ? getDetailEmployeeCountLabel(fv.employeeCount) : null}
//             />
//             {Array.isArray(fv.additionalOwners) && fv.additionalOwners.length > 0 ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Additional Owners</AppText>
//                 <View style={{ rowGap: 10 }}>
//                   {fv.additionalOwners.map((owner: any, idx: number) => (
//                     <View
//                       key={idx}
//                       className="border border-slate-200 rounded-xl p-3"
//                       style={{ backgroundColor: '#f8fafc' }}
//                     >
//                       <View className="flex-row items-center mb-1.5">
//                         {owner.photo ? (
//                           <TouchableOpacity
//                             onPress={() => openDoc(owner.photo, `Owner ${idx + 2} Photo`)}
//                             activeOpacity={0.85}
//                           >
//                             <Image
//                               source={{ uri: owner.photo }}
//                               style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0' }}
//                               resizeMode="cover"
//                             />
//                           </TouchableOpacity>
//                         ) : (
//                           <View className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 items-center justify-center">
//                             <UserCircle size={24} color="#cbd5e1" />
//                           </View>
//                         )}
//                         <AppText variant="titleMd" color={colors.text} style={{ marginLeft: 10 }}>Owner {idx + 2}</AppText>
//                       </View>
//                       <InfoRow
//                         label="Name"
//                         value={buildFullName(owner.title, owner.firstName, owner.middleName, owner.lastName, owner.name)}
//                       />
//                       <InfoRow label="Designation" value={resolveOwnerDesignation(owner.designation)} />
//                       <InfoRow label="Primary Email" value={owner.email} />
//                       <InfoRow label="Secondary Email" value={owner.email2} />
//                       <InfoRow label="Primary Phone" value={owner.phone} />
//                       <InfoRow label="Secondary Phone" value={owner.phone2} />
//                       <InfoRow
//                         label="Local Landline"
//                         value={formatLocalLandline({
//                           countryCode: '+91',
//                           std: owner.localLandlineStd,
//                           number: owner.localLandline || owner.landline,
//                         })}
//                       />
//                       <InfoRow label="International Landline" value={formatIntlLandline(owner.intlLandline)} />
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ) : null}
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 4 · Legal Address & Factory Site ────────────── */}
//         {s4Fields || s4Custom ? (
//           <SectionCard icon={Warehouse} title="Legal Address & Factory Site">
//             {hasVal(fv.factoryOwnershipType) ? (
//               <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(fv.factoryOwnershipType)} />
//             ) : null}
//             <InfoRow label="Warehousing Capacity" value={fv.factorySize} />
//             <InfoRow label="Address Line 1" value={fv.factoryAddress} />
//             <InfoRow label="Address Line 2" value={fv.addressLine2} />
//             <InfoRow label="Address Line 3" value={fv.addressLine3} />
//             <InfoRow label="Landmark" value={fv.landmark} />
//             <InfoRow label="City" value={fv.factoryCity} />
//             <InfoRow label="State" value={fv.factoryState} />
//             <InfoRow label="ZIP / Postal Code" value={fv.factoryZipCode} />
//             <InfoRow label="Country" value={fv.factoryCountry} />

//             {legalSiteImages.length > 0 ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>
//                   Factory Site Images ({legalSiteImages.length})
//                 </AppText>
//                 {imageStrip(legalSiteImages)}
//               </View>
//             ) : null}

//             {hasWarehouseSection ? (
//               <View className="pt-4 mt-2 border-t border-slate-100">
//                 <AppText variant="titleMd" color={colors.text} style={{ marginBottom: 8 }}>Warehouse Address</AppText>
//                 {warehouseSameAsFactory ? (
//                   <>
//                     <View
//                       className="flex-row items-start p-3 rounded-xl border border-brand-100"
//                       style={{ backgroundColor: brand[50] }}
//                     >
//                       <MapPin size={16} color={brand[500]} style={{ marginTop: 1 }} />
//                       <AppText variant="bodySm" color={brand[700]} style={{ marginLeft: 8, flex: 1 }}>
//                         Warehouse Address is the same as the Legal Address & Factory Site above.
//                       </AppText>
//                     </View>
//                     {fv.mapLink ? (
//                       <View className="pt-3">
//                         <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Map / Location Link</AppText>
//                         <TouchableOpacity
//                           onPress={() => {
//                             const u = safeExternalUrl(fv.mapLink);
//                             if (u) Linking.openURL(u);
//                           }}
//                           className="flex-row items-center"
//                         >
//                           <Globe size={14} color={brand[500]} />
//                           <AppText variant="bodySm" color={brand[600]} style={{ marginLeft: 6, textDecorationLine: 'underline' }}>View Map</AppText>
//                         </TouchableOpacity>
//                       </View>
//                     ) : null}
//                   </>
//                 ) : (
//                   <>
//                     <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(fv.ownershipType) || '—'} />
//                     <InfoRow label="Warehousing Capacity" value={fv.warehouseSize || '—'} />
//                     <InfoRow label="Address Line 1" value={fv.warehouseAddress} />
//                     <InfoRow label="Address Line 2" value={fv.warehouseAddressLine2} />
//                     <InfoRow label="Address Line 3" value={fv.warehouseAddressLine3} />
//                     <InfoRow label="Landmark" value={fv.warehouseLandmark} />
//                     <InfoRow label="City" value={fv.warehouseCity} />
//                     <InfoRow label="State" value={fv.warehouseState} />
//                     <InfoRow label="ZIP / Postal Code" value={fv.warehouseZipCode} />
//                     <InfoRow label="Country" value={fv.warehouseCountry} />
//                     {fv.mapLink ? (
//                       <View className="py-3 border-b border-slate-100">
//                         <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Map / Location Link</AppText>
//                         <TouchableOpacity
//                           onPress={() => {
//                             const u = safeExternalUrl(fv.mapLink);
//                             if (u) Linking.openURL(u);
//                           }}
//                           className="flex-row items-center"
//                         >
//                           <Globe size={14} color={brand[500]} />
//                           <AppText variant="bodySm" color={brand[600]} style={{ marginLeft: 6, textDecorationLine: 'underline' }}>View Map</AppText>
//                         </TouchableOpacity>
//                       </View>
//                     ) : null}
//                   </>
//                 )}
//               </View>
//             ) : null}

//             {warehousePhotoImages.length > 0 ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>
//                   Warehouse Images ({warehousePhotoImages.length})
//                 </AppText>
//                 {imageStrip(warehousePhotoImages)}
//               </View>
//             ) : null}
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 5 · Vendor Type & Products ──────────────────── */}
//         {s5 ? (
//           <SectionCard icon={Package} title="Vendor Type & Products">
//             {vendorTypeChips.length > 0 ? (
//               <ChipGroup label="Vendor Type" items={vendorTypeChips} bg="#f1f5f9" text="#334155" />
//             ) : null}
//             {Array.isArray(fv.productCategories) && fv.productCategories.length > 0 ? (
//               <ChipGroup label="Product Categories" items={fv.productCategories} bg={brand[50]} text={brand[600]} />
//             ) : null}
//             {hasVal(fv.categoryRemarks) ? <InfoRow label="General Remarks" value={fv.categoryRemarks} /> : null}
//             {productPhotos.length > 0 ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Product Photos ({productPhotos.length})</AppText>
//                 {imageStrip(productPhotos)}
//               </View>
//             ) : null}
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 6 · Manufacturing Facilities ────────────────── */}
//         {hasFacilitiesData ? (
//           <SectionCard icon={Factory} title="Manufacturing Facilities">
//             {enabledList.length > 0 ? (
//               <View className="pb-1">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Active Facilities</AppText>
//                 <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
//                   {enabledList.map((f, i) => (
//                     <View key={i} className="rounded-lg px-2.5 py-1" style={{ backgroundColor: brand[50] }}>
//                       <AppText variant="labelSm" color={brand[600]}>{f}</AppText>
//                     </View>
//                   ))}
//                 </View>
//               </View>
//             ) : null}
//             {facilityCards.map(({ fid, rows, details }) => (
//               <View key={fid} className="pt-3 mt-2 border-t border-slate-100">
//                 <AppText variant="titleMd" color={colors.text} style={{ marginBottom: 4, textTransform: 'uppercase' }}>
//                   {(FACILITY_TITLE[fid] || FACILITY_META[fid]?.label || capitalizeFirst(fid))} Facility Details
//                 </AppText>
//                 {rows.map(({ key, label, unit }) => (
//                   <InfoRow key={key} label={label} value={withUnit((details || {})[key], unit)} />
//                 ))}
//               </View>
//             ))}
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 7 · Certifications & Quality Control ────────── */}
//         {s7Fields || certs.length > 0 ? (
//           <SectionCard icon={Award} title="Certifications & Quality Control">
//             <InfoRow label="Compliance Standards" value={fv.complianceStandards} />
//             <InfoRow label="Packaging Capabilities" value={fv.packagingCapabilities} />
//             <InfoRow label="Logistics Partners" value={fv.logisticsPartners} />
//             {Array.isArray(fv.shippingMethods) && fv.shippingMethods.length > 0 ? (
//               <ChipGroup label="Shipping Methods" items={fv.shippingMethods} bg="#f1f5f9" text="#334155" />
//             ) : null}
//             {certs.length > 0 ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Catalog Certifications ({certs.length})</AppText>
//                 <View style={{ rowGap: 10 }}>
//                   {certs.map((cert: any, idx: number) => {
//                     const status = cert.expiryDate ? certExpiryStatus(cert.expiryDate) : null;
//                     return (
//                       <View
//                         key={cert.id || idx}
//                         className="border border-slate-200 rounded-xl p-3"
//                         style={{ backgroundColor: '#f8fafc' }}
//                       >
//                         <View className="flex-row items-center justify-between mb-1">
//                           <View className="rounded px-2.5 py-0.5" style={{ backgroundColor: brand[50], flexShrink: 1 }}>
//                             <AppText variant="labelSm" color={brand[600]} numberOfLines={1}>{cert.name}</AppText>
//                           </View>
//                           {cert.documentUrl ? (
//                             <TouchableOpacity
//                               onPress={() => openDoc(cert.documentUrl, cert.name)}
//                               className="flex-row items-center rounded-lg px-2.5 py-1"
//                               style={{ backgroundColor: brand[50], flexShrink: 0, marginLeft: 8 }}
//                             >
//                               <Eye size={13} color={brand[600]} />
//                               <AppText variant="labelSm" color={brand[600]} style={{ marginLeft: 4 }} numberOfLines={1}>View</AppText>
//                             </TouchableOpacity>
//                           ) : null}
//                         </View>
//                         <InfoRow label="Issued By" value={cert.issuedBy} />
//                         <InfoRow label="Certificate #" value={cert.certificateNumber} />
//                         {cert.expiryDate ? (
//                           <View className="pt-2">
//                             <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Expiry Date</AppText>
//                             <View className="flex-row items-center flex-wrap" style={{ columnGap: 6, rowGap: 4 }}>
//                               <Calendar size={13} color="#64748b" />
//                               <AppText variant="bodySm" color={colors.text}>{formatDate(cert.expiryDate)}</AppText>
//                               {status ? (
//                                 <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.bg }}>
//                                   <AppText variant="labelSm" color={status.text} style={{ fontSize: 10, lineHeight: 13 }}>{status.label}</AppText>
//                                 </View>
//                               ) : null}
//                             </View>
//                           </View>
//                         ) : (
//                           <AppText variant="bodySm" color={colors.textFaint} style={{ paddingTop: 8 }}>No expiry date set</AppText>
//                         )}
//                       </View>
//                     );
//                   })}
//                 </View>
//               </View>
//             ) : null}
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 8 · Contact & Trade Information ──────────────── */}
//         {s8Fields || contactPersons.length > 0 ? (
//           <SectionCard icon={FileText} title="Contact & Trade Information">
//             {fv.importExperience !== undefined && fv.importExperience !== null ? (
//               <InfoRow label="Import Experience" value={fv.importExperience ? 'Yes' : 'No'} />
//             ) : null}
//             {fv.exportExperience !== undefined && fv.exportExperience !== null ? (
//               <InfoRow label="Export Experience" value={fv.exportExperience ? 'Yes' : 'No'} />
//             ) : null}
//             {Array.isArray(fv.importCountries) && fv.importCountries.length > 0 ? (
//               <View className="pt-3 border-t border-slate-100 mt-1">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Import Countries</AppText>
//                 {countryChips(fv.importCountries)}
//               </View>
//             ) : null}
//             {Array.isArray(fv.exportCountries) && fv.exportCountries.length > 0 ? (
//               <View className="pt-3 border-t border-slate-100 mt-1">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Export Countries</AppText>
//                 {countryChips(fv.exportCountries)}
//               </View>
//             ) : null}
//             {contactPersons.length > 0 ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Contact Persons ({contactPersons.length})</AppText>
//                 <View style={{ rowGap: 10 }}>
//                   {contactPersons.map((contact: any, idx: number) => {
//                     const nameParts = [contact.firstName, contact.middleName, contact.lastName].filter(Boolean);
//                     const fullName = nameParts.length > 0 ? nameParts.join(' ') : contact.name || '';
//                     const designation = contact.designation === 'Others' ? contact.customDesignation : contact.designation;
//                     const department = contact.department === 'Others' ? contact.customDepartment : contact.department;
//                     const localLL = formatLocalLandline({
//                       countryCode: '+91',
//                       std: contact.localLandlineStd,
//                       number: contact.localLandline || contact.landline,
//                     });
//                     const intlLL = formatIntlLandline(
//                       contact.intlLandlineNumber
//                         ? `+${contact.intlLandlineCountryCode || ''} ${contact.intlLandlineStd || ''} ${contact.intlLandlineNumber}`.trim()
//                         : contact.intlLandline,
//                     );
//                     return (
//                       <View
//                         key={idx}
//                         className="border border-slate-200 rounded-xl p-3"
//                         style={{ backgroundColor: '#f8fafc' }}
//                       >
//                         {contact.photo ? (
//                           <View className="items-center mb-2">
//                             <TouchableOpacity
//                               onPress={() => openDoc(contact.photo, fullName || 'Contact')}
//                               activeOpacity={0.85}
//                             >
//                               <Image
//                                 source={{ uri: contact.photo }}
//                                 style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#e2e8f0' }}
//                                 resizeMode="cover"
//                               />
//                             </TouchableOpacity>
//                           </View>
//                         ) : null}
//                         <AppText variant="titleMd" color={colors.text} style={{ marginBottom: 4 }}>{contact._label}</AppText>
//                         <InfoRow label="Name" value={fullName} />
//                         <InfoRow label="Designation" value={designation} />
//                         <InfoRow label="Department" value={department} />
//                         <InfoRow label="Primary Email" value={contact.email1 || contact.email} />
//                         <InfoRow label="Secondary Email" value={contact.email2} />
//                         <InfoRow label="Primary Phone" value={contact.phone1 || contact.phone} />
//                         <InfoRow label="Secondary Phone" value={contact.phone2} />
//                         <InfoRow label="Local Landline Number" value={localLL} />
//                         <InfoRow label="International Landline Number" value={intlLL} />
//                       </View>
//                     );
//                   })}
//                 </View>
//               </View>
//             ) : null}
//           </SectionCard>
//         ) : null}

//         {/* ── SECTION 9 · Banking Details ─────────────────────────── */}
//         {bank && bank.bankName ? (
//           <SectionCard icon={Landmark} title="Banking Details">
//             <InfoRow label="Bank Name" value={bank.bankName} />
//             <InfoRow
//               label="Account Number"
//               value={
//                 bank.accountNumber
//                   ? bank.accountNumber.length > 4
//                     ? `**** **** ${bank.accountNumber.slice(-4)}`
//                     : bank.accountNumber
//                   : null
//               }
//             />
//             <InfoRow label="IFSC Code" value={bank.ifscCode} />
//             <InfoRow label="SWIFT / BIC Code" value={bank.swiftCode} />
//             <InfoRow label="IBAN Number" value={bank.iban} />
//             <InfoRow label="Account Type" value={bank.accountType} />
//             <InfoRow label="Account Holder Name" value={bank.accountHolderName} />
//             <InfoRow label="Branch Name" value={bank.branchName} />
//             <InfoRow label="Branch Address" value={bank.branchAddress} />
//             {bank.isVerified ? (
//               <View className="pt-3">
//                 <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 6 }}>Verification Status</AppText>
//                 <View
//                   className="flex-row items-center self-start rounded-full px-2.5 py-1"
//                   style={{ backgroundColor: '#d1fae5' }}
//                 >
//                   <CheckCircle size={13} color="#065f46" />
//                   <AppText variant="labelSm" color="#065f46" style={{ marginLeft: 4 }}>Verified</AppText>
//                 </View>
//               </View>
//             ) : null}
//           </SectionCard>
//         ) : null}
//       </View>
//     );
//   };

//   return (
//     <View className="flex-1 bg-slate-50">
//       <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
//       <Header
//         onBack={() => router.back()}
//         insetsTop={insets.top}
//       />

//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{ paddingBottom: 100 }}
//         showsVerticalScrollIndicator={false}
//         refreshControl={
//           <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[500]} colors={[brand[500]]} />
//         }
//       >
//         {/* Top meta row: derived main + inspection status + QC assignee */}
//         {/* Top meta row: derived main + inspection status + QC assignee */}
// <View className="px-4 pt-4 flex-row flex-wrap items-center" style={{ rowGap: 8, columnGap: 8 }}>
//   {currentMainStatus ? (
//     <View
//       className="flex-row items-center rounded-full px-4 py-2"
//       style={{
//         backgroundColor: mainStatusStyle(currentMainStatus).bg,
//         borderWidth: 1.5,
//         borderColor: `${mainStatusStyle(currentMainStatus).text}33`,
//         shadowColor: mainStatusStyle(currentMainStatus).text,
//         shadowOpacity: 0.15,
//         shadowRadius: 6,
//         shadowOffset: { width: 0, height: 2 },
//         elevation: 2,
//       }}
//     >
//       <View
//         className="rounded-full mr-2"
//         style={{ width: 8, height: 8, backgroundColor: mainStatusStyle(currentMainStatus).text }}
//       />
//       <Text
//         style={{
//           color: mainStatusStyle(currentMainStatus).text,
//           fontSize: 12,
//           fontWeight: '500',
//           letterSpacing: 0.1,
//         }}
//       >
//         {currentMainStatus}
//       </Text>
//     </View>
//   ) : null}

//   {currentInspectionStatus ? (
//     <View
//       className="flex-row items-center rounded-full px-4 py-2"
//       style={{
//         backgroundColor: inspectionStatusStyle(currentInspectionStatus).bg,
//         borderWidth: 1.5,
//         borderColor: `${inspectionStatusStyle(currentInspectionStatus).text}33`,
//         shadowColor: inspectionStatusStyle(currentInspectionStatus).text,
//         shadowOpacity: 0.15,
//         shadowRadius: 6,
//         shadowOffset: { width: 0, height: 2 },
//         elevation: 2,
//       }}
//     >
//       <View
//         className="rounded-full mr-2"
//         style={{ width: 8, height: 8, backgroundColor: inspectionStatusStyle(currentInspectionStatus).text }}
//       />
//       <Text
//         style={{
//           color: inspectionStatusStyle(currentInspectionStatus).text,
//           fontSize: 12,
//           fontWeight: '500',
//           letterSpacing: 0.1,
//         }}
//       >
//         Inspection: {currentInspectionStatus}
//       </Text>
//     </View>
//   ) : null}

//   {fullVendor?.assignedQc?.name ? (
//     <View className="bg-slate-100 rounded-full px-3.5 py-1.5 border border-slate-200">
//       <AppText variant="labelMd" color={colors.textSecondary} style={{ fontWeight: '900' }}>
//         QC: {fullVendor.assignedQc.name}
//       </AppText>
//     </View>
//   ) : null}
// </View>
//         {isCompleted ? (
//           /* Compact completed view — assignment done, full vendor profile hidden */
//           <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-4">
//             <CompletedRow icon={<Factory size={18} color={brand[600]} />} label="Vendor Name" value={companyName} />
//             <CompletedRow icon={<MapPin size={18} color={brand[600]} />} label="Location" value={location} />
//             <View className="flex-row items-center py-2.5">
//               <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center mr-3">
//                 <BarChart3 size={18} color={brand[600]} />
//               </View>
//               <View className="flex-1">
//                 <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
//                   Inspection Status
//                 </AppText>
//                 <View
//                   className="self-start rounded-full px-2.5 py-0.5 mt-1"
//                   style={{ backgroundColor: inspectionStatusStyle(currentInspectionStatus).bg }}
//                 >
//                   <AppText variant="labelSm" color={inspectionStatusStyle(currentInspectionStatus).text}>
//                     {currentInspectionStatus}
//                   </AppText>
//                 </View>
//               </View>
//             </View>
//             <CompletedRow
//               icon={<Calendar size={18} color={brand[600]} />}
//               label="Submitted Date"
//               value={fullVendor?.submittedAt ? formatDate(fullVendor.submittedAt) : '—'}
//             />
//             <CompletedRow
//               icon={<CheckCircle size={18} color={brand[600]} />}
//               label="Approved Date"
//               value={fullVendor?.approvedAt ? formatDate(fullVendor.approvedAt) : '—'}
//             />
//           </View>
//         ) : (
//         <>
//         {/* Brand summary card */}
//         <View className="mx-4 mt-4 rounded-2xl p-5" style={{ backgroundColor: brand[500] }}>
//           <SummaryRow
//             icon={<Factory size={18} color="#ffffff" />}
//             label="Vendor"
//             value={companyName}
//           />
//           <SummaryRow
//             icon={<MapPin size={18} color="#ffffff" />}
//             label="Location"
//             value={location}
//           />
//           <SummaryRow
//             icon={<Calendar size={18} color="#ffffff" />}
//             label="Last Inspection"
//             value={stats?.lastInspectionDate ? formatDate(stats.lastInspectionDate) : 'No inspections yet'}
//           />
//           <SummaryRow
//             icon={<BarChart3 size={18} color="#ffffff" />}
//             label="Total Inspections"
//             value={String(stats?.totalInspections ?? 0)}
//             isLast
//           />
//         </View>

//         {/* Start / Continue CTA */}
//         {firstUpcoming ? (
//           <View className="mx-4 mt-3">
//             <Button
//               onPress={handleStartInspectionFlow}
//               variant="primary"
//               icon={Play}
//               fullWidth
//               label={`${isContinuing ? 'Continue' : 'Start Now'}${firstUpcoming.poNumber ? ` (${firstUpcoming.poNumber})` : ''}`}
//             />
//           </View>
//         ) : null}

//         {/* Tabs */}
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           className="mt-4 mb-3"
//           contentContainerStyle={{ paddingHorizontal: 12 }}
//         >
//           {TABS.map((tab) => {
//             const isActive = activeTab === tab.id;
//             return (
//               <TouchableOpacity
//                 key={tab.id}
//                 onPress={() => setActiveTab(tab.id)}
//                 activeOpacity={0.7}
//                 className={`mx-1 px-4 py-2 rounded-full ${
//                   isActive ? 'bg-brand-500' : 'bg-white border border-slate-200'
//                 }`}
//               >
//                 <Text
//                   className={`text-sm font-bold ${
//                     isActive ? 'text-white' : 'text-slate-600'
//                   }`}
//                 >
//                   {tab.label}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//         </ScrollView>

//         {activeTab === 'overview' ? renderOverview() : null}

//         {activeTab === 'history' ? (
//           <View className="mx-4" style={{ rowGap: 16 }}>
//             {/* ── Inspection History ────────────────────────────────────── */}
//             <SectionCard
//               icon={FileText}
//               title="Inspection History"
//               subtitle={
//                 recentInspections.length === 0
//                   ? 'Completed reports will appear here'
//                   : historyMeta && historyMeta.total > 0
//                     ? `Showing ${historyMeta.returned} of ${historyMeta.total}`
//                     : `${recentInspections.length} completed`
//               }
//               right={
//                 recentInspections.length > 0 ? (
//                   <View className="rounded-full bg-white px-2.5 py-0.5">
//                     <AppText variant="labelSm" color={brand[600]}>
//                       {historyMeta?.total ?? recentInspections.length}
//                     </AppText>
//                   </View>
//                 ) : undefined
//               }
//               bodyPadded={false}
//             >

//               {/* Inspection cards */}
//               {recentInspections.length > 0 ? (
//                 <View className="p-3" style={{ gap: 10 }}>
//                   {recentInspections.map((insp: any) => {
//                     const badge = getInspectionRowBadge(insp);
//                     const scoreNum = typeof insp.score === 'number' ? insp.score : null;
//                     const scoreColor =
//                       scoreNum === null
//                         ? '#94A3B8'
//                         : scoreNum >= 8
//                           ? '#059669'
//                           : scoreNum >= 6
//                             ? '#D97706'
//                             : '#DC2626';
//                     const scoreBg =
//                       scoreNum === null
//                         ? '#F1F5F9'
//                         : scoreNum >= 8
//                           ? '#ECFDF5'
//                           : scoreNum >= 6
//                             ? '#FFFBEB'
//                             : '#FEF2F2';
//                     const isPassed = badge.label === 'Passed' || badge.label === 'Completed';
//                     const isFailed = badge.label === 'Failed' || badge.label === 'Rejected';
//                     const dateLabel =
//                       formatDate(insp.scheduledDate) || insp.scheduledDate || '';

//                     return (
//                       <TouchableOpacity
//                         key={insp.id}
//                         activeOpacity={0.7}
//                         accessibilityRole="button"
//                         accessibilityLabel={`Inspection ${insp.poNumber}, ${insp.clientName}, ${badge.label}`}
//                         className="rounded-xl overflow-hidden"
//                         style={{
//                           backgroundColor: '#FFFFFF',
//                           borderWidth: 1,
//                           borderColor: '#E2E8F0',
//                         }}
//                       >
//                         {/* Card content */}
//                         <View className="flex-row">
//                           {/* Left accent bar */}
//                           <View
//                             style={{
//                               width: 4,
//                               backgroundColor: badge.text,
//                               borderTopLeftRadius: 12,
//                               borderBottomLeftRadius: 12,
//                             }}
//                           />

//                           {/* Main content */}
//                           <View className="flex-1 p-3.5" style={{ gap: 10 }}>
//                             {/* Top row: PO + Date */}
//                             <View className="flex-row items-center justify-between">
//                               <View
//                                 className="rounded-md px-2 py-0.5"
//                                 style={{ backgroundColor: '#F1F5F9' }}
//                               >
//                                 <Text className="text-[11px] font-bold font-mono text-slate-600">
//                                   {insp.poNumber || '—'}
//                                 </Text>
//                               </View>
//                               <View className="flex-row items-center" style={{ gap: 4 }}>
//                                 <Calendar size={11} color="#94A3B8" />
//                                 <Text className="text-[11px] text-slate-400 font-medium">
//                                   {dateLabel}
//                                 </Text>
//                               </View>
//                             </View>

//                             {/* Client name */}
//                             <Text
//                               className="text-sm font-bold text-slate-900"
//                               numberOfLines={1}
//                               style={{ lineHeight: 20 }}
//                             >
//                               {insp.clientName}
//                             </Text>

//                             {/* Bottom row: Status badge + Score */}
//                             <View className="flex-row items-center justify-between">
//                               {/* Lifecycle-aware status badge */}
//                               <View
//                                 className="flex-row items-center rounded-full px-2.5 py-1"
//                                 style={{ backgroundColor: badge.bg, gap: 4 }}
//                               >
//                                 {isPassed ? (
//                                   <CheckCircle size={12} color={badge.text} />
//                                 ) : isFailed ? (
//                                   <AlertCircle size={12} color={badge.text} />
//                                 ) : (
//                                   <Clock size={12} color={badge.text} />
//                                 )}
//                                 <Text
//                                   className="text-[10px] font-bold uppercase"
//                                   style={{ color: badge.text }}
//                                 >
//                                   {badge.label}
//                                 </Text>
//                               </View>

//                               {/* Score chip */}
//                               {scoreNum !== null ? (
//                                 <View
//                                   className="flex-row items-center rounded-lg px-2.5 py-1"
//                                   style={{ backgroundColor: scoreBg, gap: 6 }}
//                                 >
//                                   {/* Mini score ring */}
//                                   <View
//                                     className="w-5 h-5 rounded-full items-center justify-center"
//                                     style={{
//                                       borderWidth: 2,
//                                       borderColor: scoreColor,
//                                     }}
//                                   >
//                                     <Text
//                                       className="font-extrabold"
//                                       style={{
//                                         color: scoreColor,
//                                         fontSize: 8,
//                                         lineHeight: 10,
//                                       }}
//                                     >
//                                       {scoreNum}
//                                     </Text>
//                                   </View>
//                                   <Text
//                                     className="text-[11px] font-bold"
//                                     style={{ color: scoreColor }}
//                                   >
//                                     / 10
//                                   </Text>
//                                 </View>
//                               ) : null}
//                             </View>

//                             {/* Lifecycle timestamps: Scheduled / Started / Completed */}
//                             <View className="pt-1 border-t border-slate-100" style={{ rowGap: 3 }}>
//                               <Text className="text-[10px] text-slate-500">
//                                 Scheduled: {insp.scheduledDate || '—'}
//                                 {insp.scheduledTime ? ` at ${formatTime12(insp.scheduledTime)}` : ''}
//                               </Text>
//                               <Text className="text-[10px] text-slate-500">
//                                 Started: {insp.startedAt ? formatDateTime(insp.startedAt) : '—'}
//                               </Text>
//                               <Text className="text-[10px] text-slate-500">
//                                 Completed: {(insp.completedAt || insp.submittedAt) ? formatDateTime(insp.completedAt || insp.submittedAt) : '—'}
//                               </Text>
//                             </View>
//                           </View>
//                         </View>
//                       </TouchableOpacity>
//                     );
//                   })}
//                 </View>
//               ) : (
//                 /* Empty state */
//                 <View className="items-center py-12" style={{ gap: 8 }}>
//                   <View
//                     className="w-14 h-14 rounded-2xl items-center justify-center"
//                     style={{ backgroundColor: '#F1F5F9' }}
//                   >
//                     <FileText size={24} color="#94A3B8" />
//                   </View>
//                   <Text className="text-sm font-bold text-slate-900">No completed inspections yet.</Text>
//                 </View>
//               )}

//               {/* Load more */}
//               {historyMeta?.hasMore && (
//                 <TouchableOpacity
//                   onPress={handleLoadMoreHistory}
//                   disabled={loading || historyLimit >= 50}
//                   activeOpacity={0.7}
//                   accessibilityRole="button"
//                   accessibilityLabel="Load more inspections"
//                   className="border-t border-slate-100 flex-row items-center justify-center"
//                   style={{
//                     paddingVertical: 14,
//                     opacity: loading || historyLimit >= 50 ? 0.5 : 1,
//                   }}
//                 >
//                   <RefreshCw size={14} color={brand[500]} />
//                   <AppText variant="titleMd" color={brand[600]} style={{ marginLeft: 8 }}>
//                     {historyLimit >= 50 ? 'Showing max 50' : 'Load older inspections'}
//                   </AppText>
//                 </TouchableOpacity>
//               )}
//             </SectionCard>
//           </View>
//         ) : null}

//         {activeTab === 'upcoming' ? (
//           <View className="mx-4">
//             <SectionCard icon={Calendar} title="Upcoming Inspections">
//               {actualUpcoming.length > 0 ? (
//                 <View style={{ rowGap: 10 }}>
//                   {actualUpcoming.map((insp: any) => {
//                     const prio = priorityStyle(insp.priority);
//                     return (
//                       <View key={insp.id} className="border border-slate-200 rounded-xl p-3.5">
//                         <View className="flex-row items-center justify-between mb-2">
//                           <View className="rounded px-2 py-0.5" style={{ backgroundColor: brand[50] }}>
//                             <Text className="text-xs font-mono font-bold" style={{ color: brand[600] }}>
//                               {insp.poNumber}
//                             </Text>
//                           </View>
//                           {insp.priority ? (
//                             <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: prio.bg }}>
//                               <Text className="text-[10px] font-bold uppercase" style={{ color: prio.text }}>
//                                 {insp.priority}
//                               </Text>
//                             </View>
//                           ) : null}
//                         </View>
//                         <Text className="text-sm font-semibold text-slate-900 mb-2" numberOfLines={1}>
//                           {insp.clientName}
//                         </Text>
//                         <View className="flex-row" style={{ columnGap: 16 }}>
//                           <View className="flex-row items-center">
//                             <Calendar size={12} color="#64748b" />
//                             <Text className="text-xs text-slate-600 ml-1">
//                               {formatDate(insp.scheduledDate) || insp.scheduledDate}
//                             </Text>
//                           </View>
//                           <View className="flex-row items-center">
//                             <Clock size={12} color="#64748b" />
//                             <Text className="text-xs text-slate-600 ml-1">{formatTime12(insp.scheduledTime)}</Text>
//                           </View>
//                         </View>
//                       </View>
//                     );
//                   })}
//                 </View>
//               ) : (
//                 <EmptyCard icon={<Calendar size={26} color="#94a3b8" />} title="No pending inspections" sub="" />
//               )}
//             </SectionCard>
//           </View>
//         ) : null}
//         </>
//         )}

//       </ScrollView>

//       {/* Fullscreen image lightbox for registered document images */}
//       <Modal
//         visible={!!lightbox}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setLightbox(null)}
//       >
//         <View className="flex-1 bg-black/95">
//           <View
//             className="flex-row items-center justify-between px-4"
//             style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
//           >
//             <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
//               {lightbox?.name}
//             </Text>
//             <TouchableOpacity
//               onPress={() => setLightbox(null)}
//               hitSlop={10}
//               className="w-9 h-9 items-center justify-center rounded-full bg-white/15"
//             >
//               <XIcon size={20} color="#ffffff" />
//             </TouchableOpacity>
//           </View>
//           <View className="flex-1 items-center justify-center px-4 pb-8">
//             {lightbox ? (
//               <Image
//                 source={{ uri: lightbox.url }}
//                 style={{ width: '100%', height: '100%' }}
//                 resizeMode="contain"
//               />
//             ) : null}
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// // ─── Reusable bits ───────────────────────────────────────────────────────────

// function DocTile({
//   url,
//   name,
//   typeLabel,
//   onOpen,
// }: {
//   url?: string | null;
//   name: string;
//   typeLabel?: string;
//   onOpen: () => void;
// }) {
//   const isImg = isImageDoc(url, name);
//   return (
//     <TouchableOpacity
//       onPress={onOpen}
//       activeOpacity={0.85}
//       className="rounded-xl border border-slate-200 bg-slate-50 p-2"
//       style={{ width: 112 }}
//     >
//       <View
//         className="rounded-lg overflow-hidden items-center justify-center bg-white border border-slate-200"
//         style={{ width: 96, height: 96 }}
//       >
//         {isImg && url ? (
//           <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
//         ) : (
//           <FileText size={34} color="#cbd5e1" />
//         )}
//       </View>
//       {typeLabel ? (
//         <AppText variant="labelSm" color={colors.textFaint} style={{ fontSize: 9, lineHeight: 12, marginTop: 6, textTransform: 'uppercase' }} numberOfLines={1}>
//           {typeLabel}
//         </AppText>
//       ) : null}
//       <View className="flex-row items-center mt-0.5">
//         {isImg ? <Eye size={11} color={brand[500]} /> : <ExternalLink size={11} color={brand[500]} />}
//         <AppText variant="labelSm" color={colors.textSecondary} style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
//           {name}
//         </AppText>
//       </View>
//     </TouchableOpacity>
//   );
// }

// function Header({
//   onBack,
//   insetsTop,
// }: {
//   onBack: () => void;
//   insetsTop: number;
// }) {
//   return (
//     <View
//       className="bg-white border-b border-slate-100 flex-row items-center justify-between px-4 pb-3"
//       style={{ paddingTop: insetsTop + 8 }}
//     >
//       <TouchableOpacity
//         onPress={onBack}
//         hitSlop={10}
//         activeOpacity={0.7}
//         className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
//       >
//         <ArrowLeft size={20} color="#0f172a" />
//       </TouchableOpacity>
//       <AppText variant="titleLg" color={colors.text}>Vendor Details</AppText>
//       <View className="w-10" />
//     </View>
//   );
// }

// function Card({
//   icon,
//   title,
//   children,
// }: {
//   icon: React.ReactNode;
//   title: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <View className="bg-white rounded-2xl border border-slate-200 p-4">
//       <View className="flex-row items-center mb-3">
//         <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center mr-3">
//           {icon}
//         </View>
//         <AppText variant="titleLg" color={colors.text}>{title}</AppText>
//       </View>
//       {children}
//     </View>
//   );
// }

// function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
//   if (value === null || value === undefined || value === '') return null;
//   return (
//     <View className="py-3 border-b border-slate-100">
//       <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>{label}</AppText>
//       <AppText variant="bodySm" color={colors.text} style={{ lineHeight: 20 }} selectable>
//         {String(value)}
//       </AppText>
//     </View>
//   );
// }

// // Icon + label + value row used by the compact completed-summary view.
// function CompletedRow({
//   icon,
//   label,
//   value,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value?: string | number | null;
// }) {
//   return (
//     <View className="flex-row items-center py-2.5">
//       <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center mr-3">
//         {icon}
//       </View>
//       <View className="flex-1">
//         <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
//           {label}
//         </AppText>
//         <AppText variant="titleMd" color={colors.text} numberOfLines={2}>
//           {value === null || value === undefined || value === '' ? '—' : String(value)}
//         </AppText>
//       </View>
//     </View>
//   );
// }

// function ChipGroup({
//   label,
//   items,
//   bg,
//   text,
// }: {
//   label: string;
//   items: string[];
//   bg: string;
//   text: string;
// }) {
//   return (
//     <View className="pt-3 border-t border-slate-100 mt-1">
//       <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>{label}</AppText>
//       <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
//         {items.map((item, i) => (
//           <View key={i} className="rounded-lg px-2.5 py-1" style={{ backgroundColor: bg }}>
//             <AppText variant="labelSm" color={text}>
//               {item}
//             </AppText>
//           </View>
//         ))}
//       </View>
//     </View>
//   );
// }

// function SummaryRow({
//   icon,
//   label,
//   value,
//   isLast,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: string;
//   isLast?: boolean;
// }) {
//   return (
//     <View className={`flex-row items-center ${isLast ? '' : 'mb-3'}`}>
//       <View
//         className="w-9 h-9 items-center justify-center rounded-lg mr-3"
//         style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
//       >
//         {icon}
//       </View>
//       <View className="flex-1">
//         <AppText variant="bodySm" color={brand[100]}>
//           {label}
//         </AppText>
//         <AppText variant="titleMd" color={colors.white} numberOfLines={2}>
//           {value}
//         </AppText>
//       </View>
//     </View>
//   );
// }

// function EmptyCard({
//   icon,
//   title,
//   sub,
// }: {
//   icon: React.ReactNode;
//   title: string;
//   sub?: string;
// }) {
//   return (
//     <View className="bg-white rounded-2xl border border-slate-200 py-10 items-center">
//       <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
//         {icon}
//       </View>
//       <AppText variant="titleMd" color={colors.textSecondary} style={{ marginBottom: 4 }}>{title}</AppText>
//       {sub ? <AppText variant="bodySm" color={colors.textMuted}>{sub}</AppText> : null}
//     </View>
//   );
// }

// function VendorDetailSkeleton({
//   onBack,
//   insetsTop,
// }: {
//   onBack: () => void;
//   insetsTop: number;
// }) {
//   const Block = ({
//     w,
//     h,
//     style,
//   }: {
//     w: number | string;
//     h: number;
//     style?: any;
//   }) => (
//     <View
//       className="bg-slate-200"
//       style={{ width: w as any, height: h, borderRadius: 8, ...style }}
//     />
//   );
//   return (
//     <View className="flex-1 bg-slate-50">
//       <Header onBack={onBack} insetsTop={insetsTop} />
//       <ScrollView
//         className="flex-1"
//         contentContainerStyle={{ paddingBottom: 32 }}
//         showsVerticalScrollIndicator={false}
//       >
//         <View className="px-4 pt-4 flex-row" style={{ columnGap: 6 }}>
//           <Block w={80} h={22} style={{ borderRadius: 999 }} />
//           <Block w={100} h={22} style={{ borderRadius: 999 }} />
//         </View>
//         <View className="mx-4 mt-4 bg-slate-300/60 rounded-2xl p-5">
//           {[0, 1, 2, 3].map((i) => (
//             <View key={i} className={`flex-row items-center ${i === 3 ? '' : 'mb-3'}`}>
//               <View className="w-9 h-9 bg-slate-300 rounded-lg mr-3" />
//               <View className="flex-1">
//                 <Block w="30%" h={10} />
//                 <View style={{ height: 6 }} />
//                 <Block w="60%" h={14} />
//               </View>
//             </View>
//           ))}
//         </View>
//         <View className="mx-4 mt-5" style={{ rowGap: 10 }}>
//           {[0, 1].map((i) => (
//             <View key={i} className="bg-white rounded-2xl p-4 border border-slate-200">
//               <View className="flex-row items-center mb-3">
//                 <View className="w-9 h-9 bg-slate-200 rounded-xl mr-3" />
//                 <Block w={160} h={14} />
//               </View>
//               {[0, 1, 2, 3].map((j) => (
//                 <View key={j} className="py-3 border-b border-slate-100">
//                   <Block w={90} h={10} />
//                   <View style={{ height: 6 }} />
//                   <Block w="80%" h={14} />
//                 </View>
//               ))}
//             </View>
//           ))}
//         </View>
//       </ScrollView>
//     </View>
//   );
// }



import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Linking,
  StatusBar,
  Image,
  Modal,
  Alert,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Factory,
  Phone,
  Mail,
  CheckCircle,
  Play,
  BarChart3,
  Globe,
  Briefcase,
  Package,
  Warehouse,
  Award,
  FileText,
  AlertCircle,
  RefreshCw,
  Eye,
  X as XIcon,
  ExternalLink,
  Landmark,
  UserCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import qcCheckerService from '../../services/qcCheckerService';
import {
  buildFullName,
  formatLocalLandline,
  formatIntlLandline,
  getOwnershipTypeLabel,
  FACILITY_META,
  withUnit,
} from '../../components/Vendor/Steps/fieldHelpers';
import { AppText, SectionCard, Button } from '@/components/UI';
import { brand, colors, elevation } from '@/constants/design';

type TabId = 'overview' | 'history' | 'upcoming';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'Inspection History' },
  { id: 'upcoming', label: 'Upcoming Inspections' },
];

// ── Document helpers (mirror web docDownload) ────────────────────────────────
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf|zip)(\?|$)/i;

// Decide whether a document URL points at an image (mirrors web isImageUrl).
const isImageDoc = (url?: string | null, name?: string | null): boolean => {
  const n = (name || '').toLowerCase();
  if (DOC_EXT.test(n)) return false;
  if (IMAGE_EXT.test(n)) return true;
  const u = (url || '').toLowerCase();
  if (DOC_EXT.test(u)) return false;
  if (IMAGE_EXT.test(u)) return true;
  if (u.includes('/raw/upload/')) return false;
  if (u.includes('/image/upload/')) return true;
  return false;
};

// Build the backend document-proxy URL for Cloudinary-hosted files (mirrors web
// cloudinaryProxyUrl), so PDFs open through our API rather than hitting
// Cloudinary directly. Non-Cloudinary URLs are returned untouched.
const proxiedDocUrl = (url: string): string => {
  try {
    const host = new URL(url).hostname;
    if (/^res\.cloudinary\.com$/i.test(host)) {
      const base = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
      return `${base}/document-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* non-URL string: return as-is */
  }
  return url;
};

// Registration document types shown in the Documents tab (mirror web —
// includes TRADE_LICENSE and EXPORT_LICENSE so those uploads aren't dropped).
const COMPANY_DOC_TYPES = [
  'GST_CERTIFICATE',
  'PAN_CARD',
  'COMPANY_REGISTRATION',
  'AADHAAR_CARD',
  'TRADE_LICENSE',
  'EXPORT_LICENSE',
];

const DOC_TYPE_LABELS: Record<string, string> = {
  GST_CERTIFICATE: 'GST Certificate',
  PAN_CARD: 'PAN Card',
  COMPANY_REGISTRATION: 'Company Registration',
  AADHAAR_CARD: 'Aadhaar Card',
  TRADE_LICENSE: 'Trade License',
  EXPORT_LICENSE: 'Export License (IEC)',
  OTHER: 'Factory Image',
};

const priorityStyle = (p: string) => {
  const key = (p || '').toLowerCase();
  const map: Record<string, { bg: string; text: string }> = {
    high: { bg: '#fee2e2', text: '#991b1b' },
    medium: { bg: '#fef3c7', text: '#92400e' },
    low: { bg: '#d1fae5', text: '#065f46' },
  };
  return map[key] || map.medium;
};

const safeExternalUrl = (url?: string | null) => {
  if (!url) return null;
  const trimmed = String(url).trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
};

const formatDate = (input?: string | Date | null) => {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatAddress = (...parts: Array<string | null | undefined>) =>
  parts.map((p) => (p ?? '').toString().trim()).filter((p) => p.length > 0).join(', ');

// Date + 12-hour time — used for inspection start / completed timestamps (mirror web formatDateTime).
const formatDateTime = (input?: string | Date | null): string => {
  if (!input) return '';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

// Convert a "HH:MM" clock string (or Date/ISO) into 12-hour format (mirror web formatTime12).
const formatTime12 = (time?: string | Date | null): string => {
  if (!time) return '';
  let hours: number;
  let minutes: number;
  if (time instanceof Date) {
    hours = time.getHours();
    minutes = time.getMinutes();
  } else {
    const clock = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
    if (clock) {
      hours = Number(clock[1]);
      minutes = Number(clock[2]);
    } else {
      const parsed = new Date(time);
      if (Number.isNaN(parsed.getTime())) return time;
      hours = parsed.getHours();
      minutes = parsed.getMinutes();
    }
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return typeof time === 'string' ? time : '';
  }
  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
};

// ── Derived vendor status (mirror web getNewMainStatus / getNewInspectionStatus) ──
// The raw DB status alone doesn't tell the checker where the assignment stands;
// these fold the latest inspection's lifecycle into a human "main status" and a
// separate "inspection status", exactly like the web QC-checker detail screen.
const getNewMainStatus = (
  dbStatus: string,
  latestInspection?: { status?: string | null; result?: string | null; cycleNumber?: number | null } | null,
): string => {
  const status = dbStatus?.toUpperCase() || 'PENDING';
  if (status === 'APPROVED') return 'Approved';
  if (status === 'REJECTED') return 'Rejected';
  if (status === 'REINSPECTION') return 'Re-Inspection';
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase();
      const cycle = latestInspection.cycleNumber ?? 1;
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') {
        return cycle > 1 ? 'Re-Inspection' : 'New Assignment';
      }
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        return cycle > 1 ? 'Re-Inspection Under Review by Admin' : 'Under Review by Admin';
      }
    }
    return 'Under Review by Admin';
  }
  if (status === 'PENDING') return 'New Assignment';
  return status.replace(/_/g, ' ').toLowerCase();
};

const getNewInspectionStatus = (
  dbStatus: string,
  latestInspection?: { status?: string | null; result?: string | null } | null,
): string => {
  const status = dbStatus?.toUpperCase() || 'PENDING';
  if (status === 'APPROVED') return 'Completed';
  if (status === 'REJECTED') {
    if (latestInspection && latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
    return 'Completed';
  }
  if (status === 'REINSPECTION') return 'Pending';
  if (status === 'UNDER_REVIEW') {
    if (latestInspection) {
      const inspStatus = latestInspection.status?.toUpperCase();
      if (inspStatus === 'SCHEDULED' || inspStatus === 'IN_PROGRESS') return 'Pending';
      if (inspStatus === 'SUBMITTED' || inspStatus === 'UNDER_ADMIN_REVIEW') {
        if (latestInspection.result?.toUpperCase() === 'FAILED') return 'Rejected';
        return 'Submitted';
      }
    }
    return 'Pending';
  }
  return 'Pending';
};

// Badge colours for the derived main status (mirror web MAIN_STATUS_COLORS).
const MAIN_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  'New Assignment': { bg: '#eff6ff', text: '#1d4ed8' },
  'Under Review by Admin': { bg: '#fff7ed', text: '#c2410c' },
  'Re-Inspection': { bg: '#fff7ed', text: '#c2410c' },
  'Re-Inspection Under Review by Admin': { bg: '#fffbeb', text: '#b45309' },
  'Re-Inspection Under Review': { bg: '#fffbeb', text: '#b45309' },
  Approved: { bg: '#ecfdf5', text: '#047857' },
  Rejected: { bg: '#fef2f2', text: '#b91c1c' },
};
const mainStatusStyle = (s: string) => MAIN_STATUS_STYLE[s] || { bg: '#fffbeb', text: '#b45309' };

// Badge colours for the derived inspection status (mirror web INSPECTION_STATUS_COLORS).
const INSPECTION_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Pending: { bg: '#f8fafc', text: '#334155' },
  Submitted: { bg: '#eff6ff', text: '#1d4ed8' },
  Rejected: { bg: '#fef2f2', text: '#b91c1c' },
  Completed: { bg: '#ecfdf5', text: '#047857' },
};
const inspectionStatusStyle = (s?: string | null) =>
  INSPECTION_STATUS_STYLE[s || 'Pending'] || INSPECTION_STATUS_STYLE.Pending;

// Lifecycle-aware badge for an inspection-history row (mirror web getInspectionRowBadge).
// The Pass/Fail verdict is only final once COMPLETED; while SUBMITTED / under admin
// review the row must reflect that lifecycle state, not the proposed result.
const getInspectionRowBadge = (insp: any): { label: string; bg: string; text: string } => {
  const status = (insp.status || '').toUpperCase();
  const result = (insp.result || '').toUpperCase();
  switch (status) {
    case 'COMPLETED':
      if (result === 'PASSED') return { label: 'Passed', bg: '#ecfdf5', text: '#047857' };
      if (result === 'FAILED') return { label: 'Failed', bg: '#fef2f2', text: '#b91c1c' };
      return { label: 'Completed', bg: '#ecfdf5', text: '#047857' };
    case 'SUBMITTED':
    case 'UNDER_ADMIN_REVIEW':
      return { label: 'Under Review by Admin', bg: '#eff6ff', text: '#1d4ed8' };
    case 'SCHEDULED':
      return { label: 'Scheduled', bg: '#f8fafc', text: '#475569' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', bg: '#fffbeb', text: '#b45309' };
    case 'REJECTED':
      return { label: 'Rejected', bg: '#fef2f2', text: '#b91c1c' };
    case 'REINSPECTION':
      return { label: 'Re-Inspection', bg: '#fffbeb', text: '#b45309' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: '#f8fafc', text: '#64748b' };
    default:
      return { label: status ? status.replace(/_/g, ' ') : 'Pending', bg: '#f8fafc', text: '#475569' };
  }
};

// ── Vendor DETAIL label maps (distinct from the Step-1/Step-3 form maps) ─────
// The web DETAIL screen uses its own Business Type / Company ID label maps that
// differ from the inspection-form step maps, so we replicate them locally here
// instead of reusing getBusinessTypeLabel / getCompanyIdLabel from fieldHelpers.
const getDetailBusinessTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    proprietorship: 'Proprietorship',
    'pvt-ltd': 'Pvt Ltd',
    'partnership-firm': 'Partnership Firm',
    llp: 'LLP',
    sole: 'Sole Proprietorship',
    partnership: 'Partnership',
    corporation: 'Corporation',
    llc: 'Limited Liability Company (LLC)',
  };
  return map[type] || type;
};

const getDetailCompanyIdLabel = (businessType: string): string => {
  const map: Record<string, string> = {
    proprietorship: 'IEC Code',
    'pvt-ltd': 'CIN Number',
    'partnership-firm': 'Partnership Deed',
    llp: 'LLPIN Number',
  };
  return map[businessType] || 'Business Registration ID';
};

// Employee-count label — the web DETAIL map uses plain hyphens and "100+
// employees", which differs from fieldHelpers.getEmployeeCountLabel (en-dashes
// + "More than 100 employees"), so replicate the DETAIL variant locally.
const getDetailEmployeeCountLabel = (count: string): string => {
  const map: Record<string, string> = {
    '10-20': '10-20 employees',
    '20-50': '20-50 employees',
    '50-100': '50-100 employees',
    '100+': '100+ employees',
  };
  return map[count] || count;
};

// Owner designation code → label. Main owner shows the RAW designation; the
// additional owners are resolved through this map (mirrors web VendorDetail).
const resolveOwnerDesignation = (val?: string | null): string => {
  if (!val) return '';
  const map: Record<string, string> = {
    proprietor: 'Proprietor',
    ceo: 'CEO',
    director: 'Director',
    'managing-director': 'Managing Director',
    founder: 'Founder',
    other: 'Other',
  };
  return map[val] || val;
};

// Facility sub-card titles — mirror the WEB FACILITY_META labels (finishing →
// "Final Packing and Dispatch"), which differ from the mobile fieldHelpers
// FACILITY_META (left untouched because the inspection form depends on it).
const FACILITY_TITLE: Record<string, string> = {
  spinning: 'Spinning',
  weaving: 'Weaving',
  dyeing: 'Dyeing',
  printing: 'Printing',
  stitching: 'Stitching',
  finishing: 'Final Packing and Dispatch',
};

// "Active Facilities" chip labels (finishing → "Finishing", per web).
const FACILITY_CHIP: Record<string, string> = {
  spinning: 'Spinning',
  weaving: 'Weaving',
  dyeing: 'Dyeing',
  printing: 'Printing',
  stitching: 'Stitching',
  finishing: 'Finishing',
};

// Country name → ISO2 for common countries so we can render a flag image via
// flagcdn. Unmappable names fall back to a plain (flag-less) chip.
const COUNTRY_ISO: Record<string, string> = {
  India: 'IN', 'United States': 'US', 'United States of America': 'US',
  'United Kingdom': 'GB', China: 'CN', Germany: 'DE', France: 'FR', Italy: 'IT',
  Spain: 'ES', Canada: 'CA', Australia: 'AU', Japan: 'JP', Bangladesh: 'BD',
  Pakistan: 'PK', 'Sri Lanka': 'LK', Nepal: 'NP', 'United Arab Emirates': 'AE',
  'Saudi Arabia': 'SA', Singapore: 'SG', Malaysia: 'MY', Thailand: 'TH',
  Vietnam: 'VN', Indonesia: 'ID', Netherlands: 'NL', Belgium: 'BE',
  Switzerland: 'CH', Sweden: 'SE', Norway: 'NO', Denmark: 'DK', Poland: 'PL',
  Turkey: 'TR', Russia: 'RU', Brazil: 'BR', Mexico: 'MX', 'South Africa': 'ZA',
  Egypt: 'EG', Nigeria: 'NG', Kenya: 'KE', 'South Korea': 'KR',
  'New Zealand': 'NZ', Ireland: 'IE', Portugal: 'PT', Austria: 'AT',
  Greece: 'GR', Israel: 'IL', Qatar: 'QA', Kuwait: 'KW', Bahrain: 'BH',
  Oman: 'OM', 'Hong Kong': 'HK', Taiwan: 'TW', Philippines: 'PH',
};

// Non-empty check for scalars/arrays (mirrors web hasData).
const hasVal = (v: any): boolean => {
  if (v === null || v === undefined || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
};

// Capitalize the first letter of each word (mirrors CSS `capitalize`).
const capitalizeWords = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase());
// Capitalize only the first character (mirrors web vendorTypes transform).
const capitalizeFirst = (s: string): string =>
  typeof s === 'string' && s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Certification expiry badge (mirrors web getCertificateStatus — 4 tiers).
// Returns null only for a missing/invalid date; otherwise always a badge.
const certExpiryStatus = (
  expiryDate?: string | null,
): { label: string; bg: string; text: string } | null => {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate);
  if (isNaN(expiry.getTime())) return null;
  const days = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: 'Expired', bg: '#fee2e2', text: '#991b1b' };
  if (days <= 30) return { label: `Expires in ${days} days`, bg: '#fef3c7', text: '#92400e' };
  if (days <= 90) return { label: `Expires in ${days} days`, bg: '#fef9c3', text: '#854d0e' };
  return { label: `Valid until ${formatDate(expiryDate)}`, bg: '#d1fae5', text: '#047857' };
};

export default function VendorDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [fullVendor, setFullVendor] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentInspections, setRecentInspections] = useState<any[]>([]);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [historyMeta, setHistoryMeta] = useState<{ total: number; returned: number; hasMore: boolean } | null>(null);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fullscreen image lightbox (registered document images).
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  // ── Floating scroll-nav button state ──────────────────────────────────────
  // scrollRef drives programmatic scroll-to-top / scroll-to-end; the two
  // booleans below are derived from onScroll so the button only shows once
  // the user has actually scrolled, and flips direction near the bottom.
  const scrollRef = useRef<ScrollView>(null);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
    setShowScrollBtn(contentOffset.y > 80);
    setIsNearBottom(distanceFromBottom < 80);
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const loadAll = useCallback(async (limitOverride?: number) => {
    if (!id) return;
    const limit = limitOverride ?? historyLimit;
    setError(null);
    if (!fullVendor) setLoading(true);
    try {
      const res = await qcCheckerService.getVendorDetails(id, limit);
      if (res.success) {
        setFullVendor(res.data.vendor);
        setStats(res.data.stats);
        setRecentInspections(res.data.recentInspections || []);
        setUpcomingList(res.data.upcomingInspections || []);
        if (res.data.recentInspectionsMeta) setHistoryMeta(res.data.recentInspectionsMeta);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load vendor details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, historyLimit, fullVendor]);

  // Refetch vendor + audit trail every time this screen is focused, so the
  // status / history reflects any inspection action the checker just took.
  useFocusEffect(
    useCallback(() => {
      loadAll();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadAll();
  }, [loadAll]);

  const actualUpcoming = upcomingList.filter(
    (i) => i.status === 'SCHEDULED' || i.status === 'IN_PROGRESS',
  );
  const firstUpcoming = actualUpcoming[0];
  const isContinuing = firstUpcoming?.status === 'IN_PROGRESS';

  // Derived main / inspection status (mirror web) — folds the latest inspection's
  // lifecycle into the badges shown in the header, instead of the raw DB status.
  const latestInspection =
    upcomingList.length > 0 ? upcomingList[0] : recentInspections.length > 0 ? recentInspections[0] : null;
  const currentMainStatus = fullVendor
    ? getNewMainStatus(fullVendor.status, latestInspection)
    : '';
  const currentInspectionStatus = fullVendor
    ? getNewInspectionStatus(fullVendor.status, latestInspection)
    : '';
  // Once the assignment is completed, the QC checker only needs a compact summary.
  const isCompleted = currentInspectionStatus === 'Completed';

  const handleLoadMoreHistory = () => {
    const nextLimit = Math.min(historyLimit + 20, 50);
    setHistoryLimit(nextLimit);
    loadAll(nextLimit);
  };

  const handleStartInspectionFlow = () => {
    router.push({
      pathname: '/vendors/[id]/inspection' as any,
      params: { id: id!, name: fullVendor?.companyName || name || '' },
    });
  };

  // ── Registered documents (mirror web VendorDetail Documents grouping) ──────
  const allDocs: any[] = Array.isArray(fullVendor?.documents) ? fullVendor.documents : [];
  const companyDocs = allDocs.filter((d) => COMPANY_DOC_TYPES.includes(d.type));
  const factoryImages = allDocs
    .filter((d) => d.type === 'OTHER')
    .map((d) => ({ label: d.name || 'Factory Image', url: d.documentUrl }));
  const companyLogo = fullVendor?.companyLogo || null;

  // Open a registered document: images go to the in-app lightbox, everything
  // else (PDFs/docs) opens through the document-proxy in the system browser
  // (mirrors web: images → lightbox, PDFs → open in browser).
  const openDoc = useCallback(async (url?: string | null, docName?: string | null) => {
    if (!url) return;
    if (isImageDoc(url, docName)) {
      setLightbox({ url, name: docName || 'Document' });
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(proxiedDocUrl(url));
    } catch {
      Alert.alert('Unable to open', 'Could not open this document.');
    }
  }, []);

  // Skeleton only on initial load
  if (loading && !fullVendor) {
    return <VendorDetailSkeleton onBack={() => router.back()} insetsTop={insets.top} />;
  }

  if (error && !fullVendor) {
    return (
      <View className="flex-1 bg-white">
        <Header onBack={() => router.back()} insetsTop={insets.top} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-20 h-20 rounded-full bg-red-50 items-center justify-center mb-5">
            <AlertCircle size={36} color="#dc2626" strokeWidth={1.75} />
          </View>
          <AppText variant="headlineSm" color={colors.text} style={{ marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </AppText>
          <AppText variant="bodyMd" color={colors.textSecondary} style={{ textAlign: 'center', marginBottom: 24 }}>{error}</AppText>
          <Button label="Try Again" icon={RefreshCw} onPress={() => loadAll()} />
        </View>
      </View>
    );
  }

  const companyName = fullVendor?.companyName || name || 'Vendor';
  const location =
    formatAddress(fullVendor?.factoryCity, fullVendor?.factoryState) || 'Location not provided';
  const productCategories: string[] = fullVendor?.productCategories || [];
  const certifications: any[] = fullVendor?.certifications || [];
  const additionalOwners: any[] = Array.isArray(fullVendor?.additionalOwners)
    ? fullVendor.additionalOwners
    : [];
  const bank = fullVendor?.bankDetails || null;
  const websiteSafe = safeExternalUrl(fullVendor?.website);

  // ── Overview derived data (mirror web renderOverviewTab) ───────────────────
  // Factory Site photos belong to the Legal Address & Factory Site; the rest
  // are Warehouse photos (web splits on the "Factory Site" name prefix).
  const legalSiteImages = factoryImages.filter((m) => (m.label || '').startsWith('Factory Site'));
  const warehousePhotoImages = factoryImages.filter((m) => !(m.label || '').startsWith('Factory Site'));

  // Product photos across registered category products + custom categories.
  const productPhotos: { label: string; url: string }[] = [];
  const collectProductPhotos = (catLabel: string, products: any) => {
    (Array.isArray(products) ? products : []).forEach((p: any, i: number) => {
      (Array.isArray(p?.photos) ? p.photos : []).forEach((ph: any) => {
        const url = ph?.url || ph?.preview;
        if (url) {
          productPhotos.push({
            label: [catLabel, p?.name || `Product ${i + 1}`].filter(Boolean).join(' · '),
            url,
          });
        }
      });
    });
  };
  if (fullVendor?.categoryProducts && typeof fullVendor.categoryProducts === 'object') {
    Object.values(fullVendor.categoryProducts).forEach((products: any) => collectProductPhotos('', products));
  }
  if (Array.isArray(fullVendor?.additionalCategories)) {
    fullVendor.additionalCategories.forEach((cat: any) =>
      collectProductPhotos(cat?.name || 'Custom Category', cat?.products),
    );
  }

  // Contact persons (main + alternates) for the Contact & Trade section.
  const mainContactPerson =
    fullVendor?.mainContact && typeof fullVendor.mainContact === 'object' ? fullVendor.mainContact : null;
  const alternateContactsList: any[] = Array.isArray(fullVendor?.alternateContacts)
    ? fullVendor.alternateContacts
    : [];
  const contactPersons = [
    ...(mainContactPerson ? [{ ...mainContactPerson, _label: 'Contact Person 1 (Main)' }] : []),
    ...alternateContactsList.map((c: any, i: number) => ({ ...c, _label: `Contact Person ${i + 2}` })),
  ];

  // Warehouse "same as factory" detection (mirrors web).
  const _wEq = (a: any, b: any) => (a || '').toString().trim() === (b || '').toString().trim();
  const warehouseSameAsFactory =
    (!fullVendor?.warehouseAddress && !fullVendor?.warehouseCity) ||
    (_wEq(fullVendor?.warehouseAddress, fullVendor?.factoryAddress) &&
      _wEq(fullVendor?.warehouseCity, fullVendor?.factoryCity) &&
      _wEq(fullVendor?.warehouseState, fullVendor?.factoryState) &&
      _wEq(fullVendor?.warehouseZipCode, fullVendor?.factoryZipCode) &&
      _wEq(fullVendor?.warehouseCountry, fullVendor?.factoryCountry));

  // Shared inline renderers for the overview sections.
  const imageStrip = (items: { label: string; url: string }[]) => (
    <View className="flex-row flex-wrap" style={{ columnGap: 10, rowGap: 12 }}>
      {items.map((m, i) => (
        <DocTile key={`${m.label}-${i}`} url={m.url} name={m.label} onOpen={() => openDoc(m.url, m.label)} />
      ))}
    </View>
  );
  const countryChips = (list: string[]) => (
    <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
      {list.map((nm, i) => {
        const iso = COUNTRY_ISO[nm];
        return (
          <View
            key={i}
            className="flex-row items-center rounded-lg px-2.5 py-1"
            style={{ backgroundColor: '#f1f5f9' }}
          >
            {iso ? (
              <Image
                source={{ uri: `https://flagcdn.com/24x18/${iso.toLowerCase()}.png` }}
                style={{ width: 16, height: 12, marginRight: 6, borderRadius: 2 }}
                resizeMode="cover"
              />
            ) : null}
            <Text className="text-xs font-semibold" style={{ color: '#334155' }}>
              {nm}
            </Text>
          </View>
        );
      })}
    </View>
  );

  const renderOverview = () => {
    if (!fullVendor) return null;
    const fv = fullVendor;
    const bt: string = fv.businessType;

    // ── Facilities ──
    const enabledFacilities = fv.enabledFacilities || {};
    const detailsMap = fv.facilityDetails || {};
    const enabledList: string[] = Object.entries(enabledFacilities)
      .filter(([, en]) => !!en)
      .map(([k]) => FACILITY_CHIP[k] || k);
    const facilityCards = Object.entries(detailsMap)
      .filter(([fid]) => enabledFacilities[fid])
      .map(([fid, details]: [string, any]) => {
        const rows = (FACILITY_META[fid]?.detailFields ?? []).filter(
          ({ key }) => (details || {})[key] !== null && (details || {})[key] !== undefined && (details || {})[key] !== '',
        );
        return { fid, rows, details };
      })
      .filter((c) => c.rows.length > 0);
    const hasFacilitiesData = (fv.enabledFacilities || fv.facilityDetails) && (enabledList.length > 0 || facilityCards.length > 0);

    // ── Section presence flags ──
    const s2Fields =
      hasVal(fv.businessPhone) || hasVal(fv.phoneNumber2) || hasVal(fv.businessEmail) || hasVal(fv.businessEmail2) ||
      !!formatLocalLandline({ countryCode: '+91', std: fv.localLandlineStd, number: fv.landlineNumber }) ||
      !!formatIntlLandline(fv.intlLandline) || hasVal(fv.businessAddress) || hasVal(fv.addressLine2) ||
      hasVal(fv.addressLine3) || hasVal(fv.landmark) || hasVal(fv.businessCity) || hasVal(fv.businessState) ||
      hasVal(fv.businessZipCode) || hasVal(fv.businessCountry);

    const ownerFullName = buildFullName(fv.ownerTitle, fv.ownerFirstName, fv.ownerMiddleName, fv.ownerLastName, fv.ownerName);
    const ownerLocalLL = formatLocalLandline({ countryCode: '+91', std: fv.ownerLocalLandlineStd, number: fv.ownerLandline });
    const ownerIntlLL = formatIntlLandline(fv.ownerIntlLandline);
    const s3Fields =
      hasVal(ownerFullName) || hasVal(fv.designation) || hasVal(fv.ownerPhone) || hasVal(fv.ownerPhone2) ||
      hasVal(fv.ownerEmail) || hasVal(fv.ownerEmail2) || !!ownerLocalLL || !!ownerIntlLL ||
      hasVal(fv.businessStartDate) || hasVal(fv.employeeCount);
    const s3Custom = !!fv.ownerPhoto || (Array.isArray(fv.additionalOwners) && fv.additionalOwners.length > 0);

    const s4Fields =
      hasVal(fv.factoryOwnershipType) || hasVal(fv.factorySize) || hasVal(fv.factoryAddress) || hasVal(fv.addressLine2) ||
      hasVal(fv.addressLine3) || hasVal(fv.landmark) || hasVal(fv.factoryCity) || hasVal(fv.factoryState) ||
      hasVal(fv.factoryZipCode) || hasVal(fv.factoryCountry);
    const hasWarehouseSection = !!(fv.warehouseAddress || fv.warehouseCity || fv.factoryAddress || fv.factoryCity);
    const s4Custom = hasWarehouseSection || legalSiteImages.length > 0 || warehousePhotoImages.length > 0;

    const vendorTypeChips: string[] = Array.isArray(fv.vendorTypes) ? fv.vendorTypes.map(capitalizeFirst) : [];
    const s5 = vendorTypeChips.length > 0 || (Array.isArray(fv.productCategories) && fv.productCategories.length > 0) ||
      hasVal(fv.categoryRemarks) || productPhotos.length > 0;

    const s7Fields = hasVal(fv.complianceStandards) || hasVal(fv.packagingCapabilities) || hasVal(fv.logisticsPartners) ||
      (Array.isArray(fv.shippingMethods) && fv.shippingMethods.length > 0);
    const certs: any[] = Array.isArray(fv.certifications) ? fv.certifications : [];

    const s8Fields =
      (fv.importExperience !== undefined && fv.importExperience !== null) ||
      (fv.exportExperience !== undefined && fv.exportExperience !== null) ||
      (Array.isArray(fv.importCountries) && fv.importCountries.length > 0) ||
      (Array.isArray(fv.exportCountries) && fv.exportCountries.length > 0);

    const bank = fv.bankDetails || null;

    return (
      <View className="mx-4" style={{ rowGap: 14 }}>
        {/* ── SECTION 1 · Company Details ─────────────────────────── */}
        <SectionCard icon={Briefcase} title="Company Details">
          <InfoRow label="Company Name" value={fv.companyName} />
          {hasVal(fv.companyType) ? (
            <View className="py-3 border-b border-slate-100">
              <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Company Type</AppText>
              <View className="self-start rounded-full px-2.5 py-1" style={{ backgroundColor: brand[50] }}>
                <AppText variant="labelSm" color={brand[600]}>
                  {capitalizeWords(String(fv.companyType).replace(/_/g, ' ').toLowerCase())}
                </AppText>
              </View>
            </View>
          ) : null}
          {hasVal(bt) ? <InfoRow label="Business Type" value={getDetailBusinessTypeLabel(bt)} /> : null}
          {hasVal(fv.factoryOwnershipType) ? (
            <InfoRow label="Factory Ownership Type" value={getOwnershipTypeLabel(fv.factoryOwnershipType)} />
          ) : null}
          <InfoRow label="Year Established" value={fv.establishedYear} />
          {fv.gstNumber ? <InfoRow label="GST Number" value={fv.gstNumber} /> : null}
          {!fv.gstNumber ? <InfoRow label="Vendor Type" value="Unregistered — identified by email" /> : null}
          {fv.companyIdNumber ? <InfoRow label={getDetailCompanyIdLabel(bt)} value={fv.companyIdNumber} /> : null}
          {fv.iecCode ? <InfoRow label="IEC Code" value={fv.iecCode} /> : null}
          <InfoRow label={bt === 'proprietorship' ? 'Proprietor PAN Number' : 'Company PAN Number'} value={fv.panNumber} />
          {fv.aadhaarNumber ? <InfoRow label="Aadhaar Number" value={fv.aadhaarNumber} /> : null}
          {hasVal(fv.website) ? (
            <View className="py-3 border-b border-slate-100">
              <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Website</AppText>
              {websiteSafe ? (
                <TouchableOpacity onPress={() => Linking.openURL(websiteSafe)} className="flex-row items-center">
                  <Globe size={14} color={brand[500]} />
                  <AppText variant="bodySm" color={brand[600]} style={{ marginLeft: 6, flexShrink: 1, textDecorationLine: 'underline' }}>{fv.website}</AppText>
                </TouchableOpacity>
              ) : (
                <View className="flex-row items-center">
                  <Globe size={14} color="#94a3b8" />
                  <AppText variant="bodySm" color={colors.text} style={{ marginLeft: 6, flexShrink: 1 }}>{fv.website}</AppText>
                </View>
              )}
            </View>
          ) : null}
          {companyLogo ? (
            <View className="pt-3">
              <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Company Logo</AppText>
              <TouchableOpacity onPress={() => openDoc(companyLogo, 'Company Logo')} activeOpacity={0.85}>
                <Image
                  source={{ uri: companyLogo }}
                  style={{ width: 96, height: 96, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          ) : null}
          {companyDocs.length > 0 ? (
            <View className="pt-3">
              <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>
                Registration Documents ({companyDocs.length})
              </AppText>
              <View className="flex-row flex-wrap" style={{ columnGap: 10, rowGap: 12 }}>
                {companyDocs.map((doc: any, idx: number) => (
                  <DocTile
                    key={doc.id || idx}
                    url={doc.documentUrl}
                    name={doc.name || DOC_TYPE_LABELS[doc.type] || 'Document'}
                    typeLabel={DOC_TYPE_LABELS[doc.type] || doc.type}
                    onOpen={() => openDoc(doc.documentUrl, doc.name)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </SectionCard>

        {/* ── SECTION 2 · Contact & Communication Details ─────────── */}
        {s2Fields ? (
          <SectionCard icon={Phone} title="Contact & Communication Details">
            <InfoRow label="Primary Phone" value={fv.businessPhone} />
            <InfoRow label="Secondary Phone" value={fv.phoneNumber2} />
            <InfoRow label="Primary Email" value={fv.businessEmail} />
            <InfoRow label="Secondary Email" value={fv.businessEmail2} />
            <InfoRow
              label="Local Landline Number"
              value={formatLocalLandline({ countryCode: '+91', std: fv.localLandlineStd, number: fv.landlineNumber })}
            />
            <InfoRow label="International Landline Number" value={formatIntlLandline(fv.intlLandline)} />
            <InfoRow label="Address Line 1" value={fv.businessAddress} />
            <InfoRow label="Address Line 2" value={fv.addressLine2} />
            <InfoRow label="Address Line 3" value={fv.addressLine3} />
            <InfoRow label="Landmark" value={fv.landmark} />
            <InfoRow label="City" value={fv.businessCity} />
            <InfoRow label="State" value={fv.businessState} />
            <InfoRow label="ZIP / Postal Code" value={fv.businessZipCode} />
            <InfoRow label="Country" value={fv.businessCountry} />
          </SectionCard>
        ) : null}

        {/* ── SECTION 3 · Owner Profile ───────────────────────────── */}
        {s3Fields || s3Custom ? (
          <SectionCard icon={UserCircle} title="Owner Profile">
            <View className="flex-row items-start mb-1">
              {fv.ownerPhoto ? (
                <TouchableOpacity onPress={() => openDoc(fv.ownerPhoto, 'Owner Photo')} activeOpacity={0.85}>
                  <Image
                    source={{ uri: fv.ownerPhoto }}
                    style={{ width: 80, height: 80, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ) : (
                <View className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center">
                  <UserCircle size={40} color="#cbd5e1" />
                </View>
              )}
              <View className="flex-1 ml-3">
                <InfoRow label="Owner Full Name" value={ownerFullName} />
                <InfoRow label="Designation" value={fv.designation} />
                <InfoRow label="Primary Phone" value={fv.ownerPhone} />
                <InfoRow label="Secondary Phone" value={fv.ownerPhone2} />
              </View>
            </View>
            <InfoRow label="Primary Email" value={fv.ownerEmail} />
            <InfoRow label="Secondary Email" value={fv.ownerEmail2} />
            <InfoRow label="Local Landline" value={ownerLocalLL} />
            <InfoRow label="International Landline" value={ownerIntlLL} />
            <InfoRow label="Business Start Date" value={fv.businessStartDate ? formatDate(fv.businessStartDate) : null} />
            <InfoRow
              label="Number of Employees"
              value={fv.employeeCount ? getDetailEmployeeCountLabel(fv.employeeCount) : null}
            />
            {Array.isArray(fv.additionalOwners) && fv.additionalOwners.length > 0 ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Additional Owners</AppText>
                <View style={{ rowGap: 10 }}>
                  {fv.additionalOwners.map((owner: any, idx: number) => (
                    <View
                      key={idx}
                      className="border border-slate-200 rounded-xl p-3"
                      style={{ backgroundColor: '#f8fafc' }}
                    >
                      <View className="flex-row items-center mb-1.5">
                        {owner.photo ? (
                          <TouchableOpacity
                            onPress={() => openDoc(owner.photo, `Owner ${idx + 2} Photo`)}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: owner.photo }}
                              style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#e2e8f0' }}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                        ) : (
                          <View className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200 items-center justify-center">
                            <UserCircle size={24} color="#cbd5e1" />
                          </View>
                        )}
                        <AppText variant="titleMd" color={colors.text} style={{ marginLeft: 10 }}>Owner {idx + 2}</AppText>
                      </View>
                      <InfoRow
                        label="Name"
                        value={buildFullName(owner.title, owner.firstName, owner.middleName, owner.lastName, owner.name)}
                      />
                      <InfoRow label="Designation" value={resolveOwnerDesignation(owner.designation)} />
                      <InfoRow label="Primary Email" value={owner.email} />
                      <InfoRow label="Secondary Email" value={owner.email2} />
                      <InfoRow label="Primary Phone" value={owner.phone} />
                      <InfoRow label="Secondary Phone" value={owner.phone2} />
                      <InfoRow
                        label="Local Landline"
                        value={formatLocalLandline({
                          countryCode: '+91',
                          std: owner.localLandlineStd,
                          number: owner.localLandline || owner.landline,
                        })}
                      />
                      <InfoRow label="International Landline" value={formatIntlLandline(owner.intlLandline)} />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── SECTION 4 · Legal Address & Factory Site ────────────── */}
        {s4Fields || s4Custom ? (
          <SectionCard icon={Warehouse} title="Legal Address & Factory Site">
            {hasVal(fv.factoryOwnershipType) ? (
              <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(fv.factoryOwnershipType)} />
            ) : null}
            <InfoRow label="Warehousing Capacity" value={fv.factorySize} />
            <InfoRow label="Address Line 1" value={fv.factoryAddress} />
            <InfoRow label="Address Line 2" value={fv.addressLine2} />
            <InfoRow label="Address Line 3" value={fv.addressLine3} />
            <InfoRow label="Landmark" value={fv.landmark} />
            <InfoRow label="City" value={fv.factoryCity} />
            <InfoRow label="State" value={fv.factoryState} />
            <InfoRow label="ZIP / Postal Code" value={fv.factoryZipCode} />
            <InfoRow label="Country" value={fv.factoryCountry} />

            {legalSiteImages.length > 0 ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>
                  Factory Site Images ({legalSiteImages.length})
                </AppText>
                {imageStrip(legalSiteImages)}
              </View>
            ) : null}

            {hasWarehouseSection ? (
              <View className="pt-4 mt-2 border-t border-slate-100">
                <AppText variant="titleMd" color={colors.text} style={{ marginBottom: 8 }}>Warehouse Address</AppText>
                {warehouseSameAsFactory ? (
                  <>
                    <View
                      className="flex-row items-start p-3 rounded-xl border border-brand-100"
                      style={{ backgroundColor: brand[50] }}
                    >
                      <MapPin size={16} color={brand[500]} style={{ marginTop: 1 }} />
                      <AppText variant="bodySm" color={brand[700]} style={{ marginLeft: 8, flex: 1 }}>
                        Warehouse Address is the same as the Legal Address & Factory Site above.
                      </AppText>
                    </View>
                    {fv.mapLink ? (
                      <View className="pt-3">
                        <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Map / Location Link</AppText>
                        <TouchableOpacity
                          onPress={() => {
                            const u = safeExternalUrl(fv.mapLink);
                            if (u) Linking.openURL(u);
                          }}
                          className="flex-row items-center"
                        >
                          <Globe size={14} color={brand[500]} />
                          <AppText variant="bodySm" color={brand[600]} style={{ marginLeft: 6, textDecorationLine: 'underline' }}>View Map</AppText>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                ) : (
                  <>
                    <InfoRow label="Ownership Type" value={getOwnershipTypeLabel(fv.ownershipType) || '—'} />
                    <InfoRow label="Warehousing Capacity" value={fv.warehouseSize || '—'} />
                    <InfoRow label="Address Line 1" value={fv.warehouseAddress} />
                    <InfoRow label="Address Line 2" value={fv.warehouseAddressLine2} />
                    <InfoRow label="Address Line 3" value={fv.warehouseAddressLine3} />
                    <InfoRow label="Landmark" value={fv.warehouseLandmark} />
                    <InfoRow label="City" value={fv.warehouseCity} />
                    <InfoRow label="State" value={fv.warehouseState} />
                    <InfoRow label="ZIP / Postal Code" value={fv.warehouseZipCode} />
                    <InfoRow label="Country" value={fv.warehouseCountry} />
                    {fv.mapLink ? (
                      <View className="py-3 border-b border-slate-100">
                        <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Map / Location Link</AppText>
                        <TouchableOpacity
                          onPress={() => {
                            const u = safeExternalUrl(fv.mapLink);
                            if (u) Linking.openURL(u);
                          }}
                          className="flex-row items-center"
                        >
                          <Globe size={14} color={brand[500]} />
                          <AppText variant="bodySm" color={brand[600]} style={{ marginLeft: 6, textDecorationLine: 'underline' }}>View Map</AppText>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            ) : null}

            {warehousePhotoImages.length > 0 ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>
                  Warehouse Images ({warehousePhotoImages.length})
                </AppText>
                {imageStrip(warehousePhotoImages)}
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── SECTION 5 · Vendor Type & Products ──────────────────── */}
        {s5 ? (
          <SectionCard icon={Package} title="Vendor Type & Products">
            {vendorTypeChips.length > 0 ? (
              <ChipGroup label="Vendor Type" items={vendorTypeChips} bg="#f1f5f9" text="#334155" />
            ) : null}
            {Array.isArray(fv.productCategories) && fv.productCategories.length > 0 ? (
              <ChipGroup label="Product Categories" items={fv.productCategories} bg={brand[50]} text={brand[600]} />
            ) : null}
            {hasVal(fv.categoryRemarks) ? <InfoRow label="General Remarks" value={fv.categoryRemarks} /> : null}
            {productPhotos.length > 0 ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Product Photos ({productPhotos.length})</AppText>
                {imageStrip(productPhotos)}
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── SECTION 6 · Manufacturing Facilities ────────────────── */}
        {hasFacilitiesData ? (
          <SectionCard icon={Factory} title="Manufacturing Facilities">
            {enabledList.length > 0 ? (
              <View className="pb-1">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Active Facilities</AppText>
                <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
                  {enabledList.map((f, i) => (
                    <View key={i} className="rounded-lg px-2.5 py-1" style={{ backgroundColor: brand[50] }}>
                      <AppText variant="labelSm" color={brand[600]}>{f}</AppText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {facilityCards.map(({ fid, rows, details }) => (
              <View key={fid} className="pt-3 mt-2 border-t border-slate-100">
                <AppText variant="titleMd" color={colors.text} style={{ marginBottom: 4, textTransform: 'uppercase' }}>
                  {(FACILITY_TITLE[fid] || FACILITY_META[fid]?.label || capitalizeFirst(fid))} Facility Details
                </AppText>
                {rows.map(({ key, label, unit }) => (
                  <InfoRow key={key} label={label} value={withUnit((details || {})[key], unit)} />
                ))}
              </View>
            ))}
          </SectionCard>
        ) : null}

        {/* ── SECTION 7 · Certifications & Quality Control ────────── */}
        {s7Fields || certs.length > 0 ? (
          <SectionCard icon={Award} title="Certifications & Quality Control">
            <InfoRow label="Compliance Standards" value={fv.complianceStandards} />
            <InfoRow label="Packaging Capabilities" value={fv.packagingCapabilities} />
            <InfoRow label="Logistics Partners" value={fv.logisticsPartners} />
            {Array.isArray(fv.shippingMethods) && fv.shippingMethods.length > 0 ? (
              <ChipGroup label="Shipping Methods" items={fv.shippingMethods} bg="#f1f5f9" text="#334155" />
            ) : null}
            {certs.length > 0 ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Catalog Certifications ({certs.length})</AppText>
                <View style={{ rowGap: 10 }}>
                  {certs.map((cert: any, idx: number) => {
                    const status = cert.expiryDate ? certExpiryStatus(cert.expiryDate) : null;
                    return (
                      <View
                        key={cert.id || idx}
                        className="border border-slate-200 rounded-xl p-3"
                        style={{ backgroundColor: '#f8fafc' }}
                      >
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="rounded px-2.5 py-0.5" style={{ backgroundColor: brand[50], flexShrink: 1 }}>
                            <AppText variant="labelSm" color={brand[600]} numberOfLines={1}>{cert.name}</AppText>
                          </View>
                          {cert.documentUrl ? (
                            <TouchableOpacity
                              onPress={() => openDoc(cert.documentUrl, cert.name)}
                              className="flex-row items-center rounded-lg px-2.5 py-1"
                              style={{ backgroundColor: brand[50], flexShrink: 0, marginLeft: 8 }}
                            >
                              <Eye size={13} color={brand[600]} />
                              <AppText variant="labelSm" color={brand[600]} style={{ marginLeft: 4 }} numberOfLines={1}>View</AppText>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        <InfoRow label="Issued By" value={cert.issuedBy} />
                        <InfoRow label="Certificate #" value={cert.certificateNumber} />
                        {cert.expiryDate ? (
                          <View className="pt-2">
                            <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>Expiry Date</AppText>
                            <View className="flex-row items-center flex-wrap" style={{ columnGap: 6, rowGap: 4 }}>
                              <Calendar size={13} color="#64748b" />
                              <AppText variant="bodySm" color={colors.text}>{formatDate(cert.expiryDate)}</AppText>
                              {status ? (
                                <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: status.bg }}>
                                  <AppText variant="labelSm" color={status.text} style={{ fontSize: 10, lineHeight: 13 }}>{status.label}</AppText>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        ) : (
                          <AppText variant="bodySm" color={colors.textFaint} style={{ paddingTop: 8 }}>No expiry date set</AppText>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── SECTION 8 · Contact & Trade Information ──────────────── */}
        {s8Fields || contactPersons.length > 0 ? (
          <SectionCard icon={FileText} title="Contact & Trade Information">
            {fv.importExperience !== undefined && fv.importExperience !== null ? (
              <InfoRow label="Import Experience" value={fv.importExperience ? 'Yes' : 'No'} />
            ) : null}
            {fv.exportExperience !== undefined && fv.exportExperience !== null ? (
              <InfoRow label="Export Experience" value={fv.exportExperience ? 'Yes' : 'No'} />
            ) : null}
            {Array.isArray(fv.importCountries) && fv.importCountries.length > 0 ? (
              <View className="pt-3 border-t border-slate-100 mt-1">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Import Countries</AppText>
                {countryChips(fv.importCountries)}
              </View>
            ) : null}
            {Array.isArray(fv.exportCountries) && fv.exportCountries.length > 0 ? (
              <View className="pt-3 border-t border-slate-100 mt-1">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Export Countries</AppText>
                {countryChips(fv.exportCountries)}
              </View>
            ) : null}
            {contactPersons.length > 0 ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>Contact Persons ({contactPersons.length})</AppText>
                <View style={{ rowGap: 10 }}>
                  {contactPersons.map((contact: any, idx: number) => {
                    const nameParts = [contact.firstName, contact.middleName, contact.lastName].filter(Boolean);
                    const fullName = nameParts.length > 0 ? nameParts.join(' ') : contact.name || '';
                    const designation = contact.designation === 'Others' ? contact.customDesignation : contact.designation;
                    const department = contact.department === 'Others' ? contact.customDepartment : contact.department;
                    const localLL = formatLocalLandline({
                      countryCode: '+91',
                      std: contact.localLandlineStd,
                      number: contact.localLandline || contact.landline,
                    });
                    const intlLL = formatIntlLandline(
                      contact.intlLandlineNumber
                        ? `+${contact.intlLandlineCountryCode || ''} ${contact.intlLandlineStd || ''} ${contact.intlLandlineNumber}`.trim()
                        : contact.intlLandline,
                    );
                    return (
                      <View
                        key={idx}
                        className="border border-slate-200 rounded-xl p-3"
                        style={{ backgroundColor: '#f8fafc' }}
                      >
                        {contact.photo ? (
                          <View className="items-center mb-2">
                            <TouchableOpacity
                              onPress={() => openDoc(contact.photo, fullName || 'Contact')}
                              activeOpacity={0.85}
                            >
                              <Image
                                source={{ uri: contact.photo }}
                                style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#e2e8f0' }}
                                resizeMode="cover"
                              />
                            </TouchableOpacity>
                          </View>
                        ) : null}
                        <AppText variant="titleMd" color={colors.text} style={{ marginBottom: 4 }}>{contact._label}</AppText>
                        <InfoRow label="Name" value={fullName} />
                        <InfoRow label="Designation" value={designation} />
                        <InfoRow label="Department" value={department} />
                        <InfoRow label="Primary Email" value={contact.email1 || contact.email} />
                        <InfoRow label="Secondary Email" value={contact.email2} />
                        <InfoRow label="Primary Phone" value={contact.phone1 || contact.phone} />
                        <InfoRow label="Secondary Phone" value={contact.phone2} />
                        <InfoRow label="Local Landline Number" value={localLL} />
                        <InfoRow label="International Landline Number" value={intlLL} />
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </SectionCard>
        ) : null}

        {/* ── SECTION 9 · Banking Details ─────────────────────────── */}
        {bank && bank.bankName ? (
          <SectionCard icon={Landmark} title="Banking Details">
            <InfoRow label="Bank Name" value={bank.bankName} />
            <InfoRow
              label="Account Number"
              value={
                bank.accountNumber
                  ? bank.accountNumber.length > 4
                    ? `**** **** ${bank.accountNumber.slice(-4)}`
                    : bank.accountNumber
                  : null
              }
            />
            <InfoRow label="IFSC Code" value={bank.ifscCode} />
            <InfoRow label="SWIFT / BIC Code" value={bank.swiftCode} />
            <InfoRow label="IBAN Number" value={bank.iban} />
            <InfoRow label="Account Type" value={bank.accountType} />
            <InfoRow label="Account Holder Name" value={bank.accountHolderName} />
            <InfoRow label="Branch Name" value={bank.branchName} />
            <InfoRow label="Branch Address" value={bank.branchAddress} />
            {bank.isVerified ? (
              <View className="pt-3">
                <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 6 }}>Verification Status</AppText>
                <View
                  className="flex-row items-center self-start rounded-full px-2.5 py-1"
                  style={{ backgroundColor: '#d1fae5' }}
                >
                  <CheckCircle size={13} color="#065f46" />
                  <AppText variant="labelSm" color="#065f46" style={{ marginLeft: 4 }}>Verified</AppText>
                </View>
              </View>
            ) : null}
          </SectionCard>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Header
        onBack={() => router.back()}
        insetsTop={insets.top}
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand[500]} colors={[brand[500]]} />
        }
      >
        {/* Top meta row: derived main + inspection status + QC assignee */}
        <View className="px-4 pt-4 flex-row flex-wrap items-center" style={{ rowGap: 8, columnGap: 8 }}>
  {currentMainStatus ? (
    <View
      className="flex-row items-center rounded-full px-4 py-2"
      style={{
        backgroundColor: mainStatusStyle(currentMainStatus).bg,
        borderWidth: 1.5,
        borderColor: `${mainStatusStyle(currentMainStatus).text}33`,
        shadowColor: mainStatusStyle(currentMainStatus).text,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View
        className="rounded-full mr-2"
        style={{ width: 8, height: 8, backgroundColor: mainStatusStyle(currentMainStatus).text }}
      />
      <Text
        style={{
          color: mainStatusStyle(currentMainStatus).text,
          fontSize: 12,
          fontWeight: '500',
          letterSpacing: 0.1,
        }}
      >
        {currentMainStatus}
      </Text>
    </View>
  ) : null}

  {currentInspectionStatus ? (
    <View
      className="flex-row items-center rounded-full px-4 py-2"
      style={{
        backgroundColor: inspectionStatusStyle(currentInspectionStatus).bg,
        borderWidth: 1.5,
        borderColor: `${inspectionStatusStyle(currentInspectionStatus).text}33`,
        shadowColor: inspectionStatusStyle(currentInspectionStatus).text,
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View
        className="rounded-full mr-2"
        style={{ width: 8, height: 8, backgroundColor: inspectionStatusStyle(currentInspectionStatus).text }}
      />
      <Text
        style={{
          color: inspectionStatusStyle(currentInspectionStatus).text,
          fontSize: 12,
          fontWeight: '500',
          letterSpacing: 0.1,
        }}
      >
        Inspection: {currentInspectionStatus}
      </Text>
    </View>
  ) : null}

  {fullVendor?.assignedQc?.name ? (
    <View className="bg-slate-100 rounded-full px-3.5 py-1.5 border border-slate-200">
      <AppText variant="labelMd" color={colors.textSecondary} style={{ fontWeight: '900' }}>
        QC: {fullVendor.assignedQc.name}
      </AppText>
    </View>
  ) : null}
</View>
        
        {isCompleted ? (
          /* Compact completed view — assignment done, full vendor profile hidden */
          <View className="mx-4 mt-4 bg-white rounded-2xl border border-slate-200 p-4">
            <CompletedRow icon={<Factory size={18} color={brand[600]} />} label="Vendor Name" value={companyName} />
            <CompletedRow icon={<MapPin size={18} color={brand[600]} />} label="Location" value={location} />
            <View className="flex-row items-center py-2.5">
              <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center mr-3">
                <BarChart3 size={18} color={brand[600]} />
              </View>
              <View className="flex-1">
                <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Inspection Status
                </AppText>
                <View
                  className="self-start rounded-full px-2.5 py-0.5 mt-1"
                  style={{ backgroundColor: inspectionStatusStyle(currentInspectionStatus).bg }}
                >
                  <AppText variant="labelSm" color={inspectionStatusStyle(currentInspectionStatus).text}>
                    {currentInspectionStatus}
                  </AppText>
                </View>
              </View>
            </View>
            <CompletedRow
              icon={<Calendar size={18} color={brand[600]} />}
              label="Submitted Date"
              value={fullVendor?.submittedAt ? formatDate(fullVendor.submittedAt) : '—'}
            />
            <CompletedRow
              icon={<CheckCircle size={18} color={brand[600]} />}
              label="Approved Date"
              value={fullVendor?.approvedAt ? formatDate(fullVendor.approvedAt) : '—'}
            />
          </View>
        ) : (
        <>
        {/* Brand summary card */}
        <View className="mx-4 mt-4 rounded-2xl p-5" style={{ backgroundColor: brand[500] }}>
          <SummaryRow
            icon={<Factory size={18} color="#ffffff" />}
            label="Vendor"
            value={companyName}
          />
          <SummaryRow
            icon={<MapPin size={18} color="#ffffff" />}
            label="Location"
            value={location}
          />
          <SummaryRow
            icon={<Calendar size={18} color="#ffffff" />}
            label="Last Inspection"
            value={stats?.lastInspectionDate ? formatDate(stats.lastInspectionDate) : 'No inspections yet'}
          />
          <SummaryRow
            icon={<BarChart3 size={18} color="#ffffff" />}
            label="Total Inspections"
            value={String(stats?.totalInspections ?? 0)}
            isLast
          />
        </View>

        {/* Start / Continue CTA */}
        {firstUpcoming ? (
          <View className="mx-4 mt-3">
            <Button
              onPress={handleStartInspectionFlow}
              variant="primary"
              icon={Play}
              fullWidth
              label={`${isContinuing ? 'Continue' : 'Start Now'}${firstUpcoming.poNumber ? ` (${firstUpcoming.poNumber})` : ''}`}
            />
          </View>
        ) : null}

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4 mb-3"
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.7}
                className={`mx-1 px-4 py-2 rounded-full ${
                  isActive ? 'bg-brand-500' : 'bg-white border border-slate-200'
                }`}
              >
                <Text
                  className={`text-sm font-bold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {activeTab === 'overview' ? renderOverview() : null}

        {activeTab === 'history' ? (
          <View className="mx-4" style={{ rowGap: 16 }}>
            {/* ── Inspection History ────────────────────────────────────── */}
            <SectionCard
              icon={FileText}
              title="Inspection History"
              subtitle={
                recentInspections.length === 0
                  ? 'Completed reports will appear here'
                  : historyMeta && historyMeta.total > 0
                    ? `Showing ${historyMeta.returned} of ${historyMeta.total}`
                    : `${recentInspections.length} completed`
              }
              right={
                recentInspections.length > 0 ? (
                  <View className="rounded-full bg-white px-2.5 py-0.5">
                    <AppText variant="labelSm" color={brand[600]}>
                      {historyMeta?.total ?? recentInspections.length}
                    </AppText>
                  </View>
                ) : undefined
              }
              bodyPadded={false}
            >

              {/* Inspection cards */}
              {recentInspections.length > 0 ? (
                <View className="p-3" style={{ gap: 10 }}>
                  {recentInspections.map((insp: any) => {
                    const badge = getInspectionRowBadge(insp);
                    const scoreNum = typeof insp.score === 'number' ? insp.score : null;
                    const scoreColor =
                      scoreNum === null
                        ? '#94A3B8'
                        : scoreNum >= 8
                          ? '#059669'
                          : scoreNum >= 6
                            ? '#D97706'
                            : '#DC2626';
                    const scoreBg =
                      scoreNum === null
                        ? '#F1F5F9'
                        : scoreNum >= 8
                          ? '#ECFDF5'
                          : scoreNum >= 6
                            ? '#FFFBEB'
                            : '#FEF2F2';
                    const isPassed = badge.label === 'Passed' || badge.label === 'Completed';
                    const isFailed = badge.label === 'Failed' || badge.label === 'Rejected';
                    const dateLabel =
                      formatDate(insp.scheduledDate) || insp.scheduledDate || '';

                    return (
                      <TouchableOpacity
                        key={insp.id}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Inspection ${insp.poNumber}, ${insp.clientName}, ${badge.label}`}
                        className="rounded-xl overflow-hidden"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderWidth: 1,
                          borderColor: '#E2E8F0',
                        }}
                      >
                        {/* Card content */}
                        <View className="flex-row">
                          {/* Left accent bar */}
                          <View
                            style={{
                              width: 4,
                              backgroundColor: badge.text,
                              borderTopLeftRadius: 12,
                              borderBottomLeftRadius: 12,
                            }}
                          />

                          {/* Main content */}
                          <View className="flex-1 p-3.5" style={{ gap: 10 }}>
                            {/* Top row: PO + Date */}
                            <View className="flex-row items-center justify-between">
                              <View
                                className="rounded-md px-2 py-0.5"
                                style={{ backgroundColor: '#F1F5F9' }}
                              >
                                <Text className="text-[11px] font-bold font-mono text-slate-600">
                                  {insp.poNumber || '—'}
                                </Text>
                              </View>
                              <View className="flex-row items-center" style={{ gap: 4 }}>
                                <Calendar size={11} color="#94A3B8" />
                                <Text className="text-[11px] text-slate-400 font-medium">
                                  {dateLabel}
                                </Text>
                              </View>
                            </View>

                            {/* Client name */}
                            <Text
                              className="text-sm font-bold text-slate-900"
                              numberOfLines={1}
                              style={{ lineHeight: 20 }}
                            >
                              {insp.clientName}
                            </Text>

                            {/* Bottom row: Status badge + Score */}
                            <View className="flex-row items-center justify-between">
                              {/* Lifecycle-aware status badge */}
                              <View
                                className="flex-row items-center rounded-full px-2.5 py-1"
                                style={{ backgroundColor: badge.bg, gap: 4 }}
                              >
                                {isPassed ? (
                                  <CheckCircle size={12} color={badge.text} />
                                ) : isFailed ? (
                                  <AlertCircle size={12} color={badge.text} />
                                ) : (
                                  <Clock size={12} color={badge.text} />
                                )}
                                <Text
                                  className="text-[10px] font-bold uppercase"
                                  style={{ color: badge.text }}
                                >
                                  {badge.label}
                                </Text>
                              </View>

                              {/* Score chip */}
                              {scoreNum !== null ? (
                                <View
                                  className="flex-row items-center rounded-lg px-2.5 py-1"
                                  style={{ backgroundColor: scoreBg, gap: 6 }}
                                >
                                  {/* Mini score ring */}
                                  <View
                                    className="w-5 h-5 rounded-full items-center justify-center"
                                    style={{
                                      borderWidth: 2,
                                      borderColor: scoreColor,
                                    }}
                                  >
                                    <Text
                                      className="font-extrabold"
                                      style={{
                                        color: scoreColor,
                                        fontSize: 8,
                                        lineHeight: 10,
                                      }}
                                    >
                                      {scoreNum}
                                    </Text>
                                  </View>
                                  <Text
                                    className="text-[11px] font-bold"
                                    style={{ color: scoreColor }}
                                  >
                                    / 10
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Lifecycle timestamps: Scheduled / Started / Completed */}
                            <View className="pt-1 border-t border-slate-100" style={{ rowGap: 3 }}>
                              <Text className="text-[10px] text-slate-500">
                                Scheduled: {insp.scheduledDate || '—'}
                                {insp.scheduledTime ? ` at ${formatTime12(insp.scheduledTime)}` : ''}
                              </Text>
                              <Text className="text-[10px] text-slate-500">
                                Started: {insp.startedAt ? formatDateTime(insp.startedAt) : '—'}
                              </Text>
                              <Text className="text-[10px] text-slate-500">
                                Completed: {(insp.completedAt || insp.submittedAt) ? formatDateTime(insp.completedAt || insp.submittedAt) : '—'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                /* Empty state */
                <View className="items-center py-12" style={{ gap: 8 }}>
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: '#F1F5F9' }}
                  >
                    <FileText size={24} color="#94A3B8" />
                  </View>
                  <Text className="text-sm font-bold text-slate-900">No completed inspections yet.</Text>
                </View>
              )}

              {/* Load more */}
              {historyMeta?.hasMore && (
                <TouchableOpacity
                  onPress={handleLoadMoreHistory}
                  disabled={loading || historyLimit >= 50}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Load more inspections"
                  className="border-t border-slate-100 flex-row items-center justify-center"
                  style={{
                    paddingVertical: 14,
                    opacity: loading || historyLimit >= 50 ? 0.5 : 1,
                  }}
                >
                  <RefreshCw size={14} color={brand[500]} />
                  <AppText variant="titleMd" color={brand[600]} style={{ marginLeft: 8 }}>
                    {historyLimit >= 50 ? 'Showing max 50' : 'Load older inspections'}
                  </AppText>
                </TouchableOpacity>
              )}
            </SectionCard>
          </View>
        ) : null}

        {activeTab === 'upcoming' ? (
          <View className="mx-4">
            <SectionCard icon={Calendar} title="Upcoming Inspections">
              {actualUpcoming.length > 0 ? (
                <View style={{ rowGap: 10 }}>
                  {actualUpcoming.map((insp: any) => {
                    const prio = priorityStyle(insp.priority);
                    return (
                      <View key={insp.id} className="border border-slate-200 rounded-xl p-3.5">
                        <View className="flex-row items-center justify-between mb-2">
                          <View className="rounded px-2 py-0.5" style={{ backgroundColor: brand[50] }}>
                            <Text className="text-xs font-mono font-bold" style={{ color: brand[600] }}>
                              {insp.poNumber}
                            </Text>
                          </View>
                          {insp.priority ? (
                            <View className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: prio.bg }}>
                              <Text className="text-[10px] font-bold uppercase" style={{ color: prio.text }}>
                                {insp.priority}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-sm font-semibold text-slate-900 mb-2" numberOfLines={1}>
                          {insp.clientName}
                        </Text>
                        <View className="flex-row" style={{ columnGap: 16 }}>
                          <View className="flex-row items-center">
                            <Calendar size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600 ml-1">
                              {formatDate(insp.scheduledDate) || insp.scheduledDate}
                            </Text>
                          </View>
                          <View className="flex-row items-center">
                            <Clock size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600 ml-1">{formatTime12(insp.scheduledTime)}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <EmptyCard icon={<Calendar size={26} color="#94a3b8" />} title="No pending inspections" sub="" />
              )}
            </SectionCard>
          </View>
        ) : null}
        </>
        )}

      </ScrollView>

      {/* Floating scroll-nav button — Down arrow near top scrolls to bottom;
          Up arrow near bottom scrolls back to top. Hidden while at rest at top. */}
      {showScrollBtn ? (
        <TouchableOpacity
          onPress={isNearBottom ? scrollToTop : scrollToBottom}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isNearBottom ? 'Scroll to top' : 'Scroll to bottom'}
          className="items-center justify-center"
          style={{
            position: 'absolute',
            right: 18,
            bottom: insets.bottom + 22,
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: brand[500],
            shadowColor: '#0f172a',
            shadowOpacity: 0.25,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}
        >
          {isNearBottom ? (
            <ChevronUp size={22} color="#ffffff" strokeWidth={2.5} />
          ) : (
            <ChevronDown size={22} color="#ffffff" strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      ) : null}

      {/* Fullscreen image lightbox for registered document images */}
      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <View className="flex-1 bg-black/95">
          <View
            className="flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
          >
            <Text className="text-white text-sm font-semibold flex-1 mr-3" numberOfLines={1}>
              {lightbox?.name}
            </Text>
            <TouchableOpacity
              onPress={() => setLightbox(null)}
              hitSlop={10}
              className="w-9 h-9 items-center justify-center rounded-full bg-white/15"
            >
              <XIcon size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <View className="flex-1 items-center justify-center px-4 pb-8">
            {lightbox ? (
              <Image
                source={{ uri: lightbox.url }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Reusable bits ───────────────────────────────────────────────────────────

function DocTile({
  url,
  name,
  typeLabel,
  onOpen,
}: {
  url?: string | null;
  name: string;
  typeLabel?: string;
  onOpen: () => void;
}) {
  const isImg = isImageDoc(url, name);
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.85}
      className="rounded-xl border border-slate-200 bg-slate-50 p-2"
      style={{ width: 112 }}
    >
      <View
        className="rounded-lg overflow-hidden items-center justify-center bg-white border border-slate-200"
        style={{ width: 96, height: 96 }}
      >
        {isImg && url ? (
          <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <FileText size={34} color="#cbd5e1" />
        )}
      </View>
      {typeLabel ? (
        <AppText variant="labelSm" color={colors.textFaint} style={{ fontSize: 9, lineHeight: 12, marginTop: 6, textTransform: 'uppercase' }} numberOfLines={1}>
          {typeLabel}
        </AppText>
      ) : null}
      <View className="flex-row items-center mt-0.5">
        {isImg ? <Eye size={11} color={brand[500]} /> : <ExternalLink size={11} color={brand[500]} />}
        <AppText variant="labelSm" color={colors.textSecondary} style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
          {name}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

function Header({
  onBack,
  insetsTop,
}: {
  onBack: () => void;
  insetsTop: number;
}) {
  return (
    <View
      className="bg-white border-b border-slate-100 flex-row items-center justify-between px-4 pb-3"
      style={{ paddingTop: insetsTop + 8 }}
    >
      <TouchableOpacity
        onPress={onBack}
        hitSlop={10}
        activeOpacity={0.7}
        className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
      >
        <ArrowLeft size={20} color="#0f172a" />
      </TouchableOpacity>
      <AppText variant="titleLg" color={colors.text}>Vendor Details</AppText>
      <View className="w-10" />
    </View>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 p-4">
      <View className="flex-row items-center mb-3">
        <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center mr-3">
          {icon}
        </View>
        <AppText variant="titleLg" color={colors.text}>{title}</AppText>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View className="py-3 border-b border-slate-100">
      <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 4 }}>{label}</AppText>
      <AppText variant="bodySm" color={colors.text} style={{ lineHeight: 20 }} selectable>
        {String(value)}
      </AppText>
    </View>
  );
}

// Icon + label + value row used by the compact completed-summary view.
function CompletedRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | number | null;
}) {
  return (
    <View className="flex-row items-center py-2.5">
      <View className="w-9 h-9 rounded-xl bg-brand-50 items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <AppText variant="labelSm" color={colors.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </AppText>
        <AppText variant="titleMd" color={colors.text} numberOfLines={2}>
          {value === null || value === undefined || value === '' ? '—' : String(value)}
        </AppText>
      </View>
    </View>
  );
}

function ChipGroup({
  label,
  items,
  bg,
  text,
}: {
  label: string;
  items: string[];
  bg: string;
  text: string;
}) {
  return (
    <View className="pt-3 border-t border-slate-100 mt-1">
      <AppText variant="labelMd" color={colors.textMuted} style={{ marginBottom: 8 }}>{label}</AppText>
      <View className="flex-row flex-wrap" style={{ rowGap: 6, columnGap: 6 }}>
        {items.map((item, i) => (
          <View key={i} className="rounded-lg px-2.5 py-1" style={{ backgroundColor: bg }}>
            <AppText variant="labelSm" color={text}>
              {item}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View className={`flex-row items-center ${isLast ? '' : 'mb-3'}`}>
      <View
        className="w-9 h-9 items-center justify-center rounded-lg mr-3"
        style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
      >
        {icon}
      </View>
      <View className="flex-1">
        <AppText variant="bodySm" color={brand[100]}>
          {label}
        </AppText>
        <AppText variant="titleMd" color={colors.white} numberOfLines={2}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function EmptyCard({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <View className="bg-white rounded-2xl border border-slate-200 py-10 items-center">
      <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
        {icon}
      </View>
      <AppText variant="titleMd" color={colors.textSecondary} style={{ marginBottom: 4 }}>{title}</AppText>
      {sub ? <AppText variant="bodySm" color={colors.textMuted}>{sub}</AppText> : null}
    </View>
  );
}

function VendorDetailSkeleton({
  onBack,
  insetsTop,
}: {
  onBack: () => void;
  insetsTop: number;
}) {
  const Block = ({
    w,
    h,
    style,
  }: {
    w: number | string;
    h: number;
    style?: any;
  }) => (
    <View
      className="bg-slate-200"
      style={{ width: w as any, height: h, borderRadius: 8, ...style }}
    />
  );
  return (
    <View className="flex-1 bg-slate-50">
      <Header onBack={onBack} insetsTop={insetsTop} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-4 flex-row" style={{ columnGap: 6 }}>
          <Block w={80} h={22} style={{ borderRadius: 999 }} />
          <Block w={100} h={22} style={{ borderRadius: 999 }} />
        </View>
        <View className="mx-4 mt-4 bg-slate-300/60 rounded-2xl p-5">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className={`flex-row items-center ${i === 3 ? '' : 'mb-3'}`}>
              <View className="w-9 h-9 bg-slate-300 rounded-lg mr-3" />
              <View className="flex-1">
                <Block w="30%" h={10} />
                <View style={{ height: 6 }} />
                <Block w="60%" h={14} />
              </View>
            </View>
          ))}
        </View>
        <View className="mx-4 mt-5" style={{ rowGap: 10 }}>
          {[0, 1].map((i) => (
            <View key={i} className="bg-white rounded-2xl p-4 border border-slate-200">
              <View className="flex-row items-center mb-3">
                <View className="w-9 h-9 bg-slate-200 rounded-xl mr-3" />
                <Block w={160} h={14} />
              </View>
              {[0, 1, 2, 3].map((j) => (
                <View key={j} className="py-3 border-b border-slate-100">
                  <Block w={90} h={10} />
                  <View style={{ height: 6 }} />
                  <Block w="80%" h={14} />
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}