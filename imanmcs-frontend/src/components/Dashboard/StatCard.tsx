// src/components/Dashboard/StatCard.tsx
import React from 'react';
import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeType?: 'increase' | 'decrease';
  changeText?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  changeType,
  changeText,
}) => {
  const isIncrease = changeType === 'increase';
  const ChangeIcon = isIncrease ? ArrowUp : ArrowDown;
  const changeColor = isIncrease ? 'text-green-500' : 'text-red-500';

  return (
    <motion.div
      className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
      variants={cardVariants}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-500" />
        </div>
      </div>
      {change !== undefined && changeText && (
        <div className="mt-4 flex items-center space-x-1 text-sm">
          <ChangeIcon className={`w-4 h-4 ${changeColor}`} />
          <span className={`${changeColor} font-semibold`}>{change}</span>
          <span className="text-gray-500">{changeText}</span>
        </div>
      )}
    </motion.div>
  );
};
