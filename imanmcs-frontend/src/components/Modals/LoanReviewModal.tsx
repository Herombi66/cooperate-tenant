import React, { useState } from 'react';
import { X, DollarSign, Calendar, User, FileText, Check, XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface LoanReviewModalProps {
  loan: any;
  onClose: () => void;
}

export const LoanReviewModal: React.FC<LoanReviewModalProps> = ({ loan, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await api.post(`/loans/${loan.id}/approve`);

      toast.success('Loan approved successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to approve loan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setIsProcessing(true);
    try {
      await api.post(`/loans/${loan.id}/reject`, { reason: rejectionReason });

      toast.success('Loan rejected successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to reject loan');
    } finally {
      setIsProcessing(false);
    }
  };

  const monthlyRepayment = loan.amount / loan.tenure;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Review Loan Application</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Loan Status */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">!</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Loan Review
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Applied on {new Date(loan.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Member Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-500" />
              Member Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Member Name</label>
                <p className="text-sm text-gray-900 font-medium">{loan.member_name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">PSN</label>
                <p className="text-sm text-gray-900 font-medium">{loan.psn}</p>
              </div>
            </div>
          </div>

          {/* Loan Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-500" />
              Loan Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Loan Type</label>
                <p className="text-sm text-gray-900 font-medium capitalize">{loan.type}</p>
              </div>
              <div className="bg-primary-50 p-3 rounded-md border border-primary-200">
                <label className="block text-sm font-medium text-primary-600">Amount</label>
                <p className="text-lg text-primary-900 font-semibold">₦{loan.amount.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Tenure</label>
                <p className="text-sm text-gray-900 font-medium">{loan.tenure} months</p>
              </div>
            </div>

            <div className="bg-primary-50 p-4 rounded-md border border-primary-200">
              <h4 className="text-sm font-medium text-primary-900 mb-2">Repayment Schedule</h4>
              <div className="space-y-1 text-sm text-primary-800">
                <div className="flex justify-between">
                  <span>Monthly Repayment:</span>
                  <span>₦{monthlyRepayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Repayment:</span>
                  <span>₦{loan.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Interest Rate:</span>
                  <span>0% (Interest-free)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grantor Information */}
          {loan.grantor_psn && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-green-500" />
                Grantor Information
              </h3>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Grantor PSN</label>
                <p className="text-sm text-gray-900 font-medium">{loan.grantor_psn}</p>
              </div>
            </div>
          )}

          {/* Purpose */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-500" />
              Purpose
            </h3>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-900">{loan.purpose}</p>
            </div>
          </div>

          {/* Payslip */}
          {loan.payslip_url && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Supporting Documents</h3>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <a
                  href={loan.payslip_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                >
                  View Payslip →
                </a>
              </div>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectionForm && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-red-600">Rejection Reason</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a detailed reason for rejecting this loan application..."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            
            {loan.status === 'pending' && (
              <>
                {!showRejectionForm ? (
                  <>
                    <button
                      onClick={() => setShowRejectionForm(true)}
                      className="flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100"
                    >
                      <XIcon className="w-4 h-4 mr-2" />
                      Reject
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="flex items-center px-6 py-2 text-sm font-medium text-white bg-green-500 border border-transparent rounded-md hover:bg-green-600 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {isProcessing ? 'Approving...' : 'Approve Loan'}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowRejectionForm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={isProcessing || !rejectionReason.trim()}
                      className="flex items-center px-6 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600 disabled:opacity-50"
                    >
                      <XIcon className="w-4 h-4 mr-2" />
                      {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};