import axios from '@/lib/axios'
import { getRegion } from '@/lib/currency'
import type { OfferType, OfferScope, OfferRegion, PublicOffer } from '@/lib/offers'

// Live status is derived by the backend from the clock (not stored).
export type OfferStatus = 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'PAUSED'

export interface Offer {
  id: string
  title: string
  description?: string | null
  bannerImage?: string | null
  type: OfferType
  scope: OfferScope
  discountPercent?: number | null
  discountFlatINR?: number | null
  maxDiscountINR?: number | null
  minQty?: number | null
  getQty?: number | null
  minCartValueINR?: number | null
  productIds: string[]
  categoryNames: string[]
  region: OfferRegion
  priority: number
  startsAt: string
  endsAt: string
  isActive: boolean
  status?: OfferStatus
  createdAt?: string
  updatedAt?: string
}

// Fields accepted when creating/updating (server validates + normalises).
export type OfferInput = Partial<
  Pick<
    Offer,
    | 'title'
    | 'description'
    | 'bannerImage'
    | 'type'
    | 'scope'
    | 'discountPercent'
    | 'discountFlatINR'
    | 'maxDiscountINR'
    | 'minQty'
    | 'getQty'
    | 'minCartValueINR'
    | 'productIds'
    | 'categoryNames'
    | 'region'
    | 'priority'
    | 'startsAt'
    | 'endsAt'
    | 'isActive'
  >
>

function errMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const r = (error as { response?: { data?: { message?: string; error?: string } } }).response
    return r?.data?.message || r?.data?.error || fallback
  }
  return error instanceof Error ? error.message : fallback
}

class OfferService {
  // ── Public ──────────────────────────────────────────────────────────────
  /** Live offers for the current storefront (offers page + strips). */
  async getActiveOffers(): Promise<PublicOffer[]> {
    try {
      const res = await axios.get('/offers/active', { params: { region: getRegion() } })
      return res.data?.success ? res.data.data : []
    } catch {
      return []
    }
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  async getOffers(): Promise<Offer[]> {
    try {
      const res = await axios.get('/offers')
      return res.data?.success ? res.data.data : []
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to fetch offers'))
    }
  }

  async getOffer(id: string): Promise<Offer> {
    try {
      const res = await axios.get(`/offers/${id}`)
      return res.data.data
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to fetch offer'))
    }
  }

  async createOffer(data: OfferInput): Promise<Offer> {
    try {
      const res = await axios.post('/offers', data)
      return res.data.data
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to create offer'))
    }
  }

  async updateOffer(id: string, data: OfferInput): Promise<Offer> {
    try {
      const res = await axios.put(`/offers/${id}`, data)
      return res.data.data
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to update offer'))
    }
  }

  async deleteOffer(id: string): Promise<void> {
    try {
      await axios.delete(`/offers/${id}`)
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to delete offer'))
    }
  }
}

export const offerService = new OfferService()
