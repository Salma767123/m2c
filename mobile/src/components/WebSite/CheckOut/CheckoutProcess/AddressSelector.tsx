import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MapPin, Home, Briefcase, Star, Plus, Check, Pencil } from 'lucide-react-native';
import type { SavedAddress } from '@/services/addressService';
import { getStateName, formatPhoneForDisplay } from './constants';
import { Palette } from '@/constants/theme';

interface AddressSelectorProps {
  addresses: SavedAddress[];
  selectedId: string | null;
  useNewAddress: boolean;
  onSelect: (id: string) => void;
  onChooseNew: () => void;
  onEdit?: (id: string) => void;
  disabled?: boolean;
}

const TYPE_META: Record<string, { label: string; Icon: typeof Home }> = {
  home: { label: 'Home', Icon: Home },
  work: { label: 'Work', Icon: Briefcase },
  other: { label: 'Other', Icon: MapPin },
};

export default function AddressSelector({
  addresses,
  selectedId,
  useNewAddress,
  onSelect,
  onChooseNew,
  onEdit,
  disabled,
}: AddressSelectorProps) {
  if (addresses.length === 0) return null;

  return (
    <View style={{ gap: 12 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a' }}>Ship to a saved address</Text>
        <Text style={{ fontSize: 12, color: '#8a807a' }}>{addresses.length} saved</Text>
      </View>

      {/* Address cards */}
      {addresses.map((addr) => {
        const meta = TYPE_META[addr.type] || TYPE_META.other;
        const { Icon } = meta;
        const selected = !useNewAddress && selectedId === addr.id;

        return (
          <Pressable
            key={addr.id}
            onPress={() => { if (!disabled) onSelect(addr.id); }}
            accessibilityRole="radio"
            accessibilityState={{ selected, disabled: disabled ?? false }}
            accessibilityLabel={`${meta.label} address: ${addr.name}, ${addr.address}, ${addr.city}`}
          >
             <View
               style={{
                 borderWidth: selected ? 2 : 1.5,
                 borderColor: selected ? '#e01a1b' : '#e5dbd0',
                 borderRadius: 14,
                 padding: 14,
                 backgroundColor: selected ? '#fef2f2' : '#fffdfbf',
                 opacity: disabled ? 0.6 : 1,
               }}
             >
              {/* Top row — type badge + default + check + edit */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {/* Type badge */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#faf6f2', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#f0e8df' }}>
                    <Icon size={11} color="#4a423c" />
                    <Text style={{ fontSize: 11, fontWeight: '600', color: '#4a423c' }}>{meta.label}</Text>
                  </View>
                  {/* Default badge */}
                  {addr.isDefault ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Palette.primary, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Star size={9} color="#fff" fill="#fff" />
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>Default</Text>
                    </View>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {onEdit ? (
                    <Pressable
                      onPress={() => onEdit(addr.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${meta.label} address`}
                      hitSlop={4}
                    >
                      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3ece5', alignItems: 'center', justifyContent: 'center' }}>
                        <Pencil size={14} color="#6b625b" />
                      </View>
                    </Pressable>
                  ) : null}
                  {selected ? (
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: Palette.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Name + Phone */}
               <Text style={{ fontSize: 14, fontWeight: '700', color: '#1a1a1a' }} numberOfLines={1}>{addr.name}</Text>
               <Text style={{ fontSize: 12, color: '#6b625b', marginTop: 1 }}>
                 {formatPhoneForDisplay(addr.phone, addr.country)}
               </Text>

               {/* Address */}
               <Text style={{ fontSize: 12, color: '#4a423c', marginTop: 4, lineHeight: 17 }} numberOfLines={2}>
                {[
                  addr.address,
                  addr.addressLine2,
                  addr.city,
                  getStateName(addr.state, addr.country),
                  addr.zipCode,
                ].filter(Boolean).join(', ')}
              </Text>
            </View>
          </Pressable>
        );
      })}

      {/* Use new address tile */}
      <Pressable
        onPress={() => { if (!disabled) onChooseNew(); }}
        accessibilityRole="radio"
        accessibilityState={{ selected: useNewAddress, disabled: disabled ?? false }}
        accessibilityLabel="Use a new shipping address"
      >
          <View
            style={{
              borderWidth: useNewAddress ? 2 : 1.5,
              borderColor: useNewAddress ? '#E01A1B' : '#e5dbd0',
              borderStyle: 'dashed',
              borderRadius: 14,
              padding: 20,
              backgroundColor: '#fffdfbf',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              minHeight: 60,
              opacity: disabled ? 0.6 : 1,
            }}
          >
          <Plus size={18} color={useNewAddress ? '#E01A1B' : '#6b625b'} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: useNewAddress ? '#E01A1B' : '#6b625b' }}>
            Use a new address
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
