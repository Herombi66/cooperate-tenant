import api from './api';

export interface ContractColors {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  border: string;
  accent: string;
}

export interface ContractTypography {
  font_family: string;
  font_scale: 'compact' | 'medium' | 'large';
  heading_weight: string;
  body_size: string;
}

export interface ContractHeader {
  org_name: string;
  chapter: string;
  registration_no?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  contract_title: string;
}

export interface ContractLogo {
  url?: string;
  position: 'left' | 'center' | 'right';
  width: number;
  height: number;
  show_on_print: boolean;
}

export interface ContractSections {
  show_logo: boolean;
  show_header: boolean;
  show_metadata: boolean;
  show_borrower_card: boolean;
  show_financing_card: boolean;
  show_breakdown_card: boolean;
  show_schedule: boolean;
  show_terms: boolean;
  show_signatures: boolean;
  show_stamp: boolean;
  show_qr_code: boolean;
  show_watermark: boolean;
  show_footer: boolean;
}

export interface ContractClause {
  clause_no: number;
  title: string;
  text: string;
}

export interface ContractStamp {
  show: boolean;
  text: string;
  color?: string;
}

export interface ContractFooter {
  text: string;
  show_page_number: boolean;
}

export interface ContractLayoutConfig {
  theme?: string;
  colors: ContractColors;
  typography: ContractTypography;
  header: ContractHeader;
  logo: ContractLogo;
  sections: ContractSections;
  terms: ContractClause[];
  stamp: ContractStamp;
  footer: ContractFooter;
}

export interface DocumentTemplate {
  id: number;
  name: string;
  type: 'murabaha_contract' | 'agent_agreement' | string;
  version: number;
  is_active: boolean;
  is_default: boolean;
  layout_config: ContractLayoutConfig;
  created_at: string;
  updated_at: string;
}

export interface DocumentTemplateVersion {
  id: number;
  template_id: number;
  version: number;
  layout_config: ContractLayoutConfig;
  change_summary: string;
  created_at: string;
}

export interface PublicAgreementVerification {
  agreement_reference: string;
  loan_id: string;
  contract_type: string;
  status: string;
  version: string;
  signing_date: string;
  signature_reference: string;
  organization: string;
  chapter: string;
  masked_member: {
    name: string;
    psn: string;
  };
}

export const COLOR_PALETTES: Record<string, { label: string; colors: ContractColors }> = {
  iman_emerald: {
    label: 'IMAN Emerald (Official)',
    colors: {
      primary: '#047857',
      secondary: '#B45309',
      text: '#111827',
      background: '#FFFFFF',
      border: '#E5E7EB',
      accent: '#ECFDF5'
    }
  },
  royal_navy: {
    label: 'Royal Navy',
    colors: {
      primary: '#1E3A8A',
      secondary: '#0284C7',
      text: '#0F172A',
      background: '#FFFFFF',
      border: '#E2E8F0',
      accent: '#F0F9FF'
    }
  },
  executive_slate: {
    label: 'Executive Slate',
    colors: {
      primary: '#334155',
      secondary: '#475569',
      text: '#1E293B',
      background: '#FFFFFF',
      border: '#CBD5E1',
      accent: '#F8FAFC'
    }
  },
  modern_teal: {
    label: 'Modern Teal',
    colors: {
      primary: '#0F766E',
      secondary: '#0D9488',
      text: '#134E4A',
      background: '#FFFFFF',
      border: '#CCFBF1',
      accent: '#F0FDFA'
    }
  },
  islamic_gold: {
    label: 'Islamic Ochre & Gold',
    colors: {
      primary: '#854D0E',
      secondary: '#A16207',
      text: '#422006',
      background: '#FFFFFF',
      border: '#FEF08A',
      accent: '#FEFCE8'
    }
  },
  classic_burgundy: {
    label: 'Classic Burgundy',
    colors: {
      primary: '#831843',
      secondary: '#9D174D',
      text: '#500724',
      background: '#FFFFFF',
      border: '#FBCFE8',
      accent: '#FDF2F8'
    }
  },
  midnight_indigo: {
    label: 'Midnight Indigo',
    colors: {
      primary: '#312E81',
      secondary: '#4338CA',
      text: '#1E1B4B',
      background: '#FFFFFF',
      border: '#E0E7FF',
      accent: '#EEF2FF'
    }
  },
  forest_pine: {
    label: 'Forest Pine',
    colors: {
      primary: '#14532D',
      secondary: '#166534',
      text: '#052E16',
      background: '#FFFFFF',
      border: '#BBF7D0',
      accent: '#F0FDF4'
    }
  }
};

class DocumentTemplateService {
  /**
   * Get all contract templates
   */
  async getTemplates(): Promise<DocumentTemplate[]> {
    const response = await api.get('/document-templates');
    return response.data.templates || [];
  }

  /**
   * Get single template by ID
   */
  async getTemplateById(id: number): Promise<DocumentTemplate> {
    const response = await api.get(`/document-templates/${id}`);
    return response.data.template;
  }

  /**
   * Update template and create immutable version record
   */
  async updateTemplate(
    id: number,
    data: {
      name?: string;
      layout_config?: ContractLayoutConfig;
      change_summary?: string;
      is_active?: boolean;
    }
  ): Promise<DocumentTemplate> {
    const response = await api.put(`/document-templates/${id}`, data);
    return response.data.template;
  }

  /**
   * Get historical version history for a template
   */
  async getTemplateVersions(id: number): Promise<DocumentTemplateVersion[]> {
    const response = await api.get(`/document-templates/${id}/versions`);
    return response.data.versions || [];
  }

  /**
   * Restore template layout from past version
   */
  async restoreTemplateVersion(id: number, versionId: number): Promise<DocumentTemplate> {
    const response = await api.post(`/document-templates/${id}/restore/${versionId}`);
    return response.data.template;
  }

  /**
   * Reset template to factory defaults
   */
  async resetTemplate(id: number): Promise<DocumentTemplate> {
    const response = await api.post(`/document-templates/${id}/reset`);
    return response.data.template;
  }

  /**
   * Test print sample contract PDF with live watermark
   */
  async testPrintContract(layoutConfig: ContractLayoutConfig, type: string = 'murabaha_contract'): Promise<void> {
    const response = await api.post(
      '/document-templates/test-print',
      { layout_config: layoutConfig, type },
      { responseType: 'blob' }
    );
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sample_${type}_contract.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Public agreement verification
   */
  async verifyAgreement(ref: string): Promise<PublicAgreementVerification> {
    const response = await api.get(`/document-templates/verify/${encodeURIComponent(ref)}`);
    return response.data.agreement;
  }
}

export default new DocumentTemplateService();
