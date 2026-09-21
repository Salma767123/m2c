import { Dimensions } from 'react-native';

/**
 * One product-card size for the whole app.
 *
 * Every screen that showed a product grid had computed its own width, so the
 * same card rendered at four different sizes depending on where you were. On a
 * 390pt screen:
 *
 *   home rails      (390 − 12·2 − 14·2 − 12) / 2  = 163
 *   products list   (390 − 16·2 − 12) / 2         = 173
 *   browse products (390 − 12·2 − 8) / 2          = 179
 *   search results  w-[48%]                       ≈ 168
 *
 * `GUTTER` is 26 because that is what the home rails already effectively use —
 * a 12pt section margin plus 14pt of section padding. Matching it here means
 * the rails keep their geometry and the three full-bleed screens come to them,
 * rather than every screen moving at once.
 */
export const CARD_GUTTER = 26;
export const CARD_GAP = 12;
export const CARD_COLUMNS = 2;

const SCREEN_W = Dimensions.get('window').width;

/** The width every ProductCard renders at. */
export const PRODUCT_CARD_WIDTH = Math.floor(
  (SCREEN_W - CARD_GUTTER * 2 - CARD_GAP * (CARD_COLUMNS - 1)) / CARD_COLUMNS,
);

/**
 * Container padding for a full-bleed grid screen, so its cards land on
 * PRODUCT_CARD_WIDTH without each screen re-deriving the arithmetic.
 */
export const CARD_GRID_PADDING = CARD_GUTTER;
