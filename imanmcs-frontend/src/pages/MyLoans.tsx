import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, CheckCircle, XCircle, Clock, AlertCircle, DollarSign, Calendar, FileText, FileCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import AgentAgreementModal from '../components/AgentAgreementModal';
import MurabahaContractModal from '../components/MurabahaContractModal';

interface Loan {
  id: number;
  loan_type: string;
  amount_requested: number;
  amount_approved: number | null;
  status: string;
  application_date: string;
  approval_date: string | null;
  guarantor_name: string;
  guarantor_status: string;
  purpose: string;
  agreements?: {
    id: number;
    type: string;
    status: string;
    version: string;
    created_at: string;
    action_timestamp?: string;
  }[];
}

interface LoanRepayment {
  id: number;
  loanId: number;
  loanType: string;
  loanAmount: number;
  repaymentAmount: number;
  repaymentDate: string;
  paymentMethod: string;
  status: string;
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export const MyLoans: React.FC = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [activeTab, setActiveTab] = useState<'loans' | 'repayments'>('loans');
  const [repaymentFilter, setRepaymentFilter] = useState<'all' | 'verified' | 'pending' | 'rejected'>('all');
  const [repaymentSearch, setRepaymentSearch] = useState('');
  const [agentAgreementLoanId, setAgentAgreementLoanId] = useState<number | null>(null);
  const [murabahaContractLoanId, setMurabahaContractLoanId] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'loans') {
      fetchMyLoans();
    } else {
      fetchMyRepayments();
    }
  }, [activeTab]);

  useEffect(() => {
    // Auto-show Agent Agreement if pending
    if (loans.length > 0) {
        const pendingAgentAgreement = loans.find(l => 
            l.loan_type === 'investment' && 
            l.status === 'pending' && 
            (!l.agreements?.some(a => a.type === 'agent_agreement' && a.status === 'accepted')) &&
            (!l.agreements?.some(a => a.type === 'agent_agreement' && a.status === 'rejected'))
        );
        if (pendingAgentAgreement) {
            setAgentAgreementLoanId(pendingAgentAgreement.id);
        }

        const pendingMurabaha = loans.find(l => 
            l.loan_type === 'investment' && 
            l.status === 'disbursed' && 
            (!l.agreements?.some(a => a.type === 'murabaha_contract' && a.status === 'accepted'))
        );
        if (pendingMurabaha) {
            setMurabahaContractLoanId(pendingMurabaha.id);
        }
    }
  }, [loans]);

  const fetchMyLoans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/loans', {
        params: { user_id: user?.id }
      });
      setLoans(response.data.loans || []);
    } catch (error) {
      console.error('Error fetching loans:', error);
      toast.error('Failed to load loan applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRepayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/loan-repayments/user/my-repayments');
      setRepayments(response.data.repayments || []);
    } catch (error) {
      console.error('Error fetching repayments:', error);
      toast.error('Failed to load repayment history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-800 bg-green-100';
      case 'rejected':
      case 'awaiting_admin_review':
        return 'text-red-800 bg-red-100';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      case 'disbursed':
        return 'text-primary-800 bg-primary-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const isAgentAgreementPending = (loan: Loan) => {
    return loan.loan_type === 'investment' && 
           loan.status === 'pending' && 
           !loan.agreements?.some(a => a.type === 'agent_agreement' && a.status === 'accepted') &&
           !loan.agreements?.some(a => a.type === 'agent_agreement' && a.status === 'rejected');
  };

  const isMurabahaContractPending = (loan: Loan) => {
    return loan.loan_type === 'investment' && 
           loan.status === 'disbursed' && 
           !loan.agreements?.some(a => a.type === 'murabaha_contract' && a.status === 'accepted');
  };

  const getGuarantorStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Filter repayments based on search and status filter
  const filteredRepayments = repayments.filter(repayment => {
    const matchesSearch = repaymentSearch === '' ||
      repayment.loanId.toString().includes(repaymentSearch) ||
      repayment.repaymentAmount.toString().includes(repaymentSearch) ||
      repayment.loanType.toLowerCase().includes(repaymentSearch.toLowerCase());

    const matchesFilter = repaymentFilter === 'all' || repayment.status === repaymentFilter;

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Loans & Repayments</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('loans')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'loans'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Loan Applications
          </button>
          <button
            onClick={() => setActiveTab('repayments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'repayments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Repayment History
          </button>
        </nav>
      </div>

      {/* Loans Tab */}
      {activeTab === 'loans' && (
        <>
          {loans.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Loan Applications</h3>
              <p className="text-gray-500 mb-6">You haven't applied for any loans yet.</p>
              <a
                href="/apply-loan"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Apply for a Loan
              </a>
            </div>
          ) : (
            <div className="grid gap-6">
              {loans.map((loan) => (
                <div key={loan.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-4">
                        {getStatusIcon(loan.status)}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {loan.loan_type.charAt(0).toUpperCase() + loan.loan_type.slice(1)} Loan
                          </h3>
                          <p className="text-sm text-gray-500">
                            Applied on {new Date(loan.application_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Requested Amount</p>
                          <p className="text-lg font-semibold text-gray-900">
                            ₦{loan.amount_requested.toLocaleString()}
                          </p>
                        </div>
                        {loan.amount_approved && (
                          <div>
                            <p className="text-sm font-medium text-gray-500">Approved Amount</p>
                            <p className="text-lg font-semibold text-green-600">
                              ₦{loan.amount_approved.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-500">Status</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Guarantor</p>
                            <p className="text-sm text-gray-900">{loan.guarantor_name}</p>
                            <p className={`text-sm font-medium ${getGuarantorStatusColor(loan.guarantor_status)}`}>
                              Guarantor Status: {loan.guarantor_status.charAt(0).toUpperCase() + loan.guarantor_status.slice(1)}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedLoan(loan)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Repayments Tab */}
      {activeTab === 'repayments' && (
        <>
          {repayments.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Repayment History</h3>
              <p className="text-gray-500">You haven't made any loan repayments yet.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">My Repayment History</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Track all your loan repayment transactions
                </p>
              </div>

              {/* Filters and Search */}
              <div className="px-4 py-4 sm:px-6 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by loan ID, amount..."
                        value={repaymentSearch}
                        onChange={(e) => setRepaymentSearch(e.target.value)}
                        className="pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm w-full sm:w-64"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={repaymentFilter}
                        onChange={(e) => setRepaymentFilter(e.target.value as 'all' | 'verified' | 'pending' | 'rejected')}
                        className="pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="verified">Verified</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const csvContent = [
                        ['Date', 'Loan ID', 'Loan Type', 'Amount', 'Payment Method', 'Status', 'Recorded By', 'Notes'].join(','),
                        ...filteredRepayments.map(rep => [
                          rep.repaymentDate,
                          rep.loanId,
                          `"${rep.loanType}"`,
                          rep.repaymentAmount,
                          `"${rep.paymentMethod.replace('_', ' ')}"`,
                          rep.status,
                          `"${rep.recordedBy}"`,
                          `"${rep.notes || ''}"`
                        ].join(','))
                      ].join('\n');

                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `my_repayments_${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                      toast.success('Repayment history exported successfully!');
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Export CSV
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-gray-200">
                {filteredRepayments.map((repayment) => (
                  <li key={repayment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <DollarSign className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">
                              ₦{repayment.repaymentAmount.toLocaleString()}
                            </p>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              repayment.status === 'verified'
                                ? 'text-green-800 bg-green-100'
                                : repayment.status === 'pending'
                                ? 'text-yellow-800 bg-yellow-100'
                                : 'text-red-800 bg-red-100'
                            }`}>
                              {repayment.status.charAt(0).toUpperCase() + repayment.status.slice(1)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {new Date(repayment.repaymentDate).toLocaleDateString()}
                            </div>
                            <span>•</span>
                            <span>{repayment.loanType} Loan (ID: {repayment.loanId})</span>
                            <span>•</span>
                            <span className="capitalize">{repayment.paymentMethod.replace('_', ' ')}</span>
                          </div>
                          {repayment.notes && (
                            <p className="text-sm text-gray-600 mt-1">{repayment.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Recorded by</p>
                        <p className="text-sm font-medium text-gray-900">{repayment.recordedBy}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Summary */}
              <div className="bg-gray-50 px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <span className="font-medium">{repayments.length}</span> total repayments
                  </div>
                  <div className="text-sm text-gray-700">
                    Total repaid: <span className="font-medium text-green-600">
                      ₦{repayments.reduce((sum, rep) => sum + rep.repaymentAmount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loan Details Modal */}
      {selectedLoan && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Loan Application Details</h3>
              <button
                onClick={() => setSelectedLoan(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Loan Type</p>
                  <p className="text-sm text-gray-900 capitalize">{selectedLoan.loan_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Application Date</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedLoan.application_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Requested Amount</p>
                  <p className="text-sm text-gray-900">₦{selectedLoan.amount_requested.toLocaleString()}</p>
                </div>
                {selectedLoan.amount_approved && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Approved Amount</p>
                    <p className="text-sm text-green-600">₦{selectedLoan.amount_approved.toLocaleString()}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedLoan.status)}`}>
                    {selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1)}
                  </span>
                </div>
                {selectedLoan.approval_date && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Approval Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedLoan.approval_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Purpose</p>
                <p className="text-sm text-gray-900">{selectedLoan.purpose}</p>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Guarantor Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Name</p>
                    <p className="text-sm text-gray-900">{selectedLoan.guarantor_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`text-sm font-medium ${getGuarantorStatusColor(selectedLoan.guarantor_status)}`}>
                      {selectedLoan.guarantor_status.charAt(0).toUpperCase() + selectedLoan.guarantor_status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Agreement History</h4>
                  {selectedLoan.agreements && selectedLoan.agreements.length > 0 ? (
                      <div className="space-y-2">
                          {selectedLoan.agreements.map((agreement) => (
                              <div key={agreement.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                  <div>
                                      <span className="font-medium text-gray-700">
                                          {agreement.type === 'agent_agreement' ? 'Agent Agreement' : 'Murabaha Contract'}
                                      </span>
                                      <span className="text-gray-500 text-xs ml-2">v{agreement.version}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-xs capitalize ${
                                          agreement.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                          agreement.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                          'bg-yellow-100 text-yellow-800'
                                      }`}>
                                          {agreement.status}
                                      </span>
                                      <span className="text-gray-400 text-xs">
                                          {new Date(agreement.created_at).toLocaleDateString()}
                                      </span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <p className="text-sm text-gray-500 italic">No agreements recorded.</p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Modals */}
      <AgentAgreementModal 
        isOpen={!!agentAgreementLoanId} 
        onClose={() => {
            setAgentAgreementLoanId(null);
            // Optionally refresh loans to ensure state consistency
            fetchMyLoans();
        }}
        loanId={agentAgreementLoanId || 0}
        onSuccess={() => {
            setAgentAgreementLoanId(null);
            fetchMyLoans();
            toast.success("Agent Agreement Accepted. Your application is now under review.");
        }}
      />
      
      <MurabahaContractModal
        isOpen={!!murabahaContractLoanId}
        onClose={() => setMurabahaContractLoanId(null)}
        loanId={murabahaContractLoanId || 0}
        onSuccess={() => {
            setMurabahaContractLoanId(null);
            fetchMyLoans();
            toast.success("Loan activated successfully!");
        }}
      />
    </div>
  );
};
