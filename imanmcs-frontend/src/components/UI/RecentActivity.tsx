import React from 'react';
import { Clock, Info } from 'lucide-react';

interface ActivityItem {
  id: string;
  description: string;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
}

interface RecentActivityProps {
  title: string;
  items: ActivityItem[];
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ title, items }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-4">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.description}</p>
                  {item.amount && (
                    <p className="text-sm text-gray-500">{item.amount}</p>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                {item.status}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-8">
            <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No recent activity to display.</p>
          </div>
        )}
      </div>
    </div>
  );
};