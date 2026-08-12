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
const LOCATION_THRESHOLD_METERS = 1000;

/**
 * Whether the checker→vendor geofence is disabled.
 *
 * ENABLED by default. Set `ENABLE_GEOFENCE=false` to switch it off — an escape hatch
 * for a GPS outage in production, not a normal operating mode.
 *
 * Note this only governs the *distance* check. A vendor with no saved coordinates is
 * never blocked (there is nothing to measure against); the inspection proceeds and is
 * recorded as location-unverified. See `verifyCheckerAtVendor`.
 *
 * @returns {boolean}
 */
function isGeofenceDisabled() {
  return String(process.env.ENABLE_GEOFENCE).toLowerCase() === "false";
}

/**
 * Parse one user-supplied coordinate into a number, or null when unusable.
 *
 * Accepts numbers and strings (forms post strings). Rejects blanks, non-numerics and
 * out-of-range values rather than storing them: a bad coordinate silently relocates the
 * factory and would either block every inspector or wave all of them through.
 *
 * @param {unknown} value
 * @param {'latitude'|'longitude'} kind
 * @returns {number|null}
 */
function parseCoordinate(value, kind) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  const limit = kind === "latitude" ? 90 : 180;
  if (n < -limit || n > limit) return null;
  return n;
}

/**
 * Resolve the coordinate pair to persist for a vendor address.
 *
 * A human-entered pair always wins over one derived from a Google Maps link: the form
 * field is explicit intent, the link is a guess parsed out of a URL. Both halves must
 * be present — a lone latitude is not a location.
 *
 * Returns `{}` (not nulls) when nothing usable is supplied, so callers can spread it
 * into a Prisma payload without clobbering existing stored values on a partial update.
 *
 * @param {object}  opts
 * @param {unknown} opts.latitude   Raw form value.
 * @param {unknown} opts.longitude  Raw form value.
 * @param {string}  [opts.mapLink]  Optional Google Maps link to fall back to.
 * @param {string}  [opts.latField]  Prisma column for latitude.
 * @param {string}  [opts.lngField]  Prisma column for longitude.
 */
function resolveVendorCoordinates({
  latitude,
  longitude,
  mapLink,
  latField = "factoryLatitude",
  lngField = "factoryLongitude",
}) {
  const lat = parseCoordinate(latitude, "latitude");
  const lng = parseCoordinate(longitude, "longitude");
  if (lat !== null && lng !== null) {
    return { [latField]: lat, [lngField]: lng };
  }
  const derived = mapLink ? parseMapLinkCoordinates(mapLink) : null;
  if (derived) {
    return { [latField]: derived.latitude, [lngField]: derived.longitude };
  }
  return {};
}

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
  inspectionType,
}) {
  const prefix = label ? `${label} — ` : "";

  // Virtual (online) inspection — the checker is not on-site, so there is nothing to
  // geofence. This is the single point that makes a virtual inspection skip location
  // for EVERY caller (factory start, factory submit, product approve/reject): they all
  // route through this guard, so none of them need their own virtual branch.
  if (String(inspectionType).toUpperCase() === "VIRTUAL") {
    console.log(`[Geofence] ${prefix}VIRTUAL inspection — location not applicable.`);
    return { ok: true, vendorLat: null, vendorLng: null, distanceM: null, skipped: true, verified: false, reason: "VIRTUAL" };
  }

  // Escape hatch only (ENABLE_GEOFENCE=false). Enabled by default.
  if (isGeofenceDisabled()) {
    console.log(`[Geofence] ${prefix}DISABLED via ENABLE_GEOFENCE=false — skipping location check.`);
    return { ok: true, vendorLat: null, vendorLng: null, distanceM: null, skipped: true, verified: false };
  }

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

  // Build the set of vendor locations the checker may legitimately stand at:
  // the LEGAL ADDRESS / FACTORY SITE and the WAREHOUSE. The checker passes when
  // they are within the threshold of ANY one of these (an "OR" of all addresses).
  let factoryLat = vendor?.factoryLatitude;
  let factoryLng = vendor?.factoryLongitude;

  // Fall back to mapLink on the fly when the factory columns aren't populated yet,
  // and backfill them async so future calls are cheaper.
  if ((factoryLat == null || factoryLng == null) && vendor?.mapLink) {
    const coords = parseMapLinkCoordinates(vendor.mapLink);
    if (coords) {
      factoryLat = coords.latitude;
      factoryLng = coords.longitude;
      if (prisma && vendor?.id) {
        prisma.vendor
          .update({
            where: { id: vendor.id },
            data: { factoryLatitude: factoryLat, factoryLongitude: factoryLng },
          })
          .catch((e) => console.error("Failed to backfill vendor coords:", e));
      }
    }
  }

  const candidates = [];
  if (factoryLat != null && factoryLng != null) {
    candidates.push({ label: "legal/factory", lat: factoryLat, lng: factoryLng });
  }
  if (vendor?.warehouseLatitude != null && vendor?.warehouseLongitude != null) {
    candidates.push({ label: "warehouse", lat: vendor.warehouseLatitude, lng: vendor.warehouseLongitude });
  }

  // Dedupe identical pairs so "legal same as warehouse" measures a single point
  // instead of the same distance twice.
  const coordsEqual = (a, b, c, d) => Math.abs(a - c) < 1e-6 && Math.abs(b - d) < 1e-6;
  const locations = [];
  for (const c of candidates) {
    if (!locations.some((u) => coordsEqual(u.lat, u.lng, c.lat, c.lng))) locations.push(c);
  }

  const vendorTag = vendor?.companyName
    ? `${vendor.companyName} (${vendor.id || "?"})`
    : `vendor ${vendor?.id || "?"}`;

  // Vendor has no coordinates on file (neither address, nor a parseable mapLink) —
  // there is nothing to measure against, so the inspection is ALLOWED and recorded as
  // location-unverified rather than blocked. Blocking here would strand vendors
  // registered before coordinates became a form field, and the checker cannot fix the
  // vendor's record themselves. The checker's own GPS is still captured for audit.
  if (locations.length === 0) {
    console.log(
      `[Geofence] ${prefix}UNVERIFIED — ${vendorTag} has no factory/warehouse coordinates ` +
        `and no parseable mapLink. Allowing, and recording the checker's GPS only.`,
    );
    return {
      ok: true,
      vendorLat: null,
      vendorLng: null,
      distanceM: null,
      verified: false,
      reason: "VENDOR_LOCATION_NOT_SET",
    };
  }

  // Distance to every registered location; the nearest one decides pass/fail.
  let nearest = null;
  for (const loc of locations) {
    const d = haversineDistanceMeters(checkerLatitude, checkerLongitude, loc.lat, loc.lng);
    if (nearest == null || d < nearest.distanceM) nearest = { ...loc, distanceM: d };
  }

  const pass = nearest.distanceM <= LOCATION_THRESHOLD_METERS;
  console.log(
    `[Geofence] ${prefix}${tag(vendor)}\n` +
      locations
        .map(
          (loc) =>
            `  ${loc.label}: ${loc.lat}, ${loc.lng} → ${Math.round(
              haversineDistanceMeters(checkerLatitude, checkerLongitude, loc.lat, loc.lng),
            )}m`,
        )
        .join("\n") +
      `\n  checker: ${checkerLatitude}, ${checkerLongitude}\n` +
      `  nearest: ${nearest.label} @ ${Math.round(nearest.distanceM)}m / ${LOCATION_THRESHOLD_METERS}m → ${pass ? "✓ PASS" : "✗ MISMATCH"}`,
  );

  if (!pass) {
    return {
      ok: false,
      status: 403,
      body: {
        error: "Location mismatch",
        message: `You are approximately ${Math.round(nearest.distanceM)}m (straight-line) from the nearest of the vendor's registered locations (legal/factory or warehouse). You must be within ${LOCATION_THRESHOLD_METERS}m of one of them to run this inspection. Note: Google Maps may show a longer distance as it measures road/walking routes. Please travel closer and try again.`,
        distanceMeters: Math.round(nearest.distanceM),
        thresholdMeters: LOCATION_THRESHOLD_METERS,
      },
    };
  }

  return {
    ok: true,
    vendorLat: nearest.lat,
    vendorLng: nearest.lng,
    distanceM: nearest.distanceM,
    verified: true,
    matchedAddress: nearest.label,
  };
}

// Short vendor tag for diagnostics.
function tag(vendor) {
  return vendor?.companyName
    ? `${vendor.companyName} (${vendor.id || "?"})`
    : `vendor ${vendor?.id || "?"}`;
}

/**
 * Build an honest audit-trail location string from a verifyCheckerAtVendor
 * result. Never asserts "Verified at factory" when the geofence was skipped or
 * no GPS was captured — that fabricated a verification that never happened and
 * printed NaN coordinates (F-06).
 *
 * @param {{ skipped?: boolean, distanceM?: number }} geo
 * @param {number|null|undefined} checkerLatitude
 * @param {number|null|undefined} checkerLongitude
 * @returns {string}
 */
function buildLocationStamp(geo, checkerLatitude, checkerLongitude) {
  if (geo?.reason === "VIRTUAL") {
    return "Virtual (online) inspection — location not applicable";
  }
  if (!geo || geo.skipped) {
    return "Location check skipped (geofence disabled)";
  }
  if (checkerLatitude == null || checkerLongitude == null) {
    return "Location not captured (no GPS sent by checker)";
  }
  const at = `checker ${Number(checkerLatitude).toFixed(6)},${Number(checkerLongitude).toFixed(6)}`;
  // Vendor had no coordinates to measure against. Say so — claiming "Verified at
  // factory — 0m" here would assert a check that never ran.
  if (geo.verified === false || geo.distanceM == null) {
    return `Location recorded but NOT verified — vendor has no factory coordinates on file (${at})`;
  }
  return `Verified at factory — ${Math.round(geo.distanceM)}m from vendor (${at})`;
}

/**
 * Structured location snapshot for storage alongside an inspection's form data.
 *
 * Product inspections have no lat/lng columns of their own — the result is a JSON blob
 * on `Product.qcInspectionData` — so the coordinates ride along inside it. That is what
 * lets the admin product-inspection view and the PDF report show where the checker
 * stood, the same as the factory-inspection flow does from its own columns.
 *
 * `verified` is explicit rather than inferred from `distanceM` so a reader never has to
 * guess whether a null distance means "far away" or "nothing to compare against".
 *
 * @param {{skipped?: boolean, verified?: boolean, vendorLat?: number|null, vendorLng?: number|null, distanceM?: number|null, reason?: string}} geo
 * @param {number|string|null|undefined} checkerLatitude
 * @param {number|string|null|undefined} checkerLongitude
 */
function buildLocationSnapshot(geo, checkerLatitude, checkerLongitude) {
  const lat = parseCoordinate(checkerLatitude, "latitude");
  const lng = parseCoordinate(checkerLongitude, "longitude");
  return {
    checkerLatitude: lat,
    checkerLongitude: lng,
    vendorLatitude: geo?.vendorLat ?? null,
    vendorLongitude: geo?.vendorLng ?? null,
    distanceMeters: geo?.distanceM != null ? Math.round(geo.distanceM) : null,
    thresholdMeters: LOCATION_THRESHOLD_METERS,
    verified: geo?.verified === true,
    geofenceSkipped: geo?.skipped === true,
    reason: geo?.reason || null,
    capturedAt: new Date().toISOString(),
  };
}

module.exports = {
  parseMapLinkCoordinates,
  buildLocationSnapshot,
  haversineDistanceMeters,
  LOCATION_THRESHOLD_METERS,
  isGeofenceDisabled,
  parseCoordinate,
  resolveVendorCoordinates,
  verifyCheckerAtVendor,
  buildLocationStamp,
};
