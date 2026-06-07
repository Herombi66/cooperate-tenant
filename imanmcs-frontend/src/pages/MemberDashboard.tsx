import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  DollarSign, CreditCard, TrendingUp, Calendar,
  AlertTriangle, CheckCircle, Clock, Target, User, AlertCircle,
  PiggyBank, Banknote, Trophy, Receipt, Eye, Heart, Plus, Info, ChevronDown, ChevronRight, MessageCircle, ExternalLink
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { DashboardService } from '../services/dashboardService';
import toast from 'react-hot-toast';

const safeMap = <T, R>(value: T[] | null | undefined, mapper: (item: T, index: number) => R): R[] => {
  if (!Array.isArray(value)) return [];
  return value.map(mapper);
};

const toCurrency = (value: number | string | null | undefined): string => {
  const n = typeof value === 'string' ? Number(value) : value;
  const amount = Number.isFinite(n as number) ? (n as number) : 0;
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
};

interface Contribution {
  id: number;
  type: string;
  amount: number;
  date: string;
  status: string;
}

interface ProfitShare {
  period: string;
  amount: number;
  status: string;
}

interface LoanRepayment {
  id: number;
  date: string;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
  status: string;
  receiptNo: string | null;
}

interface ActiveLoan {
  id: string;
  amount: number;
  balance: number;
  monthlyPayment: number;
  nextPayment: string;
  paymentsLeft: number;
  startDate: string;
  endDate: string;
  interestRate: number;
  loanType: string;
}

interface MemberDashboardData {
  totalSavings: number;
  totalInvestment: number;
  targetSavings: number;
  currentLoans: number;
  loanBalance: number;
  totalInvestmentLoans: number;
  totalCashLoans: number;
  totalPaidLoans: number;
  profitEarned: number;
  nextContributionDue: string;
  memberSince: string;
  layyahApplications: number;
  activeLayyahGroups: number;
  pendingInvitations: number;
  recentContributions: Contribution[];
  activeLoan: ActiveLoan | null;
  loanRepayments: LoanRepayment[];
  profitShares: ProfitShare[];
}

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
    y: -2,
    transition: { duration: 0.2 }
  }
};

export const MemberDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoanRepayments, setShowLoanRepayments] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [memberData, setMemberData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [whatsAppHealth, setWhatsAppHealth] = useState<{ ok: boolean; checked_at: string } | null>(null);

  const whatsappInviteUrl = 'https://chat.whatsapp.com/KLhdr510SRrIipgOkmzfjC';

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    let interval: number | null = null;

    const readCachedHealth = (): { ok: boolean; checked_at: string } | null => {
      try {
        const raw = localStorage.getItem('whatsapp_group_health');
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { ok?: boolean; checked_at?: string; expires_at?: number };
        if (!parsed || typeof parsed.ok !== 'boolean' || typeof parsed.checked_at !== 'string') return null;
        if (parsed.expires_at && Date.now() > parsed.expires_at) return null;
        return { ok: parsed.ok, checked_at: parsed.checked_at };
      } catch {
        return null;
      }
    };

    const writeCachedHealth = (payload: { ok: boolean; checked_at: string }) => {
      try {
        localStorage.setItem(
          'whatsapp_group_health',
          JSON.stringify({ ...payload, expires_at: Date.now() + 6 * 60 * 60 * 1000 })
        );
      } catch {}
    };

    const check = async () => {
      const cached = readCachedHealth();
      if (cached) {
        setWhatsAppHealth(cached);
        return;
      }

      try {
        const result = await DashboardService.getWhatsappGroupInviteHealth();
        const next = { ok: Boolean(result.ok), checked_at: result.checked_at || new Date().toISOString() };
        setWhatsAppHealth(next);
        writeCachedHealth(next);
      } catch {
        const next = { ok: false, checked_at: new Date().toISOString() };
        setWhatsAppHealth(next);
        writeCachedHealth(next);
      }
    };

    check();
    interval = window.setInterval(check, 6 * 60 * 60 * 1000);

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, []);

  const isMobileDevice = () => {
    const ua = navigator.userAgent || '';
    return /Android|iPhone|iPad|iPod/i.test(ua);
  };

  const handleWhatsappInviteClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const logPromise = DashboardService.trackWhatsappGroupInviteClick('member_dashboard');
    const logWithTimeout = Promise.race([logPromise, new Promise((resolve) => setTimeout(resolve, 350))]);

    const mobile = isMobileDevice();

    if (mobile) {
      const win = window.open(whatsappInviteUrl, '_blank', 'noopener,noreferrer');
      await logWithTimeout;
      if (!win) {
        toast.error('Popup blocked. Opening in this tab instead.');
        window.location.assign(whatsappInviteUrl);
        return;
      }
      window.setTimeout(() => {
        toast('If WhatsApp did not open, please install WhatsApp or open the link in your browser.');
      }, 1000);
      return;
    }

    const win = window.open(whatsappInviteUrl, '_blank', 'noopener,noreferrer');
    void logWithTimeout;
    if (!win) {
      toast.error('Popup blocked. Please allow popups or use the link again.');
      window.location.assign(whatsappInviteUrl);
    }
  };

  const fetchDashboardData = async () => {
    const startTime = performance.now();
    try {
      setLoading(true);
      setError(null);
      const data = await DashboardService.getUnifiedData();
      const endTime = performance.now();
      console.log(`Unified Member Dashboard Load Time: ${(endTime - startTime).toFixed(2)}ms`);

      if (data.role === 'member' && data.member) {
        // ... (rest of logic)
        const memberStats = data.member.stats;
        const contributions = data.member.recentContributions || [];
        const activeLoan = data.member.activeLoan;
        const loans = data.member.loans || [];

        setMemberData({
          totalSavings: memberStats.totalSavings || 0,
          totalInvestment: memberStats.totalInvestment || 0,
          targetSavings: memberStats.targetSavings || 200000,
          currentLoans: loans.length,
          loanBalance: memberStats.loanBalance || 0,
          totalInvestmentLoans: memberStats.totalInvestmentLoans || 0,
          totalCashLoans: memberStats.totalCashLoans || 0,
          totalPaidLoans: memberStats.totalPaidLoans || 0,
          profitEarned: memberStats.profitEarned || 0,
          nextContributionDue: '2025-02-01', // This could come from backend
          memberSince: '2023-06-15', // This could come from user profile
          layyahApplications: memberStats.totalLayyahApplications || 0,
          activeLayyahGroups: memberStats.activeLayyahGroups || 0,
          pendingInvitations: memberStats.pendingInvitations || 0,
          recentContributions: contributions.slice(0, 5).map((contrib: any) => ({
            id: contrib.id,
            type: contrib.contribution_type || 'Savings',
            amount: parseFloat(contrib.total_amount),
            date: new Date(contrib.contribution_date).toLocaleDateString(),
            status: contrib.status === 'approved' ? 'confirmed' : 'pending'
          })),
          activeLoan: activeLoan ? {
            id: activeLoan.id,
            amount: activeLoan.amount_approved,
            balance: activeLoan.amount_approved - (activeLoan.amount_paid || 0),
            monthlyPayment: activeLoan.monthly_repayment || 0,
            nextPayment: '2025-02-01', // This could be calculated
            paymentsLeft: Math.ceil((activeLoan.amount_approved - (activeLoan.amount_paid || 0)) / (activeLoan.monthly_repayment || 1)),
            startDate: activeLoan.created_at,
            endDate: '2025-08-01', // This could be calculated
            interestRate: 0,
            loanType: activeLoan.loan_type
          } : null,
          loanRepayments: [], // This would need a separate API call for repayment schedule
          profitShares: [
            { period: '2024-Q4', amount: memberStats.totalProfitShared || 0, status: 'paid' }
          ],
          settings: data.member.settings || {}
        });
      } else {
        setError('Invalid dashboard data received');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !memberData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h3>
        <p className="text-gray-600 mb-6">{error || 'Could not load dashboard data'}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const savingsProgress = (memberData.totalSavings / memberData.targetSavings) * 100;
  const loanProgress = memberData.activeLoan ?
    ((memberData.activeLoan.amount - memberData.activeLoan.balance) / memberData.activeLoan.amount) * 100 : 0;

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
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600">Here's your cooperative account overview</p>
      </motion.div>

      {/* Deduction Policy Notice */}
      <motion.div 
        className="bg-blue-50 border-l-4 border-blue-400 mb-6 rounded-r-lg shadow-sm overflow-hidden"
        variants={cardVariants}
      >
        <div 
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setShowPolicy(!showPolicy)}
        >
          <div className="flex items-center">
            <Info className="h-5 w-5 text-blue-400 mr-3" />
            <h3 className="text-sm font-medium text-blue-800">Membership Fee Policy</h3>
          </div>
          {showPolicy ? (
            <ChevronDown className="h-5 w-5 text-blue-500" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-500" />
          )}
        </div>
        
        {showPolicy && (
          <div className="px-4 pb-4 pl-12">
            <div className="text-sm text-blue-700">
              <p className="mb-1">Please note the following automatic deductions as per the membership agreement:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Registration Fee:</strong> ₦1,500 (One-time deduction from first contribution)</li>
                <li><strong>Monthly Admin Fee:</strong> ₦1,000 (Deducted once per month from the first contribution in that month)</li>
              </ul>
              <p className="mt-2 text-xs text-blue-600">
                These fees support the operational costs of the cooperative. You can view all deductions in your transaction history.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {user?.isDefaultPassword && (
        <motion.div
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You are using the default password. For your security, please{' '}
                <NavLink to="/change-password" className="font-medium underline text-yellow-700 hover:text-yellow-600">
                  change your password
                </NavLink>{' '}
                immediately.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Stats Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6" variants={cardVariants}>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <PiggyBank className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Savings</p>
              <p className="text-2xl font-bold text-gray-900">{toCurrency(memberData.totalSavings)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Investment Base</p>
              <p className="text-2xl font-bold text-gray-900">{toCurrency(memberData.totalInvestment)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CreditCard className="w-8 h-8 text-orange-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Loan Balance</p>
              <p className="text-2xl font-bold text-gray-900">{toCurrency(memberData.loanBalance)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Trophy className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profit Earned</p>
              <p className="text-2xl font-bold text-gray-900">{toCurrency(memberData.profitEarned)}</p>
            </div>
          </div>
        </div>
      </motion.div>



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Share Eligibility */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2 text-purple-500" />
            Share Eligibility
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <span className="text-sm font-medium text-purple-800">Minimum Shares Required</span>
              <span className="font-bold text-purple-900">{toCurrency(memberData.settings.minimum_shares || 20000)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm font-medium text-indigo-800">Maximum Shares Eligibility</span>
              <span className="font-bold text-indigo-900">{memberData.settings.maximum_shares_percent || 20}% of total</span>
            </div>
          </div>
        </div>

        {/* Loan Eligibility */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-green-500" />
            Loan Eligibility
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="text-xs text-green-600 font-semibold mb-1">Emergency Loan</div>
              <div className="text-lg font-bold text-green-800">{toCurrency(memberData.settings.emergency_loan_limit || 20000)}</div>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="text-xs text-blue-600 font-semibold mb-1">Cash Loan</div>
              <div className="text-lg font-bold text-blue-800">{toCurrency(memberData.settings.cash_loan_limit || 500000)}</div>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
              <div className="text-xs text-orange-600 font-semibold mb-1">Venture Loan</div>
              <div className="text-lg font-bold text-orange-800">{toCurrency(memberData.settings.venture_loan_limit || 1000000)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Savings Progress */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Savings Target Progress
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Current: {toCurrency(memberData.totalSavings)}</span>
              <span>Target: {toCurrency(memberData.targetSavings)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className="bg-blue-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ width: `${Math.min(savingsProgress, 100)}%` }}
              >
                {savingsProgress.toFixed(1)}%
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {toCurrency((memberData.targetSavings || 0) - (memberData.totalSavings || 0))} remaining to reach your target
            </p>
          </div>
        </div>

        {/* Loan Repayment Progress */}
        {memberData.activeLoan && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Loan Repayment Progress
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Paid: {toCurrency((memberData.activeLoan.amount || 0) - (memberData.activeLoan.balance || 0))}</span>
                <span>Total: {toCurrency(memberData.activeLoan.amount)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-green-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${loanProgress}%` }}
                >
                  {loanProgress.toFixed(1)}%
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Next Payment:</span>
                  <p className="font-medium">{toCurrency(memberData.activeLoan.monthlyPayment)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Due Date:</span>
                  <p className="font-medium">{memberData.activeLoan.nextPayment}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Contributions Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-green-500" />
            CONTRIBUTIONS
          </h3>
          <div className="space-y-3">
            {safeMap(memberData.recentContributions, (contribution: Contribution) => (
              <div key={contribution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {contribution.type === 'fixed_deposit' ? 'Fixed Deposit' : 
                       contribution.type === 'investment' ? 'Investment Fund' : 
                       contribution.type === 'savings' ? 'Monthly Savings' : contribution.type}
                    </p>
                    <p className="text-xs text-gray-500">{contribution.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{toCurrency(contribution.amount)}</p>
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

        {/* Profit Shares */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Profit Shares</h3>
          <div className="space-y-3">
            {safeMap(memberData.profitShares, (share: ProfitShare, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 text-purple-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{share.period}</p>
                    <p className="text-xs text-gray-500">Quarterly Distribution</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{toCurrency(share.amount)}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    {share.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loans Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-blue-500" />
              LOANS
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All Loans
            </button>
          </div>

          <div className="space-y-3">
            {memberData.activeLoan ? (
              <>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Loan application submitted:</span>
                  <span className="text-sm font-bold text-gray-900">{new Date(memberData.activeLoan.startDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="text-sm font-medium text-gray-700">Amount approved:</span>
                  <span className="text-sm font-bold text-green-600">{toCurrency(memberData.activeLoan.amount)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <span className="text-sm font-medium text-blue-900">Outstanding balance:</span>
                  <span className="text-lg font-bold text-red-600">{toCurrency(memberData.activeLoan.balance)}</span>
                </div>
              </>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-500">No active loans.</p>
              </div>
            )}
          </div>
        </div>

        {/* Layyah Applications */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Heart className="w-5 h-5 mr-2 text-green-500" />
              Layyah Applications
            </h3>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{memberData.layyahApplications}</div>
              <div className="text-sm text-gray-600">My Applications</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{memberData.activeLayyahGroups}</div>
              <div className="text-sm text-gray-600">Active Groups</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{memberData.pendingInvitations}</div>
              <div className="text-sm text-gray-600">Pending Invites</div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              type="button"
              onClick={() => navigate('/my-layyah')}
            >
              <Plus className="w-4 h-4" />
              <span>New Application</span>
            </button>
            <button
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              type="button"
              onClick={() => navigate('/browse-layyah')}
            >
              <Heart className="w-4 h-4" />
              <span>Browse Groups</span>
            </button>
          </div>

          <div className="mt-4">
            <a
              href={whatsappInviteUrl}
              onClick={handleWhatsappInviteClick}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              aria-label="Join the cooperative WhatsApp group"
              rel="noopener noreferrer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Join WhatsApp Group</span>
              <ExternalLink className="w-4 h-4 opacity-90" />
            </a>
            {whatsAppHealth && !whatsAppHealth.ok && (
              <div className="mt-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                WhatsApp invite link may be unavailable. Last checked: {new Date(whatsAppHealth.checked_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loan Repayment Overview */}
      {memberData.activeLoan && (
        <motion.div className="mt-6" variants={cardVariants}>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-primary-500" />
                Loan Repayment Overview
              </h3>
              <button
                onClick={() => window.location.href = '/my-loans'}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View Full Details →
              </button>
            </div>

            {/* Loan Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-700">Loan Amount</div>
                <div className="text-xl font-bold text-blue-900">{toCurrency(memberData.activeLoan.amount)}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-700">Amount Paid</div>
                <div className="text-xl font-bold text-green-900">{toCurrency((memberData.activeLoan.amount || 0) - (memberData.activeLoan.balance || 0))}</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-sm text-orange-700">Outstanding</div>
                <div className="text-xl font-bold text-orange-900">{toCurrency(memberData.activeLoan.balance)}</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-700">Monthly Payment</div>
                <div className="text-xl font-bold text-purple-900">{toCurrency(memberData.activeLoan.monthlyPayment)}</div>
              </div>
            </div>

            {/* Next Payment Alert */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3" />
                <div>
                  <div className="text-sm font-medium text-yellow-800">Next Payment Due</div>
                  <div className="text-sm text-yellow-700">
                    {toCurrency(memberData.activeLoan.monthlyPayment)} due on {memberData.activeLoan.nextPayment}
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    {memberData.activeLoan.paymentsLeft} payments remaining
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}


    </motion.div>
  );
};
