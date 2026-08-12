// RN port of VI_Step2_WarehouseFactory.tsx — Warehouse & Factory verification
// plus the mandatory inspector evidence photo slots (3 for the Legal Address &
// Factory Site, +3 for the Warehouse when its address differs).

import React, { useEffect, useState } from 'react';
import {
  useWindowDimensions,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Warehouse, MapPin, Image as ImageIcon, Camera, X, Trash2, AlertTriangle } from 'lucide-react-native';
import VerifyField, { SectionBlock, Verifications, ViewButton } from './VI_VerifyField';
import { getOwnershipTypeLabel } from './fieldHelpers';
import { compressImage } from '../../../utils/imageCompress';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import { PhotoConfirmCrop, Prepared } from '@/components/General/PhotoCrop';

export interface FactoryEvidencePhoto {
  name: string;
  url: string; // data URI (compressed)
  id: number;
}

export interface FactoryEvidenceState {
  // Legal Address & Factory Site — inspector evidence photos
  frontView: FactoryEvidencePhoto | null;
  nameBoard: FactoryEvidencePhoto | null;
  routeMap: FactoryEvidencePhoto | null;
  // Warehouse — inspector evidence photos (only collected when the warehouse
  // address differs from the Legal Address & Factory Site). Optional so the
  // host screen's initial 3-slot state remains valid.
  warehouseFrontView?: FactoryEvidencePhoto | null;
  warehouseNameBoard?: FactoryEvidencePhoto | null;
  warehouseRouteMap?: FactoryEvidencePhoto | null;
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

// ── Remove confirmation ─────────────────────────────────────────────────────
// A native Alert here looks like a system error rather than a deliberate step,
// and it can't show which photo is about to go. This dialog carries the app's
// own styling and a thumbnail, so the checker sees exactly what they're
// deleting before it's gone.
function ConfirmRemoveDialog({
  visible,
  label,
  previewUri,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  label: string;
  previewUri?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 bg-black/60 items-center justify-center px-6" onPress={onCancel}>
        <Pressable
          className="w-full bg-white rounded-2xl overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center px-5 pt-6 pb-2">
            <View className="w-14 h-14 rounded-full bg-red-50 items-center justify-center mb-3">
              <AlertTriangle size={24} color="#dc2626" strokeWidth={2.25} />
            </View>
            <Text className="text-lg font-bold text-slate-900 text-center">Remove this photo?</Text>
            <Text className="text-sm text-slate-600 text-center mt-1.5 leading-5">
              This evidence photo is required, and it can only be re-taken at the site.
            </Text>
          </View>

          <View className="flex-row items-center mx-5 mt-3 mb-1 p-3 rounded-xl bg-slate-50 border border-slate-200" style={{ columnGap: 12 }}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="cover" />
            ) : (
              <View className="w-11 h-11 rounded-lg bg-slate-200 items-center justify-center">
                <ImageIcon size={18} color="#94a3b8" />
              </View>
            )}
            <Text className="text-sm font-semibold text-slate-800 flex-1" numberOfLines={2}>
              {label}
            </Text>
          </View>

          <View className="flex-row px-5 pt-4 pb-5" style={{ columnGap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              accessibilityRole="button"
              className="rounded-xl border border-slate-200 bg-white items-center justify-center"
              style={{ flex: 1, minHeight: 46 }}
            >
              <Text className="text-slate-700 font-semibold text-sm">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              accessibilityRole="button"
              className="flex-row items-center justify-center rounded-xl bg-red-600 px-3"
              style={{ flex: 1.4, minHeight: 46, columnGap: 6 }}
            >
              <Trash2 size={16} color="#ffffff" strokeWidth={2.5} />
              <Text className="text-white font-semibold text-sm" numberOfLines={1}>
                Remove Photo
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Evidence slot ───────────────────────────────────────────────────────────
function EvidenceUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FactoryEvidencePhoto | null | undefined;
  onChange: (photo: FactoryEvidencePhoto | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  // Freshly captured shot awaiting the checker's OK / Crop decision.
  const [pending, setPending] = useState<Prepared | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const closePending = () => setPending(null);

  // Camera only — gallery upload is deliberately unavailable so evidence can't
  // be sourced from an old or third-party photo.
  const capture = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow camera access to capture evidence photos.');
        return;
      }
      // No allowsEditing: the checker chooses whether to crop on the next screen.
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setPending({ uri: asset.uri, width: asset.width, height: asset.height });
    } catch (err: any) {
      showErrorToast('Camera Error', err?.message || 'Failed to prepare the photo.');
    }
  };

  const accept = async (prepared: Prepared) => {
    if (busy) return;
    setBusy(true);
    try {
      const dataUri = await compressImage(prepared.uri);
      const name = `${label.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`;
      onChange({ name, url: dataUri, id: Date.now() });
      closePending();
      showSuccessToast('Evidence Added', `${label} saved.`);
    } catch (err: any) {
      showErrorToast('Upload Failed', err?.message || 'Could not save this photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const retake = () => {
    closePending();
    // Let the modal finish dismissing before the camera activity opens.
    setTimeout(capture, 350);
  };

  // Every slot is mandatory, and the photo can only be re-taken on site — so a
  // stray tap on the little X should not silently discard it.
  const doRemove = () => {
    setConfirmingRemove(false);
    onChange(null);
    showSuccessToast('Photo Removed', `${label} was deleted.`);
  };

  return (
    <View style={{ rowGap: 8 }}>
      <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
        {label} — Inspector Evidence Photo <Text className="text-red-500">*</Text>
      </Text>
      {value ? (
        <View className="self-start relative">
          <Image source={{ uri: value.url }} style={{ width: 128, height: 128, borderRadius: 12 }} className="border border-emerald-200" resizeMode="cover" />
          <TouchableOpacity
            onPress={() => setConfirmingRemove(true)}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${label}`}
            hitSlop={8}
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
          accessibilityRole="button"
          accessibilityLabel={`Capture ${label}`}
          className="flex-row items-center px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 self-start"
          style={{ columnGap: 8, opacity: busy ? 0.6 : 1 }}
        >
          {busy ? <ActivityIndicator size="small" color="#e01a1b" /> : <Camera size={16} color="#475569" />}
          <Text className="text-slate-600 text-sm font-medium">{busy ? 'Processing…' : 'Take Evidence Photo'}</Text>
        </TouchableOpacity>
      )}

      <ConfirmRemoveDialog
        visible={confirmingRemove}
        label={label}
        previewUri={value?.url}
        onCancel={() => setConfirmingRemove(false)}
        onConfirm={doRemove}
      />

      {/* Single modal: confirm the shot, or switch to the crop surface in place. */}
      <PhotoConfirmCrop
        visible={!!pending}
        label={label}
        source={pending}
        busy={busy}
        onAccept={accept}
        onCancel={closePending}
        onRetake={retake}
      />
    </View>
  );
}

const eq = (a: any, b: any) => (a || '').trim() === (b || '').trim();

// The Warehouse Address counts as "same as" the Legal Address & Factory Site
// when the vendor didn't enter a separate warehouse address, or entered one
// that matches the legal/factory address field-for-field.
/**
 * Invisible fillers for the last row of a `space-between` wrap grid.
 *
 * Without them a final row holding fewer items than there are columns gets its
 * items pushed to the outer edges — e.g. 2 photos in a 3-up grid sit hard left
 * and hard right with a hole between. Only matters once the column count can
 * exceed two, which is why it arrived with the responsive grid.
 */
function GridSpacers({ count, cols, width }: { count: number; cols: number; width: `${number}%` }) {
  const missing = (cols - (count % cols)) % cols;
  if (missing === 0) return null;
  return (
    <>
      {Array.from({ length: missing }).map((_, i) => (
        <View key={`spacer-${i}`} style={{ width }} />
      ))}
    </>
  );
}

export function detectSameAsWarehouse(v: any): boolean {
  if (!v.warehouseAddress && !v.warehouseCity) return true;
  return (
    eq(v.warehouseAddress, v.factoryAddress) &&
    eq(v.warehouseCity, v.factoryCity) &&
    eq(v.warehouseState, v.factoryState) &&
    eq(v.warehouseZipCode, v.factoryZipCode) &&
    eq(v.warehouseCountry, v.factoryCountry)
  );
}

// Vendor-uploaded photos are all stored as type='OTHER' documents. The Legal
// Address & Factory Site photos are prefixed "Factory Site …", while the
// Warehouse photos are named "Factory …".
const FACTORY_SITE_PHOTO_ORDER: Record<string, number> = {
  'Factory Site Name Board': 0,
  'Factory Site Front View': 1,
  'Factory Site Back View': 2,
  'Factory Site Left View': 3,
  'Factory Site Right View': 4,
  'Factory Site Road View': 5,
  'Factory Site Interior': 6,
  'Factory Site Image (Other)': 7,
};
const WAREHOUSE_PHOTO_ORDER: Record<string, number> = {
  'Factory Name Board': 0,
  'Factory Front View': 1,
  'Factory Back View': 2,
  'Factory Left View': 3,
  'Factory Right View': 4,
  'Factory Road View': 5,
  'Factory Interior': 6,
  'Factory Image (Other)': 7,
};
const isFactorySiteDoc = (name: string) => (name || '').startsWith('Factory Site');

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

  const otherDocs = Array.isArray(v.documents) ? v.documents.filter((d: any) => d.type === 'OTHER') : [];
  // Legal Address & Factory Site images — "Factory Site …" documents.
  const legalImages = otherDocs
    .filter((d: any) => isFactorySiteDoc(d.name))
    .map((d: any) => ({ label: d.name || 'Factory Site Image', url: d.documentUrl }))
    .sort((a: any, b: any) => (FACTORY_SITE_PHOTO_ORDER[a.label] ?? 99) - (FACTORY_SITE_PHOTO_ORDER[b.label] ?? 99));
  // Warehouse images — every other "Factory …" document.
  const warehouseImages = otherDocs
    .filter((d: any) => !isFactorySiteDoc(d.name))
    .map((d: any) => ({ label: d.name || 'Warehouse Image', url: d.documentUrl }))
    .sort((a: any, b: any) => (WAREHOUSE_PHOTO_ORDER[a.label] ?? 99) - (WAREHOUSE_PHOTO_ORDER[b.label] ?? 99));

  const isSameAsWarehouse = detectSameAsWarehouse(v);

  // Image grid density, mirroring the web portal's 1/2/3/4-up responsive grid.
  // Web's breakpoints are desktop-sized, so they are re-pitched for handsets:
  // a phone keeps 2-up, and the extra columns only appear on tablets, where a
  // 2-up grid otherwise stretches each thumbnail across half a large screen.
  const { width: screenW } = useWindowDimensions();
  const imageCols = screenW >= 1024 ? 4 : screenW >= 768 ? 3 : 2;
  // Percentage width leaving a consistent 4% gutter between columns.
  const imageColWidth: `${number}%` = `${(100 - (imageCols - 1) * 4) / imageCols}%`;

  useEffect(() => {
    const keys: string[] = [
      // ── Legal Address & Factory Site ──
      'w_legalOwnershipType',
      'w_legalCapacity',
      ...(v.factoryAddress ? ['w_legalAddress'] : []),
      ...(v.addressLine2 ? ['w_legalAddressLine2'] : []),
      ...(v.addressLine3 ? ['w_legalAddressLine3'] : []),
      ...(v.landmark ? ['w_legalLandmark'] : []),
      ...(v.factoryCity ? ['w_legalCity'] : []),
      ...(v.factoryState ? ['w_legalState'] : []),
      ...(v.factoryZipCode ? ['w_legalZipCode'] : []),
      ...(v.factoryCountry ? ['w_legalCountry'] : []),
      ...(v.mapLink ? ['w_mapLink'] : []),
      ...legalImages.map((_: any, idx: number) => `w_legalImg_${idx}`),
      // ── Warehouse Address ──
      ...(isSameAsWarehouse
        ? ['w_sameWarehouse']
        : [
            'w_whOwnershipType',
            'w_whCapacity',
            ...(v.warehouseAddress ? ['w_whAddress'] : []),
            ...(v.warehouseAddressLine2 ? ['w_whAddressLine2'] : []),
            ...(v.warehouseAddressLine3 ? ['w_whAddressLine3'] : []),
            ...(v.warehouseLandmark ? ['w_whLandmark'] : []),
            ...(v.warehouseCity ? ['w_whCity'] : []),
            ...(v.warehouseState ? ['w_whState'] : []),
            ...(v.warehouseZipCode ? ['w_whZipCode'] : []),
            ...(v.warehouseCountry ? ['w_whCountry'] : []),
          ]),
      ...warehouseImages.map((_: any, idx: number) => `w_whImg_${idx}`),
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

      {/* Section 1: Legal Address & Factory Site */}
      <SectionBlock title="Legal Address & Factory Site" icon={<Warehouse size={16} color="#e01a1b" />}>
        <View style={{ rowGap: 16 }}>
          {vf('w_legalOwnershipType', 'Ownership Type', getOwnershipTypeLabel(v.factoryOwnershipType))}
          {vf('w_legalCapacity', 'Warehousing Capacity', v.factorySize)}
          {v.factoryAddress && vf('w_legalAddress', 'Address Line 1', v.factoryAddress)}
          {v.addressLine2 && vf('w_legalAddressLine2', 'Address Line 2', v.addressLine2)}
          {v.addressLine3 && vf('w_legalAddressLine3', 'Address Line 3', v.addressLine3)}
          {v.landmark && vf('w_legalLandmark', 'Landmark', v.landmark)}
          {v.factoryCity && vf('w_legalCity', 'City', v.factoryCity)}
          {v.factoryState && vf('w_legalState', 'State', v.factoryState)}
          {v.factoryZipCode && vf('w_legalZipCode', 'ZIP / Postal Code', v.factoryZipCode)}
          {v.factoryCountry && vf('w_legalCountry', 'Country', v.factoryCountry)}
          {v.mapLink && vf('w_mapLink', 'Map / Location Link', v.mapLink, 'url')}
        </View>
        {/* Factory Images — only the Legal Address & Factory Site photos */}
        {legalImages.length > 0 && (
          <View style={{ rowGap: 12 }} className="mt-2">
            <View className="flex-row items-center" style={{ columnGap: 6 }}>
              <ImageIcon size={14} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Factory Images</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {legalImages.map((img: any, idx: number) => (
                <View key={idx} style={{ width: imageColWidth }}>
                  <VerifyField
                    fieldKey={`w_legalImg_${idx}`}
                    label={img.label}
                    value={img.url}
                    type="image"
                    verifications={verifications}
                    onChange={onChange}
                    compact
                    headerAction={img.url ? <ViewButton url={img.url} name={img.label} isImage /> : undefined}
                  />
                </View>
              ))}
              <GridSpacers count={legalImages.length} cols={imageCols} width={imageColWidth} />
            </View>
          </View>
        )}
      </SectionBlock>

      {/* Section 2: Warehouse Address */}
      <SectionBlock title="Warehouse Address" icon={<MapPin size={16} color="#e01a1b" />}>
        {isSameAsWarehouse ? (
          <View style={{ rowGap: 16 }}>
            <View className="flex-row items-start p-4 bg-brand-50 border border-brand-200 rounded-xl" style={{ columnGap: 12 }}>
              <MapPin size={16} color="#e01a1b" />
              <Text className="text-sm text-brand-700 font-medium flex-1">
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
          </View>
        ) : (
          <View style={{ rowGap: 16 }}>
            {vf('w_whOwnershipType', 'Ownership Type', getOwnershipTypeLabel(v.ownershipType))}
            {vf('w_whCapacity', 'Warehousing Capacity', v.warehouseSize)}
            {v.warehouseAddress && vf('w_whAddress', 'Address Line 1', v.warehouseAddress)}
            {v.warehouseAddressLine2 && vf('w_whAddressLine2', 'Address Line 2', v.warehouseAddressLine2)}
            {v.warehouseAddressLine3 && vf('w_whAddressLine3', 'Address Line 3', v.warehouseAddressLine3)}
            {v.warehouseLandmark && vf('w_whLandmark', 'Landmark', v.warehouseLandmark)}
            {v.warehouseCity && vf('w_whCity', 'City', v.warehouseCity)}
            {v.warehouseState && vf('w_whState', 'State', v.warehouseState)}
            {v.warehouseZipCode && vf('w_whZipCode', 'ZIP / Postal Code', v.warehouseZipCode)}
            {v.warehouseCountry && vf('w_whCountry', 'Country', v.warehouseCountry)}
          </View>
        )}
        {/* Warehouse Images — only the Warehouse Address photos */}
        {warehouseImages.length > 0 && (
          <View style={{ rowGap: 12 }} className="mt-2">
            <View className="flex-row items-center" style={{ columnGap: 6 }}>
              <ImageIcon size={14} color="#475569" />
              <Text className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">Warehouse Images</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }}>
              {warehouseImages.map((img: any, idx: number) => (
                <View key={idx} style={{ width: imageColWidth }}>
                  <VerifyField
                    fieldKey={`w_whImg_${idx}`}
                    label={img.label}
                    value={img.url}
                    type="image"
                    verifications={verifications}
                    onChange={onChange}
                    compact
                    headerAction={img.url ? <ViewButton url={img.url} name={img.label} isImage /> : undefined}
                  />
                </View>
              ))}
              <GridSpacers count={warehouseImages.length} cols={imageCols} width={imageColWidth} />
            </View>
          </View>
        )}
      </SectionBlock>

      {/* Inspector Evidence Photos */}
      <SectionBlock title="Inspector Evidence Photos" icon={<Camera size={16} color="#e01a1b" />}>
        <Text className="text-xs text-slate-500 -mt-2">
          Capture photos during the visit to serve as inspection evidence — camera only, gallery uploads are not accepted.{' '}
          {isSameAsWarehouse
            ? 'All three Legal Address & Factory Site photos are required.'
            : 'All three Legal Address & Factory Site photos and all three Warehouse photos are required.'}
        </Text>
        {evidenceError && (
          <View className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <Text className="text-sm font-semibold text-red-600">
              {isSameAsWarehouse
                ? 'All three evidence photos are required before continuing.'
                : 'All six evidence photos (Legal Address & Factory Site and Warehouse) are required before continuing.'}
            </Text>
          </View>
        )}
        <View style={{ rowGap: 24 }} className={evidenceError ? 'border-2 border-red-300 rounded-xl p-2' : ''}>
          {/* Group 1: Legal Address & Factory Site */}
          <View style={{ rowGap: 16 }}>
            <View className="flex-row items-center" style={{ columnGap: 6 }}>
              <Warehouse size={16} color="#e01a1b" />
              <Text className="text-sm font-bold text-slate-700">Legal Address & Factory Site — Photo Evidence</Text>
            </View>
            <EvidenceUpload label="Factory Site Name Board" value={factoryEvidence.nameBoard} onChange={(p) => onEvidenceChange('nameBoard', p)} />
            <EvidenceUpload label="Factory Site Front View" value={factoryEvidence.frontView} onChange={(p) => onEvidenceChange('frontView', p)} />
            <EvidenceUpload label="Factory Site Route Map" value={factoryEvidence.routeMap} onChange={(p) => onEvidenceChange('routeMap', p)} />
          </View>

          {/* Group 2: Warehouse — only when the warehouse address differs */}
          {!isSameAsWarehouse && (
            <View style={{ rowGap: 16 }}>
              <View className="flex-row items-center" style={{ columnGap: 6 }}>
                <MapPin size={16} color="#e01a1b" />
                <Text className="text-sm font-bold text-slate-700">Warehouse — Photo Evidence</Text>
              </View>
              <EvidenceUpload label="Warehouse Name Board" value={factoryEvidence.warehouseNameBoard} onChange={(p) => onEvidenceChange('warehouseNameBoard', p)} />
              <EvidenceUpload label="Warehouse Front View" value={factoryEvidence.warehouseFrontView} onChange={(p) => onEvidenceChange('warehouseFrontView', p)} />
              <EvidenceUpload label="Warehouse Route Map" value={factoryEvidence.warehouseRouteMap} onChange={(p) => onEvidenceChange('warehouseRouteMap', p)} />
            </View>
          )}
        </View>
      </SectionBlock>
    </View>
  );
}