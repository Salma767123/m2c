import axios from '@/lib/axios';
import axiosLib from 'axios';

export interface VendorEnquiry {
    id: string;
    name: string;
    companyName: string;
    gstNumber: string;
    email: string;
    phone: string;
    website?: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedAt?: string;
    rejectedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface SubmitEnquiryData {
    name: string;
    companyName: string;
    gstNumber: string;
    email: string;
    phone: string;
    website?: string;
}

class EnquiryService {
    // Public: Submit vendor enquiry from Contact page (no auth)
    async submitEnquiry(data: SubmitEnquiryData): Promise<{ success: boolean; message: string; data: VendorEnquiry }> {
        try {
            const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
            const response = await axiosLib.post(`${baseURL}/enquiries/submit`, data, {
                headers: { 'Content-Type': 'application/json' }
            });
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Failed to submit enquiry');
        }
    }

    // Admin: Get all enquiries
    async getAllEnquiries(params?: { status?: string; search?: string }): Promise<{ success: boolean; data: VendorEnquiry[] }> {
        try {
            const response = await axios.get('/enquiries', { params });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch enquiries');
        }
    }

    // Admin: Approve enquiry (sends registration email)
    async approveEnquiry(id: string): Promise<{ success: boolean; message: string; data: VendorEnquiry }> {
        try {
            const response = await axios.patch(`/enquiries/${id}/approve`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to approve enquiry');
        }
    }

    // Admin: Reject enquiry
    async rejectEnquiry(id: string): Promise<{ success: boolean; message: string; data: VendorEnquiry }> {
        try {
            const response = await axios.patch(`/enquiries/${id}/reject`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to reject enquiry');
        }
    }

    // Admin: Delete enquiry
    async deleteEnquiry(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await axios.delete(`/enquiries/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to delete enquiry');
        }
    }
}

export const enquiryService = new EnquiryService();
export default enquiryService;
