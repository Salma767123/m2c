import axios from '@/lib/axios';

export type CreditPointsTxType = 'EARN' | 'REDEEM' | 'EXPIRE' | 'REVERSE' | 'ADJUST';

export interface CreditPointsTransaction {
    id: string;
    type: CreditPointsTxType;
    points: number;
    balanceAfter: number;
    source: string; // ORDER_EARN | ORDER_REDEMPTION | ORDER_REVERSAL | EXPIRY | ADMIN_ADJUSTMENT
    valueInr?: number | null;
    remaining?: number | null;
    expiresAt?: string | null;
    description?: string | null;
    orderCode?: string | null;
    createdByName?: string | null;
    createdByType?: string | null;
    createdAt: string;
}

export interface CreditPointsSettings {
    enabled: boolean;
    earnPointsPerUnit: number;
    earnUnitInr: number;
    minOrderAmountToEarnInr: number;
    earnOn: 'DELIVERED' | 'PLACED';
    redeemValuePerPointInr: number;
    minPointsToRedeem: number;
    maxRedeemPercent: number;
    expiryDays: number;
    region: 'BOTH' | 'IN_ONLY' | 'COM_ONLY';
}

export interface CreditPointsSummary {
    balance: number;
    transactions: CreditPointsTransaction[];
    nextExpiring?: { remaining: number; expiresAt: string } | null;
    settings?: Partial<CreditPointsSettings>;
    customer?: { id?: string; name?: string; email?: string } | null;
}

export interface PointsAccountRow {
    customerId: string;
    balance: number;
    name: string;
    email: string;
    updatedAt: string;
}

// Human label + tint for a ledger source/type.
export const POINTS_SOURCE_LABEL: Record<string, string> = {
    ORDER_EARN: 'Earned on order',
    ORDER_REDEMPTION: 'Redeemed on order',
    ORDER_REVERSAL: 'Order reversal',
    EXPIRY: 'Expired',
    ADMIN_ADJUSTMENT: 'Adjustment',
};

// Whether a transaction type adds (+) or removes (−) points, for display.
export const POINTS_TYPE_SIGN: Record<CreditPointsTxType, 1 | -1> = {
    EARN: 1,
    REDEEM: -1,
    EXPIRE: -1,
    REVERSE: -1,
    ADJUST: -1, // ADJUST rows are deductions; manual additions come through as EARN
};

class CreditPointsService {
    // ── Customer ──
    async getMyPoints(): Promise<{ success: boolean; data: CreditPointsSummary }> {
        const res = await axios.get('/credit-points/mine');
        return res.data;
    }
    // Lightweight settings + balance for the checkout redeem widget.
    async getPublicSettings(): Promise<{ success: boolean; data: { settings: Partial<CreditPointsSettings>; balance: number } }> {
        const res = await axios.get('/credit-points/settings/public');
        return res.data;
    }

    // ── Admin: settings ──
    async getSettings(): Promise<{ success: boolean; data: CreditPointsSettings & { id: string } }> {
        const res = await axios.get('/credit-points/admin/settings');
        return res.data;
    }
    async updateSettings(body: Partial<CreditPointsSettings>) {
        const res = await axios.put('/credit-points/admin/settings', body);
        return res.data as { success: boolean; message: string; data: CreditPointsSettings & { id: string } };
    }

    // ── Admin: accounts ──
    async getAllAccounts(params?: { search?: string; page?: number; limit?: number }) {
        const res = await axios.get('/credit-points/admin', { params });
        return res.data as {
            success: boolean;
            data: {
                accounts: PointsAccountRow[];
                totalPoints: number;
                pagination: { currentPage: number; totalPages: number; totalItems: number; limit: number };
            };
        };
    }
    async getAccountByCustomer(customerId: string): Promise<{ success: boolean; data: CreditPointsSummary }> {
        const res = await axios.get(`/credit-points/admin/${customerId}`);
        return res.data;
    }
    async adjustAccount(customerId: string, body: { direction: 'ADD' | 'DEDUCT'; points: number; reason: string }) {
        const res = await axios.post(`/credit-points/admin/${customerId}/adjust`, body);
        return res.data as { success: boolean; message: string };
    }
}

export const creditPointsService = new CreditPointsService();
export default creditPointsService;
