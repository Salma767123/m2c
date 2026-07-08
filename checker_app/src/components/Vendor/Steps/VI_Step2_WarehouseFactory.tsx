// RN port of VI_Step2_WarehouseFactory.tsx — Warehouse & Factory verification
// plus the 3 mandatory-ish inspector evidence photo slots.

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Warehouse, MapPin, Image as ImageIcon, Camera, X } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications, ViewButton } from './VI_VerifyField';
import { getOwnershipTypeLabel } from './fieldHelpers';
import { compressImage } from '../../../utils/imageCompress';

export interface FactoryEvidencePhoto {
  name: string;
  url: string; // data URI (compressed)
  id: number;
}

export interface FactoryEvidenceState {
  frontView: FactoryEvidencePhoto | null;
  nameBoard: FactoryEvidencePhoto | null;
  routeMap: FactoryEvidencePhoto | null;
}

interface Props {
  vendor: any;
  verifications: Verifications;
  onChange: (key: string, ok: boolean | null, remarks: string) => void;
  onRegisterFields: (keys: string[]) => void;
  factoryEvidence: FactoryEvidenceState;
  onEvidenceChange: (slot: keyof FactoryEvidenceState, photo: FactoryEvidencePhoto | null) => void;
  evidenceError?: boolean;
}

function EvidenceUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FactoryEvidencePhoto | null;
  onChange: (photo: FactoryEvidencePhoto | null) => void;
}) {
  const [busy, setBusy] = useState(false);

  const capture = async () => {
    Alert.alert('Evidence Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: () => launch('camera') },
      { text: 'Choose from Gallery', onPress: () => launch('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launch = async (source: 'camera' | 'library') => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Please allow camera access.');
          return;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission needed', 'Please allow photo library access.');
          return;
        }
      }

      // Web crops evidence photos to a free rect with a grid — mirror with an
      // editable (crop) picker so the checker can frame the shot.
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);

      if (result.canceled || !result.assets?.[0]) return;
      setBusy(true);
      const asset = result.assets[0];
      const dataUri = await compressImage(asset.uri);
      const name = asset.fileName || `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
      onChange({ name, url: dataUri, id: Date.now() });
    } catch (err: any) {
      Alert.alert('Upload Error', err?.message || 'Failed to add photo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ rowGap: 8 }}>
      <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{label} — Inspector Evidence Photo</Text>
      {value ? (
        <View className="self-start relative">
          <Image source={{ uri: value.url }} style={{ width: 128, height: 128, borderRadius: 12 }} className="border border-emerald-200" resizeMode="cover" />
          <TouchableOpacity
            onPress={() => onChange(null)}
            className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full p-1"
          >
            <X size={12} color="#ffffff" strokeWidth={2.5} />
          </TouchableOpacity>
          <Text className="text-xs text-slate-500 mt-1" style={{ maxWidth: 128 }} numberOfLines={1}>{value.name}</Text>
        </View>
      ) : (
        <TouchableOpacity
          onPress={capture}
          disabled={busy}
          className="flex-row items-center px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 self-start"
          style={{ columnGap: 8, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <ActivityIndicator size="small" color="#2563eb" /> : <Camera size={16} color="#475569" />}
          <Text className="text-slate-600 text-sm font-medium">{busy ? 'Processing…' : 'Upload Evidence Photo'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const eq = (a: any, b: any) => (a || '').trim() === (b || '').trim();

function detectSameAsLegal(v: any): boolean {
  if (!v.factoryAddress && !v.factoryCity) return true;
  return (
    eq(v.factoryAddress, v.warehouseAddress) &&
    eq(v.factoryCity, v.warehouseCity) &&
    eq(v.factoryState, v.warehouseState) &&
    eq(v.factoryZipCode, v.warehouseZipCode) &&
    eq(v.factoryCountry, v.warehouseCountry)
  );
}

export default function VI_Step2_WarehouseFactory({
  vendor: v,
  verifications,
  onChange,
  onRegisterFields,
  factoryEvidence,
  onEvidenceChange,
  evidenceError,
}: Props) {
  const vf = (key: string, label: string, value: any, type?: any) => (
    <VerifyField key={key} fieldKey={key} label={label} value={value} type={type} verifications={verifications} onChange={onChange} />
  );

  const factoryImages = Array.isArray(v.documents)
    ? v.documents.filter((d: any) => d.type === 'OTHER').map((d: any) => ({ label: d.name || 'Factory Image', url: d.documentUrl }))
    : [];

  const isSameAsLegal = detectSameAsLegal(v);

  useEffect(() => {
    const keys: string[] = [
      'w_ownershipType',
      'w_warehouseSize',
      ...(v.warehouseAddress ? ['w_warehouseAddress'] : []),
      ...(v.warehouseAddressLine2 ? ['w_warehouseAddressLine2'] : []),
      ...(v.warehouseAddressLine3 ? ['w_warehouseAddressLine3'] : []),
      ...(v.warehouseLandmark ? ['w_warehouseLandmark'] : []),
      ...(v.warehouseCity ? ['w_warehouseCity'] : []),
      ...(v.warehouseState ? ['w_warehouseState'] : []),
      ...(v.warehouseZipCode ? ['w_warehouseZipCode'] : []),
      ...(v.warehouseCountry ? ['w_warehouseCountry'] : []),
      ...(isSameAsLegal
        ? ['w_sameWarehouse']
        : [
            ...(v.factoryAddress ? ['w_factoryAddress'] : []),
            ...(v.factoryCity ? ['w_factoryCity'] : []),
            ...(v.factoryState ? ['w_factoryState'] : []),
            ...(v.factoryZipCode ? ['w_factoryZipCode'] : []),
            ...(v.factoryCountry ? ['w_factoryCountry'] : []),
          ]),
      ...(v.mapLink ? ['w_mapLink'] : []),
      ...factoryImages.map((_: any, idx: number) => `w_factoryImg_${idx}`),
    ];
    onRegisterFields(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  return (
    <View style={{ rowGap: 28 }}>
      <View className="border-b border-slate-200 pb-4">
        <Text className="text-2xl font-bold text-slate-900 mb-1">Warehouse & Factory Details</Text>
        <Text className="text-slate-500 text-sm">Verify the warehouse and factory address and physical infrastructure.</Text>
      </View>

      <SectionBlock title="Legal Address & Factory Site" icon={<Warehouse size={16} color="#2563eb" />}>
        <View style={{ rowGap: 16 }}>
          {vf('w_ownershipType', 'Ownership Type', getOwnershipTypeLabel(v.ownershipType))}
          {vf('w_warehouseSize', 'Warehousing Capacity', v.warehouseSize)}
          {v.warehouseAddress && vf('w_warehouseAddress', 'Address Line 1', v.warehouseAddress)}
          {v.warehouseAddressLine2 && vf('w_warehouseAddressLine2', 'Address Line 2', v.warehouseAddressLine2)}
          {v.warehouseAddressLine3 && vf('w_warehouseAddressLine3', 'Address Line 3', v.warehouseAddressLine3)}
          {v.warehouseLandmark && vf('w_warehouseLandmark', 'Landmark', v.warehouseLandmark)}
          {v.warehouseCity && vf('w_warehouseCity', 'City', v.warehouseCity)}
          {v.warehouseState && vf('w_warehouseState', 'State', v.warehouseState)}
          {v.warehouseZipCode && vf('w_warehouseZipCode', 'ZIP / Postal Code', v.warehouseZipCode)}
          {v.warehouseCountry && vf('w_warehouseCountry', 'Country', v.warehouseCountry)}
        </View>
      </SectionBlock>

      <SectionBlock title="Warehouse Address" icon={<MapPin size={16} color="#2563eb" />}>
        {isSameAsLegal ? (
          <View style={{ rowGap: 16 }}>
            <View className="flex-row items-start p-4 bg-blue-50 border border-blue-200 rounded-xl" style={{ columnGap: 12 }}>
              <MapPin size={16} color="#3b82f6" />
              <Text className="text-sm text-blue-800 font-medium flex-1">
                Warehouse Address is the same as the Legal Address & Factory Site provided above. Please verify.
              </Text>
            </View>
            <VerifyField
              fieldKey="w_sameWarehouse"
              label="Warehouse Address"
              value="Same as Legal Address & Factory Site"
              verifications={verifications}
              onChange={onChange}
            />
            {v.mapLink && vf('w_mapLink', 'Map / Location Link', v.mapLink, 'url')}
          </View>
        ) : (
          <View style={{ rowGap: 16 }}>
            {v.factoryAddress && vf('w_factoryAddress', 'Address Line 1', v.factoryAddress)}
            {v.factoryCity && vf('w_factoryCity', 'City', v.factoryCity)}
            {v.factoryState && vf('w_factoryState', 'State', v.factoryState)}
            {v.factoryZipCode && vf('w_factoryZipCode', 'ZIP / Postal Code', v.factoryZipCode)}
            {v.factoryCountry && vf('w_factoryCountry', 'Country', v.factoryCountry)}
            {v.mapLink && vf('w_mapLink', 'Map / Location Link', v.mapLink, 'url')}
          </View>
        )}
      </SectionBlock>

      {factoryImages.length > 0 && (
        <SectionBlock title="Factory Photos (Vendor-Uploaded)" icon={<ImageIcon size={16} color="#2563eb" />}>
          <View style={{ rowGap: 16 }}>
            {factoryImages.map((img: any, idx: number) => (
              <VerifyField
                key={idx}
                fieldKey={`w_factoryImg_${idx}`}
                label={img.label}
                value={img.url}
                type="image"
                verifications={verifications}
                onChange={onChange}
                headerAction={img.url ? <ViewButton url={img.url} name={img.label} isImage /> : undefined}
              />
            ))}
          </View>
        </SectionBlock>
      )}

      <SectionBlock title="Inspector Evidence Photos" icon={<Camera size={16} color="#2563eb" />}>
        <Text className="text-xs text-slate-500 -mt-2">Upload photos taken during the factory visit to serve as inspection evidence.</Text>
        {evidenceError && (
          <View className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <Text className="text-sm font-semibold text-red-600">At least one evidence photo is required before continuing.</Text>
          </View>
        )}
        <View style={{ rowGap: 20 }} className={evidenceError ? 'border-2 border-red-300 rounded-xl p-2' : ''}>
          <EvidenceUpload label="Factory Front View" value={factoryEvidence.frontView} onChange={(p) => onEvidenceChange('frontView', p)} />
          <EvidenceUpload label="Factory Name Board" value={factoryEvidence.nameBoard} onChange={(p) => onEvidenceChange('nameBoard', p)} />
          <EvidenceUpload label="Route Map Photo" value={factoryEvidence.routeMap} onChange={(p) => onEvidenceChange('routeMap', p)} />
        </View>
      </SectionBlock>
    </View>
  );
}
