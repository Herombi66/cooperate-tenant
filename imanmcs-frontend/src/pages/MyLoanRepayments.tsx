import React, { useState, useEffect } from 'react';
import {
  Calendar, DollarSign, CheckCircle, AlertCircle,
  Clock, FileText, CreditCard, Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

interface LoanRepayment {
  id: string;
  loanId: string;
  loanType: string;
  loanAmount: number;
  repaymentAmount: number;
  repaymentDate: string;
  paymentMethod: string;
  status: 'pending' | 'verified' | 'rejected';
  recordedBy: string;
  notes?: string;
  createdAt: string;
}

export const MyLoanRepayments: React.FC = () => {
  const { user } = useAuth();
  const [repayments, setRepayments] = useState<LoanRepayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRepayment, setSelectedRepayment] = useState<LoanRepayment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchMyRepayments();
  }, []);

  const fetchMyRepayments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/loan-repayments/user/my-repayments');
      if (response.data.success) {
        setRepayments(response.data.repayments);
      }
    } catch (error) {
      console.error('Error fetching repayments:', error);
      toast.error('Failed to load your loan repayments');
    } finally {
      setLoading(false);
    }
  };

  const viewRepaymentDetails = (repayment: LoanRepayment) => {
    setSelectedRepayment(repayment);
    setShowDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const totalRepayments = repayments.reduce((sum, rep) => sum + rep.repaymentAmount, 0);
  const verifiedRepayments = repayments.filter(rep => rep.status === 'verified').reduce((sum, rep) => sum + rep.repaymentAmount, 0);
  const pendingRepayments = repayments.filter(rep => rep.status === 'pending').reduce((sum, rep) => sum + rep.repaymentAmount, 0);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Loan Repayments</h1>
        <p className="text-gray-600">View all your loan repayment records and history</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-primary-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Repaid</p>
              <p className="text-2xl font-bold text-gray-900">₦{totalRepayments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-gray-900">₦{verifiedRepayments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">₦{pendingRepayments.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{repayments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Repayments Table */}
      {repayments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Repayment Records</h3>
          <p className="text-gray-600">You haven't made any loan repayments yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Repayment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {repayments.map((repayment) => (
                  <tr key={repayment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">Loan #{repayment.loanId}</div>
                        <div className="text-sm text-gray-500 capitalize">{repayment.loanType} - ₦{repayment.loanAmount.toLocaleString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">₦{repayment.repaymentAmount.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">{new Date(repayment.repaymentDate).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{repayment.paymentMethod.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(repayment.status)}`}>
                        {getStatusIcon(repayment.status)}
                        <span className="ml-1 capitalize">{repayment.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => viewRepaymentDetails(repayment)}
                        className="text-primary-600 hover:text-primary-900 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Repayment Details Modal */}
      {showDetailsModal && selectedRepayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Repayment Details</h3>
              <p className="text-sm text-gray-600">Repayment ID: {selectedRepayment.id}</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Loan Information */}
                <div className="bg-primary-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-primary-900 mb-3 flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Loan Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan ID:</span>
                      <span className="font-medium">{selectedRepayment.loanId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan Type:</span>
                      <span className="font-medium capitalize">{selectedRepayment.loanType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Loan Amount:</span>
                      <span className="font-medium">₦{selectedRepayment.loanAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Repayment Information */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Repayment Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-green-600">₦{selectedRepayment.repaymentAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{new Date(selectedRepayment.repaymentDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium capitalize">{selectedRepayment.paymentMethod.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRepayment.status)}`}>
                        {getStatusIcon(selectedRepayment.status)}
                        <span className="ml-1 capitalize">{selectedRepayment.status}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recorded By:</span>
                    <span className="font-medium">{selectedRepayment.recordedBy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Recorded Date:</span>
                    <span className="font-medium">{new Date(selectedRepayment.createdAt).toLocaleDateString()}</span>
                  </div>
                  {selectedRepayment.notes && (
                    <div>
                      <span className="text-gray-600 block mb-1">Notes:</span>
                      <p className="text-gray-900 bg-white p-2 rounded border">{selectedRepayment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
