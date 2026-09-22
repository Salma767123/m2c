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
 * `GUTTER` was 26 — a 12pt section margin plus 14pt of section padding, which
 * is what the home sections reached when each floated as its own rounded card.
 * Those are full-width bands now, as they are on the web, so the margin is
 * gone and the gutter is the page's own: `px-4`, which is what the web sets
 * for these grids. The cards gain 10pt each on a 390pt screen and land on 173,
 * exactly the width the web gives them.
 */
export const CARD_GUTTER = 16;
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
