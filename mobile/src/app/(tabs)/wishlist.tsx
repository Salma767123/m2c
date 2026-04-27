import React from 'react';
import Wishlist from '@/components/WebSite/Wishlist/Wishlist';

// The Wishlist tab simply renders the real wishlist component which wires
// into WishlistContext + wishlistService (supports authenticated and guest
// modes, optimistic updates, and syncs header badges).
export default function WishlistScreen() {
  return <Wishlist />;
}
