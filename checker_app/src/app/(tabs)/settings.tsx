import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { 
  Settings, 
  Shield, 
  User, 
  Sliders, 
  Camera, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  Ruler,
  ChevronRight,
  Save
} from 'lucide-react-native';

// Type definitions
interface SettingCardProps {
  icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

interface SwitchFieldProps {
  label: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export default function SettingsScreen() {
  const [checkerIdLoaded, setCheckerIdLoaded] = useState(false);
  const [checkerInfo, setCheckerInfo] = useState({
    id: 'CHECKER_001',
    name: 'John Smith',
    email: 'john.smith@qcchecker.com'
  });
  
  // App Settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  
  // Inspection Preferences
  const [sampleSize, setSampleSize] = useState('10');
  const [inspectionPriority, setInspectionPriority] = useState('critical');
  const [photoRequirement, setPhotoRequirement] = useState('defects');
  const [reportFormat, setReportFormat] = useState('detailed');
  
  // Quality Standards
  const [fabricGrade, setFabricGrade] = useState('A');
  const [colorTolerance, setColorTolerance] = useState('standard');
  const [stitchingQuality, setStitchingQuality] = useState('12');
  
  // Measurement Settings
  const [measurementUnit, setMeasurementUnit] = useState('metric');
  const [scalePrecision, setScalePrecision] = useState('0.1');
  const [calibrationFreq, setCalibrationFreq] = useState('weekly');
  
  // Documentation Settings
  const [reportLanguage, setReportLanguage] = useState('en');
  const [autoSaveFreq, setAutoSaveFreq] = useState('60');
  
  // Photo Settings
  const [photoResolution, setPhotoResolution] = useState('high');
  const [photoQuality, setPhotoQuality] = useState('90');

  useEffect(() => {
    const checkAuth = async () => {
      const stored = await AsyncStorage.getItem('checkerID');
      if (!stored) {
        router.replace('/(auth)/Login');
        return;
      }
      setCheckerInfo(prev => ({ ...prev, id: stored }));
      setCheckerIdLoaded(true);
    };

    checkAuth();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const settings = {
        sampleSize,
        inspectionPriority,
        photoRequirement,
        reportFormat,
        fabricGrade,
        colorTolerance,
        stitchingQuality,
        measurementUnit,
        scalePrecision,
        calibrationFreq,
        reportLanguage,
        autoSaveFreq,
        photoResolution,
        photoQuality,
        notificationsEnabled,
        autoSyncEnabled,
        darkModeEnabled
      };
      
      await AsyncStorage.setItem('qcSettings', JSON.stringify(settings));
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  if (!checkerIdLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const SettingCard: React.FC<SettingCardProps> = ({ icon: Icon, title, subtitle, children, iconColor = "#3b82f6", iconBg = "bg-blue-100" }) => (
    <View className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
      <View className="px-4 py-4 border-b border-gray-100">
        <View className="flex-row items-center">
          <View className={`p-2 ${iconBg} rounded-lg mr-3`}>
            <Icon size={20} color={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">{title}</Text>
            <Text className="text-xs text-gray-600">{subtitle}</Text>
          </View>
        </View>
      </View>
      <View className="p-4">
        {children}
      </View>
    </View>
  );

  const SelectField: React.FC<SelectFieldProps> = ({ label, value, onValueChange, options }) => (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
      <View className="border border-gray-300 rounded-xl bg-gray-50">
        {options.map((option: { value: string; label: string }, index: number) => (
          <TouchableOpacity
            key={option.value}
            onPress={() => onValueChange(option.value)}
            className={`flex-row items-center justify-between px-4 py-3 ${
              index !== options.length - 1 ? 'border-b border-gray-200' : ''
            } ${value === option.value ? 'bg-blue-50' : ''}`}
          >
            <Text className={`text-sm ${value === option.value ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}>
              {option.label}
            </Text>
            {value === option.value && <CheckCircle2 size={16} color="#3b82f6" />}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const SwitchField: React.FC<SwitchFieldProps> = ({ label, subtitle, value, onValueChange }) => (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <View className="flex-1 mr-3">
        <Text className="text-sm font-semibold text-gray-900">{label}</Text>
        <Text className="text-xs text-gray-600 mt-1">{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
        thumbColor={value ? '#ffffff' : '#ffffff'}
      />
    </View>
  );

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
      {/* Header */}
      <View className="mb-6">
        <Text className="text-3xl font-bold text-gray-900 mb-2">QC Settings</Text>
        <Text className="text-gray-600">Configure inspection standards and preferences</Text>
      </View>

      {/* Profile Information */}
      <SettingCard
        icon={User}
        title="Profile Information"
        subtitle="Update your personal details"
        iconColor="#d97706"
        iconBg="bg-amber-100"
      >
        <View className="space-y-4 gap-2">
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Checker ID</Text>
            <TextInput
              value={checkerInfo.id}
              editable={false}
              className="bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-500"
            />
          </View>
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Full Name</Text>
            <TextInput
              value={checkerInfo.name}
              onChangeText={(text) => setCheckerInfo(prev => ({ ...prev, name: text }))}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
              placeholder="Enter your full name"
            />
          </View>
          <View>
            <Text className="text-sm font-semibold text-gray-700 mb-2">Email Address</Text>
            <TextInput
              value={checkerInfo.email}
              onChangeText={(text) => setCheckerInfo(prev => ({ ...prev, email: text }))}
              className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-gray-900"
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>
      </SettingCard>

      {/* AQL Standards */}
      <SettingCard
        icon={Shield}
        title="AQL Standards (Level II)"
        subtitle="Acceptable Quality Limits for inspections"
        iconColor="#3b82f6"
        iconBg="bg-blue-100"
      >
        <View className="space-y-4 gap-2">
          <View className="bg-red-50 border border-red-200 rounded-xl p-4">
            <Text className="text-sm font-semibold text-red-800 mb-2">Critical Defects: 0 Max</Text>
            <Text className="text-xs text-red-600">No critical defects allowed</Text>
          </View>
          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <Text className="text-sm font-semibold text-yellow-800 mb-2">Major Defects: 4 Max</Text>
            <Text className="text-xs text-yellow-600">Maximum 4 major defects allowed</Text>
          </View>
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Text className="text-sm font-semibold text-blue-800 mb-2">Minor Defects: 14 Max</Text>
            <Text className="text-xs text-blue-600">Maximum 14 minor defects allowed</Text>
          </View>
        </View>
      </SettingCard>

      {/* Inspection Preferences */}
      <SettingCard
        icon={Target}
        title="Inspection Preferences"
        subtitle="Customize your quality control workflow"
        iconColor="#9333ea"
        iconBg="bg-purple-100"
      >
        <SelectField
          label="Default Sample Size (%)"
          value={sampleSize}
          onValueChange={setSampleSize}
          options={[
            { value: '10', label: '10% - Standard Sampling' },
            { value: '15', label: '15% - Enhanced Sampling' },
            { value: '20', label: '20% - Strict Sampling' },
            { value: '25', label: '25% - Critical Items' }
          ]}
        />
        <SelectField
          label="Inspection Priority"
          value={inspectionPriority}
          onValueChange={setInspectionPriority}
          options={[
            { value: 'critical', label: 'Critical Defects First' },
            { value: 'major', label: 'Major Defects First' },
            { value: 'sequential', label: 'Sequential Order' },
            { value: 'random', label: 'Random Sampling' }
          ]}
        />
        <SelectField
          label="Photo Requirements"
          value={photoRequirement}
          onValueChange={setPhotoRequirement}
          options={[
            { value: 'defects', label: 'Defects Only' },
            { value: 'all', label: 'All Items' },
            { value: 'sample', label: 'Sample Items' },
            { value: 'none', label: 'No Photos' }
          ]}
        />
      </SettingCard>

      {/* Quality Standards */}
      <SettingCard
        icon={CheckCircle2}
        title="Quality Standards"
        subtitle="Define acceptable quality thresholds"
        iconColor="#059669"
        iconBg="bg-emerald-100"
      >
        <SelectField
          label="Fabric Quality Grade"
          value={fabricGrade}
          onValueChange={setFabricGrade}
          options={[
            { value: 'A', label: 'Grade A - Premium' },
            { value: 'B', label: 'Grade B - Standard' },
            { value: 'C', label: 'Grade C - Basic' }
          ]}
        />
        <SelectField
          label="Color Matching Tolerance"
          value={colorTolerance}
          onValueChange={setColorTolerance}
          options={[
            { value: 'strict', label: 'Strict (±1 Delta E)' },
            { value: 'standard', label: 'Standard (±2 Delta E)' },
            { value: 'relaxed', label: 'Relaxed (±3 Delta E)' }
          ]}
        />
      </SettingCard>

      {/* Measurement Tools */}
      <SettingCard
        icon={Ruler}
        title="Measurement Tools"
        subtitle="Configure measurement instruments"
        iconColor="#6366f1"
        iconBg="bg-indigo-100"
      >
        <SelectField
          label="Primary Measuring Unit"
          value={measurementUnit}
          onValueChange={setMeasurementUnit}
          options={[
            { value: 'metric', label: 'Metric (cm/kg)' },
            { value: 'imperial', label: 'Imperial (in/lbs)' },
            { value: 'both', label: 'Both Units' }
          ]}
        />
        <SelectField
          label="Scale Precision"
          value={scalePrecision}
          onValueChange={setScalePrecision}
          options={[
            { value: '0.1', label: '0.1g precision' },
            { value: '0.01', label: '0.01g precision' },
            { value: '0.001', label: '0.001g precision' }
          ]}
        />
      </SettingCard>

      {/* Photo & Camera Settings */}
      <SettingCard
        icon={Camera}
        title="Photo & Camera Settings"
        subtitle="Configure photo capture requirements"
        iconColor="#ec4899"
        iconBg="bg-pink-100"
      >
        <SelectField
          label="Photo Resolution"
          value={photoResolution}
          onValueChange={setPhotoResolution}
          options={[
            { value: 'high', label: 'High (1920x1080)' },
            { value: 'medium', label: 'Medium (1280x720)' },
            { value: 'low', label: 'Low (640x480)' }
          ]}
        />
        <SelectField
          label="Photo Quality"
          value={photoQuality}
          onValueChange={setPhotoQuality}
          options={[
            { value: '90', label: '90% - Best Quality' },
            { value: '75', label: '75% - Good Quality' },
            { value: '60', label: '60% - Standard' }
          ]}
        />
      </SettingCard>

      {/* App Settings */}
      <SettingCard
        icon={Settings}
        title="App Settings"
        subtitle="Configure app behavior and notifications"
        iconColor="#6b7280"
        iconBg="bg-gray-100"
      >
        <SwitchField
          label="Inspection Alerts"
          subtitle="Get notified when new inspections are assigned"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
        />
        <SwitchField
          label="Auto-sync Reports"
          subtitle="Automatically sync draft inspection reports when online"
          value={autoSyncEnabled}
          onValueChange={setAutoSyncEnabled}
        />
        <SwitchField
          label="Dark Mode"
          subtitle="Use a dark color scheme during low-light inspections"
          value={darkModeEnabled}
          onValueChange={setDarkModeEnabled}
        />
      </SettingCard>

      {/* Save Button */}
      <TouchableOpacity
        onPress={handleSaveSettings}
        className="bg-gray-900 rounded-2xl py-4 flex-row items-center justify-center shadow-sm mb-4"
      >
        <Save size={20} color="#ffffff" strokeWidth={2} />
        <Text className="text-white font-bold text-base ml-2">Save All Settings</Text>
      </TouchableOpacity>

      {/* About Section */}
      <View className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <Text className="text-lg font-bold text-gray-900 mb-2">About QC Checker Mobile</Text>
        <Text className="text-sm text-gray-600 mb-1">Version 1.0.0</Text>
        <Text className="text-xs text-gray-500">
          Professional quality control inspection app optimized for on-site pre-shipment inspections.
        </Text>
      </View>
    </ScrollView>
  );
}

