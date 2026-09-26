import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, AlertCircle, FileCheck, Building, UserCheck, Calendar, Hash, ArrowLeft } from 'lucide-react';
import DocumentTemplateService, { PublicAgreementVerification } from '../services/documentTemplateService';

export const VerifyAgreementPage: React.FC = () => {
  const { agreementRef } = useParams<{ agreementRef: string }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [verification, setVerification] = useState<PublicAgreementVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (agreementRef) {
      verifyRecord(agreementRef);
    }
  }, [agreementRef]);

  const verifyRecord = async (ref: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await DocumentTemplateService.verifyAgreement(ref);
      setVerification(data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'No official cooperative agreement matching this verification reference was found.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full mx-auto space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Cooperative Portal</span>
          </Link>

          <span className="text-[11px] font-mono text-gray-400">
            SECURE VERIFICATION SYSTEM
          </span>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto" />
              <p className="text-sm font-medium text-gray-600">
                Verifying digital agreement authenticity...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 sm:p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Verification Failed
              </h2>
              <p className="text-sm text-gray-600 max-w-sm mx-auto">
                {error}
              </p>
              <div className="pt-4">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                >
                  Visit Portal Homepage
                </Link>
              </div>
            </div>
          ) : verification ? (
            <div>
              {/* Green Verified Banner */}
              <div className="bg-emerald-600 text-white p-6 sm:p-8 text-center space-y-2 relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mx-auto mb-2">
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight uppercase">
                  Official Agreement Verified
                </h1>
                <p className="text-xs text-emerald-100 max-w-md mx-auto">
                  This document is authenticated and recorded on the official IMAN Cooperative Society ledger.
                </p>
              </div>

              {/* Agreement Metadata Summary */}
              <div className="p-6 sm:p-8 space-y-5 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Agreement Reference
                    </span>
                    <span className="font-mono font-bold text-primary-700 text-base">
                      {verification.agreement_reference}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Contract Status
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {verification.status}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-gray-100 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-gray-400" />
                      <span>Contract Type</span>
                    </span>
                    <span className="font-semibold text-gray-800">
                      {verification.contract_type}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span>Loan Application ID</span>
                    </span>
                    <span className="font-semibold text-gray-800">
                      {verification.loan_id}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-gray-400" />
                      <span>Masked Signatory</span>
                    </span>
                    <span className="font-semibold text-gray-800">
                      {verification.masked_member?.name} (PSN: {verification.masked_member?.psn})
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Signing Date</span>
                    </span>
                    <span className="font-semibold text-gray-800">
                      {new Date(verification.signing_date).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-gray-400" />
                      <span>Signature Reference</span>
                    </span>
                    <span className="font-mono text-gray-700 font-medium">
                      {verification.signature_reference}
                    </span>
                  </div>

                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span>Issuing Cooperative</span>
                    </span>
                    <span className="font-semibold text-gray-800 text-right">
                      {verification.organization}
                      <span className="block text-[10px] text-gray-500 font-normal">
                        {verification.chapter}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-center text-[11px] text-gray-400 leading-relaxed border-t border-gray-100">
                  Privacy Protected: Member personal contact information (email, phone, home address) is omitted for public security in accordance with Cooperative Privacy Regulations.
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 py-4">
        © {new Date().getFullYear()} IMAN Multipurpose Cooperative Society. All rights reserved.
      </div>
    </div>
  );
};
