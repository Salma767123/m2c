/**
 * stockSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches live product/variant data for every cart item and returns a diff
 * describing what has changed since the item was added to cart.
 *
 * Consumed by CartContext.syncStock(); the Cart UI reads the result array to
 * render per-item banners without knowing any fetch logic.
 */
import { publicProductService } from '@/services/publicProductService';
import { CartItem } from '@/services/cartService';
import { getRegionalPrice, getRegionalOriginalPrice } from '@/lib/currency';

// Re-export so callers import from one place.
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface StockSyncResult {
  /** cart item id */
  itemId: string;
  productId: string;
  productName: string;

  /* ── Stock ─────────────────────────────── */
  availableStock: number;
  stockStatus: StockStatus;
  wasOutOfStock: boolean;  // item was OOS before, now back in stock

  /* ── Price ─────────────────────────────── */
  oldPrice: number;
  newPrice: number;
  priceChanged: boolean;

  /* ── Quantity ───────────────────────────── */
  oldQty: number;
  /** qty clamped to availableStock; equals oldQty if no clamp needed */
  clampedQty: number;
  qtyAdjusted: boolean;

  /* ── Live product snapshot (for UI refresh) ── */
  live: {
    name: string;
    images: string[];
    price: number;
    originalPrice?: number;
    discount?: number;
    inStock: boolean;
    availableStock: number;
    category: string;
    variant?: {
      size: string;
      color: string;
      colorHex?: string;
      sku: string;
    };
  };
}

/** Threshold below which we call stock "low". */
const LOW_STOCK_THRESHOLD = 5;

function stockStatus(available: number): StockStatus {
  if (available <= 0) return 'out_of_stock';
  if (available <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

/**
 * Run a stock check for every item in `cartItems`.
 * Items whose product fetch fails are skipped (they won't appear in the result).
 */
export async function syncCartStock(
  cartItems: CartItem[],
): Promise<StockSyncResult[]> {
  const results: StockSyncResult[] = [];

  await Promise.allSettled(
    cartItems.map(async (item) => {
      try {
        const res = await publicProductService.getProduct(item.productId);
        if (!res.success || !res.data) return;

        const p = res.data;

        // Resolve price, stock, images, and variant details — prefer variant if present.
        let livePrice: number;
        let availableStock: number;
        let liveImages: string[] = [];
        let liveOriginalPrice: number | undefined = getRegionalOriginalPrice(p as any) ?? undefined;
        let liveDiscount: number | undefined = p.discount;
        let liveVariant: { size: string; color: string; colorHex?: string; sku: string } | undefined;

        if (item.variantId && p.variants) {
          const variant = p.variants.find((v) => v.id === item.variantId);
          if (variant) {
            livePrice = getRegionalPrice(variant as any);
            availableStock = variant.stock;
            liveOriginalPrice = getRegionalOriginalPrice(variant as any) ?? getRegionalOriginalPrice(p as any) ?? undefined;
            liveDiscount = variant.discount ?? p.discount;
            liveVariant = {
              size: variant.size,
              color: variant.color,
              colorHex: variant.colorHex,
              sku: variant.sku,
            };
            // Use variant images if available, fall back to product images
            if (variant.images && variant.images.length > 0) {
              liveImages = [...variant.images];
            }
          } else {
            // Variant no longer exists — treat as OOS.
            livePrice = item.price;
            availableStock = 0;
          }
        } else {
          livePrice = getRegionalPrice(p as any);
          // For products with variants but no variantId selected (base unit),
          // use baseStock from inventory — NOT totalStock (which sums all variants).
          availableStock = p.hasVariants
            ? (p.inventory?.baseStock ?? 0)
            : (p.inventory?.availableStock ?? p.totalStock ?? 0);
        }

        // Fall back to product images if variant had none
        if (liveImages.length === 0 && p.images) {
          for (const img of p.images) {
            const url = typeof img === 'string' ? img : img?.url;
            if (url) liveImages.push(url);
          }
        }

        availableStock = Math.max(0, availableStock);
        const oldQty = item.quantity;
        const clampedQty =
          availableStock > 0 ? Math.min(oldQty, availableStock) : oldQty;
        const qtyAdjusted = clampedQty < oldQty;

        const oldPrice = item.price;
        const priceChanged = Math.abs(oldPrice - livePrice) >= 0.01;

        const status = stockStatus(availableStock);
        const wasOutOfStock =
          item.product?.inStock === false && status !== 'out_of_stock';

        results.push({
          itemId: item.id,
          productId: item.productId,
          productName: item.product?.name ?? p.name,
          availableStock,
          stockStatus: status,
          wasOutOfStock,
          oldPrice,
          newPrice: livePrice,
          priceChanged,
          oldQty,
          clampedQty,
          qtyAdjusted,
          live: {
            name: p.name,
            images: liveImages,
            price: livePrice,
            originalPrice: liveOriginalPrice,
            discount: liveDiscount,
            inStock: availableStock > 0,
            availableStock,
            category: p.category || '',
            variant: liveVariant,
          },
        });
      } catch {
        // Network error for this item — skip silently.
      }
    }),
  );

  return results;
}
