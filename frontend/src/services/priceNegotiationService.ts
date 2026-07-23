import axiosInstance from '@/lib/axios';

export type NegotiationParty = 'ADMIN' | 'VENDOR';

export type NegotiationRoundStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTERED'
  | 'EXPIRED'
  | 'CANCELLED';

export interface NegotiationRound {
  id: string;
  productId: string;
  vendorId: string;
  round: number;
  proposedBy: NegotiationParty;
  proposedById?: string | null;
  proposedPrice: number;
  proposedPercent?: number | null;
  previousPrice?: number | null;
  reasonCode?: string | null;
  message?: string | null;
  status: NegotiationRoundStatus;
  respondedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface NegotiationProduct {
  id: string;
  name: string;
  baseSku?: string;
  vendorId: string;
  basePrice: number;
  agreedPrice?: number | null;
  basePriceOriginal?: number | null;
  approvalStatus: string;
  hasVariants: boolean;
  variants?: Array<{ id: string; size?: string; color?: string; sku: string; price: number }>;
}

export interface NegotiationTimeline {
  product: NegotiationProduct;
  rounds: NegotiationRound[];
  openOffer: NegotiationRound | null;
  /** Whose response the open offer is waiting on, or null when closed. */
  awaiting: NegotiationParty | null;
  maxRounds: number;
  roundsUsed: number;
}

/** Structured reasons an admin can attach to an offer. */
export const NEGOTIATION_REASONS: Array<{ code: string; label: string }> = [
  { code: 'MARKET_PRICE_LOWER', label: 'Market price is lower' },
  { code: 'HIGH_COMPETITION', label: 'High competition' },
  { code: 'BULK_ORDER_PRICING', label: 'Bulk order pricing' },
  { code: 'QUALITY_MISMATCH', label: 'Quality mismatch' },
  { code: 'OTHER', label: 'Other (explain below)' },
];

export const reasonLabel = (code?: string | null): string =>
  NEGOTIATION_REASONS.find((r) => r.code === code)?.label || code || '';

const priceNegotiationService = {
  /** Timeline for one product — used by both admin and vendor views. */
  getProductTimeline: async (productId: string): Promise<NegotiationTimeline> => {
    const res = await axiosInstance.get(`/price-negotiations/product/${productId}`);
    return res.data.data;
  },

  /** List view. Vendors are scoped server-side to their own rows. */
  list: async (params: { status?: string; page?: number; limit?: number } = {}) => {
    const res = await axiosInstance.get('/price-negotiations', { params });
    return res.data;
  },

  /** Admin opens a negotiation or counters the vendor's offer. */
  adminPropose: async (
    productId: string,
    payload: { proposedPrice: number; reasonCode?: string; message?: string },
  ) => {
    const res = await axiosInstance.post(
      `/price-negotiations/admin/product/${productId}/propose`,
      payload,
    );
    return res.data;
  },

  /** Admin responds to the vendor's open offer. */
  adminRespond: async (
    productId: string,
    payload: { action: 'ACCEPT' | 'REJECT' | 'COUNTER'; counterPrice?: number; message?: string; reasonCode?: string },
  ) => {
    const res = await axiosInstance.post(
      `/price-negotiations/admin/product/${productId}/respond`,
      payload,
    );
    return res.data;
  },

  /** Vendor responds to the admin's open offer. */
  vendorRespond: async (
    productId: string,
    payload: { action: 'ACCEPT' | 'REJECT' | 'COUNTER'; counterPrice?: number; message?: string },
  ) => {
    const res = await axiosInstance.post(
      `/price-negotiations/vendor/product/${productId}/respond`,
      payload,
    );
    return res.data;
  },
};

export default priceNegotiationService;
