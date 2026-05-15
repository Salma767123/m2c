import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { ArrowLeft, Plus, MapPin, Home, Briefcase, Pencil, Trash2, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  addressService,
  MAX_SAVED_ADDRESSES,
  type SavedAddress,
  type AddressPayload,
} from '@/services/addressService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import AddressFormModal from './AddressFormModal';

const TYPE_META: Record<string, { label: string; Icon: typeof Home; bg: string; fg: string }> = {
  home: { label: 'Home', Icon: Home, bg: '#ecfdf5', fg: '#047857' },
  work: { label: 'Work', Icon: Briefcase, bg: '#eef2ff', fg: '#4338ca' },
  other: { label: 'Other', Icon: MapPin, bg: '#f1f5f9', fg: '#475569' },
};

export default function AddressBook() {
  const insets = useSafeAreaInsets();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await addressService.list();
      setAddresses(list);
    } catch (err: any) {
      showErrorToast('Load Failed', err?.message || 'Could not load addresses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const atLimit = addresses.length >= MAX_SAVED_ADDRESSES;

  const openAdd = () => {
    if (atLimit) return;
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditing(addr);
    setModalOpen(true);
  };

  const handleSubmit = async (payload: AddressPayload) => {
    if (editing) {
      await addressService.update(editing.id, payload);
      showSuccessToast('Address Updated', 'Your address has been saved.');
    } else {
      await addressService.create(payload);
      showSuccessToast('Address Added', 'Your new address is saved.');
    }
    setModalOpen(false);
    setEditing(null);
    await load();
  };

  const handleSetDefault = async (addr: SavedAddress) => {
    if (addr.isDefault) return;
    const previous = addresses;
    setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addr.id })));
    try {
      setBusyId(addr.id);
      await addressService.setDefault(addr.id);
      showSuccessToast('Default Updated', `${TYPE_META[addr.type]?.label || 'Address'} is now your default.`);
    } catch (err: any) {
      setAddresses(previous);
      showErrorToast('Failed', err?.message || 'Could not set default');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = (addr: SavedAddress) => {
    Alert.alert(
      'Delete address?',
      "This address will be permanently removed. If it's your default, the next address becomes the default.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDelete(addr.id) },
      ],
    );
  };

  const handleDelete = async (id: string) => {
    const previous = addresses;
    const removed = addresses.find((a) => a.id === id);
    if (!removed) return;
    let next = addresses.filter((a) => a.id !== id);
    if (removed.isDefault && next.length > 0 && !next.some((a) => a.isDefault)) {
      next = next.map((a, i) => (i === 0 ? { ...a, isDefault: true } : a));
    }
    setAddresses(next);
    try {
      setBusyId(id);
      await addressService.remove(id);
      showSuccessToast('Address Deleted', 'The address has been removed.');
      await load();
    } catch (err: any) {
      setAddresses(previous);
      showErrorToast('Failed', err?.message || 'Could not delete address');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View
        style={{
          backgroundColor: '#fff',
          paddingHorizontal: 8,
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={6}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <ArrowLeft size={22} color="#111827" />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>Saved Addresses</Text>
          <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
            {addresses.length} of {MAX_SAVED_ADDRESSES} addresses used
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }} showsVerticalScrollIndicator={false}>
          {addresses.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 16, backgroundColor: '#fff' }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <MapPin size={28} color="#9ca3af" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 }}>No saved addresses yet</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 19 }}>
                Save your shipping addresses to check out faster next time.
              </Text>
            </View>
          ) : (
            addresses.map((addr) => {
              const meta = TYPE_META[addr.type] || TYPE_META.other;
              const { Icon } = meta;
              const busy = busyId === addr.id;
              return (
                <View
                  key={addr.id}
                  style={{
                    borderWidth: addr.isDefault ? 2 : 1,
                    borderColor: addr.isDefault ? '#111827' : '#e5e7eb',
                    borderRadius: 16,
                    backgroundColor: '#fff',
                    padding: 16,
                  }}
                >
                  {/* Top row — type + default */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: meta.bg, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Icon size={12} color={meta.fg} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: meta.fg }}>{meta.label}</Text>
                    </View>
                    {addr.isDefault ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#111827', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                        <Star size={10} color="#fff" fill="#fff" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>Default</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Address details */}
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{addr.name}</Text>
                  <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>{addr.phone}</Text>
                  <Text style={{ fontSize: 13, color: '#374151', marginTop: 6, lineHeight: 19 }}>
                    {addr.address}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#374151', lineHeight: 19 }}>
                    {addr.city}, {addr.state} {addr.zipCode}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{addr.country || 'United States'}</Text>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable onPress={() => openEdit(addr)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Edit ${meta.label} address`} hitSlop={4}>
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                          <Pencil size={15} color="#475569" />
                        </View>
                      </Pressable>
                      <Pressable onPress={() => confirmDelete(addr)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Delete ${meta.label} address`} hitSlop={4}>
                        <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
                          <Trash2 size={15} color="#ef4444" />
                        </View>
                      </Pressable>
                    </View>
                    {!addr.isDefault ? (
                      <Pressable onPress={() => handleSetDefault(addr)} disabled={busy} accessibilityRole="button" accessibilityLabel="Set as default address" hitSlop={4}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, minHeight: 40, justifyContent: 'center' }}>
                          {busy ? <ActivityIndicator size="small" color="#374151" /> : <Star size={13} color="#374151" />}
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>Set as default</Text>
                        </View>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}

          {atLimit ? (
            <Text style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 4 }}>
              You've reached the {MAX_SAVED_ADDRESSES}-address limit. Delete one to add a new address.
            </Text>
          ) : null}
        </ScrollView>
      )}

      {/* Add Address — sticky bottom button */}
      {!loading && !atLimit ? (
        <View
          style={{
            position: 'absolute',
            left: 0, right: 0, bottom: 0,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
          }}
        >
          <Pressable onPress={openAdd} accessibilityRole="button" accessibilityLabel="Add new address">
            <View style={{ height: 52, borderRadius: 14, backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Plus size={18} color="#fff" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Add Address</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      <AddressFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
        editing={editing}
        hasNoAddressesYet={addresses.length === 0}
      />
    </View>
  );
}
