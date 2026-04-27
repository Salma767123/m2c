import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { cartService, CartItem } from '@/services/cartService';
import { userAuthService } from '@/services/userAuthService';
import { syncCartStock, StockSyncResult } from '@/lib/stockSync';

interface CartContextType {
  cartItems: CartItem[];
  itemCount: number;
  totalAmount: number;
  refreshCart: () => Promise<void>;
  addToCart: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  isLoading: boolean;
  clearCart: () => void;
  // ── Stock sync ──────────────────────────────────────────────────────────────
  syncResult: StockSyncResult[];       // only items with actionable changes (banners)
  allSyncResults: StockSyncResult[];   // all items with live data (for UI refresh)
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncStock: () => Promise<void>;
  clearSyncResult: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [itemCount, setItemCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ── Stock sync state ────────────────────────────────────────────────────────
  const [syncResult, setSyncResult] = useState<StockSyncResult[]>([]);
  const [allSyncResults, setAllSyncResults] = useState<StockSyncResult[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Guard: prevent overlapping sync calls.
  const syncInProgress = useRef(false);

  // ── Cart fetch ──────────────────────────────────────────────────────────────
  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      const authenticated = await userAuthService.isAuthenticated();
      let items: CartItem[] = [];
      let count = 0;
      let total = 0;

      if (authenticated) {
        const localCart = await cartService.getLocalCart();
        if (localCart.length > 0) {
          await cartService.migrateGuestCartToAuth();
        }
        const response = await cartService.getCart();
        if (response.success && response.data) {
          items = response.data.items;
          count = response.data.itemCount;
          total = response.data.total;
        }
      } else {
        items = await cartService.getLocalCart();
        count = items.reduce((acc, item) => acc + item.quantity, 0);
        total = 0;
      }

      setCartItems(items);
      setItemCount(count);
      setTotalAmount(total);
    } catch (error) {
      console.error('Failed to refresh cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Stock sync ──────────────────────────────────────────────────────────────
  const syncStock = useCallback(async () => {
    if (syncInProgress.current) return;
    try {
      syncInProgress.current = true;
      setIsSyncing(true);

      await refreshCart();

      const authenticated = await userAuthService.isAuthenticated();
      let freshItems: CartItem[] = [];
      if (authenticated) {
        const res = await cartService.getCart();
        if (res.success && res.data) freshItems = res.data.items;
      } else {
        freshItems = await cartService.getLocalCart();
      }

      if (freshItems.length === 0) {
        setSyncResult([]);
        setLastSyncedAt(new Date());
        return;
      }

      const results = await syncCartStock(freshItems);

      // Auto-clamp quantities that exceed available stock
      const toClamp = results.filter(
        (r) => r.qtyAdjusted && r.availableStock > 0,
      );
      await Promise.allSettled(
        toClamp.map(async (r) => {
          try {
            if (authenticated) {
              await cartService.updateCartItem(r.itemId, r.clampedQty);
            } else {
              await cartService.updateLocalCartItem(r.itemId, r.clampedQty);
            }
          } catch {
            // If the update fails, keep the sync result so the user can act.
          }
        }),
      );

      if (toClamp.length > 0) await refreshCart();

      const meaningful = results.filter(
        (r) =>
          r.stockStatus !== 'in_stock' ||
          r.priceChanged ||
          r.qtyAdjusted ||
          r.wasOutOfStock,
      );
      setAllSyncResults(results);
      setSyncResult(meaningful);
      setLastSyncedAt(new Date());
    } catch {
      // Sync failed — non-critical, swallow silently.
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, [refreshCart]);

  const clearSyncResult = useCallback(() => setSyncResult([]), []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    setItemCount(0);
    setTotalAmount(0);
    setSyncResult([]);
    setAllSyncResults([]);
  }, []);

  // ── Cart mutation helpers ────────────────────────────────────────────────────
  const addToCart = async (productId: string, quantity: number, variantId?: string) => {
    const prevCount = itemCount;
    setItemCount((prev) => prev + quantity);
    try {
      const authenticated = await userAuthService.isAuthenticated();
      if (authenticated) {
        await cartService.addToCart(productId, quantity, variantId);
      } else {
        await cartService.addToLocalCart(productId, quantity, variantId);
      }
      await refreshCart();
    } catch (error) {
      setItemCount(prevCount);
      throw error;
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    const previousItems = [...cartItems];
    const previousCount = itemCount;
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
    const countDiff =
      quantity - (previousItems.find((i) => i.id === itemId)?.quantity || 0);
    setItemCount((prev) => prev + countDiff);
    try {
      const authenticated = await userAuthService.isAuthenticated();
      if (authenticated) {
        await cartService.updateCartItem(itemId, quantity);
      } else {
        await cartService.updateLocalCartItem(itemId, quantity);
      }
      await refreshCart();
    } catch (error) {
      setCartItems(previousItems);
      setItemCount(previousCount);
      throw error;
    }
  };

  const removeFromCart = async (itemId: string) => {
    const previousItems = [...cartItems];
    const previousCount = itemCount;
    const itemToRemove = cartItems.find((i) => i.id === itemId);
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
    if (itemToRemove) {
      setItemCount((prev) => Math.max(0, prev - itemToRemove.quantity));
    }
    try {
      const authenticated = await userAuthService.isAuthenticated();
      if (authenticated) {
        await cartService.removeFromCart(itemId);
      } else {
        await cartService.removeFromLocalCart(itemId);
      }
      await refreshCart();
    } catch (error) {
      setCartItems(previousItems);
      setItemCount(previousCount);
      throw error;
    }
  };

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  // ── AppState — sync when app comes to foreground ─────────────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          // Fire-and-forget — errors are swallowed inside syncStock.
          syncStock();
        }
      },
    );
    return () => subscription.remove();
  }, [syncStock]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        itemCount,
        totalAmount,
        refreshCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        isLoading,
        syncResult,
        allSyncResults,
        isSyncing,
        lastSyncedAt,
        syncStock,
        clearSyncResult,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
