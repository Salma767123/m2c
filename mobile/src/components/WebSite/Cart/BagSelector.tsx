import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { ShoppingBag, Check, Package } from 'lucide-react-native';
import { bagTypeService, type BagType } from '@/services/bagTypeService';

interface BagSelectorProps {
  selectedBagId: string | null;
  onSelect: (bag: BagType | null) => void;
}

function BagSelector({ selectedBagId, onSelect }: BagSelectorProps) {
  const [bags, setBags] = useState<BagType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await bagTypeService.getActiveBagTypes();
      if (res.success) setBags(res.data);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={s.container}>
        <View style={s.header}>
          <ShoppingBag size={16} color="#374151" />
          <Text style={s.headerTitle}>Add a Bag</Text>
        </View>
        <ActivityIndicator size="small" color="#6b7280" style={s.loader} />
      </View>
    );
  }

  if (bags.length === 0) return null;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <ShoppingBag size={16} color="#374151" />
        <Text style={s.headerTitle}>Add a Bag</Text>
        <View style={s.countBadge}>
          <Text style={s.countText}>{bags.length}</Text>
        </View>
      </View>

      {/* No bag option */}
      <Pressable
        onPress={() => onSelect(null)}
        accessibilityRole="radio"
        accessibilityState={{ selected: selectedBagId === null }}
        style={[s.option, selectedBagId === null ? s.optionSelected : null]}
      >
        <View style={[s.radio, selectedBagId === null ? s.radioSelected : null]}>
          {selectedBagId === null ? <Check size={12} color="#fff" /> : null}
        </View>
        <Text style={s.optionLabel}>No bag needed</Text>
      </Pressable>

      {/* Bag options */}
      {bags.map((bag) => {
        const isSelected = selectedBagId === bag.id;
        return (
          <BagOption
            key={bag.id}
            bag={bag}
            isSelected={isSelected}
            onPress={() => onSelect(bag)}
          />
        );
      })}
    </View>
  );
}

const BagOption = memo(function BagOption({
  bag,
  isSelected,
  onPress,
}: {
  bag: BagType;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${bag.name}, $${bag.price.toFixed(2)}`}
      style={[s.option, isSelected ? s.optionSelected : null]}
    >
      <View style={[s.radio, isSelected ? s.radioSelected : null]}>
        {isSelected ? <Check size={12} color="#fff" /> : null}
      </View>
      <View style={s.bagImage}>
        {bag.image ? (
          <Image
            source={{ uri: bag.image }}
            style={s.bagImageInner}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <Package size={18} color="#d1d5db" />
        )}
      </View>
      <View style={s.bagInfo}>
        <Text style={s.bagName} numberOfLines={1}>{bag.name}</Text>
        {bag.description ? (
          <Text style={s.bagDesc} numberOfLines={1}>{bag.description}</Text>
        ) : null}
      </View>
      <Text style={s.bagPrice}>${bag.price.toFixed(2)}</Text>
    </Pressable>
  );
});

export default BagSelector;

const s = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  countBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
  },
  loader: {
    paddingVertical: 12,
  },

  // Options
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#f3f4f6',
    backgroundColor: '#ffffff',
    marginBottom: 8,
    gap: 10,
  },
  optionSelected: {
    borderColor: '#111827',
    backgroundColor: '#f9fafb',
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },

  // Radio dot
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },

  // Bag item
  bagImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bagImageInner: {
    width: '100%',
    height: '100%',
  },
  bagInfo: {
    flex: 1,
  },
  bagName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  bagDesc: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 1,
  },
  bagPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
});
