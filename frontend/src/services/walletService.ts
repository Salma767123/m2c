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

export interface WalletWithdrawal {
    id: string;
    withdrawalId: string;
    amount: number;
    currency: string;
    method: 'UPI' | 'BANK';
    upiId?: string | null;
    accountName?: string | null;
    accountNumber?: string | null; // masked (••••1234)
    ifsc?: string | null;
    bankName?: string | null;
    status: 'Processing' | 'Completed' | 'Failed';
    note?: string | null;
    failureReason?: string | null;
    processedByName?: string | null;
    processedAt?: string | null;
    createdAt: string;
    customerName?: string;
    customerEmail?: string;
}

export interface WithdrawalPayload {
    amount: number;
    method: 'UPI' | 'BANK';
    upiId?: string;
    accountName?: string;
    accountNumber?: string;
    ifsc?: string;
    bankName?: string;
    note?: string;
}

// Human label + tint for a ledger source.
export const WALLET_SOURCE_LABEL: Record<string, string> = {
    REFUND: 'Refund credit',
    REPLACEMENT: 'Replacement credit',
    ORDER_REDEMPTION: 'Used on order',
    ORDER_REVERSAL: 'Order reversal',
    ADMIN_ADJUSTMENT: 'Adjustment',
    WITHDRAWAL: 'Withdrawal',
    WITHDRAWAL_REVERSAL: 'Withdrawal returned',
};

export const WITHDRAWAL_STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
    Processing: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    Completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600' },
    Failed: { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
};

class WalletService {
    // ── Customer ──
    async getMyWallet(): Promise<{ success: boolean; data: WalletSummary }> {
        const res = await axios.get('/wallet/mine');
        return res.data;
    }
    async requestWithdrawal(body: WithdrawalPayload) {
        const res = await axios.post('/wallet/withdrawals', body);
        return res.data as { success: boolean; message: string; data: WalletWithdrawal };
    }
    async getMyWithdrawals(): Promise<{ success: boolean; data: WalletWithdrawal[] }> {
        const res = await axios.get('/wallet/withdrawals/mine');
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
    async getAllWithdrawals(params?: { status?: string; search?: string; page?: number; limit?: number }) {
        const res = await axios.get('/wallet/admin/withdrawals', { params });
        return res.data as { success: boolean; data: WalletWithdrawal[]; pendingTotal: number; pagination: { total: number; page: number; limit: number; totalPages: number } };
    }
    async updateWithdrawalStatus(id: string, status: 'Completed' | 'Failed', note?: string) {
        const res = await axios.post(`/wallet/admin/withdrawals/${id}/status`, { status, note });
        return res.data as { success: boolean; message: string; data: WalletWithdrawal };
    }
}

export const walletService = new WalletService();
export default walletService;
