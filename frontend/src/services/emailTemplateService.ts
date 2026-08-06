import axiosInstance from '@/lib/axios';

export interface EmailTemplate {
  id: string;
  key: string;
  category: string; // "ACCOUNT" | "NOTIFICATIONS" | "SECURITY"
  name: string;
  description: string;
  subject: string;
  bodyHtml: string; // derived (send-ready); not edited directly

  // Structured, admin-editable text content
  emoji: string | null;
  headerTitle: string | null;
  headerSubtitle: string | null;
  bodyText: string | null;
  buttonLabel: string | null;
  footerText: string | null;

  fromName: string | null;
  variables: string[];
  enabled: boolean;
  isSecurity: boolean;
  sortOrder: number;
  updatedAt: string;

  // UI hints from the backend layout registry
  hasButton: boolean;
  buttonUrlVar: string | null;
}

export interface UpdateEmailTemplatePayload {
  name?: string;
  description?: string;
  subject?: string;
  fromName?: string | null;
  emoji?: string | null;
  headerTitle?: string;
  headerSubtitle?: string;
  bodyText?: string;
  buttonLabel?: string | null;
  footerText?: string;
}

class EmailTemplateService {
  // List all templates (admin only). Ordered by category, then sortOrder.
  async getTemplates(): Promise<{ success: boolean; data: EmailTemplate[] }> {
    try {
      const response = await axiosInstance.get('/email-templates');
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || error.message || 'Failed to fetch email templates');
    }
  }

  // Update editable content (structured text fields / subject / fromName).
  async updateTemplate(
    id: string,
    payload: UpdateEmailTemplatePayload
  ): Promise<{ success: boolean; data: EmailTemplate; message: string }> {
    try {
      const response = await axiosInstance.put(`/email-templates/${id}`, payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || error.message || 'Failed to update email template');
    }
  }

  // Compose (without saving) the full HTML for a draft, for the live preview.
  async previewTemplate(
    id: string,
    payload: UpdateEmailTemplatePayload
  ): Promise<{ success: boolean; data: { html: string; subject: string } }> {
    try {
      const response = await axiosInstance.post(`/email-templates/${id}/preview`, payload);
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || error.message || 'Failed to preview email template');
    }
  }

  // Enable / disable a template. Security templates cannot be disabled.
  async toggleTemplate(
    id: string,
    enabled: boolean
  ): Promise<{ success: boolean; data: EmailTemplate; message: string }> {
    try {
      const response = await axiosInstance.patch(`/email-templates/${id}/toggle`, { enabled });
      return response.data;
    } catch (error: any) {
      throw new Error(error?.response?.data?.error || error.message || 'Failed to update email template');
    }
  }
}

export const emailTemplateService = new EmailTemplateService();
