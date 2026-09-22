/**
 * Store credit — the customer half of frontend/src/services/walletService.ts.
 *
 * Only the three customer endpoints are ported. The admin ones (listing every
 * wallet, adjusting a balance, approving withdrawals) belong to the dashboard,
 * which has no mobile client, so carrying them here would be dead surface.
 */
import axios from '@/lib/axios';

export interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceAfter: number;
  /** REFUND | REPLACEMENT | ORDER_REDEMPTION | ORDER_REVERSAL | ADMIN_ADJUSTMENT */
  source: string;
  description?: string | null;
  orderCode?: string | null;
  returnCode?: string | null;
  createdByName?: string | null;
  createdByType?: string | null;
  createdAt: string;
}

export interface WalletSummary {
  /** INR. */
  balance: number;
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
  /** Masked by the server (••••1234). */
  accountNumber?: string | null;
  ifsc?: string | null;
  bankName?: string | null;
  status: 'Processing' | 'Completed' | 'Failed';
  note?: string | null;
  failureReason?: string | null;
  processedByName?: string | null;
  processedAt?: string | null;
  createdAt: string;
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

/** Human label for a ledger source. Same map as the web's. */
export const WALLET_SOURCE_LABEL: Record<string, string> = {
  REFUND: 'Refund credit',
  REPLACEMENT: 'Replacement credit',
  ORDER_REDEMPTION: 'Used on order',
  ORDER_REVERSAL: 'Order reversal',
  ADMIN_ADJUSTMENT: 'Adjustment',
  WITHDRAWAL: 'Withdrawal',
  WITHDRAWAL_REVERSAL: 'Withdrawal returned',
};

/**
 * Withdrawal status tints. The web stores these as Tailwind class names, which
 * mean nothing to a StyleSheet — same three states, resolved to hex.
 */
export const WITHDRAWAL_STATUS_STYLE: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  Processing: { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  Completed: { bg: '#ecfdf5', text: '#047857', dot: '#059669' },
  Failed: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
};

// Surface the backend's own message rather than a generic axios one.
function extractError(error: any, fallback: string): Error {
  return new Error(
    error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      fallback,
  );
}

class WalletService {
  async getMyWallet(): Promise<{ success: boolean; data: WalletSummary }> {
    try {
      const res = await axios.get('/wallet/mine');
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to load your wallet');
    }
  }

  async requestWithdrawal(
    body: WithdrawalPayload,
  ): Promise<{ success: boolean; message: string; data: WalletWithdrawal }> {
    try {
      const res = await axios.post('/wallet/withdrawals', body);
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Could not request that withdrawal');
    }
  }

  async getMyWithdrawals(): Promise<{ success: boolean; data: WalletWithdrawal[] }> {
    try {
      const res = await axios.get('/wallet/withdrawals/mine');
      return res.data;
    } catch (error: any) {
      throw extractError(error, 'Failed to load your withdrawals');
    }
  }
}

export const walletService = new WalletService();
export default walletService;
