import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface GuaranteeRequest {
  id: number;
  loan_type: string;
  amount_requested: number;
  application_date: string;
  purpose: string;
  status?: string;
  user?: {
    membershipApplication?: {
      name?: string;
      psn?: string;
      email?: string;
    };
  };
  applicantName: string;
  applicantPsn: string;
  applicantEmail: string;
  guarantor_approved: boolean | null;
  guarantor_response_date: string | null;
  guarantor_response_notes: string | null;
}

export const MyGuarantees: React.FC = () => {
  const { user } = useAuth();
  const [guaranteeRequests, setGuaranteeRequests] = useState<GuaranteeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<GuaranteeRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    fetchGuaranteeRequests();
  }, []);

  const fetchGuaranteeRequests = async () => {
    try {
      const response = await api.get('/loans/guarantee/requests');
      const raw = response.data.guarantee_requests || response.data.requests || [];
      const transformed = raw.map((r: any) => {
        const applicantName = r.user?.membershipApplication?.name || r.memberName || 'Unknown';
        const applicantPsn = r.user?.membershipApplication?.psn || r.memberPsn || 'Unknown';
        const applicantEmail = r.user?.membershipApplication?.email || r.memberEmail || 'Unknown';
        return {
          ...r,
          applicantName,
          applicantPsn,
          applicantEmail,
        } as GuaranteeRequest;
      });
      setGuaranteeRequests(transformed);
    } catch (error) {
      console.error('Error fetching guarantee requests:', error);
      toast.error('Failed to load guarantee requests');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (approved: boolean) => {
    if (!selectedRequest) return;

    setIsResponding(true);
    try {
      await api.put(`/loans/${selectedRequest.id}/guarantee`, {
        status: approved ? 'approved' : 'rejected',
        notes: responseNotes.trim() || null
      });

      toast.success(`Guarantee ${approved ? 'approved' : 'rejected'} successfully`);

      // Refresh the list
      await fetchGuaranteeRequests();

      // Close modal
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseNotes('');

    } catch (error: any) {
      console.error('Error responding to guarantee request:', error);
      toast.error(error.response?.data?.message || 'Failed to respond to guarantee request');
    } finally {
      setIsResponding(false);
    }
  };

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return <Clock className="w-5 h-5 text-yellow-500" />;
    if (status === true) return <CheckCircle className="w-5 h-5 text-green-500" />;
    return <XCircle className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = (status: boolean | null) => {
    if (status === null) return 'text-yellow-800 bg-yellow-100';
    if (status === true) return 'text-green-800 bg-green-100';
    return 'text-red-800 bg-red-100';
  };

  const getStatusText = (status: boolean | null) => {
    if (status === null) return 'Pending Response';
    if (status === true) return 'Approved';
    return 'Rejected';
  };

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
        <h1 className="text-2xl font-bold text-gray-900">My Guarantee Requests</h1>
      </div>

      {guaranteeRequests.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Guarantee Requests</h3>
          <p className="text-gray-500">You don't have any pending guarantee requests.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {guaranteeRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    {getStatusIcon(request.guarantor_approved)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.loan_type.charAt(0).toUpperCase() + request.loan_type.slice(1)} Loan Guarantee
                      </h3>
                      <p className="text-sm text-gray-500">
                        Requested on {new Date(request.application_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Applicant</p>
                      <p className="text-sm text-gray-900">{request.applicantName}</p>
                      <p className="text-xs text-gray-500">PSN: {request.applicantPsn}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Guarantor</p>
                      <p className="text-sm text-gray-900">{user?.name || 'N/A'}</p>
                      <p className="text-xs text-gray-500">PSN: {user?.psn || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Amount Requested</p>
                      <p className="text-lg font-semibold text-gray-900">
                        ₦{request.amount_requested.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.guarantor_approved)}`}>
                        {getStatusText(request.guarantor_approved)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500">Purpose</p>
                        <p className="text-sm text-gray-900">{request.purpose}</p>
                      </div>
                      {request.guarantor_approved === null && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowResponseModal(true);
                            }}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Review
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Review Guarantee Request</h3>
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setSelectedRequest(null);
                  setResponseNotes('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Applicant</p>
                  <p className="text-sm text-gray-900">{selectedRequest.applicantName}</p>
                  <p className="text-xs text-gray-500">PSN: {selectedRequest.applicantPsn}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Guarantor</p>
                  <p className="text-sm text-gray-900">{user?.name || 'N/A'}</p>
                  <p className="text-xs text-gray-500">PSN: {user?.psn || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Loan Type</p>
                  <p className="text-sm text-gray-900 capitalize">{selectedRequest.loan_type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Amount Requested</p>
                  <p className="text-sm text-gray-900">₦{selectedRequest.amount_requested.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Application Date</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedRequest.application_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRequest.guarantor_approved)}`}>
                    {getStatusText(selectedRequest.guarantor_approved)}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">Purpose</p>
                <p className="text-sm text-gray-900">{selectedRequest.purpose}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Notes (Optional)
                </label>
                <textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add any notes about your decision..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => handleResponse(false)}
                  disabled={isResponding}
                  className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Guarantee
                </button>
                <button
                  onClick={() => handleResponse(true)}
                  disabled={isResponding}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Guarantee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
