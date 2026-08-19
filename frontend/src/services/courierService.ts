import axios from '@/lib/axios'
import { registerCouriers, type Courier } from '@/lib/couriers'

export type { Courier }

export type CourierInput = Partial<
  Pick<Courier, 'name' | 'code' | 'color' | 'logo' | 'region' | 'modes' | 'isActive' | 'sortOrder' | 'trackingUrl'>
>

function errMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const r = (error as { response?: { data?: { message?: string; error?: string } } }).response
    return r?.data?.message || r?.data?.error || fallback
  }
  return error instanceof Error ? error.message : fallback
}

class CourierService {
  // ── Public ──────────────────────────────────────────────────────────────
  /** Active couriers, optionally narrowed by region/mode. Also primes the runtime
   *  registry so courierName()/courierById() can resolve ids anywhere (cart, orders). */
  async getActiveCouriers(region?: string, mode?: string): Promise<Courier[]> {
    try {
      const res = await axios.get('/couriers/active', { params: { region, mode } })
      const list: Courier[] = res.data?.success ? res.data.data : []
      registerCouriers(list)
      return list
    } catch {
      return []
    }
  }

  // ── Admin ───────────────────────────────────────────────────────────────
  async getCouriers(): Promise<Courier[]> {
    try {
      const res = await axios.get('/couriers')
      return res.data?.success ? res.data.data : []
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to fetch couriers'))
    }
  }

  async createCourier(data: CourierInput): Promise<Courier> {
    try {
      const res = await axios.post('/couriers', data)
      return res.data.data
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to create courier'))
    }
  }

  async updateCourier(id: string, data: CourierInput): Promise<Courier> {
    try {
      const res = await axios.put(`/couriers/${id}`, data)
      return res.data.data
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to update courier'))
    }
  }

  async deleteCourier(id: string): Promise<void> {
    try {
      await axios.delete(`/couriers/${id}`)
    } catch (error) {
      throw new Error(errMessage(error, 'Failed to delete courier'))
    }
  }
}

export const courierService = new CourierService()
