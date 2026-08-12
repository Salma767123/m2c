// Single source of truth for the backend API root.
//
// EXPO_PUBLIC_* values are inlined at transform time and cached by Metro, so a
// wrong or stale value silently 404s every screen at once with no obvious
// cause — editing .env while the dev server is running is enough to do it.
// Normalising in one place, and complaining loudly, turns that into something
// the log actually explains.
//
// Kept free of imports so pure helper modules can use it without pulling in the
// axios instance.

function resolveApiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');

  if (!raw) {
    console.error(
      'EXPO_PUBLIC_API_URL is not set — every API request will fail. ' +
        'Set it in checker_app/.env, then restart Metro with `npx expo start --clear`.',
    );
    return '';
  }

  // Every backend route is mounted under /api (backend/server.js), so a base
  // URL without it makes the whole app 404.
  if (!/\/api(\/|$)/.test(raw)) {
    console.warn(
      `EXPO_PUBLIC_API_URL ("${raw}") has no /api segment — falling back to "${raw}/api". ` +
        'Fix checker_app/.env and restart Metro with `npx expo start --clear`.',
    );
    return `${raw}/api`;
  }

  return raw;
}

/** Normalised API root — no trailing slash, guaranteed to include /api. */
export const API_BASE_URL = resolveApiBaseUrl();
