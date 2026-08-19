import axios from '@/lib/axios';

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /** Marketing attribution slug — see lib/enquirySources.ts. Null on legacy rows. */
  hearAboutUs?: string | null;
  /** Free text captured when hearAboutUs is "other". */
  hearAboutUsOther?: string | null;
  status: 'new' | 'read' | 'replied' | 'closed';
  repliedAt?: string;
  closedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactEnquiryStats {
  total: number;
  new: number;
  read: number;
  replied: number;
  closed: number;
  /** Counts keyed by source slug, plus `unspecified`. Powers the source report. */
  bySource?: Record<string, number>;
}

class ContactEnquiryService {
  // Public: Submit contact enquiry
  async submitEnquiry(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
    hearAboutUs?: string;
    hearAboutUsOther?: string;
  }): Promise<{ success: boolean; message: string; data?: ContactEnquiry }> {
    // The contact form shows its own centre-screen result, so the shared
    // interceptor must not add a corner toast on top of it — one failed click
    // was producing two error messages saying the same thing.
    const response = await axios.post('/contact-enquiries/submit', data, {
      skipErrorToast: true,
    });
    return response.data;
  }

  // Admin: Get all contact enquiries
  async getAllEnquiries(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: ContactEnquiry[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const response = await axios.get('/contact-enquiries', { params });
    return response.data;
  }

  // Admin: Get single enquiry
  async getEnquiryById(id: string): Promise<{ success: boolean; data: ContactEnquiry }> {
    const response = await axios.get(`/contact-enquiries/${id}`);
    return response.data;
  }

  // Admin: Update enquiry status
  async updateStatus(
    id: string,
    data: { status: string; notes?: string }
  ): Promise<{ success: boolean; message: string; data: ContactEnquiry }> {
    const response = await axios.put(`/contact-enquiries/${id}/status`, data);
    return response.data;
  }

  // Admin: Delete enquiry
  async deleteEnquiry(id: string): Promise<{ success: boolean; message: string }> {
    const response = await axios.delete(`/contact-enquiries/${id}`);
    return response.data;
  }

  // Admin: Get statistics
  async getStats(): Promise<{ success: boolean; data: ContactEnquiryStats }> {
    const response = await axios.get('/contact-enquiries/stats');
    return response.data;
  }

  // Analytics: "How did you hear about us?" breakdown for a period.
  async getSourceReport(period: string): Promise<{
    success: boolean;
    data: { period: string; total: number; sources: { value: string; count: number }[] };
  }> {
    const response = await axios.get('/contact-enquiries/source-report', { params: { period } });
    return response.data;
  }
}

export const contactEnquiryService = new ContactEnquiryService();
