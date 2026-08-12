/**
 * Read-only "who made this item" card — plain body used inside the Product
 * detail screen. Port of web frontend/src/components/Shared/ManufacturerInfoCard.tsx
 * (plain variant). Renders nothing when there is no manufacturer data.
 */
import React from 'react';
import { Image, Text, View } from 'react-native';
import { User } from 'lucide-react-native';

export interface ManufacturerInfo {
  photo?: string;
  title?: string;
  fullName?: string;
  role?: string;
  experience?: string;
  description?: string;
}

/** True when the vendor supplied at least one real manufacturer field. */
export function hasManufacturerInfo(m?: ManufacturerInfo | null): boolean {
  if (!m) return false;
  return Boolean(
    (m.photo && m.photo.trim()) ||
      (m.fullName && m.fullName.trim()) ||
      (m.role && m.role.trim()) ||
      (m.experience && m.experience.trim()) ||
      (m.description && m.description.trim()),
  );
}

/** "Mr. Ravi Kumar" — title + name, trimmed, either part optional. */
export function manufacturerDisplayName(m?: ManufacturerInfo | null): string {
  if (!m) return '';
  return [m.title, m.fullName].filter((p) => p && p.trim()).join(' ').trim();
}

export function ManufacturerInfoCard({ info }: { info?: ManufacturerInfo | null }) {
  if (!hasManufacturerInfo(info)) return null;
  const m = info as ManufacturerInfo;
  const name = manufacturerDisplayName(m);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      {/* Photo */}
      <View style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' }}>
        {m.photo ? (
          <Image source={{ uri: m.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <User size={26} color="#94a3b8" />
        )}
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontWeight: '600', color: '#0f172a', fontSize: 15, lineHeight: 20 }} numberOfLines={1}>
          {name || '—'}
        </Text>
        {(m.role || m.experience) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, marginTop: 4 }}>
            {m.role?.trim() ? (
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                <Text style={{ color: '#94a3b8' }}>Role: </Text>
                {m.role}
              </Text>
            ) : null}
            {m.experience?.trim() ? (
              <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                <Text style={{ color: '#94a3b8' }}>Experience: </Text>
                {m.experience}
              </Text>
            ) : null}
          </View>
        )}
        {m.description?.trim() ? (
          <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginTop: 6 }} selectable>
            {m.description}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
