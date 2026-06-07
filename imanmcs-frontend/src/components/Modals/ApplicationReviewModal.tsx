import React, { useState } from 'react';
import { X, User, Building, Phone, DollarSign, Check, XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface ApplicationReviewModalProps {
  application: any;
  onClose: () => void;
}

export const ApplicationReviewModal: React.FC<ApplicationReviewModalProps> = ({
  application,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post(`/applications/${application.id}/approve`);

      const result = response.data;
      toast.success(`Application approved! Temporary password: ${result.password}`);
      onClose();
    } catch (error) {
      toast.error('Failed to approve application');
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
      await api.post(`/applications/${application.id}/reject`, { reason: rejectionReason });

      toast.success('Application rejected successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to reject application');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalContribution = application.savings + application.investment;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Review Application</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Application Status */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">!</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Pending Application Review
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Submitted on {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-500" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Full Name</label>
                <p className="text-sm text-gray-900 font-medium">{application.name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">PSN</label>
                <p className="text-sm text-gray-900 font-medium">{application.psn}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <p className="text-sm text-gray-900 font-medium">{application.email}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Phone</label>
                <p className="text-sm text-gray-900 font-medium">{application.phone}</p>
              </div>
            </div>
          </div>

          {/* Facility Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building className="w-5 h-5 mr-2 text-primary-500" />
              Facility Information
            </h3>
            
            <div className="bg-gray-50 p-3 rounded-md">
              <label className="block text-sm font-medium text-gray-600">Facility Name</label>
              <p className="text-sm text-gray-900 font-medium">{application.facility_name}</p>
            </div>
          </div>

          {/* Next of Kin */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-primary-500" />
              Next of Kin
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Name</label>
                <p className="text-sm text-gray-900 font-medium">{application.next_of_kin_name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Phone</label>
                <p className="text-sm text-gray-900 font-medium">{application.next_of_kin_phone}</p>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-500" />
              Initial Contributions
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Savings</label>
                <p className="text-sm text-gray-900 font-medium">₦{application.savings.toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-600">Investment</label>
                <p className="text-sm text-gray-900 font-medium">₦{application.investment.toLocaleString()}</p>
              </div>
              <div className="bg-primary-50 p-3 rounded-md border border-primary-200">
                <label className="block text-sm font-medium text-primary-600">Total</label>
                <p className="text-sm text-primary-900 font-semibold">₦{totalContribution.toLocaleString()}</p>
              </div>
            </div>

            {application.target_saving > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-600">Target Saving</label>
                  <p className="text-sm text-gray-900 font-medium">₦{application.target_saving.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-md">
                  <label className="block text-sm font-medium text-gray-600">Target Period</label>
                  <p className="text-sm text-gray-900 font-medium">{application.target_period} months</p>
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Contribution Breakdown</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <div className="flex justify-between">
                  <span>Total Contribution:</span>
                  <span>₦{totalContribution.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Entrance Fee:</span>
                  <span>₦1,500</span>
                </div>
                <div className="flex justify-between font-medium border-t border-blue-200 pt-1">
                  <span>Net Initial Contribution:</span>
                  <span>₦{(totalContribution - 1500).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rejection Form */}
          {showRejectionForm && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-red-600">Rejection Reason</h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                placeholder="Please provide a detailed reason for rejecting this application..."
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
            
            {application.status === 'pending' && (
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
                      {isProcessing ? 'Approving...' : 'Approve Application'}
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