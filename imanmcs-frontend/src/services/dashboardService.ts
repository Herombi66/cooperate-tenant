import api from './api';

export interface DashboardStats {
  totalMembers: number;
  totalContributions: number;
  pendingLoans: number;
  totalProfitShared: number;
  pendingExpenses: number;
  monthlyExpenses: number;
  totalReserves: number;
  activeApplications: number;
  totalLayyahApplications: number;
  pendingLayyahApplications: number;
  activeLayyahGroups: number;
}

export interface MemberStats {
  totalContributions: number;
  pendingLoans: number;
  approvedLoans: number;
  monthlySavings: number;
  investmentBalance: number;
  profitShare: number;
}

export interface ExpenseData {
  id: number;
  description: string;
  category: string;
  amount: number;
  status: string;
  date: string;
  recipient?: string;
  type?: string;
}

export interface ActivityLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_role: string | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: any;
  created_at: string;
  user?: {
    id: number;
    name: string;
    role: string;
  };
}

export interface ActivityLogsResponse {
  logs: ActivityLog[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export class DashboardService {
  private static baseUrl = '/dashboard';

  static async getAdminStats(): Promise<DashboardStats> {
    try {
      const response = await api.get(`${this.baseUrl}/stats`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw new Error('Failed to load dashboard statistics');
    }
  }



  static async getExpenses(): Promise<ExpenseData[]> {
    try {
      const response = await api.get('/expenses/');
      return response.data.expenses.map((expense: any) => ({
        id: expense.id,
        description: expense.description,
        category: expense.category,
        amount: expense.amount,
        status: expense.status,
        date: expense.expense_date ? new Date(expense.expense_date).toISOString().split('T')[0] : '',
        recipient: expense.recipient,
        type: expense.category
      }));
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      throw new Error('Failed to load expenses data');
    }
  }

  static async getExpenseStats(): Promise<{
    totalExpenses: number;
    pendingExpenses: number;
    approvedExpenses: number;
    totalAmount: number;
    monthlyAmount: number;
  }> {
    try {
      const response = await api.get('/expenses/stats/summary');
      return response.data.stats;
    } catch (error) {
      console.error('Failed to fetch expense stats:', error);
      throw new Error('Failed to load expense statistics');
    }
  }

  static async getChairmanStats(): Promise<DashboardStats> {
    // For chairman, we can reuse admin stats for now
    return this.getAdminStats();
  }

  static async getActivityLogs(params?: {
    page?: number;
    limit?: number;
    resource_type?: string;
    action?: string;
    user_id?: number;
  }): Promise<ActivityLogsResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.resource_type) queryParams.append('resource_type', params.resource_type);
      if (params?.action) queryParams.append('action', params.action);
      if (params?.user_id) queryParams.append('user_id', params.user_id.toString());
      
      const response = await api.get(`${this.baseUrl}/activity-logs?${queryParams.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
      throw new Error('Failed to load activity logs');
    }
  }

  static async getUnifiedData(): Promise<any> {
    const response = await api.get(`${this.baseUrl}/unified`);
    return response.data.data || response.data;
  }

  static async trackWhatsappGroupInviteClick(source: string = 'member_dashboard'): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/engagement/whatsapp-group-click`, { source });
    } catch {}
  }

  static async getWhatsappGroupInviteHealth(): Promise<{ url: string; ok: boolean; status: number | null; checked_at: string }> {
    const response = await api.get(`${this.baseUrl}/health/whatsapp-group`);
    return response.data.data || response.data;
  }
}

export default DashboardService;
