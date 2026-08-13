import axios from '@/lib/axios';
import { getRegion } from '@/lib/currency';
import type { PublicOffer } from '@/lib/offers';

/**
 * Customer-facing slice of the web's offerService. The admin CRUD methods
 * (create/update/delete) are intentionally absent — there is no admin surface in
 * this app, and shipping unused write paths would only widen the API surface.
 */
class OfferService {
  /** Live offers for the current storefront region. Never throws — an empty
   *  list renders the same empty state a failed request should. */
  async getActiveOffers(): Promise<PublicOffer[]> {
    try {
      const res = await axios.get('/offers/active', { params: { region: getRegion() } });
      return res.data?.success ? res.data.data : [];
    } catch {
      return [];
    }
  }
}

export const offerService = new OfferService();
export default offerService;
