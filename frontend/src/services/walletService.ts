import axios from '@/lib/axios';

export interface WalletTransaction {
    id: string;
    type: 'CREDIT' | 'DEBIT';
    amount: number;
    balanceAfter: number;
    source: string; // REFUND | REPLACEMENT | ORDER_REDEMPTION | ORDER_REVERSAL | ADMIN_ADJUSTMENT
    description?: string | null;
    orderCode?: string | null;
    returnCode?: string | null;
    createdByName?: string | null;
    createdByType?: string | null;
    createdAt: string;
}

export interface WalletSummary {
    balance: number;   // INR
    currency: string;
    transactions: WalletTransaction[];
    customer?: { name?: string; email?: string; phoneNumber?: string } | null;
}

// Human label + tint for a ledger source.
export const WALLET_SOURCE_LABEL: Record<string, string> = {
    REFUND: 'Refund credit',
    REPLACEMENT: 'Replacement credit',
    ORDER_REDEMPTION: 'Used on order',
    ORDER_REVERSAL: 'Order reversal',
    ADMIN_ADJUSTMENT: 'Adjustment',
};

class WalletService {
    // ── Customer ──
    async getMyWallet(): Promise<{ success: boolean; data: WalletSummary }> {
        const res = await axios.get('/wallet/mine');
        return res.data;
    }

    // ── Admin ──
    async getAllWallets(params?: { search?: string; page?: number; limit?: number }) {
        const res = await axios.get('/wallet/admin', { params });
        return res.data as { success: boolean; data: any[]; totalBalance: number; pagination: { total: number; page: number; limit: number; totalPages: number } };
    }
    async getWalletByCustomer(customerId: string): Promise<{ success: boolean; data: WalletSummary }> {
        const res = await axios.get(`/wallet/admin/${customerId}`);
        return res.data;
    }
    async adjustWallet(customerId: string, body: { type: 'CREDIT' | 'DEBIT'; amount: number; reason: string }) {
        const res = await axios.post(`/wallet/admin/${customerId}/adjust`, body);
        return res.data as { success: boolean; message: string };
    }
}

export const walletService = new WalletService();
export default walletService;
