import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Eye, CheckCircle, XCircle, Clock,
  User, DollarSign, Calendar, FileText, Download, CreditCard, Shield
} from 'lucide-react';

interface LoanApproval {
  id: string;
  memberPsn: string;
  memberName: string;
  loanType: 'cash' | 'investment';
  amount: number;
  tenure: number;
  grantorPsn: string;
  grantorName: string;
  purpose: string;
  applicationDate: string;
  status: 'pending_chairman' | 'approved_chairman' | 'rejected_chairman' | 'disbursed';
  monthlyIncome: string;
  currentInvestment?: number;
  payslipUrl: string;
  riskAssessment: 'low' | 'medium' | 'high';
  recommendedBy: string;
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

const buttonVariants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.98 }
};

export const LoanApprovalsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanApproval | null>(null);

  const [loanApprovals] = useState<LoanApproval[]>([
    {
      id: 'LOAN001',
      memberPsn: 'MEMBER001',
      memberName: 'Dr. Amina Hassan',
      loanType: 'cash',
      amount: 80000,
      tenure: 6,
      grantorPsn: 'MEMBER002',
      grantorName: 'Dr. Ibrahim Musa',
      purpose: 'Medical equipment purchase for private practice',
      applicationDate: '2024-12-28',
      status: 'pending_chairman',
      monthlyIncome: '₦350,000',
      payslipUrl: '/uploads/payslip_001.pdf',
      riskAssessment: 'low',
      recommendedBy: 'TREASURER001'
    },
    {
      id: 'LOAN002',
      memberPsn: 'MEMBER003',
      memberName: 'Nurse Fatima Umar',
      loanType: 'investment',
      amount: 150000,
      tenure: 18,
      grantorPsn: 'MEMBER001',
      grantorName: 'Dr. Amina Hassan',
      purpose: 'Pharmacy business expansion',
      applicationDate: '2024-12-25',
      status: 'pending_chairman',
      monthlyIncome: '₦180,000',
      currentInvestment: 85000,
      payslipUrl: '/uploads/payslip_002.pdf',
      riskAssessment: 'medium',
      recommendedBy: 'TREASURER001'
    },
    {
      id: 'LOAN003',
      memberPsn: 'MEMBER004',
      memberName: 'Pharmacist Zainab Ibrahim',
      loanType: 'cash',
      amount: 50000,
      tenure: 4,
      grantorPsn: 'MEMBER002',
      grantorName: 'Dr. Ibrahim Musa',
      purpose: 'Emergency family medical expenses',
      applicationDate: '2024-12-20',
      status: 'approved_chairman',
      monthlyIncome: '₦120,000',
      payslipUrl: '/uploads/payslip_003.pdf',
      riskAssessment: 'low',
      recommendedBy: 'TREASURER001'
    },
    {
      id: 'LOAN004',
      memberPsn: 'MEMBER005',
      memberName: 'Lab Technician Ahmad Sani',
      loanType: 'cash',
      amount: 120000,
      tenure: 8,
      grantorPsn: 'MEMBER001',
      grantorName: 'Dr. Amina Hassan',
      purpose: 'Laboratory equipment for diagnostic center',
      applicationDate: '2024-12-18',
      status: 'rejected_chairman',
      monthlyIncome: '₦95,000',
      payslipUrl: '/uploads/payslip_004.pdf',
      riskAssessment: 'high',
      recommendedBy: 'TREASURER001'
    },
    {
      id: 'LOAN005',
      memberPsn: 'MEMBER006',
      memberName: 'Dr. Maryam Aliyu',
      loanType: 'investment',
      amount: 200000,
      tenure: 24,
      grantorPsn: 'MEMBER002',
      grantorName: 'Dr. Ibrahim Musa',
      purpose: 'Medical clinic establishment',
      applicationDate: '2024-12-15',
      status: 'disbursed',
      monthlyIncome: '₦400,000',
      currentInvestment: 120000,
      payslipUrl: '/uploads/payslip_005.pdf',
      riskAssessment: 'low',
      recommendedBy: 'TREASURER001'
    }
  ]);

  const filteredLoans = loanApprovals.filter(loan => {
    const matchesSearch = 
      loan.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.memberPsn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    const matchesType = typeFilter === 'all' || loan.loanType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved_chairman': return 'bg-green-100 text-green-800';
      case 'rejected_chairman': return 'bg-red-100 text-red-800';
      case 'pending_chairman': return 'bg-yellow-100 text-yellow-800';
      case 'disbursed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved_chairman': return <CheckCircle className="w-4 h-4" />;
      case 'rejected_chairman': return <XCircle className="w-4 h-4" />;
      case 'pending_chairman': return <Clock className="w-4 h-4" />;
      case 'disbursed': return <DollarSign className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = (loan: LoanApproval) => {
    if (confirm(`Approve loan application for ${loan.memberName}?\n\nAmount: ₦${loan.amount.toLocaleString()}\nTenure: ${loan.tenure} months\n\nThis will authorize the treasurer to disburse the loan.`)) {
      alert(`✅ Loan approved! ${loan.memberName}'s loan has been authorized for disbursement by the treasurer.`);
    }
  };

  const handleReject = (loan: LoanApproval) => {
    const reason = prompt(`Reject loan application for ${loan.memberName}?\n\nAmount: ₦${loan.amount.toLocaleString()}\n\nPlease provide a reason for rejection:`);
    if (reason) {
      alert(`❌ Loan rejected. Reason: ${reason}\n\n${loan.memberName} will be notified of the decision.`);
    }
  };

  const totalApplications = loanApprovals.length;
  const pendingApprovals = loanApprovals.filter(loan => loan.status === 'pending_chairman').length;
  const approvedLoans = loanApprovals.filter(loan => loan.status === 'approved_chairman').length;
  const totalApprovedAmount = loanApprovals.filter(loan => loan.status === 'approved_chairman' || loan.status === 'disbursed').reduce((sum, loan) => sum + loan.amount, 0);

  return (
    <motion.div
      className="p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="mb-6" variants={cardVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Loan Approvals</h1>
        <p className="text-gray-600">Review and approve loan applications as Chairman</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" variants={cardVariants}>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900">{pendingApprovals}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{approvedLoans}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Approved</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalApprovedAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name, PSN, or loan ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-80"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending_chairman">Pending Approval</option>
                <option value="approved_chairman">Approved</option>
                <option value="rejected_chairman">Rejected</option>
                <option value="disbursed">Disbursed</option>
              </select>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="cash">Cash Loan</option>
              <option value="investment">Investment Loan</option>
            </select>
          </div>
          
          <button 
            onClick={() => {
              // Export loan approvals data
              const csvContent = [
                ['Loan ID', 'Member Name', 'PSN', 'Type', 'Amount', 'Tenure', 'Risk', 'Status', 'Application Date'].join(','),
                ...filteredLoans.map(loan => [
                  loan.id,
                  `"${loan.memberName}"`,
                  loan.memberPsn,
                  loan.loanType,
                  loan.amount,
                  loan.tenure,
                  loan.riskAssessment,
                  loan.status,
                  loan.applicationDate
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `loan_approvals_${new Date().toISOString().split('T')[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Approvals
          </button>
        </div>
      </div>

      {/* Loan Approvals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Assessment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
                <tr key={loan.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{loan.memberName}</div>
                        <div className="text-sm text-gray-500">{loan.memberPsn}</div>
                        <div className="text-sm text-gray-500">{loan.monthlyIncome}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        <CreditCard className="w-4 h-4 inline mr-1" />
                        {loan.loanType === 'cash' ? 'Cash Loan' : 'Investment Loan'}
                      </div>
                      <div className="text-sm text-gray-900">₦{loan.amount.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">{loan.tenure} months tenure</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskColor(loan.riskAssessment)}`}>
                      <Shield className="w-3 h-3 mr-1" />
                      {loan.riskAssessment.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {loan.applicationDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                      {getStatusIcon(loan.status)}
                      <span className="ml-1 capitalize">{loan.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => {
                          setSelectedLoan(loan);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {loan.status === 'pending_chairman' && (
                        <>
                          <button 
                            onClick={() => handleApprove(loan)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleReject(loan)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Loan Details Modal */}
      {showViewModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Approval Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedLoan(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Application Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan ID</label>
                    <p className="text-sm text-gray-900">{selectedLoan.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Application Date</label>
                    <p className="text-sm text-gray-900">{selectedLoan.applicationDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedLoan.status)}`}>
                      {getStatusIcon(selectedLoan.status)}
                      <span className="ml-1 capitalize">{selectedLoan.status.replace('_', ' ')}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Member Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900">{selectedLoan.memberName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PSN</label>
                    <p className="text-sm text-gray-900">{selectedLoan.memberPsn}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Income</label>
                    <p className="text-sm text-gray-900">{selectedLoan.monthlyIncome}</p>
                  </div>
                  {selectedLoan.currentInvestment && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Investment</label>
                      <p className="text-sm text-gray-900">₦{selectedLoan.currentInvestment.toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Loan Details */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Loan Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Loan Type</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedLoan.loanType} Loan</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="text-lg font-semibold text-green-600">₦{selectedLoan.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Tenure</label>
                    <p className="text-sm text-gray-900">{selectedLoan.tenure} months</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Monthly Payment</label>
                    <p className="text-sm text-gray-900">₦{(selectedLoan.amount / selectedLoan.tenure).toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Purpose</label>
                  <p className="text-sm text-gray-900 bg-white p-3 rounded border">{selectedLoan.purpose}</p>
                </div>
              </div>

              {/* Risk Assessment */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Risk Assessment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Risk Level</label>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(selectedLoan.riskAssessment)}`}>
                      <Shield className="w-4 h-4 mr-1" />
                      {selectedLoan.riskAssessment.toUpperCase()} RISK
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recommended By</label>
                    <p className="text-sm text-gray-900">{selectedLoan.recommendedBy}</p>
                  </div>
                </div>
              </div>

              {/* Grantor Information */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Grantor Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grantor Name</label>
                    <p className="text-sm text-gray-900">{selectedLoan.grantorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grantor PSN</label>
                    <p className="text-sm text-gray-900">{selectedLoan.grantorPsn}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Documents</h4>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-sm text-blue-700">Payslip: {selectedLoan.payslipUrl}</span>
                    <button className="ml-auto text-blue-600 hover:text-blue-800 text-sm">View</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
              <div className="flex space-x-3">
                {selectedLoan.status === 'pending_chairman' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedLoan);
                        setShowViewModal(false);
                        setSelectedLoan(null);
                      }}
                      className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Loan
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedLoan);
                        setShowViewModal(false);
                        setSelectedLoan(null);
                      }}
                      className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Loan
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedLoan(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
