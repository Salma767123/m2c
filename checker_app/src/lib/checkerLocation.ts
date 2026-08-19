/**
 * Device-GPS capture for QC inspections (mobile mirror of the web
 * `frontend/src/lib/checkerLocation.ts`).
 *
 * A checker running a PHYSICAL inspection must be standing at the vendor's site:
 * the backend compares the coordinates we send against the vendor's registered
 * factory/warehouse positions and refuses anything further than
 * LOCATION_THRESHOLD_METERS away (backend/utils/locationUtils.js).
 *
 * The app used to send no coordinates at all, which the server answers with a 400
 * "Location required" — so a physical inspection could never actually start. This
 * module is the single place that reads the device position, so start and submit
 * prompt identically.
 */
import * as Location from 'expo-location';

export type InspectionType = 'PHYSICAL' | 'VIRTUAL';

/**
 * Whether the geofence is switched off.
 *
 * ENABLED by default, matching the backend (`ENABLE_GEOFENCE=false` is an escape
 * hatch for a GPS outage, not a normal mode). The server enforces its own copy
 * regardless of what the client believes.
 */
export const GEOFENCE_DISABLED =
  String(process.env.EXPO_PUBLIC_ENABLE_GEOFENCE).toLowerCase() === 'false';

/** Display only — the server owns enforcement. Keep in step with the backend. */
export const LOCATION_THRESHOLD_METERS = 1000;

export interface CheckerCoords {
  latitude: number;
  longitude: number;
}

/** Reject a hanging fix rather than leaving the checker on a dead spinner. */
const FIX_TIMEOUT_MS = 15000;

/**
 * Read the device's current position.
 *
 * Rejects with a message written for a checker standing at a factory gate — each
 * failure says what to actually do about it. `Accuracy.High` because a
 * network-derived position can be kilometres off, which the geofence would read
 * as "not on site".
 */
export async function getCurrentCoords(): Promise<CheckerCoords> {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error(
      'Location permission was denied. Please allow location access for this app in your device settings, then try again.',
    );
  }

  const enabled = await Location.hasServicesEnabledAsync().catch(() => true);
  if (!enabled) {
    throw new Error('Location services are turned off. Please switch on GPS and try again.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const position = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Timed out while getting your location. Please try again.')),
          FIX_TIMEOUT_MS,
        );
      }),
    ]);
    return { latitude: position.coords.latitude, longitude: position.coords.longitude };
  } catch (err: any) {
    // expo-location surfaces its own message for an unavailable fix; keep ours
    // when we already wrote one (permission / services / timeout).
    throw new Error(
      err?.message ||
        'Your location could not be determined. Please check that location services are enabled and try again.',
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Capture coordinates for a start/submit call, honouring the flag and the type.
 *
 * Returns null — so the caller posts explicit nulls and the server records no
 * position — when the geofence is off OR the inspection is virtual (online, so
 * there is no on-site location to capture).
 */
export async function captureCoordsForSubmit(
  inspectionType?: InspectionType | null,
): Promise<CheckerCoords | null> {
  if (String(inspectionType).toUpperCase() === 'VIRTUAL') return null;
  if (GEOFENCE_DISABLED) return null;
  return getCurrentCoords();
}

/** Human label for an inspection type. Defaults to Physical for legacy/absent values. */
export function inspectionTypeLabel(type?: InspectionType | string | null): string {
  return String(type).toUpperCase() === 'VIRTUAL' ? 'Virtual Inspection' : 'Physical Inspection';
}
