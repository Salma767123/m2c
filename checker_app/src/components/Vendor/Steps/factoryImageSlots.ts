// RN port of frontend/src/components/Checker/Vendor/Steps/factoryImageSlots.ts
// Named factory/facility photo slots for the QC factory-inspection form.
// Kept 1:1 with the web source so the app produces the same slot ids/labels.

export type FactoryImageSlotId =
  | 'nameBoard'
  | 'frontView'
  | 'backView'
  | 'leftView'
  | 'rightView'
  | 'roadView'
  | 'insideFactory'
  | 'others';

export interface FactoryImageSlot {
  id: FactoryImageSlotId;
  label: string;
  description: string;
  required: boolean;
}

// A single uploaded factory photo, stored in formData.factoryPhotos[].
// `data` holds the (compressed) base64 data URI on the client; the backend
// swaps it for a Cloudinary URL on submit.
export interface FactoryPhoto {
  slotId?: FactoryImageSlotId;
  label?: string;
  name: string;
  data?: string | null;
  url?: string | null;
}

export const FACTORY_IMAGE_SLOTS: FactoryImageSlot[] = [
  { id: 'nameBoard', label: 'Factory Name Board', description: 'Signage showing the factory name', required: true },
  { id: 'frontView', label: 'Front View', description: 'Main entrance / facade', required: true },
  { id: 'backView', label: 'Back View', description: 'Rear of the building', required: false },
  { id: 'leftView', label: 'Left View', description: 'Left-side elevation', required: false },
  { id: 'rightView', label: 'Right View', description: 'Right-side elevation', required: false },
  { id: 'roadView', label: 'Road View', description: 'Approach road / driveway', required: false },
  { id: 'insideFactory', label: 'Inside Factory', description: 'Production floor or interior', required: false },
  { id: 'others', label: 'Others', description: 'Any additional photo', required: false },
];

export const REQUIRED_FACTORY_SLOT_IDS: FactoryImageSlotId[] = FACTORY_IMAGE_SLOTS
  .filter((s) => s.required)
  .map((s) => s.id);

export const REQUIRED_FACTORY_SLOT_LABEL = FACTORY_IMAGE_SLOTS
  .filter((s) => s.required)
  .map((s) => s.label)
  .join(', ');

export function photoHasImage(p?: FactoryPhoto | null): boolean {
  if (!p) return false;
  const src = p.data || p.url;
  return typeof src === 'string' && src.length > 0;
}

export function getSlotPhoto(
  photos: FactoryPhoto[] | undefined,
  slotId: FactoryImageSlotId,
): FactoryPhoto | undefined {
  return (photos || []).find((p) => p?.slotId === slotId && photoHasImage(p));
}
