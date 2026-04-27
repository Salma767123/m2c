import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { wishlistService, WishlistItem } from '@/services/wishlistService';
import { userAuthService } from '@/services/userAuthService';

interface WishlistContextType {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  refreshWishlist: () => Promise<void>;
  addToWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => void;
  isLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  lastSyncedAt: Date | null;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Derived — count is always items.length; avoids drift.
  const wishlistCount = wishlistItems.length;

  const refreshWishlist = useCallback(async () => {
    try {
      const authenticated = await userAuthService.isAuthenticated();
      let items: WishlistItem[] = [];

      if (authenticated) {
        // Migrate any guest wishlist on first authenticated load.
        const localIds = await wishlistService.getLocalWishlist();
        if (localIds.length > 0) {
          await wishlistService.migrateGuestWishlistToAuth();
        }
        const response = await wishlistService.getWishlist();
        if (response.success && response.data) {
          items = response.data.items;
        }
      } else {
        const localIds = await wishlistService.getLocalWishlist();
        items = localIds.map((id) => ({ productId: id } as WishlistItem));
      }

      setWishlistItems(items);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('Failed to refresh wishlist:', error);
    }
  }, []);

  const addToWishlist = async (productId: string) => {
    try {
      setWishlistItems((prev) => [...prev, { productId } as WishlistItem]);
      const authenticated = await userAuthService.isAuthenticated();
      if (authenticated) {
        await wishlistService.addToWishlist(productId);
      } else {
        await wishlistService.addToLocalWishlist(productId);
      }
      await refreshWishlist();
    } catch (error) {
      await refreshWishlist();
      throw error;
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      setWishlistItems((prev) =>
        prev.filter((item) => item.productId !== productId),
      );
      const authenticated = await userAuthService.isAuthenticated();
      if (authenticated) {
        await wishlistService.removeFromWishlist(productId);
      } else {
        await wishlistService.removeFromLocalWishlist(productId);
      }
      await refreshWishlist();
    } catch (error) {
      await refreshWishlist();
      throw error;
    }
  };

  const clearWishlist = useCallback(() => {
    setWishlistItems([]);
  }, []);

  const isInWishlist = useCallback(
    (productId: string) =>
      wishlistItems.some((item) => item.productId === productId),
    [wishlistItems],
  );

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsLoading(true);
    refreshWishlist().finally(() => setIsLoading(false));
  }, [refreshWishlist]);

  // ── AppState — re-fetch when app comes back to foreground ─────────────────────
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          refreshWishlist();
        }
      },
    );
    return () => subscription.remove();
  }, [refreshWishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistCount,
        refreshWishlist,
        addToWishlist,
        removeFromWishlist,
        clearWishlist,
        isLoading,
        isInWishlist,
        lastSyncedAt,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
}
