import React, { useState } from 'react';
import { 
  DollarSign, CreditCard, TrendingUp, Users, 
  AlertCircle, CheckCircle, Clock, Target, 
  PiggyBank, Banknote, Trophy, Receipt
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TreasurerDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Mock treasurer data - in real app, this would come from API
  const treasurerData = {
    totalContributions: 2850000,
    monthlyContributions: 485000,
    pendingContributions: 125000,
    totalMembers: 47,
    activeLoans: 12,
    loanApplications: 5,
    totalLoanAmount: 1250000,
    outstandingLoans: 680000,
    profitToDistribute: 320000,
    expensesThisMonth: 85000,
    recentContributions: [
      { id: 1, member: 'Dr. Amina Hassan', amount: 25000, type: 'Monthly', date: '2024-12-28', status: 'confirmed' },
      { id: 2, member: 'Nurse Fatima Umar', amount: 15000, type: 'Savings', date: '2024-12-27', status: 'pending' },
      { id: 3, member: 'Dr. Ibrahim Musa', amount: 30000, type: 'Investment', date: '2024-12-26', status: 'confirmed' },
      { id: 4, member: 'Pharmacist Zainab', amount: 20000, type: 'Target', date: '2024-12-25', status: 'confirmed' }
    ],
    pendingApprovals: [
      { id: 1, type: 'Loan Application', member: 'Dr. Amina Hassan', amount: 80000, date: '2024-12-28' },
      { id: 2, type: 'Expense Claim', member: 'Office Supplies', amount: 15000, date: '2024-12-27' },
      { id: 3, type: 'Contribution Adjustment', member: 'Nurse Fatima', amount: 5000, date: '2024-12-26' }
    ]
  };

  const contributionGrowth = 12.5; // percentage
  const loanRepaymentRate = 94.2; // percentage

  return (
    <div className="p-6">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Financial Dashboard 💰
        </h1>
        <p className="text-gray-600">Welcome back, {user?.name?.split(' ')[0]}! Here's your financial overview</p>
      </div>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <PiggyBank className="w-8 h-8 text-primary-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Contributions</p>
              <p className="text-2xl font-bold text-gray-900">₦{(treasurerData.totalContributions / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-green-600">+{contributionGrowth}% this month</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Loans</p>
              <p className="text-2xl font-bold text-gray-900">{treasurerData.activeLoans}</p>
              <p className="text-xs text-primary-600">₦{(treasurerData.totalLoanAmount / 1000000).toFixed(1)}M total</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
              <p className="text-2xl font-bold text-gray-900">{treasurerData.pendingApprovals.length}</p>
              <p className="text-xs text-yellow-600">Requires attention</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit to Distribute</p>
              <p className="text-2xl font-bold text-gray-900">₦{treasurerData.profitToDistribute.toLocaleString()}</p>
              <p className="text-xs text-purple-600">Q4 2024</p>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Contributions Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Contributions Trend</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>This Month: ₦{treasurerData.monthlyContributions.toLocaleString()}</span>
              <span className="text-green-600">+{contributionGrowth}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-primary-500 h-4 rounded-full"
                style={{ width: '78%' }}
              ></div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Savings:</span>
                <p className="font-medium">₦285K</p>
              </div>
              <div>
                <span className="text-gray-600">Investment:</span>
                <p className="font-medium">₦150K</p>
              </div>
              <div>
                <span className="text-gray-600">Target:</span>
                <p className="font-medium">₦50K</p>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Repayment Status */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Repayment Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Repayment Rate: {loanRepaymentRate}%</span>
              <span className="text-green-600">Excellent</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full"
                style={{ width: `${loanRepaymentRate}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Repaid:</span>
                <p className="font-medium">₦{((treasurerData.totalLoanAmount - treasurerData.outstandingLoans) / 1000).toFixed(0)}K</p>
              </div>
              <div>
                <span className="text-gray-600">Outstanding:</span>
                <p className="font-medium">₦{(treasurerData.outstandingLoans / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contributions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Contributions</h3>
          <div className="space-y-3">
            {treasurerData.recentContributions.map((contribution) => (
              <div key={contribution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 text-green-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{contribution.member}</p>
                    <p className="text-xs text-gray-500">{contribution.type} - {contribution.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₦{contribution.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    contribution.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {contribution.status === 'confirmed' ? <CheckCircle className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                    {contribution.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h3>
          <div className="space-y-3">
            {treasurerData.pendingApprovals.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.type}</p>
                    <p className="text-xs text-gray-500">{item.member} - {item.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">₦{item.amount.toLocaleString()}</p>
                  <button className="text-xs text-primary-600 hover:text-primary-800">Review</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <DollarSign className="w-6 h-6 text-primary-500 mb-2" />
            <div className="font-medium">Record Contribution</div>
            <div className="text-sm text-gray-500">Add member contribution</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <CreditCard className="w-6 h-6 text-green-500 mb-2" />
            <div className="font-medium">Review Loans</div>
            <div className="text-sm text-gray-500">Process loan applications</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <Receipt className="w-6 h-6 text-purple-500 mb-2" />
            <div className="font-medium">Expense Report</div>
            <div className="text-sm text-gray-500">Generate expense summary</div>
          </button>
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
            <Trophy className="w-6 h-6 text-orange-500 mb-2" />
            <div className="font-medium">Profit Distribution</div>
            <div className="text-sm text-gray-500">Calculate member shares</div>
          </button>
        </div>
      </div>
    </div>
  );
};
