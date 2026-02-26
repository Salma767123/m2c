import axios from '@/lib/axios';

export interface InvoiceSettingsData {
    id: string;
    invoicePrefix: string;
    sequenceLength: number;
    currentSequence: number;
    financialYearStart: string;
    financialYearEnd: string;
    autoFinancialYear: boolean;
    financialYearStartMonth: number; // 1–12
    financialYearStartDay: number;   // 1–31
    formatTemplate: string;
    createdAt: string;
    updatedAt: string;
}

export interface UpdateInvoiceSettingsData {
    invoicePrefix?: string;
    sequenceLength?: number;
    currentSequence?: number;
    financialYearStart?: string;       // ISO date, manual mode only
    autoFinancialYear?: boolean;
    financialYearStartMonth?: number;  // 1–12, auto mode
    financialYearStartDay?: number;    // 1–31, auto mode
    formatTemplate?: string;
}

class InvoiceSettingsService {
    async getInvoiceSettings(): Promise<{ success: boolean; data: InvoiceSettingsData }> {
        try {
            const response = await axios.get('/invoice-settings');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch invoice settings');
        }
    }

    async updateInvoiceSettings(data: UpdateInvoiceSettingsData): Promise<{ success: boolean; message: string; data: InvoiceSettingsData }> {
        try {
            const response = await axios.put('/invoice-settings', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update invoice settings');
        }
    }
}

export const invoiceSettingsService = new InvoiceSettingsService();
export default invoiceSettingsService;
