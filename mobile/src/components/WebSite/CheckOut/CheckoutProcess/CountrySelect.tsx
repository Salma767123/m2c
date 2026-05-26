import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { ChevronDown, Check, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCountries, getCountry, type CountryOption } from './constants';

interface CountrySelectProps {
  value: string;
  onChange: (isoCode: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  accessibilityLabel?: string;
}

export default function CountrySelect({
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  accessibilityLabel,
}: CountrySelectProps) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const countries = useMemo(() => getCountries(), []);
  const selected = useMemo(() => getCountry(value), [value]);

  const filtered = useMemo<CountryOption[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q) ||
        c.phoneCode.includes(q),
    );
  }, [countries, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  const choose = (iso: string) => {
    onChange(iso);
    setOpen(false);
    setQuery('');
    onBlur?.();
  };

  return (
    <>
      {/* Field */}
      <Pressable
        onPress={() => { if (!disabled) { setOpen(true); setQuery(''); } }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || 'Select country'}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 14,
            minHeight: 48,
            borderWidth: 1.5,
            borderColor: invalid ? '#ef4444' : '#e2e8f0',
            borderRadius: 12,
            backgroundColor: disabled ? '#f1f5f9' : '#f8fafc',
          }}
        >
          {selected ? (
            <Text style={{ flex: 1, fontSize: 14, color: '#111827', fontWeight: '600' }}>
              {selected.flag}  {selected.name}  ({selected.phoneCode})
            </Text>
          ) : (
            <Text style={{ flex: 1, fontSize: 14, color: '#9ca3af' }}>Select Country</Text>
          )}
          <ChevronDown size={16} color="#6b7280" />
        </View>
      </Pressable>

      {/* Picker modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: insets.top + 8,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Select Country</Text>
            <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close country picker" hitSlop={4}>
              <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} color="#6b7280" />
              </View>
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f3f4f6',
                borderRadius: 12,
                paddingHorizontal: 12,
                height: 44,
                gap: 8,
              }}
            >
              <Search size={16} color="#9ca3af" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search countries..."
                placeholderTextColor="#9ca3af"
                autoFocus
                style={{ flex: 1, fontSize: 14, color: '#111827' }}
              />
            </View>
          </View>

          {/* List */}
          <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            {filtered.map((c) => {
              const isSelected = c.isoCode === value;
              return (
                <Pressable
                  key={c.isoCode}
                  onPress={() => choose(c.isoCode)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name} ${c.phoneCode}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 20,
                      paddingVertical: 14,
                      backgroundColor: isSelected ? '#f0f9ff' : '#fff',
                      borderBottomWidth: 1,
                      borderBottomColor: '#f3f4f6',
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{c.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: isSelected ? '700' : '500', color: isSelected ? '#0369a1' : '#111827' }}>
                        {c.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>
                        {c.isoCode} · {c.phoneCode}
                      </Text>
                    </View>
                    {isSelected ? <Check size={18} color="#0369a1" strokeWidth={2.5} /> : null}
                  </View>
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#6b7280' }}>No countries found</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
