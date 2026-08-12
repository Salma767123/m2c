import axios from '@/lib/axios';
import { registerCouriers, type Courier } from '@/lib/couriers';

export type { Courier };

class CourierService {
  // ── Public ──────────────────────────────────────────────────────────────
  /** Active couriers, optionally narrowed by region/mode. Also primes the runtime
   *  registry so courierName()/courierById() can resolve ids anywhere (cart, orders). */
  async getActiveCouriers(region?: string, mode?: string): Promise<Courier[]> {
    try {
      const res = await axios.get('/couriers/active', { params: { region, mode } });
      const list: Courier[] = res.data?.success ? res.data.data : [];
      registerCouriers(list);
      return list;
    } catch {
      return [];
    }
  }
}

export const courierService = new CourierService();
export default courierService;
