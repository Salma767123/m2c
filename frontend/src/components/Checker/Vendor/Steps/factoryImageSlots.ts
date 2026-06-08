// Named factory/facility photo slots for the QC factory-inspection form.
// Mirrors the vendor registration form (WarehouseDetails) so a checker uploads
// one image per named view instead of a generic photo pile. Each stored entry
// carries its `slotId` + `label` so the admin/report sees a labelled grid.

export type FactoryImageSlotId =
    | "nameBoard"
    | "frontView"
    | "backView"
    | "leftView"
    | "rightView"
    | "roadView"
    | "insideFactory"
    | "others"

export interface FactoryImageSlot {
    id: FactoryImageSlotId
    label: string
    description: string
    required: boolean
}

// A single uploaded factory photo, stored in formData.factoryPhotos[].
// `data` holds the (compressed) base64 on the client; the backend swaps it for
// a Cloudinary URL on submit. Older reports may omit `slotId`/`label`.
export interface FactoryPhoto {
    slotId?: FactoryImageSlotId
    label?: string
    name: string
    data?: string | null
    url?: string | null
}

export const FACTORY_IMAGE_SLOTS: FactoryImageSlot[] = [
    { id: "nameBoard", label: "Factory Name Board", description: "Signage showing the factory name", required: true },
    { id: "frontView", label: "Front View", description: "Main entrance / facade", required: true },
    { id: "backView", label: "Back View", description: "Rear of the building", required: false },
    { id: "leftView", label: "Left View", description: "Left-side elevation", required: false },
    { id: "rightView", label: "Right View", description: "Right-side elevation", required: false },
    { id: "roadView", label: "Road View", description: "Approach road / driveway", required: false },
    { id: "insideFactory", label: "Inside Factory", description: "Production floor or interior", required: false },
    { id: "others", label: "Others", description: "Any additional photo", required: false },
]

export const REQUIRED_FACTORY_SLOT_IDS: FactoryImageSlotId[] = FACTORY_IMAGE_SLOTS
    .filter((s) => s.required)
    .map((s) => s.id)

// Human label for the required slots, used in helper text / error messages.
export const REQUIRED_FACTORY_SLOT_LABEL = FACTORY_IMAGE_SLOTS
    .filter((s) => s.required)
    .map((s) => s.label)
    .join(", ")

// True when a stored photo entry actually has an image behind it.
export function photoHasImage(p?: FactoryPhoto | null): boolean {
    if (!p) return false
    const src = p.data || p.url
    return typeof src === "string" && src.length > 0
}

// Find the uploaded entry for a given slot (ignores legacy un-slotted items).
export function getSlotPhoto(
    photos: FactoryPhoto[] | undefined,
    slotId: FactoryImageSlotId,
): FactoryPhoto | undefined {
    return (photos || []).find((p) => p?.slotId === slotId && photoHasImage(p))
}
