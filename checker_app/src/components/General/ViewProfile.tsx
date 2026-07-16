import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
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

import qcCheckerService, { QCCheckerData } from '../../services/qcCheckerService';
import { AppText, SectionCard } from '@/components/UI';
import { brand, colors, space } from '@/constants/design';

// Decide whether an ID-proof reference is a PDF (mirrors web CheckerSettings).
const isPdfIdProof = (v?: string | null) =>
  !!v && (v.startsWith('data:application/pdf') || v.toLowerCase().endsWith('.pdf'));

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

  // Open the ID proof: images go to an in-app lightbox, PDFs open in the
  // system browser (mirrors web's viewer behaviour).
  const openIdProof = async () => {
    const idProof = profile?.idProof;
    if (!idProof) return;
    if (isPdfIdProof(idProof)) {
      try {
        await WebBrowser.openBrowserAsync(idProof);
      } catch {
        Alert.alert('Unable to open', 'Could not open the ID proof.');
      }
    } else {
      setIdProofLightbox(true);
    }
  };

  const fullName = formatCheckerName(profile) || profile?.name || '';
  const hasSecondaryEmail = !!profile?.alternateEmail;
  const hasSecondaryPhone = !!profile?.alternatePhone;

  return (
    <View style={{ flex: 1, backgroundColor: brand[500], paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-1 bg-slate-50">
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
                {profile?.idProof ? (
                  <TouchableOpacity
                    onPress={openIdProof}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    className="self-start flex-row items-center rounded-xl border border-brand-200 bg-brand-50 px-4 py-3"
                    style={{ gap: 8, minHeight: 44 }}
                  >
                    <FileText size={16} color={brand[600]} strokeWidth={2.25} />
                    <AppText variant="titleMd" color={brand[600]}>
                      {`View ID Proof${isPdfIdProof(profile.idProof) ? ' (PDF)' : ''}`}
                    </AppText>
                    <ExternalLink size={14} color={brand[600]} strokeWidth={2.25} />
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
              {profile?.idProof ? (
                <Image
                  source={{ uri: profile.idProof }}
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
