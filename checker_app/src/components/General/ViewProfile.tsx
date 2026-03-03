import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, Modal } from 'react-native';
import { ArrowLeft, User, Mail, Phone, Briefcase, Calendar, BarChart3, Edit3, Lock, Eye, EyeOff, MapPin, Shield } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ViewProfileProps = {
  onClose: () => void;
};

export function ViewProfile({ onClose }: ViewProfileProps) {
  const [checkerInfo, setCheckerInfo] = useState({
    id: 'CHK-001',
    name: 'John Smith',
    email: 'john.smith@qcchecker.com',
    phone: '+91 98765 43210',
    address: '123 Quality Street',
    city: 'Chennai',
    state: 'Tamil Nadu',
    zipCode: '600001',
    country: 'India',
    dateOfBirth: '1990-05-15',
    role: 'Quality Inspector',
    department: 'Quality Control',
    joinDate: '2023-01-15',
    status: 'active',
    specialization: 'Textile Quality Control',
    experience: '5',
    certifications: 'ISO 9001 Quality Management, Six Sigma Green Belt',
    totalInspections: 127,
    passRate: 92,
    location: 'Chennai, Tamil Nadu'
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
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
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    loadCheckerInfo();
  }, []);

  const loadCheckerInfo = async () => {
    try {
      const checkerId = await AsyncStorage.getItem('checkerID');
      if (checkerId) {
        // TODO: Fetch checker info from API
        setCheckerInfo(prev => ({ ...prev, id: checkerId }));
        setEditForm({
          name: checkerInfo.name,
          email: checkerInfo.email,
          phone: checkerInfo.phone,
          address: checkerInfo.address,
          city: checkerInfo.city,
          state: checkerInfo.state,
          zipCode: checkerInfo.zipCode,
          country: checkerInfo.country,
          dateOfBirth: checkerInfo.dateOfBirth,
          specialization: checkerInfo.specialization,
          experience: checkerInfo.experience,
          certifications: checkerInfo.certifications,
        });
      }
    } catch (error) {
      console.error('Error loading checker info:', error);
    }
  };

  const handleEditProfile = () => {
    setEditForm({
      name: checkerInfo.name,
      email: checkerInfo.email,
      phone: checkerInfo.phone,
      address: checkerInfo.address,
      city: checkerInfo.city,
      state: checkerInfo.state,
      zipCode: checkerInfo.zipCode,
      country: checkerInfo.country,
      dateOfBirth: checkerInfo.dateOfBirth,
      specialization: checkerInfo.specialization,
      experience: checkerInfo.experience,
      certifications: checkerInfo.certifications,
    });
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.phone.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // TODO: Save to API
      setCheckerInfo(prev => ({
        ...prev,
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zipCode: editForm.zipCode,
        country: editForm.country,
        dateOfBirth: editForm.dateOfBirth,
        specialization: editForm.specialization,
        experience: editForm.experience,
        certifications: editForm.certifications,
      }));
      
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleChangePassword = () => {
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    try {
      // TODO: Validate current password and save new password to API
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      Alert.alert('Success', 'Password changed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to change password');
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-gray-900 px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onClose} className="mr-3 rounded-full bg-gray-800 p-2">
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <View>
            <Text className="text-lg font-bold text-white">My Profile</Text>
            <Text className="text-xs text-gray-300">Account information</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-4 py-6">
          {/* Profile Card */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            {/* Profile Header */}
            <View className="mb-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 mb-1">{checkerInfo.name}</Text>
                  <Text className="text-sm text-gray-600 mb-2">{checkerInfo.role}</Text>
                  <View className="bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-full self-start">
                    <Text className="text-xs font-bold text-blue-600">ID: {checkerInfo.id}</Text>
                  </View>
                </View>
                <View className="bg-gray-100 rounded-full p-3">
                  <User size={32} color="#374151" strokeWidth={2} />
                </View>
              </View>
            </View>

            {/* Stats Grid */}
            <View className="flex-row gap-3 mb-6">
              <View className="flex-1 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-blue-600 rounded-lg p-2">
                    <BarChart3 size={18} color="#ffffff" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">{checkerInfo.totalInspections}</Text>
                </View>
                <Text className="text-xs font-semibold text-gray-700">Total Inspections</Text>
              </View>
            </View>

            {/* Information Sections */}
            <View className="space-y-3 gap-2">
              {/* Email */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-blue-100 border border-blue-700 rounded-lg p-2.5 mr-4">
                  <Mail size={16} color="#1d4ed8" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Email Address</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.email}</Text>
                </View>
              </View>

              {/* Phone */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-emerald-100 border border-emerald-700 rounded-lg p-2.5 mr-4">
                  <Phone size={16} color="#047857" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Phone Number</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.phone}</Text>
                </View>
              </View>

              {/* Address */}
              <View className="flex-row items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-orange-100 border border-orange-700 rounded-lg p-2.5 mr-4 mt-0.5">
                  <MapPin size={16} color="#c2410c" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Address</Text>
                  <Text className="text-sm font-semibold text-gray-900 mb-1">{checkerInfo.address}</Text>
                  <Text className="text-xs text-gray-600">{checkerInfo.city}, {checkerInfo.state} {checkerInfo.zipCode}</Text>
                  <Text className="text-xs text-gray-600">{checkerInfo.country}</Text>
                </View>
              </View>

              {/* Date of Birth */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-pink-100 border border-pink-700 rounded-lg p-2.5 mr-4">
                  <Calendar size={16} color="#be185d" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Date of Birth</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.dateOfBirth}</Text>
                </View>
              </View>

              {/* Department */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-purple-100 border border-purple-700 rounded-lg p-2.5 mr-4">
                  <Briefcase size={16} color="#7e22ce" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Department</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.department}</Text>
                </View>
              </View>

              {/* Specialization */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-indigo-100 border border-indigo-700 rounded-lg p-2.5 mr-4">
                  <Shield size={16} color="#4338ca" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Specialization</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.specialization}</Text>
                </View>
              </View>

              {/* Experience */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-teal-100 border border-teal-700 rounded-lg p-2.5 mr-4">
                  <BarChart3 size={16} color="#0f766e" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Experience</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.experience} years</Text>
                </View>
              </View>

              {/* Join Date */}
              <View className="flex-row items-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <View className="bg-amber-100 border border-amber-700 rounded-lg p-2.5 mr-4">
                  <Calendar size={16} color="#b45309" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Join Date</Text>
                  <Text className="text-sm font-semibold text-gray-900">{checkerInfo.joinDate}</Text>
                </View>
              </View>

              {/* Certifications */}
              {checkerInfo.certifications && (
                <View className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <Text className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Certifications</Text>
                  <Text className="text-sm font-semibold text-gray-900 leading-relaxed">{checkerInfo.certifications}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-3 gap-2">
            <TouchableOpacity 
              onPress={handleEditProfile}
              className="bg-gray-900 rounded-xl py-4 shadow-sm flex-row items-center justify-center"
            >
              <Edit3 size={18} color="#ffffff" strokeWidth={2} />
              <Text className="text-center text-white font-bold text-sm ml-2">Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={handleChangePassword}
              className="bg-white border-2 border-gray-900 rounded-xl py-4 flex-row items-center justify-center"
            >
              <Lock size={18} color="#111827" strokeWidth={2} />
              <Text className="text-center text-gray-900 font-bold text-sm ml-2">Change Password</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="bg-gray-900 px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-white">Edit Profile</Text>
              <TouchableOpacity onPress={handleSaveProfile}>
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            <View className="space-y-4">
              {/* Personal Information Section */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-4">Personal Information</Text>
                
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Full Name *</Text>
                  <TextInput
                    value={editForm.name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, name: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter your full name"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Date of Birth</Text>
                  <TextInput
                    value={editForm.dateOfBirth}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, dateOfBirth: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="YYYY-MM-DD"
                  />
                </View>
              </View>

              {/* Contact Information Section */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-4">Contact Information</Text>
                
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Email Address *</Text>
                  <TextInput
                    value={editForm.email}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Phone Number *</Text>
                  <TextInput
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter your phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Address Information Section */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-4">Address Information</Text>
                
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Street Address</Text>
                  <TextInput
                    value={editForm.address}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter street address"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">City</Text>
                  <TextInput
                    value={editForm.city}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, city: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter city"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">State/Province</Text>
                  <TextInput
                    value={editForm.state}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, state: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter state"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">ZIP/Postal Code</Text>
                  <TextInput
                    value={editForm.zipCode}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, zipCode: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter ZIP code"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Country</Text>
                  <TextInput
                    value={editForm.country}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, country: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter country"
                  />
                </View>
              </View>

              {/* Professional Information Section */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-900 mb-4">Professional Information</Text>
                
                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Specialization</Text>
                  <TextInput
                    value={editForm.specialization}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, specialization: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="e.g., Textile Quality, Manufacturing"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Years of Experience</Text>
                  <TextInput
                    value={editForm.experience}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, experience: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="Enter years"
                    keyboardType="numeric"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Certifications</Text>
                  <TextInput
                    value={editForm.certifications}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, certifications: text }))}
                    className="bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
                    placeholder="List any relevant certifications..."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="bg-gray-900 px-4 py-4">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold text-white">Change Password</Text>
              <TouchableOpacity onPress={handleSavePassword}>
                <Text className="text-white font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">Current Password</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
                  <TextInput
                    value={passwordForm.currentPassword}
                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                    className="flex-1 text-gray-900"
                    placeholder="Enter current password"
                    secureTextEntry={!showPasswords.current}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  >
                    {showPasswords.current ? (
                      <EyeOff size={20} color="#6b7280" />
                    ) : (
                      <Eye size={20} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">New Password</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
                  <TextInput
                    value={passwordForm.newPassword}
                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                    className="flex-1 text-gray-900"
                    placeholder="Enter new password"
                    secureTextEntry={!showPasswords.new}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  >
                    {showPasswords.new ? (
                      <EyeOff size={20} color="#6b7280" />
                    ) : (
                      <Eye size={20} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-gray-700 mb-2">Confirm New Password</Text>
                <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl px-4 py-3">
                  <TextInput
                    value={passwordForm.confirmPassword}
                    onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                    className="flex-1 text-gray-900"
                    placeholder="Confirm new password"
                    secureTextEntry={!showPasswords.confirm}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  >
                    {showPasswords.confirm ? (
                      <EyeOff size={20} color="#6b7280" />
                    ) : (
                      <Eye size={20} color="#6b7280" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
                <Text className="text-xs text-blue-600 font-semibold mb-1">Password Requirements:</Text>
                <Text className="text-xs text-blue-600">• At least 6 characters long</Text>
                <Text className="text-xs text-blue-600">• Mix of letters and numbers recommended</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
