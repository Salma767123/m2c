/**
 * Device-GPS capture for QC inspections.
 *
 * A QC checker must physically be at the vendor's factory to run an inspection. The
 * browser's geolocation reading is the evidence for that: the backend compares it
 * against the vendor's saved factory coordinates and blocks anything outside
 * LOCATION_THRESHOLD_METERS (see backend/utils/locationUtils.js).
 *
 * Single home for this so factory inspections, product inspections and the report
 * PDFs all prompt identically. Three near-identical copies had drifted before, and one
 * of them ignored the feature flag entirely.
 */

/**
 * Whether the geofence is switched off.
 *
 * ENABLED by default, matching the backend. Set `NEXT_PUBLIC_ENABLE_GEOFENCE=false`
 * only as an escape hatch — this is not a normal operating mode, and the backend
 * enforces its own copy of the rule regardless of what the client believes.
 */
export const GEOFENCE_DISABLED =
  String(process.env.NEXT_PUBLIC_ENABLE_GEOFENCE).toLowerCase() === 'false'

/**
 * Allowed distance between the checker and the vendor's factory, in metres.
 *
 * Display only — the server owns enforcement (LOCATION_THRESHOLD_METERS in
 * backend/utils/locationUtils.js). Keep the two in step; this exists so admin screens
 * stop hard-coding the number in prose.
 */
export const LOCATION_THRESHOLD_METERS = 1000

/**
 * How an inspection's stored location snapshot should be presented.
 *
 * Four outcomes. A virtual inspection never has a location, so it is its own state
 * rather than being mislabelled "Not Verified". Among physical inspections,
 * `locationVerified: false` alone is still ambiguous — it covers both "the checker was
 * too far away" and "the vendor has no coordinates on file" — so those stay distinct;
 * labelling the second a mismatch accuses the checker of something that never happened.
 *
 * `showCoords` is the single flag every report/view reads to decide whether to render
 * latitude/longitude at all: false for virtual (show the type instead).
 */
/** Human label for the address the geofence matched ('legal/factory' | 'warehouse'). */
export function matchedAddressLabel(matched?: string | null): string | null {
  if (matched === 'warehouse') return 'Warehouse address'
  if (matched === 'legal/factory') return 'Legal / Factory site'
  return null
}

export function describeLocationVerification(inspection: {
  inspectionType?: InspectionType | string | null
  locationVerified?: boolean | null
  locationDistanceM?: number | null
  checkerLatitude?: number | null
  /** Which registered address matched: 'legal/factory' | 'warehouse'. */
  matchedAddress?: string | null
}): {
  state: 'virtual' | 'verified' | 'mismatch' | 'unverified'
  label: string
  detail: string | null
  showCoords: boolean
} {
  if (String(inspection.inspectionType).toUpperCase() === 'VIRTUAL') {
    return {
      state: 'virtual',
      label: 'Virtual Inspection',
      detail: 'Conducted online — no on-site location was captured.',
      showCoords: false,
    }
  }
  if (inspection.locationVerified) {
    const site = matchedAddressLabel(inspection.matchedAddress)
    const distance =
      inspection.locationDistanceM != null
        ? `Distance: ${inspection.locationDistanceM}m (allowed: ${LOCATION_THRESHOLD_METERS}m)`
        : null
    // Name the exact address the checker was verified at, then the distance.
    const detail = [site ? `Verified at: ${site}` : null, distance].filter(Boolean).join(' · ') || null
    return {
      state: 'verified',
      label: 'Location Verified',
      detail,
      showCoords: true,
    }
  }
  if (inspection.locationDistanceM != null) {
    return {
      state: 'mismatch',
      label: 'Location Mismatch',
      detail: `Distance: ${inspection.locationDistanceM}m (allowed: ${LOCATION_THRESHOLD_METERS}m)`,
      showCoords: true,
    }
  }
  return {
    state: 'unverified',
    label: 'Not Verified',
    detail: "Vendor has no factory coordinates on file, so the checker's position could not be compared.",
    showCoords: true,
  }
}

export interface CheckerCoords {
  latitude: number
  longitude: number
}

/**
 * Read the device's current position.
 *
 * Rejects with a message written for the checker standing at a factory gate, not a
 * developer — each failure says what to actually do about it.
 *
 * `maximumAge: 0` because a cached fix from another location would defeat the point,
 * and `enableHighAccuracy` because a network-derived position can be kilometres off.
 */
export function getCurrentCoords(): Promise<CheckerCoords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(
        new Error(
          'Location is not supported by this browser. Please use a device with GPS/location enabled.',
        ),
      )
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow location access for this site and refresh the page to continue the inspection.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Your location could not be determined. Please check that location services are enabled and try again.'
              : 'Timed out while getting your location. Please try again.'
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

/**
 * Capture coordinates for a submission, honouring the feature flag and inspection type.
 *
 * Returns null — so callers post explicit nulls and the server records no position —
 * when EITHER the geofence is switched off OR the inspection is virtual (online, so
 * there is no on-site location to capture).
 */
export async function captureCoordsForSubmit(
  inspectionType?: InspectionType,
): Promise<CheckerCoords | null> {
  if (inspectionType === 'VIRTUAL') return null
  if (GEOFENCE_DISABLED) return null
  return getCurrentCoords()
}

export type InspectionType = 'PHYSICAL' | 'VIRTUAL'

/** Human label for an inspection type. Defaults to Physical for legacy/absent values. */
export function inspectionTypeLabel(type?: InspectionType | string | null): string {
  return String(type).toUpperCase() === 'VIRTUAL' ? 'Virtual Inspection' : 'Physical Inspection'
}
