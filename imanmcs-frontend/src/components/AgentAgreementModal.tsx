import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, AlertTriangle, FileText } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface AgentAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: number;
  onSuccess: () => void;
}

const AgentAgreementModal: React.FC<AgentAgreementModalProps> = ({ isOpen, onClose, loanId, onSuccess }) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [fetchingContent, setFetchingContent] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await api.get('/settings/category/loans');
        if (response.data.success && response.data.data.agent_agreement_template) {
          setContent(response.data.data.agent_agreement_template);
        } else {
             // Fallback content if not found
             setContent(`
              <h3 class="text-gray-900">1. Appointment of Agent (Wakala)</h3>
              <p>By accepting this agreement, you (the "Principal") hereby appoint IMAN Cooperative Society (the "Agent") to act on your behalf...</p>
              <p><em>(Default content used - please update in Settings)</em></p>
             `);
        }
      } catch (error) {
        console.error('Failed to fetch agreement content', error);
        setContent('<p>Error loading agreement content. Please contact support.</p>');
      } finally {
        setFetchingContent(false);
      }
    };
    
    if (isOpen) {
        fetchContent();
    }
  }, [isOpen]);

  const handleSubmit = async (accepted: boolean) => {
    if (!accepted) {
        if (!window.confirm('Are you sure you want to reject this agreement? This will flag your application for admin review.')) {
            return;
        }
    }

    setLoading(true);
    try {
      await api.post(`/loans/${loanId}/agreement`, {
        type: 'agent_agreement',
        status: accepted ? 'accepted' : 'rejected'
      });
      
      if (accepted) {
        toast.success('Agent Agreement Accepted');
        onSuccess();
      } else {
        toast.error('Agent Agreement Rejected. Admin notified.');
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error('Agreement error:', error);
      toast.error('Failed to submit agreement');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-primary-50">
            <div>
                <h2 className="text-xl font-bold text-primary-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Investment Loan Agent Agreement
                </h2>
                <p className="text-sm text-primary-600 mt-1">Please review the terms below carefully.</p>
            </div>
          </div>

          <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
            <div className="prose prose-sm max-w-none text-gray-600">
              {fetchingContent ? (
                  <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
              ) : (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: content }} />
                    
                    <div className="my-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-800">
                            <strong>Note:</strong> This is a binding legal agreement. Please read carefully before accepting.
                        </p>
                    </div>
                  </>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-white">
            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
              <div className="relative flex items-center pt-1">
                <input
                  type="checkbox"
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900 select-none">
                I have read and agree to the Agent Agreement terms and conditions. I understand that rejecting this agreement may delay or cancel my loan application.
              </span>
            </label>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors border border-transparent hover:border-red-100"
              >
                Reject Agreement
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={!agreed || loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
              >
                {loading ? (
                    <>Processing...</>
                ) : (
                    <>
                        <Check className="w-4 h-4" />
                        Accept & Proceed
                    </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AgentAgreementModal;
