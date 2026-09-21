import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView, StyleSheet } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCountries, type CountryOption } from '@/components/WebSite/CheckOut/CheckoutProcess/constants';
import { Palette } from '@/constants/theme';

interface CountryCodeSelectProps {
  /** Current dial code, e.g. "+91". */
  value: string;
  /** Fired with the chosen country's dial code, e.g. "+971". */
  onChange: (dialCode: string) => void;
  disabled?: boolean;
}


export default function CountryCodeSelect({ value, onChange, disabled }: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const countries = useMemo(() => getCountries(), []);
  const selected = useMemo(
    () => countries.find((c) => c.phoneCode === value),
    [countries, value],
  );
  const filtered = useMemo(() => {
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
  };

  const choose = (dialCode: string) => {
    onChange(dialCode);
    close();
  };

  const triggerBg = disabled ? Palette.disabled : Palette.surface;
  const triggerBorder = disabled ? Palette.outlineVariant : Palette.outline;

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={() => { if (!disabled) { setOpen(true); setQuery(''); } }}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Select country code"
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        style={[styles.trigger, { backgroundColor: triggerBg, borderColor: triggerBorder }]}
      >
        <View style={styles.triggerInner}>
          {!!selected && <Text style={styles.flag}>{selected.flag}</Text>}
          <Text style={[styles.dialCode, disabled && styles.dialCodeDisabled]}>
            {value || '+91'}
          </Text>
        </View>
        <ChevronDown size={16} color={disabled ? Palette.textSubtle : Palette.textMuted} />
      </Pressable>

      {/* Picker modal */}
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <View style={[styles.modalRoot, { backgroundColor: Palette.surface }]}>
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              { paddingTop: insets.top + 12, borderBottomColor: Palette.outlineSubtle },
            ]}
          >
            <Text style={[styles.modalTitle, { color: Palette.ink }]}>Select Country</Text>
            <Pressable
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close country picker"
              hitSlop={8}
            >
              <View style={styles.modalCloseBtn}>
                <X size={20} color={Palette.textMuted} />
              </View>
            </Pressable>
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <Search size={16} color={Palette.textSubtle} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search country or code"
              placeholderTextColor={Palette.textSubtle}
              autoFocus
              style={[styles.searchInput, { color: Palette.ink }]}
            />
          </View>

          {/* List */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.map((c: CountryOption) => {
              const isSelected = c.phoneCode === value;
              return (
                <Pressable
                  key={c.isoCode}
                  onPress={() => choose(c.phoneCode)}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name} ${c.phoneCode}`}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.countryRow,
                    { borderBottomColor: Palette.outlineSubtle },
                    isSelected && styles.countryRowSelected,
                  ]}
                >
                  <Text style={styles.countryFlag}>{c.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text
                      style={[
                        styles.countryName,
                        { color: Palette.ink },
                        isSelected && { color: Palette.primary },
                      ]}
                    >
                      {c.name}
                    </Text>
                    <Text style={[styles.countryDial, { color: Palette.textMuted }]}>{c.isoCode} · {c.phoneCode}</Text>
                  </View>
                  {isSelected ? <X size={18} color={Palette.primary} strokeWidth={2.5} /> : null}
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: Palette.textMuted }]}>No matches</Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 96,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  triggerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flag: {
    fontSize: 16,
    lineHeight: 16,
  },
  dialCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dialCodeDisabled: {
    color: '#9ca3af',
  },
  modalRoot: {
    flex: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  countryRowSelected: {
    backgroundColor: '#fff5f5',
  },
  countryFlag: {
    fontSize: 20,
    lineHeight: 20,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 15,
    fontWeight: '500',
  },
  countryDial: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
