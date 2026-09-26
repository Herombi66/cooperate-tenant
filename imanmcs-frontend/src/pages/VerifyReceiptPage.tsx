import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, CheckCircle, Clock,
  DollarSign, FileText, ArrowLeft, Printer, Lock, Info, Building2
} from 'lucide-react';
import receiptTemplateService, { VerificationResult } from '../services/receiptTemplateService';

export const VerifyReceiptPage: React.FC = () => {
  const { receiptNumber } = useParams<{ receiptNumber: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (receiptNumber) {
      verify(receiptNumber);
    } else {
      setLoading(false);
      setError('No receipt number provided');
    }
  }, [receiptNumber]);

  const verify = async (num: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await receiptTemplateService.verifyReceipt(num);
      setResult(data);
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err?.response?.data?.message || 'Receipt verification failed. Please verify the code and try again.');
      setResult({
        success: false,
        verified: false,
        message: err?.response?.data?.message || 'Invalid or unverified receipt code'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2 mb-2">
            <img src="/logo.png" alt="IMAN MCS" className="w-12 h-12 rounded-full shadow-sm bg-white p-1 object-contain" />
            <span className="text-xl font-black text-teal-800 tracking-tight">IMAN Cooperative</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Official Receipt Verification</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Public authentication portal for member transaction receipts
          </p>
        </div>

        {/* Verification Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden"
        >
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm font-semibold text-gray-600">Verifying receipt cryptographic signature...</p>
            </div>
          ) : result?.verified ? (
            <div>
              {/* Green Verified Header */}
              <div className="bg-emerald-600 p-6 text-white text-center space-y-2">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <ShieldCheck className="w-9 h-9 text-white" />
                </div>
                <h2 className="text-xl font-black tracking-tight">Official Receipt Verified</h2>
                <p className="text-xs text-emerald-100 font-medium">
                  {result.receipt?.badge || 'Digitally Authenticated by IMAN Cooperative Society'}
                </p>
              </div>

              {/* Receipt Metadata Breakdown */}
              <div className="p-6 space-y-4 text-xs sm:text-sm">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Receipt Number:</span>
                    <span className="font-mono font-bold text-gray-900">{result.receipt?.receipt_number}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Cooperative Organization:</span>
                    <span className="font-semibold text-gray-800 text-right">{result.receipt?.cooperative_name}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Transaction Type:</span>
                    <span className="font-semibold text-teal-800">{result.receipt?.transaction_type}</span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Date & Time Issued:</span>
                    <span className="font-semibold text-gray-700">
                      {result.receipt?.issued_at ? new Date(result.receipt.issued_at).toLocaleString('en-NG') : 'N/A'}
                    </span>
                  </div>

                  {result.receipt?.amount !== undefined && (
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-gray-700 font-bold">Total Amount Paid:</span>
                      <span className="font-mono text-base font-black text-emerald-700">
                        ₦{Number(result.receipt.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Safe Masked Member Details */}
                <div className="border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <Lock className="w-3.5 h-3.5 text-teal-600" />
                    Masked Member Identification (Privacy Protected)
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Member Name:</span>
                    <span className="font-bold text-gray-800">{result.receipt?.masked_member_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-xs">Member PSN/ID:</span>
                    <span className="font-mono font-bold text-gray-700">{result.receipt?.masked_member_id}</span>
                  </div>
                </div>

                {/* Digital Verification Hash */}
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px] text-teal-900 leading-relaxed">
                    <span className="font-bold block">Cryptographic Authentication</span>
                    Verified with HMAC SHA-256 signature ({result.receipt?.verification_hash_snippet}). This receipt is genuine and recorded in the cooperative financial ledger.
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    onClick={handlePrint}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-md transition text-xs sm:text-sm"
                  >
                    <Printer className="w-4 h-4" /> Print Verification Badge
                  </button>
                  <Link
                    to="/"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition text-xs sm:text-sm"
                  >
                    <ArrowLeft className="w-4 h-4" /> Return to Portal
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Unverified / Invalid Warning */
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600 shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Receipt Verification Warning</h2>
                <p className="text-xs sm:text-sm text-red-600 font-medium mt-1">
                  {result?.message || error || 'Receipt could not be verified'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 text-left space-y-1.5">
                <span className="font-bold flex items-center gap-1">
                  <Info className="w-4 h-4" /> Possible Reasons:
                </span>
                <ul className="list-disc list-inside space-y-0.5 text-gray-700">
                  <li>The receipt number was entered incorrectly.</li>
                  <li>The receipt was modified, forged, or altered.</li>
                  <li>The transaction was revoked or voided.</li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold rounded-xl transition"
                >
                  <ArrowLeft className="w-4 h-4" /> Return to Home
                </Link>
              </div>
            </div>
          )}
        </motion.div>

        {/* Footer Note */}
        <div className="text-center text-xs text-gray-400">
          <p>© {new Date().getFullYear()} IMAN Multi-Purpose Cooperative Society. All rights reserved.</p>
          <p className="mt-0.5">Strict privacy protection: Personal sensitive identifiers are masked by default.</p>
        </div>
      </div>
    </div>
  );
};
