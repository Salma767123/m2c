/**
 * Brand typography for the app.
 *
 * The web loads Outfit for body copy and Poppins for headings
 * (frontend/src/app/layout.tsx). Mobile shipped Expo's stock boilerplate —
 * `system-ui` / `serif` / `monospace` — so every screen rendered in Roboto on
 * Android and San Francisco on iOS, and the one "heading" style in the app
 * resolved to a generic serif while the web's headings are a sans. Same brand,
 * three different typefaces depending on where you looked.
 *
 * Static instances rather than the variable Outfit: React Native cannot select
 * a weight axis from a variable TTF reliably on Android, so `fontWeight: '700'`
 * against a variable file renders at the default instance — i.e. bold text that
 * is not bold. One file per weight avoids that entirely.
 *
 * ── On making this the default for every <Text> ─────────────────────────────
 * There is no supported way to do that, and the usual tricks do not work here:
 *   - `Text.defaultProps` is ignored on React 19, which dropped defaultProps
 *     for function components.
 *   - Patching `Text.render` needs a forwardRef component; RN 0.81's Text is a
 *     plain function component taking `ref` as a prop, so it has no `.render`.
 *   - Reassigning `ReactNative.Text` fails: the index exposes it through a
 *     getter with no setter.
 * So text picks up a brand face by asking for one — via the `font-*` classes
 * below, or the `Typography` / `Fonts` tokens in constants/theme.ts.
 */

/** Font-file map passed to `useFonts`. Keys are the names styles refer to. */
export const FONT_ASSETS = {
  Outfit_400Regular: require('../../assets/fonts/Outfit_400Regular.ttf'),
  Outfit_500Medium: require('../../assets/fonts/Outfit_500Medium.ttf'),
  Outfit_600SemiBold: require('../../assets/fonts/Outfit_600SemiBold.ttf'),
  Outfit_700Bold: require('../../assets/fonts/Outfit_700Bold.ttf'),
  Poppins_400Regular: require('../../assets/fonts/Poppins_400Regular.ttf'),
  Poppins_500Medium: require('../../assets/fonts/Poppins_500Medium.ttf'),
  Poppins_600SemiBold: require('../../assets/fonts/Poppins_600SemiBold.ttf'),
  Poppins_700Bold: require('../../assets/fonts/Poppins_700Bold.ttf'),
};

/** Body / UI face — the web's `--font-outfit`. */
export const Sans = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
} as const;

/** Display face for headings — the web's `--font-playfair`, which is Poppins. */
export const Heading = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

/**
 * Pick the Outfit file matching a numeric weight.
 *
 * Needed because these are separate files, not one family with weight axes:
 * `{ fontFamily: 'Outfit_400Regular', fontWeight: '700' }` gives a synthetically
 * smeared regular on Android, not real bold. Pair this with the same weight so
 * the two always agree.
 */
export function sansFor(weight?: string | number): string {
  const w = String(weight ?? '400');
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return Sans.bold;
  if (w === '600') return Sans.semibold;
  if (w === '500') return Sans.medium;
  return Sans.regular;
}

/** As `sansFor`, for the heading face. */
export function headingFor(weight?: string | number): string {
  const w = String(weight ?? '400');
  if (w === '700' || w === '800' || w === '900' || w === 'bold') return Heading.bold;
  if (w === '600') return Heading.semibold;
  if (w === '500') return Heading.medium;
  return Heading.regular;
}
