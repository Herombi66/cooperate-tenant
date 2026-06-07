// src/components/Dashboard/RecentActivity.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { User, DollarSign, CreditCard, FileText, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string;
  };
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons: { [key: string]: React.ElementType } = {
  USER_REGISTRATION: User,
  CONTRIBUTION: DollarSign,
  LOAN_APPLICATION: CreditCard,
  LOAN_REPAYMENT: CheckCircle,
  DOCUMENT_UPLOAD: FileText,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4 },
  },
};

export const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="text-gray-500">No recent activity to display.</p>
      ) : (
        <motion.ul className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type] || User;
            return (
              <motion.li key={activity.id} className="flex items-center space-x-4" variants={itemVariants}>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(activity.timestamp), 'MMM d, yyyy, h:mm a')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <img
                    src={activity.user.avatar || 'https://i.pravatar.cc/150'}
                    alt={activity.user.name}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-600">{activity.user.name}</span>
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </div>
  );
};
