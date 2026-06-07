import React, { useState, useEffect } from 'react';
import { Users, DollarSign, TrendingUp, FileText, Plus, Download, Upload, Receipt } from 'lucide-react';
import { DataTable } from '../Common/DataTable';
import { ContributionForm } from '../Forms/ContributionForm';
import { BulkContributionUpload } from '../Forms/BulkContributionUpload';
import { ExpenseForm } from '../Forms/ExpenseForm';
import { ApplicationReviewModal } from '../Modals/ApplicationReviewModal';
import { LoanReviewModal } from '../Modals/LoanReviewModal';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface TreasurerStats {
  totalMembers: number;
  totalSavings: number;
  totalInvestments: number;
  pendingApplications: number;
  pendingLoans: number;
  monthlyContributions: number;
}

export const TreasurerDashboard: React.FC = () => {
  const [stats, setStats] = useState<TreasurerStats | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedLoan, setSelectedLoan] = useState(null);

  useEffect(() => {
    fetchTreasurerStats();
  }, []);

  const fetchTreasurerStats = async () => {
    try {
      const response = await api.get('/treasurer/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'applications', label: 'Applications' },
    { id: 'contributions', label: 'Contributions' },
    { id: 'loans', label: 'Loans' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'reports', label: 'Reports' },
  ];

  if (!stats) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Treasurer Dashboard</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setShowContributionForm(true)}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Contribution
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Members"
          value={stats.totalMembers}
          icon={Users}
          color="bg-blue-500"
          change={5}
        />
        <StatCard
          title="Total Savings"
          value={`₦${stats.totalSavings.toLocaleString()}`}
          icon={DollarSign}
          color="bg-green-500"
          change={12}
        />
        <StatCard
          title="Total Investments"
          value={`₦${stats.totalInvestments.toLocaleString()}`}
          icon={TrendingUp}
          color="bg-purple-500"
          change={8}
        />
        <StatCard
          title="Monthly Contributions"
          value={`₦${stats.monthlyContributions.toLocaleString()}`}
          icon={FileText}
          color="bg-orange-500"
          change={-3}
        />
      </div>

      {/* Pending Items Alert */}
      {(stats.pendingApplications > 0 || stats.pendingLoans > 0) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FileText className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Pending Reviews Required
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {stats.pendingApplications > 0 && (
                    <li>{stats.pendingApplications} membership applications pending review</li>
                  )}
                  {stats.pendingLoans > 0 && (
                    <li>{stats.pendingLoans} loan applications pending review</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'applications' && (
          <ApplicationsTab onReview={setSelectedApplication} />
        )}
        {activeTab === 'contributions' && <ContributionsTab />}
        {activeTab === 'loans' && <LoansTab onReview={setSelectedLoan} />}
        {activeTab === 'expenses' && <ExpensesTab onShowExpenseForm={setShowExpenseForm} />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>

      {/* Modals */}
      {showContributionForm && (
        <ContributionForm onClose={() => setShowContributionForm(false)} />
      )}
      {showBulkUpload && (
        <BulkContributionUpload onClose={() => setShowBulkUpload(false)} />
      )}
      {showExpenseForm && (
        <ExpenseForm onClose={() => setShowExpenseForm(false)} />
      )}
      {selectedApplication && (
        <ApplicationReviewModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
        />
      )}
      {selectedLoan && (
        <LoanReviewModal
          loan={selectedLoan}
          onClose={() => setSelectedLoan(null)}
        />
      )}
    </div>
  );
};

const OverviewTab = () => {
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/treasurer/recent-activity');
      setRecentActivity(response.data);
    } catch (error) {
      console.error('Failed to fetch recent activity');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity: any, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <div className="flex items-center">
                <Plus className="w-5 h-5 text-primary-500 mr-3" />
                <span className="text-sm font-medium">Record New Contribution</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <div className="flex items-center">
                <Download className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-sm font-medium">Export Monthly Report</span>
              </div>
            </button>
            <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-500 mr-3" />
                <span className="text-sm font-medium">Generate Statements</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApplicationsTab = ({ onReview }: { onReview: (app: any) => void }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/applications/');
      setApplications(response.data);
    } catch (error) {
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'psn', label: 'PSN' },
    { key: 'email', label: 'Email' },
    { key: 'facility_name', label: 'Facility' },
    { 
      key: 'total_contribution', 
      label: 'Total Contribution',
      render: (row: any) => `₦${(row.savings + row.investment).toLocaleString()}`
    },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.status === 'approved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Applied',
      render: (row: any) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => onReview(row)}
          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
        >
          Review
        </button>
      )
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Membership Applications</h3>
      </div>
      <DataTable
        data={applications}
        columns={columns}
        loading={loading}
        searchable
        pagination
      />
    </div>
  );
};

const ContributionsTab = () => {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchContributions();
  }, [selectedPeriod]);

  const fetchContributions = async () => {
    try {
      const response = await api.get('/contributions/', {
        params: { period: selectedPeriod }
      });
      setContributions(response.data);
    } catch (error) {
      toast.error('Failed to fetch contributions');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'member_name', label: 'Member' },
    { key: 'psn', label: 'PSN' },
    { 
      key: 'savings', 
      label: 'Savings',
      render: (row: any) => `₦${row.savings.toLocaleString()}`
    },
    { 
      key: 'investment', 
      label: 'Investment',
      render: (row: any) => `₦${row.investment.toLocaleString()}`
    },
    { 
      key: 'target_saving', 
      label: 'Target Saving',
      render: (row: any) => `₦${row.target_saving.toLocaleString()}`
    },
    { 
      key: 'total', 
      label: 'Total',
      render: (row: any) => `₦${(row.savings + row.investment + row.target_saving).toLocaleString()}`
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Period
          </label>
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Contributions for {new Date(selectedPeriod).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
          </h3>
        </div>
        <DataTable
          data={contributions}
          columns={columns}
          loading={loading}
          searchable
          pagination
        />
      </div>
    </div>
  );
};

const LoansTab = ({ onReview }: { onReview: (loan: any) => void }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const response = await api.get('/loans/');
      setLoans(response.data);
    } catch (error) {
      toast.error('Failed to fetch loans');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'member_name', label: 'Member' },
    { key: 'psn', label: 'PSN' },
    { key: 'type', label: 'Type' },
    { 
      key: 'amount', 
      label: 'Amount',
      render: (row: any) => `₦${row.amount.toLocaleString()}`
    },
    { key: 'tenure', label: 'Tenure (Months)' },
    { key: 'grantor_psn', label: 'Grantor PSN' },
    { 
      key: 'status', 
      label: 'Status',
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          row.status === 'approved' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      key: 'created_at', 
      label: 'Applied',
      render: (row: any) => new Date(row.created_at).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <button
          onClick={() => onReview(row)}
          className="text-primary-600 hover:text-primary-900 text-sm font-medium"
        >
          Review
        </button>
      )
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Loan Applications</h3>
      </div>
      <DataTable
        data={loans}
        columns={columns}
        loading={loading}
        searchable
        pagination
      />
    </div>
  );
};

const ExpensesTab = ({ onShowExpenseForm }: { onShowExpenseForm: (show: boolean) => void }) => {
  const [expenses, setExpenses] = useState([]);
  const [expenseStats, setExpenseStats] = useState<{
    total_expenses: number;
    pending_expenses: number;
    approved_expenses: number;
    total_amount: number;
    monthly_amount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
    fetchExpenseStats();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await api.get('/expenses/');
      setExpenses(response.data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Failed to fetch expenses');
      setExpenses([]);
    }
  };

  const fetchExpenseStats = async () => {
    try {
      const response = await api.get('/expenses/stats/summary');
      setExpenseStats(response.data);
    } catch (error) {
      console.error('Failed to fetch expense stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'id', label: 'Expense ID' },
    { key: 'description', label: 'Description' },
    { key: 'amount', label: 'Amount', render: (value: number) => `₦${value.toLocaleString()}` },
    { key: 'recipient', label: 'Recipient' },
    { key: 'date', label: 'Date' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'approved' ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Expense Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-red-100">
              <Receipt className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{expenseStats ? expenseStats.total_amount.toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">
                {expenseStats ? expenseStats.pending_expenses : 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                ₦{expenseStats ? expenseStats.monthly_amount.toLocaleString() : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
            <button
              onClick={() => onShowExpenseForm(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </button>
          </div>
        </div>

        <DataTable
          data={expenses}
          columns={columns}
          loading={loading}
        />
      </div>
    </div>
  );
};

const ReportsTab = () => {
  const reports = [
    { name: 'Monthly Contribution Report', description: 'Detailed breakdown of all contributions for the month' },
    { name: 'Member Statement', description: 'Individual member account statements' },
    { name: 'Loan Report', description: 'Active loans and repayment schedules' },
    { name: 'Financial Summary', description: 'Overall financial position of the cooperative' },
    { name: 'Profit Sharing Report', description: 'Annual profit distribution calculations' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {reports.map((report, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{report.name}</h3>
          <p className="text-sm text-gray-600 mb-4">{report.description}</p>
          <button className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </button>
        </div>
      ))}
    </div>
  );
};