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
      className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border"
      variants={cardVariants}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 bg-primary-50 dark:bg-primary-950/40 border border-primary-200/50 dark:border-primary-800/40 rounded-full flex items-center justify-center flex-shrink-0">
          <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
      {change !== undefined && changeText && (
        <div className="mt-4 flex items-center space-x-1 text-sm">
          <ChangeIcon className={`w-4 h-4 ${changeColor}`} />
          <span className={`${changeColor} font-semibold`}>{change}</span>
          <span className="text-muted-foreground">{changeText}</span>
        </div>
      )}
    </motion.div>
  );
};
