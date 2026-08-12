import axios from '@/lib/axios';

/**
 * Customer slice of the web's supportService. The admin methods (getAllTickets,
 * updateTicketStatus, deleteTicket) are intentionally omitted — this app has no
 * admin surface, and the backend rejects them for a customer token anyway.
 */

export interface TicketMessage {
  id: string;
  message: string;
  attachments?: string[];
  senderId: string;
  senderType: string;
  senderName: string;
  isRead: boolean;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  attachments?: string[];
  creatorId: string;
  creatorType: string;
  creatorName: string;
  creatorEmail: string;
  createdAt: string;
  updatedAt: string;
  messages?: TicketMessage[];
}

export interface CreateTicketData {
  subject: string;
  category: string;
  priority?: string;
  description: string;
  attachments?: string[];
}

export interface ReplyTicketData {
  message: string;
  attachments?: string[];
}

class SupportService {
  async createTicket(
    data: CreateTicketData,
  ): Promise<{ success: boolean; data: SupportTicket; message: string }> {
    try {
      const response = await axios.post('/support', data);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to create ticket');
    }
  }

  async getMyTickets(): Promise<{ success: boolean; data: SupportTicket[] }> {
    try {
      const response = await axios.get('/support/my-tickets');
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to fetch tickets');
    }
  }

  async getTicketById(id: string): Promise<{ success: boolean; data: SupportTicket }> {
    try {
      const response = await axios.get(`/support/${id}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to fetch ticket');
    }
  }

  async replyToTicket(
    id: string,
    data: ReplyTicketData,
  ): Promise<{ success: boolean; data: TicketMessage; message: string }> {
    try {
      const response = await axios.post(`/support/${id}/reply`, data);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to send reply');
    }
  }
}

export const supportService = new SupportService();
export default supportService;
