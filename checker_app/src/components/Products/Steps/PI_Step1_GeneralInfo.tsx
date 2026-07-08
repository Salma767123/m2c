import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { SERVICE_TYPES } from '../PI_data';
import { StepHeader, Card, InfoBlock } from './piShared';

interface Props {
  formData: {
    serviceStartDate: string;
    serviceType: string;
    vendorData: any;
    productData: any;
  };
  setFormData: (d: any) => void;
  errors?: Record<string, string>;
}

export default function PI_Step1_GeneralInfo({ formData, setFormData, errors = {} }: Props) {
  const v = formData.vendorData || {};
  const p = formData.productData || {};
  const [showDropdown, setShowDropdown] = useState(false);

  const mc = v.mainContact && typeof v.mainContact === 'object' ? v.mainContact : null;
  const contactFullName =
    [mc?.title, mc?.firstName, mc?.middleName, mc?.lastName].filter(Boolean).join(' ') ||
    mc?.name ||
    v.ownerName ||
    '';

  const factoryAddress = [v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode, v.factoryCountry]
    .filter(Boolean)
    .join(', ');
  const warehouseAddress = [v.warehouseAddress, v.warehouseCity, v.warehouseState].filter(Boolean).join(', ');

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <StepHeader
        title="General Information"
        subtitle="Vendor registration data and inspection context for this product audit."
      />

      {/* Company Information */}
      <Card title="Company Information">
        <InfoBlock label="Company Name" value={v.companyName} />
        <InfoBlock label="Business Type" value={v.businessType} />
        <InfoBlock label="Primary Phone" value={v.businessPhone} />
        {!!v.phoneNumber2 && <InfoBlock label="Secondary Phone" value={v.phoneNumber2} />}
        <InfoBlock label="Primary Email" value={v.businessEmail} />
      </Card>

      {/* Addresses */}
      <Card title="Factory Address">
        <Text className={`text-sm ${factoryAddress ? 'text-slate-900' : 'text-slate-400 italic'}`}>
          {factoryAddress || 'Not provided'}
        </Text>
      </Card>
      <Card title="Warehouse Address">
        <Text className={`text-sm ${warehouseAddress ? 'text-slate-900' : 'text-slate-400 italic'}`}>
          {warehouseAddress || 'Not provided'}
        </Text>
      </Card>

      {/* Main Contact */}
      {(mc || v.ownerName || v.ownerFirstName) && (
        <Card title="Main Contact Person">
          <Text className="text-base font-semibold text-slate-900 mb-1">{contactFullName || '—'}</Text>
          {(mc?.customDesignation || mc?.designation || v.designation) && (
            <Text className="text-xs text-slate-500 mb-3">
              {mc?.customDesignation || mc?.designation || v.designation}
            </Text>
          )}
          <InfoBlock label="Designation" value={mc?.customDesignation || mc?.designation || v.designation} />
          <InfoBlock label="Department" value={mc?.customDepartment || mc?.department} />
          <InfoBlock label="Primary Phone" value={mc?.phone1 || mc?.phone || v.ownerPhone} />
          {(mc?.phone2 || v.ownerPhone2) && <InfoBlock label="Secondary Phone" value={mc?.phone2 || v.ownerPhone2} />}
          <InfoBlock label="Primary Email" value={mc?.email1 || mc?.email || v.ownerEmail} />
          {(mc?.email2 || v.ownerEmail2) && <InfoBlock label="Secondary Email" value={mc?.email2 || v.ownerEmail2} />}
        </Card>
      )}

      {/* Inspection Details */}
      <Card title="Inspection Details">
        {/* Inspection Date — read-only */}
        <Text className="text-sm font-semibold text-slate-700 mb-1">Inspection Date</Text>
        <View className="px-4 py-3 border border-slate-200 rounded-xl bg-slate-100 mb-1">
          <Text className="text-sm text-slate-700">{formData.serviceStartDate}</Text>
        </View>
        <Text className="text-[11px] text-slate-400 mb-4">Auto-populated from today's date.</Text>

        {/* Service Type — editable dropdown */}
        <Text className="text-sm font-semibold text-slate-700 mb-1">
          Service Type <Text className="text-red-500">*</Text>
        </Text>
        <TouchableOpacity
          onPress={() => setShowDropdown(true)}
          activeOpacity={0.8}
          className={`px-4 py-3 border rounded-xl bg-white flex-row items-center justify-between ${
            errors.serviceType ? 'border-red-500 bg-red-50' : 'border-slate-300'
          }`}
        >
          <Text className="text-sm text-slate-900">{formData.serviceType}</Text>
          <ChevronDown size={16} color="#64748b" />
        </TouchableOpacity>
        {!!errors.serviceType && <Text className="text-xs text-red-600 mt-1.5">{errors.serviceType}</Text>}
      </Card>

      {/* Product Being Inspected */}
      {p && (
        <Card title="Product Being Inspected">
          <InfoBlock label="Product Name" value={p.name} />
          <InfoBlock label="Category" value={p.category} />
          <InfoBlock label="Sub-Category" value={p.subCategory} />
        </Card>
      )}

      <View className="h-6" />

      {/* Service type modal */}
      <Modal visible={showDropdown} transparent animationType="fade" onRequestClose={() => setShowDropdown(false)}>
        <Pressable className="flex-1 bg-black/40 justify-center px-6" onPress={() => setShowDropdown(false)}>
          <Pressable className="bg-white rounded-2xl overflow-hidden" onPress={(e) => e.stopPropagation()}>
            <View className="px-5 py-3 border-b border-slate-100">
              <Text className="text-sm font-bold text-slate-800">Select Service Type</Text>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {SERVICE_TYPES.map((type) => {
                const selected = formData.serviceType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    onPress={() => {
                      setFormData({ ...formData, serviceType: type });
                      setShowDropdown(false);
                    }}
                    className={`px-5 py-3.5 flex-row items-center justify-between border-b border-slate-50 ${
                      selected ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <Text className={`text-sm ${selected ? 'text-blue-700 font-semibold' : 'text-slate-700'}`}>
                      {type}
                    </Text>
                    {selected && <Check size={16} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}
