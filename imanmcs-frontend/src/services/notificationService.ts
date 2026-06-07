import api from './api';

export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export class NotificationService {
  private static baseUrl = '/notifications';

  // Get user's notifications
  static async getMyNotifications(page = 1, limit = 20): Promise<{ notifications: NotificationItem[]; pagination: any }> {
    const response = await api.get(`${this.baseUrl}?page=${page}&limit=${limit}`);
    return response.data;
  }

  // Get unread notifications count
  static async getUnreadCount(): Promise<{ count: number }> {
    const response = await api.get(`${this.baseUrl}/unread-count`);
    return response.data;
  }

  // Mark notification as read
  static async markAsRead(notificationId: number): Promise<void> {
    await api.put(`${this.baseUrl}/${notificationId}/read`);
  }

  // Mark all notifications as read
  static async markAllAsRead(): Promise<void> {
    await api.put(`${this.baseUrl}/mark-all-read`);
  }

  // Delete notification
  static async deleteNotification(notificationId: number): Promise<void> {
    await api.delete(`${this.baseUrl}/${notificationId}`);
  }

  // Get notification type styles
  static getNotificationTypeColor(type: string): string {
    const colors: Record<string, string> = {
      loan_approved: 'text-green-600 bg-green-100',
      loan_rejected: 'text-red-600 bg-red-100',
      loan_disbursed: 'text-blue-600 bg-blue-100',
      group_join_request: 'text-blue-600 bg-blue-100',
      group_join_approved: 'text-green-600 bg-green-100',
      group_join_rejected: 'text-red-600 bg-red-100',
      guarantor_request: 'text-yellow-600 bg-yellow-100',
      guarantor_approved: 'text-green-600 bg-green-100',
      guarantor_rejected: 'text-red-600 bg-red-100',
      admin_added_to_group: 'text-purple-600 bg-purple-100',
      profit_payout: 'text-green-600 bg-green-100',
      system_alert: 'text-orange-600 bg-orange-100',
      default: 'text-gray-600 bg-gray-100'
    };
    return colors[type] || colors.default;
  }

  static getNotificationTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      loan_approved: '💰',
      loan_rejected: '❌',
      loan_disbursed: '✅',
      group_join_request: '👥',
      group_join_approved: '✅',
      group_join_rejected: '❌',
      guarantor_request: '🤝',
      guarantor_approved: '✅',
      guarantor_rejected: '❌',
      admin_added_to_group: '👑',
      profit_payout: '💵',
      system_alert: '⚠️',
      default: '📢'
    };
    return icons[type] || icons.default;
  }

  static getNotificationTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      loan_approved: 'Loan Approved',
      loan_rejected: 'Loan Rejected',
      loan_disbursed: 'Loan Disbursed',
      group_join_request: 'Group Join Request',
      group_join_approved: 'Added to Group',
      group_join_rejected: 'Group Join Rejected',
      guarantor_request: 'Guarantee Request',
      guarantor_approved: 'Guarantee Approved',
      guarantor_rejected: 'Guarantee Rejected',
      admin_added_to_group: 'Added by Admin',
      profit_payout: 'Profit Payout',
      system_alert: 'System Alert',
      default: 'Notification'
    };
    return labels[type] || labels.default;
  }
}

export default NotificationService;
