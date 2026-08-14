// "Who made this item" — the person/entity that manufactured a product, entered by the
// vendor on the product form and shown on every product & inspection surface.
//
// 1:1 port of frontend/src/lib/manufacturerInfo.ts — keep the two in step.

export interface ManufacturerInfo {
  /** Cloudinary URL after save; a base64 data URL while being edited in the form. */
  photo?: string
  /** Mr. / Mrs. / Ms. */
  title?: string
  fullName?: string
  /** e.g. "Master Weaver", "Production Head". */
  role?: string
  /** Free text, e.g. "12 years", "Since 2008". */
  experience?: string
  description?: string
}

/** True when the vendor supplied at least one real manufacturer field. */
export function hasManufacturerInfo(m?: ManufacturerInfo | null): boolean {
  if (!m) return false
  return Boolean(
    (m.photo && m.photo.trim()) ||
      (m.fullName && m.fullName.trim()) ||
      (m.role && m.role.trim()) ||
      (m.experience && m.experience.trim()) ||
      (m.description && m.description.trim()),
  )
}

/** "Mr. Ravi Kumar" — title + name, trimmed, either part optional. */
export function manufacturerDisplayName(m?: ManufacturerInfo | null): string {
  if (!m) return ''
  return [m.title, m.fullName].filter((p) => p && p.trim()).join(' ').trim()
}
