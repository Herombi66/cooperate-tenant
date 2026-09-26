import api from './api';

export interface ReceiptColors {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  border: string;
  accent: string;
}

export interface ReceiptTypography {
  font_family: string;
  font_scale: 'compact' | 'medium' | 'large';
  heading_weight: string;
  body_size: string;
  text_align: 'left' | 'center' | 'right';
}

export interface ReceiptHeader {
  org_name: string;
  tagline?: string;
  registration_no?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  receipt_title: string;
}

export interface ReceiptLogo {
  url?: string;
  position: 'left' | 'center' | 'right';
  width: number;
  height: number;
  show_on_print: boolean;
}

export interface ReceiptSections {
  show_logo: boolean;
  show_header: boolean;
  show_metadata: boolean;
  show_member_details: boolean;
  show_breakdown: boolean;
  show_summary: boolean;
  show_qr_code: boolean;
  show_barcode: boolean;
  show_signatures: boolean;
  show_stamp: boolean;
  show_notes: boolean;
  show_watermark: boolean;
}

export interface ReceiptLayoutConfig {
  theme?: string;
  colors: ReceiptColors;
  typography: ReceiptTypography;
  header: ReceiptHeader;
  logo: ReceiptLogo;
  border_style: 'solid' | 'dashed' | 'double' | 'minimal' | 'none';
  sections: ReceiptSections;
  watermark: {
    text: string;
    opacity: number;
    rotation: number;
  };
  stamp: {
    text: string;
    color: string;
    show_date: boolean;
  };
  signature: {
    title: string;
    show_line: boolean;
  };
  notes: {
    text: string;
  };
}

export interface ReceiptTemplate {
  id: number;
  name: string;
  type: 'default' | 'contribution' | 'loan_repayment' | 'savings' | 'investment' | 'membership' | 'expense';
  paper_size: 'A4' | 'A5' | 'thermal_80' | 'thermal_58';
  is_active: boolean;
  is_default: boolean;
  version: number;
  layout_config: ReceiptLayoutConfig;
  created_at: string;
  updated_at: string;
}

export interface ReceiptTemplateVersion {
  id: number;
  template_id: number;
  version: number;
  layout_config: ReceiptLayoutConfig;
  change_summary?: string;
  created_by?: number;
  created_at: string;
  creator?: {
    id: number;
    role: string;
  };
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  is_sample?: boolean;
  message?: string;
  receipt?: {
    receipt_number: string;
    cooperative_name: string;
    status: string;
    badge: string;
    transaction_type: string;
    payment_method?: string;
    amount: number;
    currency: string;
    issued_at: string;
    masked_member_name: string;
    masked_member_id: string;
    verification_hash_snippet: string;
  };
}

const receiptTemplateService = {
  // Get all templates
  getTemplates: async (): Promise<ReceiptTemplate[]> => {
    const response = await api.get('/receipt-templates');
    return response.data.templates || [];
  },

  // Get single template
  getTemplate: async (id: number): Promise<ReceiptTemplate> => {
    const response = await api.get(`/receipt-templates/${id}`);
    return response.data.template;
  },

  // Create template
  createTemplate: async (data: Partial<ReceiptTemplate>): Promise<ReceiptTemplate> => {
    const response = await api.post('/receipt-templates', data);
    return response.data.template;
  },

  // Update template
  updateTemplate: async (
    id: number,
    data: {
      name?: string;
      paper_size?: string;
      layout_config: ReceiptLayoutConfig;
      change_summary?: string;
      is_active?: boolean;
    }
  ): Promise<ReceiptTemplate> => {
    const response = await api.put(`/receipt-templates/${id}`, data);
    return response.data.template;
  },

  // Activate template
  activateTemplate: async (id: number, makeDefault = false): Promise<ReceiptTemplate> => {
    const response = await api.post(`/receipt-templates/${id}/activate`, { make_default: makeDefault });
    return response.data.template;
  },

  // Get version history
  getTemplateVersions: async (id: number): Promise<ReceiptTemplateVersion[]> => {
    const response = await api.get(`/receipt-templates/${id}/versions`);
    return response.data.versions || [];
  },

  // Rollback to version
  rollbackVersion: async (id: number, versionId: number): Promise<ReceiptTemplate> => {
    const response = await api.post(`/receipt-templates/${id}/rollback`, { version_id: versionId });
    return response.data.template;
  },

  // Reset to factory default
  resetToDefault: async (id: number): Promise<ReceiptTemplate> => {
    const response = await api.post(`/receipt-templates/${id}/reset`);
    return response.data.template;
  },

  // Test Print (returns PDF blob)
  testPrint: async (params: {
    template_id?: number;
    paper_size?: string;
    layout_config?: ReceiptLayoutConfig;
  }): Promise<Blob> => {
    const response = await api.post('/receipt-templates/test-print', params, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Public verification endpoint
  verifyReceipt: async (receiptNumber: string): Promise<VerificationResult> => {
    const response = await api.get(`/receipt-templates/verify/${encodeURIComponent(receiptNumber)}`);
    return response.data;
  }
};

export default receiptTemplateService;
