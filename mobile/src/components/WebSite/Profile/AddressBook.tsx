import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Plus, MapPin, Home, Briefcase, Pencil, Trash2, Star } from 'lucide-react-native';
import { useConfirm } from '@/components/WebSite/Shared/ConfirmDialog';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '@/components/WebSite/Shared/ScreenHeader';
import EmptyState from '@/components/WebSite/Shared/EmptyState';
import {
  addressService,
  MAX_SAVED_ADDRESSES,
  type SavedAddress,
  type AddressPayload,
} from '@/services/addressService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import AddressFormModal from './AddressFormModal';
import { Fonts } from '@/constants/theme';

/**
 * Warm palette, 1:1 with the web's AddressBook.tsx.
 *
 * This screen was slate throughout — #111827, #6b7280, #374151, #e5e7eb — and
 * set every string with a bare fontSize and no `fontFamily` at all, so on
 * Android the whole page rendered in Roboto beside screens rendering in Outfit
 * and Poppins. Both are fixed here.
 */
const WARM = {
  ink: '#1a1a1a',
  body: '#5f5550',
  muted: '#7a6d62',
  subtle: '#a89a8d',
  line: '#efe4d8',
  lineSoft: '#f2e9df',
  ground: '#faf7f3',
  red: '#e01a1b',
  deep: '#c41617',
  dark: '#7a0f10',
  defaultBg: '#fdf8f6',
  defaultLine: '#e8d2cb',
} as const;

/* The type chip is one neutral pill for all three, as on the web. It used to
   take a different tint per type — mint, indigo, slate — which made "Home" and
   "Work" read as statuses rather than as labels. */
const TYPE_META: Record<string, { label: string; Icon: typeof Home }> = {
  home: { label: 'Home', Icon: Home },
  work: { label: 'Work', Icon: Briefcase },
  other: { label: 'Other', Icon: MapPin },
};
export default function AddressBook() {
  const confirm = useConfirm();
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

  const confirmDelete = async (addr: SavedAddress) => {
    const ok = await confirm({
      title: 'Delete address?',
      message:
        "This address will be permanently removed. If it's your default, the next address becomes the default.",
      confirmLabel: 'Delete',
    });
    if (ok) handleDelete(addr.id);
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
    <View style={s.screen}>
      <ScreenHeader
        title="Saved Addresses"
        eyebrow="Where we deliver"
        subtitle={`${addresses.length} of ${MAX_SAVED_ADDRESSES} saved`}
        onBack={() => router.back()}
      />

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={WARM.red} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {addresses.length === 0 ? (
            /* The shared empty state, not a dashed box. A dashed border means
               "drop something here" — it is an upload affordance, and around a
               list it made a finished screen look unbuilt. The web's Profile
               note says exactly this about the frame it removed. */
            <EmptyState
              fill={false}
              icon={MapPin}
              title="No saved addresses yet"
              subtitle="Save your shipping addresses to check out faster next time."
              ctaLabel="Add address"
              ctaIcon={Plus}
              onPress={openAdd}
            />
          ) : (
            addresses.map((addr) => {
              const meta = TYPE_META[addr.type] || TYPE_META.other;
              const { Icon } = meta;
              const busy = busyId === addr.id;
              return (
                <View
                  key={addr.id}
                  /* 1px, not 2px. The web's note: "A 2px border around every
                     card put more ink into the frames than into the addresses
                     inside them. The default card is marked by a warm tint and
                     its badge rather than by a heavier line." Mobile had the
                     2px, and in near-black. */
                  style={[s.card, addr.isDefault && s.cardDefault]}
                >
                  <View style={s.cardTop}>
                    <View style={s.typeChip}>
                      <Icon size={14} color={WARM.subtle} />
                      <Text style={s.typeChipText}>{meta.label}</Text>
                    </View>
                    {addr.isDefault ? (
                      <View style={s.defaultChip}>
                        <Star size={11} color="#ffffff" fill="#ffffff" />
                        <Text style={s.defaultChipText}>Default</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* The recipient is the line you scan for when you have three
                      of these, so it is set larger than the address beneath it
                      rather than one weight heavier at the same size. */}
                  <Text style={s.name}>{addr.name}</Text>
                  <Text style={s.phone}>{addr.phone}</Text>

                  <View style={{ marginTop: 12, gap: 2 }}>
                    <Text style={s.addrLine}>
                      {addr.address}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                    </Text>
                    <Text style={s.addrLine}>
                      {addr.city}, {addr.state} {addr.zipCode}
                    </Text>
                    <Text style={s.country}>{addr.country || '—'}</Text>
                  </View>

                  <View style={s.actions}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        onPress={() => openEdit(addr)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${meta.label} address`}
                        hitSlop={4}
                        style={[s.iconBtn, busy && { opacity: 0.5 }]}
                      >
                        <Pencil size={16} color={WARM.muted} />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(addr)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${meta.label} address`}
                        hitSlop={4}
                        /* This was a SOLID #E01A1B plate carrying a #E01A1B
                           glyph — a red square with an invisible icon in it. */
                        style={[s.iconBtn, s.iconBtnDanger, busy && { opacity: 0.5 }]}
                      >
                        <Trash2 size={16} color={WARM.deep} />
                      </Pressable>
                    </View>

                    {!addr.isDefault ? (
                      <Pressable
                        onPress={() => handleSetDefault(addr)}
                        disabled={busy}
                        accessibilityRole="button"
                        accessibilityLabel="Set as default address"
                        hitSlop={4}
                        style={s.setDefault}
                      >
                        {busy ? (
                          <ActivityIndicator size="small" color={WARM.dark} />
                        ) : (
                          <Star size={13} color={WARM.dark} />
                        )}
                        <Text style={s.setDefaultText}>Set as default</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}

          {atLimit ? (
            <Text style={s.limitNote}>
              You&apos;ve reached the {MAX_SAVED_ADDRESSES}-address limit. Delete one to add a new address.
            </Text>
          ) : null}
        </ScrollView>
      )}

      {/* Add Address — sticky, so it is reachable with three addresses on
          screen and with none. */}
      {!loading && !atLimit && addresses.length > 0 ? (
        <View style={[s.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            onPress={openAdd}
            accessibilityRole="button"
            accessibilityLabel="Add new address"
            android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
            style={s.addBtn}
          >
            <Plus size={18} color="#ffffff" strokeWidth={2.4} />
            <Text style={s.addBtnText}>Add address</Text>
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

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: WARM.ground },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    borderWidth: 1,
    borderColor: WARM.line,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 20,
  },
  cardDefault: { borderColor: WARM.defaultLine, backgroundColor: WARM.defaultBg },

  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  /* `rounded-full border border-[#e6dcd0] bg-[#faf7f3] text-[#5f5550]` */
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e6dcd0',
    backgroundColor: WARM.ground,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeChipText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: WARM.body,
  },
  defaultChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: WARM.red,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  defaultChipText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    color: '#ffffff',
  },

  name: { fontFamily: Fonts.sansSemibold, fontSize: 15, fontWeight: '600', color: WARM.ink },
  phone: { fontFamily: Fonts.sans, fontSize: 13, color: WARM.muted, marginTop: 2 },
  addrLine: { fontFamily: Fonts.sans, fontSize: 13.5, lineHeight: 21, color: WARM.body },
  country: { fontFamily: Fonts.sans, fontSize: 12, color: WARM.subtle, marginTop: 2 },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: WARM.lineSoft,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: WARM.ground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDanger: { backgroundColor: '#fdf3f0' },
  setDefault: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, minHeight: 40 },
  setDefaultText: { fontFamily: Fonts.sansSemibold, fontSize: 12.5, fontWeight: '600', color: WARM.dark },

  limitNote: {
    fontFamily: Fonts.sans,
    fontSize: 12.5,
    lineHeight: 18,
    color: WARM.muted,
    textAlign: 'center',
    marginTop: 4,
  },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: WARM.lineSoft,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: WARM.red,
    overflow: 'hidden',
    shadowColor: WARM.red,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    // Android paints elevation only.
    elevation: 4,
  },
  addBtnText: { fontFamily: Fonts.sansSemibold, fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
