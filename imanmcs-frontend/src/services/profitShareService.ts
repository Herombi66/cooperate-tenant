import api from './api';

// Profit Share interfaces
export interface ProfitShare {
  id: number;
  user_id: number;
  period: string;
  total_investment_pool: number;
  total_profit: number;
  member_investment: number;
  share_percentage: number;
  profit_amount: number;
  status: 'calculated' | 'approved' | 'paid' | 'cancelled';
  calculated_at: string;
  approved_at?: string;
  approved_by?: number;
  paid_at?: string;
  paid_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: number;
    name?: string;
    psn?: string;
  };
  membershipApplication?: {
    psn: string;
    name: string;
    email: string;
  };
  approvedBy?: {
    id: number;
    name?: string;
  };
  paidBy?: {
    id: number;
    name?: string;
  };
}

export interface ProfitShareListResponse {
  profitShares: ProfitShare[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface ProfitShareStats {
  total_profit_shared: number;
  paid_amount: number;
  pending_amount: number;
  member_count: number;
  period_count: number;
}

export interface MemberInvestmentData {
  user_id: number;
  amount: number;
}

export interface CalculateProfitSharesRequest {
  period: string;
  totalProfit: number;
  totalInvestmentPool: number;
  memberInvestments: MemberInvestmentData[];
}

export interface CalculateProfitSharesResponse {
  success: boolean;
  message: string;
  data: {
    period: string;
    totalInvestmentPool: number;
    totalProfit: number;
    deductions: number;
    netProfitForMembers: number;
    memberCount: number;
    profitShares: ProfitShare[];
  };
}

export interface ApproveProfitSharesRequest {
  period?: string;
  profitShareIds?: number[];
}

export interface ApproveProfitSharesResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

export interface PayProfitSharesRequest {
  profitShareIds: number[];
}

export interface PayProfitSharesResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

export interface CancelProfitSharesRequest {
  profitShareIds: number[];
  reason?: string;
}

export interface CancelProfitSharesResponse {
  success: boolean;
  message: string;
  updatedCount: number;
}

export interface PeriodDataResponse {
  success: boolean;
  period: string;
  totalInvestmentPool: number;
  totalProfit: number;
  memberInvestments: {
    user_id: number;
    name: string;
    psn: string;
    amount: number;
  }[];
  calculations: {
    totalContributions: number;
    totalExpenses: number;
    memberCountWithInvestments: number;
  };
}

export class ProfitShareService {
  private static baseUrl = '/profit-shares';

  // Get all profit shares with pagination and filtering
  static async getProfitShares(params?: {
    page?: number;
    limit?: number;
    period?: string;
    status?: string;
    user_id?: number;
  }): Promise<ProfitShareListResponse> {
    try {
      const response = await api.get(`${this.baseUrl}`, { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profit shares:', error);
      throw new Error('Failed to load profit shares');
    }
  }

  // Get distinct periods for dropdown
  static async getProfitSharePeriods(): Promise<string[]> {
    try {
      const response = await api.get(`${this.baseUrl}/periods`);
      return response.data.periods;
    } catch (error) {
      console.error('Failed to fetch profit share periods:', error);
      throw new Error('Failed to load profit share periods');
    }
  }

  // Get automatically calculated period data (investment pool and profit)
  static async getPeriodData(period: string): Promise<PeriodDataResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/period-data`, { params: { period } });
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch period data:', error);
      throw new Error(error.response?.data?.message || 'Failed to load period data');
    }
  }

  // Get current user's profit shares (for members)
  static async getMyProfitShares(): Promise<ProfitShareListResponse> {
    try {
      const response = await api.get(`${this.baseUrl}/my`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to fetch my profit shares:', error);
      throw new Error(error.response?.data?.message || 'Failed to load my profit shares');
    }
  }

  // Calculate profit shares for a period (Admin only)
  static async calculateProfitShares(data: CalculateProfitSharesRequest): Promise<CalculateProfitSharesResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/calculate`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to calculate profit shares:', error);
      throw new Error(error.response?.data?.message || 'Failed to calculate profit shares');
    }
  }

  // Approve calculated profit shares (Admin only)
  static async approveProfitShares(data: ApproveProfitSharesRequest): Promise<ApproveProfitSharesResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/approve`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to approve profit shares:', error);
      throw new Error(error.response?.data?.message || 'Failed to approve profit shares');
    }
  }

  // Mark approved profit shares as paid (Admin only)
  static async payProfitShares(data: PayProfitSharesRequest): Promise<PayProfitSharesResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/pay`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to mark profit shares as paid:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark profit shares as paid');
    }
  }

  // Cancel profit shares (Admin only)
  static async cancelProfitShares(data: CancelProfitSharesRequest): Promise<CancelProfitSharesResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/cancel`, data);
      return response.data;
    } catch (error: any) {
      console.error('Failed to cancel profit shares:', error);
      throw new Error(error.response?.data?.message || 'Failed to cancel profit shares');
    }
  }
}

export default ProfitShareService;
