import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, FileCheck } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface MurabahaContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  loanId: number;
  onSuccess: () => void;
}

const MurabahaContractModal: React.FC<MurabahaContractModalProps> = ({ isOpen, onClose, loanId, onSuccess }) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [fetchingContent, setFetchingContent] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await api.get('/settings/category/loans');
        if (response.data.success && response.data.data.murabaha_contract_template) {
          setContent(response.data.data.murabaha_contract_template);
        } else {
             // Fallback content if not found
             setContent(`
              <h3 class="text-gray-900">1. Offer and Acceptance</h3>
              <p>IMAN Cooperative Society (the "Seller") hereby sells the goods specified in the schedule to you (the "Buyer")...</p>
              <p><em>(Default content used - please update in Settings)</em></p>
             `);
        }
      } catch (error) {
        console.error('Failed to fetch contract content', error);
        setContent('<p>Error loading contract content. Please contact support.</p>');
      } finally {
        setFetchingContent(false);
      }
    };
    
    if (isOpen) {
        fetchContent();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/loans/${loanId}/agreement`, {
        type: 'murabaha_contract',
        status: 'accepted'
      });
      
      toast.success('Murabaha Contract Accepted');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Contract error:', error);
      toast.error('Failed to accept contract');
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
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-green-50">
            <div>
                <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
                    <FileCheck className="w-5 h-5" />
                    Murabaha Sales Contract
                </h2>
                <p className="text-sm text-green-700 mt-1">Final step to activate your loan.</p>
            </div>
          </div>

          <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
            <div className="prose prose-sm max-w-none text-gray-600">
              {fetchingContent ? (
                  <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
              ) : (
                  <>
                    <div dangerouslySetInnerHTML={{ __html: content }} />

                    <div className="my-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-800">
                            <strong>Declaration:</strong> I acknowledge that I have inspected the goods (or waived inspection) and accept them in their current condition.
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
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
              </div>
              <span className="text-sm text-gray-600 group-hover:text-gray-900 select-none">
                I accept the Murabaha Contract and agree to the repayment schedule.
              </span>
            </label>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  toast.success('Downloading contract...');
                  const element = document.createElement("a");
                  const file = new Blob([content], {type: 'text/html'});
                  element.href = URL.createObjectURL(file);
                  element.download = `Murabaha_Contract_${loanId}.html`;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                className="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <FileCheck className="w-4 h-4" />
                View/Download
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                Review Later
              </button>
              <button
                onClick={handleSubmit}
                disabled={!agreed || loading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-sm"
              >
                {loading ? 'Processing...' : 'Sign Contract'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MurabahaContractModal;
