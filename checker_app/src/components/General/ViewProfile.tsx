import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  BarChart3,
  Edit3,
  MapPin,
  Shield,
  Award,
  CheckCircle2,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import qcCheckerService from '../../services/qcCheckerService';

type ViewProfileProps = {
  onClose: () => void;
};

type CheckerInfo = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  dateOfBirth: string;
  role: string;
  department: string;
  joinDate: string;
  status: string;
  specialization: string;
  experience: string;
  certifications: string;
  totalInspections: number;
  location: string;
};

const EMPTY_INFO: CheckerInfo = {
  id: '',
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  dateOfBirth: '',
  role: 'Quality Inspector',
  department: 'Quality Control',
  joinDate: '',
  status: 'active',
  specialization: '',
  experience: '',
  certifications: '',
  totalInspections: 0,
  location: '',
};

function getInitials(name: string): string {
  if (!name) return 'QC';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function tenure(joinIso: string): string {
  if (!joinIso) return '';
  const join = new Date(joinIso);
  if (isNaN(join.getTime())) return '';
  const now = new Date();
  const months =
    (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
  if (months < 1) return 'Joined this month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} at company`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const yearStr = `${years} yr${years === 1 ? '' : 's'}`;
  return rem === 0 ? `${yearStr} at company` : `${yearStr} ${rem} mo at company`;
}

type InfoRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  multiline?: boolean;
  subValue?: string;
};

function InfoRow({ icon, label, value, multiline, subValue }: InfoRowProps) {
  const displayValue = value?.trim() ? value : '—';
  return (
    <View className={`flex-row ${multiline ? 'items-start' : 'items-center'} py-4`}>
      <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mr-4">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
          {label}
        </Text>
        <Text className="text-base font-medium text-slate-900 leading-6">{displayValue}</Text>
        {subValue ? <Text className="text-sm text-slate-500 mt-0.5">{subValue}</Text> : null}
      </View>
    </View>
  );
}

type FormFieldProps = {
  label: string;
  value: string;
  onChange?: (text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
};

function FormField({
  label,
  value,
  onChange,
  placeholder,
  readOnly,
  required,
  keyboardType = 'default',
  autoCapitalize,
  multiline,
}: FormFieldProps) {
  return (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-slate-700 mb-2">
        {label}
        {required ? <Text className="text-red-500"> *</Text> : null}
        {readOnly ? <Text className="text-slate-400 font-normal"> (read-only)</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        editable={!readOnly}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        className={`border rounded-xl px-4 py-3 text-base ${
          readOnly
            ? 'bg-slate-100 border-slate-200 text-slate-500'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
        style={{ minHeight: multiline ? 88 : 48 }}
      />
    </View>
  );
}

export function ViewProfile({ onClose }: ViewProfileProps) {
  const insets = useSafeAreaInsets();
  const [checkerInfo, setCheckerInfo] = useState<CheckerInfo>(EMPTY_INFO);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    dateOfBirth: '',
    specialization: '',
    experience: '',
    certifications: '',
  });

  useEffect(() => {
    loadCheckerInfo();
  }, []);

  const loadCheckerInfo = async () => {
    try {
      const res = await qcCheckerService.getCheckerProfile();
      if (res.success && res.data) {
        const next: CheckerInfo = {
          id: res.data.checkerId || '',
          name: res.data.name || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          city: res.data.city || '',
          state: res.data.state || '',
          zipCode: res.data.zipCode || '',
          country: res.data.country || '',
          dateOfBirth: res.data.dateOfBirth ? res.data.dateOfBirth.split('T')[0] : '',
          role: 'Quality Inspector',
          department: 'Quality Control',
          joinDate: res.data.joiningDate ? res.data.joiningDate.split('T')[0] : '',
          status: res.data.status?.toLowerCase() || 'active',
          specialization: res.data.specialization || '',
          experience: res.data.experience?.toString() || '',
          certifications: res.data.certifications || '',
          totalInspections: res.data.completedInspections || 0,
          location: [res.data.city, res.data.state].filter(Boolean).join(', '),
        };
        setCheckerInfo(next);
        setEditForm({
          name: next.name,
          email: next.email,
          phone: next.phone,
          address: next.address,
          city: next.city,
          state: next.state,
          zipCode: next.zipCode,
          country: next.country,
          dateOfBirth: next.dateOfBirth,
          specialization: next.specialization,
          experience: next.experience,
          certifications: next.certifications,
        });
      }
    } catch (error) {
      console.error('Error loading checker info:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      Alert.alert('Missing info', 'Name and phone number are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await qcCheckerService.updateProfile({
        name: editForm.name,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zipCode: editForm.zipCode,
        country: editForm.country,
      });
      if (res.success && res.data) {
        setCheckerInfo((prev) => ({
          ...prev,
          name: res.data.name || '',
          phone: res.data.phone || '',
          address: res.data.address || '',
          city: res.data.city || '',
          state: res.data.state || '',
          zipCode: res.data.zipCode || '',
          country: res.data.country || '',
          location: [res.data.city, res.data.state].filter(Boolean).join(', '),
        }));
        setShowEditModal(false);
        Alert.alert('Saved', 'Your profile has been updated.');
      } else {
        Alert.alert('Error', 'Failed to update profile');
      }
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const isActive = checkerInfo.status === 'active';
  const addressLines = [
    checkerInfo.address,
    [checkerInfo.city, checkerInfo.state, checkerInfo.zipCode].filter(Boolean).join(', '),
    checkerInfo.country,
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View className="flex-1 bg-slate-50">
        {/* Header */}
        <View className="bg-slate-900 px-4 pt-2 pb-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.7}
              className="rounded-full bg-white/10 items-center justify-center mr-3"
              style={{ minHeight: 44, minWidth: 44 }}
            >
              <ArrowLeft size={20} color="#ffffff" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-lg font-bold text-white">My Profile</Text>
              <Text className="text-sm text-slate-400">Account details</Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Identity card with dark top bleed */}
          <View className="bg-slate-900 pb-16 px-4" />
          <View className="px-4 -mt-20">
            <View className="bg-white rounded-3xl border border-slate-200 p-6" style={{ elevation: 2 }}>
              <View className="flex-row items-center">
                <View
                  className="rounded-2xl bg-blue-600 items-center justify-center"
                  style={{ width: 72, height: 72 }}
                >
                  <Text className="text-white font-bold text-2xl">
                    {getInitials(checkerInfo.name)}
                  </Text>
                </View>
                <View className="flex-1 ml-4">
                  <Text className="text-xl font-bold text-slate-900" numberOfLines={1}>
                    {checkerInfo.name || 'Unnamed inspector'}
                  </Text>
                  <Text className="text-sm text-slate-600 mt-0.5">{checkerInfo.role}</Text>
                  <View className="flex-row items-center mt-2">
                    <View
                      className={`flex-row items-center px-2 py-1 rounded-full ${
                        isActive ? 'bg-emerald-50' : 'bg-slate-100'
                      }`}
                    >
                      <View
                        className={`rounded-full mr-1.5 ${
                          isActive ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        style={{ width: 6, height: 6 }}
                      />
                      <Text
                        className={`text-xs font-semibold ${
                          isActive ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    {checkerInfo.id ? (
                      <View className="ml-2 px-2 py-1 rounded-full bg-slate-100">
                        <Text className="text-xs font-semibold text-slate-700">
                          ID · {checkerInfo.id}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Stats row */}
              <View className="flex-row mt-6 pt-5 border-t border-slate-100">
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-slate-900">
                    {checkerInfo.totalInspections}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1">Inspections</Text>
                </View>
                <View className="w-px bg-slate-200" />
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-slate-900">
                    {checkerInfo.experience || '—'}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1">
                    {checkerInfo.experience ? 'Years exp.' : 'Experience'}
                  </Text>
                </View>
                <View className="w-px bg-slate-200" />
                <View className="flex-1 items-center">
                  <Text className="text-2xl font-bold text-slate-900">
                    {checkerInfo.joinDate
                      ? new Date().getFullYear() - new Date(checkerInfo.joinDate).getFullYear()
                      : '—'}
                  </Text>
                  <Text className="text-xs font-medium text-slate-500 mt-1">
                    {checkerInfo.joinDate ? 'Years here' : 'Tenure'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Contact section */}
          <View className="px-4 mt-6">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Contact
            </Text>
            <View className="bg-white rounded-2xl border border-slate-200 px-4 divide-y divide-slate-100">
              <InfoRow
                icon={<Mail size={18} color="#2563eb" strokeWidth={2} />}
                label="Email"
                value={checkerInfo.email}
              />
              <InfoRow
                icon={<Phone size={18} color="#2563eb" strokeWidth={2} />}
                label="Phone"
                value={checkerInfo.phone}
              />
              <InfoRow
                icon={<MapPin size={18} color="#2563eb" strokeWidth={2} />}
                label="Address"
                multiline
                value={addressLines[0] || ''}
                subValue={addressLines.slice(1).join(' · ')}
              />
            </View>
          </View>

          {/* Professional section */}
          <View className="px-4 mt-6">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Professional
            </Text>
            <View className="bg-white rounded-2xl border border-slate-200 px-4 divide-y divide-slate-100">
              <InfoRow
                icon={<Briefcase size={18} color="#2563eb" strokeWidth={2} />}
                label="Department"
                value={checkerInfo.department}
              />
              <InfoRow
                icon={<Shield size={18} color="#2563eb" strokeWidth={2} />}
                label="Specialization"
                value={checkerInfo.specialization}
              />
              <InfoRow
                icon={<BarChart3 size={18} color="#2563eb" strokeWidth={2} />}
                label="Experience"
                value={checkerInfo.experience ? `${checkerInfo.experience} years` : ''}
              />
              <InfoRow
                icon={<Calendar size={18} color="#2563eb" strokeWidth={2} />}
                label="Join date"
                value={formatDate(checkerInfo.joinDate)}
                subValue={tenure(checkerInfo.joinDate)}
              />
            </View>
          </View>

          {/* Personal section */}
          <View className="px-4 mt-6">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
              Personal
            </Text>
            <View className="bg-white rounded-2xl border border-slate-200 px-4 divide-y divide-slate-100">
              <InfoRow
                icon={<User size={18} color="#2563eb" strokeWidth={2} />}
                label="Full name"
                value={checkerInfo.name}
              />
              <InfoRow
                icon={<Calendar size={18} color="#2563eb" strokeWidth={2} />}
                label="Date of birth"
                value={formatDate(checkerInfo.dateOfBirth)}
              />
            </View>
          </View>

          {/* Certifications */}
          {checkerInfo.certifications ? (
            <View className="px-4 mt-6">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                Certifications
              </Text>
              <View className="bg-white rounded-2xl border border-slate-200 p-4">
                <View className="flex-row items-start">
                  <View className="w-10 h-10 rounded-xl bg-blue-50 items-center justify-center mr-3">
                    <Award size={18} color="#2563eb" strokeWidth={2} />
                  </View>
                  <Text className="flex-1 text-base text-slate-800 leading-6">
                    {checkerInfo.certifications}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Edit action */}
          <View className="px-4 mt-8">
            <TouchableOpacity
              onPress={() => setShowEditModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
              activeOpacity={0.85}
              className="bg-slate-900 rounded-2xl flex-row items-center justify-center"
              style={{ minHeight: 52 }}
            >
              <Edit3 size={18} color="#ffffff" strokeWidth={2} />
              <Text className="text-white font-semibold text-base ml-2">Edit profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Edit Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowEditModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#0f172a', paddingTop: insets.top, paddingBottom: insets.bottom }}>
            <View className="flex-1 bg-slate-50">
              <View className="bg-slate-900 px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <TouchableOpacity
                    onPress={() => setShowEditModal(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing"
                    activeOpacity={0.7}
                    style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
                  >
                    <Text className="text-white text-base font-medium">Cancel</Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-white">Edit profile</Text>
                  <TouchableOpacity
                    onPress={handleSaveProfile}
                    disabled={saving}
                    accessibilityRole="button"
                    accessibilityLabel="Save profile"
                    activeOpacity={0.7}
                    style={{
                      minHeight: 44,
                      minWidth: 44,
                      justifyContent: 'center',
                      alignItems: 'flex-end',
                      opacity: saving ? 0.5 : 1,
                    }}
                  >
                    <View className="flex-row items-center">
                      {saving ? null : <CheckCircle2 size={16} color="#ffffff" />}
                      <Text className="text-white text-base font-semibold ml-1">
                        {saving ? 'Saving…' : 'Save'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 60 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Personal
                </Text>
                <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                  <FormField
                    label="Full name"
                    required
                    value={editForm.name}
                    onChange={(t) => setEditForm((p) => ({ ...p, name: t }))}
                    placeholder="Enter your full name"
                  />
                  <FormField
                    label="Date of birth"
                    readOnly
                    value={editForm.dateOfBirth}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Contact
                </Text>
                <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                  <FormField
                    label="Email"
                    readOnly
                    value={editForm.email}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <FormField
                    label="Phone number"
                    required
                    value={editForm.phone}
                    onChange={(t) => setEditForm((p) => ({ ...p, phone: t }))}
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Address
                </Text>
                <View className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
                  <FormField
                    label="Street address"
                    value={editForm.address}
                    onChange={(t) => setEditForm((p) => ({ ...p, address: t }))}
                    placeholder="Enter street address"
                  />
                  <FormField
                    label="City"
                    value={editForm.city}
                    onChange={(t) => setEditForm((p) => ({ ...p, city: t }))}
                    placeholder="Enter city"
                  />
                  <FormField
                    label="State / Province"
                    value={editForm.state}
                    onChange={(t) => setEditForm((p) => ({ ...p, state: t }))}
                    placeholder="Enter state"
                  />
                  <FormField
                    label="ZIP / Postal code"
                    value={editForm.zipCode}
                    onChange={(t) => setEditForm((p) => ({ ...p, zipCode: t }))}
                    placeholder="Enter ZIP code"
                  />
                  <FormField
                    label="Country"
                    value={editForm.country}
                    onChange={(t) => setEditForm((p) => ({ ...p, country: t }))}
                    placeholder="Enter country"
                  />
                </View>

                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Professional
                </Text>
                <View className="bg-white rounded-2xl border border-slate-200 p-4">
                  <FormField
                    label="Specialization"
                    readOnly
                    value={editForm.specialization}
                    placeholder="e.g., Textile Quality, Manufacturing"
                  />
                  <FormField
                    label="Years of experience"
                    readOnly
                    value={editForm.experience}
                    placeholder="Enter years"
                    keyboardType="numeric"
                  />
                  <FormField
                    label="Certifications"
                    readOnly
                    multiline
                    value={editForm.certifications}
                    placeholder="List any relevant certifications..."
                  />
                </View>
              </KeyboardAwareScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}
