import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import {
  ArrowLeft,
  User,
  Mail,
  Briefcase,
  MapPin,
  CalendarDays,
  FileText,
  ExternalLink,
  X as XIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import qcCheckerService, { QCCheckerData } from '../../services/qcCheckerService';
import { API_BASE_URL } from '../../lib/apiBase';
import { AppText, SectionCard } from '@/components/UI';
import { brand, colors, space } from '@/constants/design';

// Decide whether an ID-proof reference is a PDF (mirrors web CheckerSettings).
const isPdfIdProof = (v?: string | null) =>
  !!v && (v.startsWith('data:application/pdf') || v.toLowerCase().endsWith('.pdf'));

// Build the backend document-proxy URL for Cloudinary-hosted files so they open
// through our API rather than hitting Cloudinary directly (which 401s). Non-
// Cloudinary URLs are returned untouched. (Same logic as the vendor detail page.)
const proxiedDocUrl = (url: string): string => {
  try {
    const host = new URL(url).hostname;
    if (/^res\.cloudinary\.com$/i.test(host)) {
      return `${API_BASE_URL}/document-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    /* non-URL string (e.g. data: URI): return as-is */
  }
  return url;
};

type ViewProfileProps = {
  onClose: () => void;
};

// title + name, mirroring web's formatCheckerName().
function formatCheckerName(
  checker: { title?: string | null; name?: string | null } | null | undefined,
): string {
  if (!checker) return '';
  return [checker.title, checker.name].filter(Boolean).join(' ');
}

// Locale date (en-IN, DD/MM/YYYY) — mirrors web's formatDate().
function formatDate(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN');
}

// Display-only field row: uppercase muted label + slate-900 value, "—" when empty.
function Field({ label, value }: { label: string; value?: string | number | null }) {
  const hasValue = value !== undefined && value !== null && value !== '';
  return (
    <View>
      <AppText
        variant="labelMd"
        color={colors.textMuted}
        style={{ textTransform: 'uppercase', marginBottom: 6 }}
      >
        {label}
      </AppText>
      <View className="border border-slate-200 rounded-xl bg-slate-50 px-4 py-3" style={{ minHeight: 46, justifyContent: 'center' }}>
        <AppText variant="bodyMd" color={hasValue ? colors.text : colors.textFaint}>
          {hasValue ? String(value) : '—'}
        </AppText>
      </View>
    </View>
  );
}

// Three-state status badge (raw enum) with distinct colors — mirrors web.
function StatusBadge({ status }: { status?: string | null }) {
  const s = status || '';
  const style =
    s === 'ACTIVE'
      ? { bg: '#ecfdf3', fg: '#047857', border: '#a7f3d0' }
      : s === 'SUSPENDED'
        ? { bg: '#fef2f2', fg: '#b91c1c', border: '#fecaca' }
        : { bg: '#f1f5f9', fg: '#475569', border: '#e2e8f0' };
  return (
    <View
      className="self-start rounded-lg px-3 py-1.5 border"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <AppText variant="labelLg" color={style.fg}>
        {s || '—'}
      </AppText>
    </View>
  );
}

export function ViewProfile({ onClose }: ViewProfileProps) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<QCCheckerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [idProofLightbox, setIdProofLightbox] = useState(false);
  // ID proof blob is fetched on demand (kept out of the initial profile load).
  const [idProofData, setIdProofData] = useState<string | null>(null);
  const [idProofLoading, setIdProofLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await qcCheckerService.getCheckerProfile();
        if (active && res.success && res.data) {
          setProfile(res.data);
        }
      } catch (error) {
        console.error('Error loading checker info:', error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Lazily fetch the ID proof blob (base64/URL) — it's excluded from the initial
  // profile load to keep that fast on slow connections. Cached after first fetch.
  const ensureIdProof = async (): Promise<string | null> => {
    if (idProofData) return idProofData;
    const res = await qcCheckerService.getCheckerIdProof();
    const val = res?.data?.idProof || null;
    setIdProofData(val);
    return val;
  };

  // Open the ID proof: images go to an in-app lightbox, PDFs open in the
  // system browser (mirrors web's viewer behaviour).
  const openIdProof = async () => {
    if (!profile?.hasIdProof || idProofLoading) return;
    setIdProofLoading(true);
    try {
      const idProof = await ensureIdProof();
      if (!idProof) {
        Alert.alert('Unable to open', 'ID proof is not available.');
        return;
      }
      // Images (remote URL or base64 data URI) → in-app lightbox.
      if (!isPdfIdProof(idProof)) {
        setIdProofLightbox(true);
        return;
      }
      if (idProof.startsWith('data:')) {
        // base64 data-URI PDF — WebBrowser can't open data: URIs, so write it
        // to a cache file and hand it to the OS share/open sheet.
        const base64 = idProof.substring(idProof.indexOf(',') + 1);
        const fileUri = `${FileSystem.cacheDirectory}id-proof-${Date.now()}.pdf`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'ID Proof' });
        } else {
          await WebBrowser.openBrowserAsync(fileUri);
        }
      } else {
        // remote PDF (e.g. Cloudinary) — open through the backend document-proxy.
        await WebBrowser.openBrowserAsync(proxiedDocUrl(idProof));
      }
    } catch (err: any) {
      Alert.alert('Unable to open', err?.message || 'Could not open the ID proof.');
    } finally {
      setIdProofLoading(false);
    }
  };

  const fullName = formatCheckerName(profile) || profile?.name || '';
  const hasSecondaryEmail = !!profile?.alternateEmail;
  const hasSecondaryPhone = !!profile?.alternatePhone;

  return (
    <View style={{ flex: 1, backgroundColor: brand[500], paddingTop: insets.top }}>
      {/* Uniform red status bar — transparent + light icons removes the dark
          scrim that made the top band look two-tone. */}
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {/* bottom safe-area painted slate (not red) so no red "footer" strip shows. */}
      <View className="flex-1 bg-slate-50" style={{ paddingBottom: insets.bottom }}>
        {/* Header — red AppBar (kept) */}
        <View className="bg-brand-500 px-4 pt-2 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.7}
              className="rounded-full bg-white/15 items-center justify-center mr-3"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <AppText variant="headlineSm" color={colors.white}>Profile</AppText>
              <AppText variant="bodySm" color="rgba(255,255,255,0.85)">
                View your personal details and account information
              </AppText>
            </View>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={brand[500]} />
          </View>
        ) : (
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 24 }}>
            {/* 1. Profile Information */}
            <SectionCard icon={User} title="Profile Information" subtitle="Your account identity">
              <View style={{ gap: space.xl }}>
                <View className="flex-row items-center" style={{ gap: space.lg }}>
                  <View
                    className="rounded-full border border-slate-200 bg-slate-50 items-center justify-center overflow-hidden"
                    style={{ width: 88, height: 88 }}
                  >
                    {profile?.profilePhoto ? (
                      <Image
                        source={{ uri: profile.profilePhoto }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <User size={40} color="#cbd5e1" strokeWidth={1.75} />
                    )}
                  </View>
                </View>
                <Field label="Checker ID" value={profile?.checkerId} />
                <Field label="Full Name" value={fullName} />
                <View>
                  <AppText
                    variant="labelMd"
                    color={colors.textMuted}
                    style={{ textTransform: 'uppercase', marginBottom: 6 }}
                  >
                    Status
                  </AppText>
                  <StatusBadge status={profile?.status} />
                </View>
              </View>
            </SectionCard>

            {/* 2. Contact Information */}
            <SectionCard icon={Mail} title="Contact Information" subtitle="How we reach you">
              <View style={{ gap: space.xl }}>
                <Field label="Primary Email" value={profile?.email} />
                <Field label="Primary Phone" value={profile?.phone} />
                {hasSecondaryEmail ? (
                  <Field label="Secondary Email" value={profile?.alternateEmail} />
                ) : null}
                {hasSecondaryPhone ? (
                  <Field label="Secondary Phone" value={profile?.alternatePhone} />
                ) : null}
              </View>
            </SectionCard>

            {/* 3. Personal Information */}
            <SectionCard icon={CalendarDays} title="Personal Information">
              <View style={{ gap: space.xl }}>
                <Field label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
                <Field label="Joining Date" value={formatDate(profile?.joiningDate)} />
              </View>
            </SectionCard>

            {/* 4. Address Information */}
            <SectionCard icon={MapPin} title="Address Information">
              <View style={{ gap: space.xl }}>
                <Field label="Address Line 1" value={profile?.address} />
                <Field label="City" value={profile?.city} />
                <Field label="State / Province" value={profile?.state} />
                <Field label="PIN / ZIP Code" value={profile?.zipCode} />
                <Field label="Country" value={profile?.country} />
              </View>
            </SectionCard>

            {/* 5. Professional Information */}
            <SectionCard icon={Briefcase} title="Professional Information">
              <View style={{ gap: space.xl }}>
                <Field label="Specialization" value={profile?.specialization} />
                <Field label="Years of Experience" value={profile?.experience} />
                <Field label="Certifications" value={profile?.certifications} />
              </View>
            </SectionCard>

            {/* 6. Documents */}
            <SectionCard icon={FileText} title="Documents" subtitle="ID proof">
              <View>
                <AppText
                  variant="labelMd"
                  color={colors.textMuted}
                  style={{ textTransform: 'uppercase', marginBottom: 8 }}
                >
                  ID Proof
                </AppText>
                {profile?.hasIdProof ? (
                  <TouchableOpacity
                    onPress={openIdProof}
                    disabled={idProofLoading}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    className="self-start flex-row items-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-3"
                    style={{ gap: 8, minHeight: 44 }}
                  >
                    <FileText size={16} color={brand[600]} strokeWidth={2.25} />
                    <AppText variant="titleMd" color={brand[600]}>
                      {`View ID Proof${profile.idProofType === 'pdf' ? ' (PDF)' : ''}`}
                    </AppText>
                    {idProofLoading ? (
                      <ActivityIndicator size="small" color={brand[600]} />
                    ) : (
                      <ExternalLink size={14} color={brand[600]} strokeWidth={2.25} />
                    )}
                  </TouchableOpacity>
                ) : (
                  <View className="self-start rounded-xl border border-dashed border-slate-200 px-4 py-3">
                    <AppText variant="bodyMd" color={colors.textFaint}>
                      No ID proof uploaded
                    </AppText>
                  </View>
                )}
              </View>
            </SectionCard>
          </ScrollView>
        )}

        {/* ID proof image lightbox (kept) */}
        <Modal
          visible={idProofLightbox}
          transparent
          animationType="fade"
          onRequestClose={() => setIdProofLightbox(false)}
        >
          <View className="flex-1 bg-black/95">
            <View
              className="flex-row items-center justify-between px-4"
              style={{ paddingTop: insets.top + 8, paddingBottom: 8 }}
            >
              <AppText variant="titleMd" color={colors.white} style={{ flex: 1, marginRight: 12 }} numberOfLines={1}>
                ID Proof
              </AppText>
              <TouchableOpacity
                onPress={() => setIdProofLightbox(false)}
                hitSlop={10}
                className="w-9 h-9 items-center justify-center rounded-full bg-white/15"
              >
                <XIcon size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <View className="flex-1 items-center justify-center px-4 pb-8">
              {idProofData ? (
                <Image
                  source={{ uri: proxiedDocUrl(idProofData) }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                />
              ) : null}
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
