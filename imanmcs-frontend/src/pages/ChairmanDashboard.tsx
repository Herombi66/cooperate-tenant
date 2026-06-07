import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, CreditCard, Receipt, TrendingUp,
  AlertCircle, CheckCircle, Clock, Target,
  FileText, Shield, Award, Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  },
  hover: {
    y: -5,
    transition: { duration: 0.2 }
  }
};

const buttonVariants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.98 }
};

export const ChairmanDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Mock chairman data - in real app, this would come from API
  const chairmanData = {
    totalMembers: 47,
    newApplications: 3,
    pendingLoans: 5,
    pendingExpenses: 4,
    totalAssets: 3850000,
    monthlyGrowth: 8.5,
    pendingApprovals: [
      { id: 1, type: 'Loan Application', member: 'Dr. Amina Hassan', amount: 80000, date: '2024-12-28', priority: 'high' },
      { id: 2, type: 'Expense Approval', description: 'Office Supplies', amount: 25000, date: '2024-12-27', priority: 'medium' },
      { id: 3, type: 'Member Application', member: 'Nurse Aisha Abdullahi', amount: 25000, date: '2024-12-26', priority: 'low' },
      { id: 4, type: 'Expense Approval', description: 'Equipment Purchase', amount: 150000, date: '2024-12-25', priority: 'high' }
    ],
    recentDecisions: [
      { id: 1, type: 'Loan Approved', member: 'Dr. Ibrahim Musa', amount: 120000, date: '2024-12-24', decision: 'approved' },
      { id: 2, type: 'Expense Approved', description: 'Utility Bills', amount: 15000, date: '2024-12-23', decision: 'approved' },
      { id: 3, type: 'Member Approved', member: 'Pharmacist Zainab', amount: 20000, date: '2024-12-22', decision: 'approved' }
    ],
    systemMetrics: {
      loanApprovalRate: 92.5,
      memberSatisfaction: 96.8,
      financialHealth: 94.2,
      complianceScore: 98.5
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      className="p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Header */}
      <motion.div className="mb-6" variants={cardVariants}>
        <h1 className="text-2xl font-bold text-gray-900">
          Chairman Dashboard 👑
        </h1>
        <p className="text-gray-600">Welcome back, {user?.name?.split(' ')[0]}! Here's your governance overview</p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" variants={cardVariants}>
        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{chairmanData.totalMembers}</p>
              <p className="text-xs text-green-600">+{chairmanData.monthlyGrowth}% this month</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{chairmanData.pendingApprovals.length}</p>
              <p className="text-xs text-orange-600">Requires attention</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <Target className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-gray-900">₦{(chairmanData.totalAssets / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-purple-600">Cooperative value</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <Award className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Compliance Score</p>
              <p className="text-2xl font-bold text-gray-900">{chairmanData.systemMetrics.complianceScore}%</p>
              <p className="text-xs text-green-600">Excellent</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* System Health Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Loan Approval Rate</span>
                <span>{chairmanData.systemMetrics.loanApprovalRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${chairmanData.systemMetrics.loanApprovalRate}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Member Satisfaction</span>
                <span>{chairmanData.systemMetrics.memberSatisfaction}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${chairmanData.systemMetrics.memberSatisfaction}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Financial Health</span>
                <span>{chairmanData.systemMetrics.financialHealth}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${chairmanData.systemMetrics.financialHealth}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-3">
            <motion.button
              onClick={() => navigate('/loan-approvals')}
              className="p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left flex items-center transition-colors"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <CreditCard className="w-5 h-5 text-blue-500 mr-3" />
              <div>
                <div className="font-medium text-sm">Review Loan Applications</div>
                <div className="text-xs text-gray-500">{chairmanData.pendingLoans} pending approvals</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => navigate('/expenses')}
              className="p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 text-left flex items-center transition-colors"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Receipt className="w-5 h-5 text-green-500 mr-3" />
              <div>
                <div className="font-medium text-sm">Approve Expenses</div>
                <div className="text-xs text-gray-500">{chairmanData.pendingExpenses} awaiting approval</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => navigate('/member-applications')}
              className="p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 text-left flex items-center transition-colors"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <Users className="w-5 h-5 text-purple-500 mr-3" />
              <div>
                <div className="font-medium text-sm">Member Applications</div>
                <div className="text-xs text-gray-500">{chairmanData.newApplications} new applications</div>
              </div>
            </motion.button>

            <motion.button
              onClick={() => navigate('/reports')}
              className="p-3 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 text-left flex items-center transition-colors"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <FileText className="w-5 h-5 text-orange-500 mr-3" />
              <div>
                <div className="font-medium text-sm">Generate Reports</div>
                <div className="text-xs text-gray-500">Executive summaries</div>
              </div>
            </motion.button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h3>
          <div className="space-y-3">
            {chairmanData.pendingApprovals.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === 'Loan Application') {
                    navigate('/loan-approvals');
                  } else if (item.type === 'Expense Approval') {
                    navigate('/expenses');
                  } else if (item.type === 'Member Application') {
                    navigate('/member-applications');
                  }
                }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.type}</p>
                    <p className="text-xs text-gray-500">
                      {item.member || item.description} - {item.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₦{item.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Decisions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Decisions</h3>
          <div className="space-y-3">
            {chairmanData.recentDecisions.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type.includes('Loan')) {
                    navigate('/loan-approvals');
                  } else if (item.type.includes('Expense')) {
                    navigate('/expenses');
                  } else if (item.type.includes('Member')) {
                    navigate('/member-applications');
                  }
                }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.type}</p>
                    <p className="text-xs text-gray-500">
                      {item.member || item.description} - {item.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₦{item.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDecisionColor(item.decision)}`}>
                    {item.decision}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
