import axios from '@/lib/axios';

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
  async submitEnquiry(data: SubmitEnquiryData): Promise<{ success: boolean; message: string; data: VendorEnquiry }> {
    try {
      const response = await axios.post('/enquiries/submit', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to submit enquiry');
    }
  }
}

export const enquiryService = new EnquiryService();
export default enquiryService;
