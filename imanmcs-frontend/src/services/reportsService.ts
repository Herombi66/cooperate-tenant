import api from './api';

export interface FinancialReportData {
  period: string;
  totalMembers: number;
  newMembers: number;
  totalContributions: number;
  savingsContributions: number;
  investmentContributions: number;
  targetSavingsContributions: number;
  totalLoans: number;
  loansAmount: number;
  repaidAmount: number;
  outstandingAmount: number;
  totalExpenses: number;
  profitGenerated: number;
  profitDistributed: number;
  generatedAt: string;
}

export interface MemberReportData {
  period: string;
  memberStats: {
    totalMembers: number;
    activeMembers: number;
    totalContributions: number;
    uniqueContributors: number;
    averageContribution: number;
    contributionRatio: string;
  };
  newMembers: number;
  activeContributors: number;
  averageContributions: number;
  topContributors: any[];
  recentContributors: any[];
  memberEngagement: {
    highlyActive: number;
    moderatelyActive: number;
    lowActivity: number;
  };
  generatedAt: string;
}

export interface LoanReportData {
  period: string;
  portfolioSummary: any[];
  repaymentRate: number;
  monthlyTrends: any[];
  riskAnalysis: any;
  generatedAt: string;
}

export interface ExpenseReportData {
  period: string;
  expenseBreakdown: any[];
  totalExpenses: number;
  monthlyTrends: any[];
  topExpenseCategories: any[];
  generatedAt: string;
}

export interface ProfitSharingReportData {
  period: string;
  overallStats: {
    totalProfitDistributed: number;
    totalInvestment: number;
    averageReturn: number;
    memberCount: number;
  };
  quarterlyTrends: any[];
  topPerformers: any[];
  investmentDistribution: any[];
  generatedAt: string;
}

export interface ComplianceReportData {
  period: string;
  complianceStatus: any;
  auditTrail: any;
  riskIndicators: any;
  recommendations: string[];
  generatedAt: string;
}

export interface MemberStatementReportData {
  period: string;
  member: {
    user_id: number;
    psn: string;
    name: string;
    email: string;
    phone?: string | null;
    facility_name?: string | null;
  };
  balances: {
    total_contributions_approved: number;
    total_withdrawals_approved: number;
    contribution_balance: number;
    total_outstanding_loans: number;
  };
  transactions: {
    contributions: any[];
    withdrawals: any[];
    loans: any[];
    repayments: any[];
  };
  generatedAt: string;
}

export interface GeneralLedgerReportData {
  period: string;
  totals: {
    contributions: number;
    withdrawals: number;
    loan_approved: number;
    loan_repayments: number;
    expenses: number;
  };
  generatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  report: T;
  message?: string;
}

export class ReportsService {
  private static baseUrl = '/reports';

  // Get financial summary report
  static async getFinancialReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/financial`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching financial report:', error);
      throw error;
    }
  }

  // Get member activity report
  static async getMemberReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MemberReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/members`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching member report:', error);
      throw error;
    }
  }

  // Get loan portfolio report
  static async getLoanReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LoanReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/loans`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching loan report:', error);
      throw error;
    }
  }

  // Get expense report
  static async getExpenseReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ExpenseReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/expenses`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching expense report:', error);
      throw error;
    }
  }

  // Get profit sharing report
  static async getProfitSharingReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ProfitSharingReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/profit-sharing`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching profit sharing report:', error);
      throw error;
    }
  }

  // Get compliance/audit report
  static async getComplianceReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<ComplianceReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/compliance`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching compliance report:', error);
      throw error;
    }
  }

  static async getMemberStatementReport(params: {
    psn: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<MemberStatementReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/member-statement`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching member statement report:', error);
      throw error;
    }
  }

  static async getGeneralLedgerReport(params?: {
    period?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<GeneralLedgerReportData> {
    try {
      const response = await api.get(`${this.baseUrl}/general-ledger`, { params });
      return response.data.report || response.data;
    } catch (error) {
      console.error('Error fetching general ledger report:', error);
      throw error;
    }
  }

  // Export report to PDF/CSV/Excel
  static async exportReport(
    type: 'financial' | 'members' | 'loans' | 'expenses' | 'profit-share' | 'compliance',
    format: 'pdf' | 'csv' | 'excel',
    params?: { period?: string; startDate?: string; endDate?: string }
  ): Promise<Blob> {
    try {
      const response = await api.get(`${this.baseUrl}/${type}/export`, {
        params: { ...params, format },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting report:', error);
      throw error;
    }
  }
}

export default ReportsService;
