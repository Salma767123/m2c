/**
 * Location utilities for QC Checker → Vendor proximity verification.
 *
 * Extracts lat/lng from Google Maps embed URLs and calculates Haversine
 * distance between two GPS coordinates.
 */

/**
 * Parse latitude and longitude from a Google Maps embed URL.
 *
 * The embed URL's `pb` parameter encodes coordinates as:
 *   !2d<longitude>!3d<latitude>
 *
 * Example:
 *   https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31425.8!2d78.1388!3d10.0804!...
 *   → { latitude: 10.0804, longitude: 78.1388 }
 *
 * @param {string|null|undefined} mapLink - Google Maps embed URL or iframe HTML
 * @returns {{ latitude: number, longitude: number } | null}
 */
function parseMapLinkCoordinates(mapLink) {
  if (!mapLink || typeof mapLink !== "string") return null;

  // If it's an iframe tag, extract the src attribute
  let url = mapLink;
  const srcMatch = mapLink.match(/src=["']([^"']+)["']/i);
  if (srcMatch) {
    url = srcMatch[1];
  }

  // Method 1: Parse from pb parameter (!2d<lng>!3d<lat>)
  const lngMatch = url.match(/!2d(-?[\d.]+)/);
  const latMatch = url.match(/!3d(-?[\d.]+)/);

  if (latMatch && lngMatch) {
    const latitude = parseFloat(latMatch[1]);
    const longitude = parseFloat(lngMatch[1]);
    if (
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  // Method 2: Parse from @lat,lng format in regular Google Maps URLs
  const atMatch = url.match(/@(-?[\d.]+),(-?[\d.]+)/);
  if (atMatch) {
    const latitude = parseFloat(atMatch[1]);
    const longitude = parseFloat(atMatch[2]);
    if (
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  // Method 3: Parse from q=lat,lng or ll=lat,lng format
  const qMatch = url.match(/[?&](?:q|ll)=(-?[\d.]+),(-?[\d.]+)/);
  if (qMatch) {
    const latitude = parseFloat(qMatch[1]);
    const longitude = parseFloat(qMatch[2]);
    if (
      !isNaN(latitude) &&
      !isNaN(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

/**
 * Calculate the Haversine distance between two GPS coordinates.
 *
 * @param {number} lat1 - Latitude of point 1 (degrees)
 * @param {number} lon1 - Longitude of point 1 (degrees)
 * @param {number} lat2 - Latitude of point 2 (degrees)
 * @param {number} lon2 - Longitude of point 2 (degrees)
 * @returns {number} Distance in meters
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6_371_000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Threshold in meters — inspections where the checker is further than
 * this from the vendor's factory are **blocked**.
 */
const LOCATION_THRESHOLD_METERS = 500;

/**
 * Geofence guard used by every "checker → vendor factory" action.
 *
 * Mirrors the inline check in `inspectionController.startInspection` so the
 * three error shapes (Location required / Vendor location not set /
 * Location mismatch) are identical across factory + product inspections,
 * which lets the checker app handle them with one set of branches.
 *
 * Resolves the vendor's coordinates from the stored columns, falls back to
 * parsing `mapLink` on the fly, and lazily backfills the columns when the
 * parse succeeds.
 *
 * @returns {Promise<
 *   { ok: true, vendorLat: number, vendorLng: number, distanceM: number }
 *   | { ok: false, status: number, body: object }
 * >}
 */
async function verifyCheckerAtVendor({
  vendor,
  checkerLatitude,
  checkerLongitude,
  prisma,
  label,
}) {
  const prefix = label ? `${label} — ` : "";

  if (checkerLatitude == null || checkerLongitude == null) {
    console.log(
      `[Geofence] ${prefix}SKIPPED — no checker GPS sent ` +
        `(checkerLatitude=${checkerLatitude}, checkerLongitude=${checkerLongitude}). ` +
        `Responding with 400 "Location required".`,
    );
    return {
      ok: false,
      status: 400,
      body: {
        error: "Location required",
        message:
          "Your current GPS location is required to submit this inspection. Please enable location services and try again.",
      },
    };
  }

  let vendorLat = vendor?.factoryLatitude;
  let vendorLng = vendor?.factoryLongitude;

  // Fall back to mapLink on the fly when the columns aren't populated yet,
  // and backfill them async so future calls are cheaper.
  if ((vendorLat == null || vendorLng == null) && vendor?.mapLink) {
    const coords = parseMapLinkCoordinates(vendor.mapLink);
    if (coords) {
      vendorLat = coords.latitude;
      vendorLng = coords.longitude;
      if (prisma && vendor?.id) {
        prisma.vendor
          .update({
            where: { id: vendor.id },
            data: { factoryLatitude: vendorLat, factoryLongitude: vendorLng },
          })
          .catch((e) => console.error("Failed to backfill vendor coords:", e));
      }
    }
  }

  if (vendorLat == null || vendorLng == null) {
    const vendorTag = vendor?.companyName
      ? `${vendor.companyName} (${vendor.id || "?"})`
      : `vendor ${vendor?.id || "?"}`;
    console.log(
      `[Geofence] ${prefix}SKIPPED — ${vendorTag} has no factoryLatitude/Longitude ` +
        `and no parseable mapLink. Responding with 400 "Vendor location not set".`,
    );
    return {
      ok: false,
      status: 400,
      body: {
        error: "Vendor location not set",
        message:
          "The vendor's factory location (Map Embed Link) has not been configured. Please contact admin to set the vendor's map location before submitting the inspection.",
      },
    };
  }

  const distanceM = haversineDistanceMeters(
    checkerLatitude,
    checkerLongitude,
    vendorLat,
    vendorLng,
  );

  // Diagnostic — show both sides of the comparison so you can see at a
  // glance which vendor coords the geofence is using vs the checker's GPS.
  const pass = distanceM <= LOCATION_THRESHOLD_METERS;
  const tag = vendor?.companyName
    ? `${vendor.companyName} (${vendor.id || "?"})`
    : `vendor ${vendor?.id || "?"}`;
  const vendorSrc =
    vendor?.factoryLatitude == null || vendor?.factoryLongitude == null
      ? " (from mapLink)"
      : " (factoryLatitude/Longitude)";
  console.log(
    `[Geofence] ${prefix}${tag}\n` +
      `  vendor:  ${vendorLat}, ${vendorLng}${vendorSrc}\n` +
      `  checker: ${checkerLatitude}, ${checkerLongitude}\n` +
      `  distance: ${Math.round(distanceM)}m / ${LOCATION_THRESHOLD_METERS}m → ${pass ? "✓ PASS" : "✗ MISMATCH"}`,
  );

  if (distanceM > LOCATION_THRESHOLD_METERS) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Location mismatch",
        message: `You are approximately ${Math.round(distanceM)}m (straight-line) from the vendor's factory. You must be within ${LOCATION_THRESHOLD_METERS}m to submit this inspection. Note: Google Maps may show a longer distance as it measures road/walking routes. Please travel closer to the factory location and try again.`,
        distanceMeters: Math.round(distanceM),
        thresholdMeters: LOCATION_THRESHOLD_METERS,
      },
    };
  }

  return { ok: true, vendorLat, vendorLng, distanceM };
}

module.exports = {
  parseMapLinkCoordinates,
  haversineDistanceMeters,
  LOCATION_THRESHOLD_METERS,
  verifyCheckerAtVendor,
};
