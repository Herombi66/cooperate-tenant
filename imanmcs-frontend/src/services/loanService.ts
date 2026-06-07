import api from './api';

export interface Loan {
  id: number;
  user_id: number;
  loan_type: string;
  amount_requested: number;
  amount_approved?: number;
  repayment_period_months: number;
  monthly_repayment?: number;
  total_repayment?: number;
  status: string;
  application_date: string;
  approval_date?: string;
  disbursement_date?: string;
  first_repayment_date?: string;
  purpose: string;
  collateral_details?: string;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_relationship?: string;
  guarantor_psn?: string;
  guarantor_approved?: boolean;
  guarantor_response_date?: string;
  guarantor_response_notes?: string;
  notes?: string;
  approved_by?: number;
  disbursed_by?: number;
  created_at: string;
  updated_at: string;

  // Frontend computed fields
  amount?: number;
  tenure?: number;
  loanType?: string;
  guarantor_status?: string;

  // Associated data
  user?: {
    id: number;
    name: string;
    psn: string;
    email: string;
    phone: string;
    facility_name: string;
  };
  approvedBy?: {
    id: number;
    name: string;
  };
}

export interface LoanCreate {
  loan_type: string;
  amount_requested: number;
  repayment_period_months: number;
  purpose: string;
  collateral_details?: string;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_relationship?: string;
  guarantor_psn?: string;
  notes?: string;
}

export interface LoanUpdate {
  status?: string;
  amount_approved?: number;
  approved_by?: number;
  disbursement_date?: string;
  disbursed_by?: number;
  notes?: string;
}

export interface LoanStats {
  total_loans: number;
  pending_loans: number;
  approved_loans: number;
  active_loans: number;
  total_amount_approved: number;
}

export interface GuaranteeResponse {
  approved: boolean;
  notes?: string;
}

export class LoanService {
  private static baseUrl = '/loans';

  // Loan management
  static async createLoan(data: LoanCreate): Promise<Loan> {
    const response = await api.post(`${this.baseUrl}`, data);
    return response.data.loan || response.data;
  }

  static async getLoans(page = 1, limit = 10, status?: string, userId?: number, loanType?: string): Promise<{ loans: Loan[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    if (status) params.append('status', status);
    if (userId) params.append('user_id', userId.toString());
    if (loanType) params.append('loan_type', loanType);

    const response = await api.get(`${this.baseUrl}?${params}`);
    return response.data;
  }

  static async getLoan(id: number): Promise<Loan> {
    const response = await api.get(`${this.baseUrl}/${id}`);
    return response.data.loan || response.data;
  }

  static async updateLoan(id: number, data: LoanUpdate): Promise<Loan> {
    const response = await api.put(`${this.baseUrl}/${id}`, data);
    return response.data.loan || response.data;
  }

  static async deleteLoan(id: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${id}`);
  }

  // Member loan functions
  static async getMyLoans(): Promise<Loan[]> {
    const response = await api.get('/loans/my-loans');
    return response.data.loans || [];
  }

  // Admin functions
  static async getLoanStats(): Promise<LoanStats> {
    const response = await api.get('/loans/stats');
    return response.data.stats || response.data;
  }

  // Guarantee functions
  static async respondToGuaranteeRequest(loanId: number, response: GuaranteeResponse): Promise<Loan> {
    const responseObj = await api.put(`/loans/${loanId}/guarantee`, response);
    return responseObj.data.loan || responseObj.data;
  }

  static async getGuaranteeRequests(): Promise<Loan[]> {
    const response = await api.get('/loans/guarantee/requests');
    return response.data.guarantee_requests || [];
  }

  // Utility functions
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  }

  static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Pending',
      waiting_disbursement: 'Waiting for Disbursement',
      approved: 'Approved',
      disbursed: 'Disbursed',
      active: 'Active',
      rejected: 'Rejected',
      completed: 'Completed',
      defaulted: 'Defaulted'
    };
    return labels[status] || status;
  }

  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 bg-yellow-100',
      waiting_disbursement: 'text-blue-600 bg-blue-100',
      approved: 'text-green-600 bg-green-100',
      disbursed: 'text-purple-600 bg-purple-100',
      active: 'text-blue-600 bg-blue-100',
      rejected: 'text-red-600 bg-red-100',
      completed: 'text-green-600 bg-green-100',
      defaulted: 'text-red-600 bg-red-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  }

  static getLoanTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      cash: 'Cash Loan',
      investment: 'Investment Loan',
      emergency: 'Emergency Loan',
      business: 'Business Loan'
    };
    return labels[type] || type;
  }

  static calculateMonthlyPayment(principal: number, months: number): number {
    // Simple calculation - in a real Islamic system, this would be more complex
    return principal / months;
  }
}

export default LoanService;
