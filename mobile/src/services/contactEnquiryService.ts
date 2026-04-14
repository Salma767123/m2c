import axios from '@/lib/axios';

export interface ContactEnquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  createdAt: string;
}

class ContactEnquiryService {
  async submitEnquiry(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean; message: string; data?: ContactEnquiry }> {
    const response = await axios.post('/contact-enquiries/submit', data);
    return response.data;
  }
}

export const contactEnquiryService = new ContactEnquiryService();
export default contactEnquiryService;
