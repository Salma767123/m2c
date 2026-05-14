import axios from '@/lib/axios';

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
    // Create a new ticket
    async createTicket(data: CreateTicketData): Promise<{ success: boolean; data: SupportTicket; message: string }> {
        try {
            const response = await axios.post('/support', data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to create ticket');
        }
    }

    // Get current user/vendor's tickets
    async getMyTickets(): Promise<{ success: boolean; data: SupportTicket[] }> {
        try {
            const response = await axios.get('/support/my-tickets');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch tickets');
        }
    }

    // Get all tickets (Admin only)
    async getAllTickets(): Promise<{ success: boolean; data: SupportTicket[] }> {
        try {
            const response = await axios.get('/support/admin');
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch tickets');
        }
    }

    // Get ticket details
    async getTicketById(id: string): Promise<{ success: boolean; data: SupportTicket }> {
        try {
            const response = await axios.get(`/support/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to fetch ticket');
        }
    }

    // Reply to ticket
    async replyToTicket(id: string, data: ReplyTicketData): Promise<{ success: boolean; data: TicketMessage; message: string }> {
        try {
            const response = await axios.post(`/support/${id}/messages`, data);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to reply to ticket');
        }
    }

    // Update ticket status
    async updateTicketStatus(id: string, status: string): Promise<{ success: boolean; data: SupportTicket; message: string }> {
        try {
            const response = await axios.patch(`/support/${id}/status`, { status });
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to update ticket status');
        }
    }

    // Delete ticket (Admin only)
    async deleteTicket(id: string): Promise<{ success: boolean; message: string }> {
        try {
            const response = await axios.delete(`/support/${id}`);
            return response.data;
        } catch (error: any) {
            throw new Error(error.message || 'Failed to delete ticket');
        }
    }
}

export const supportService = new SupportService();
export default supportService;
