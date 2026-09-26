import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Scale, Calendar, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorReconciliationPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit/reconciliation?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to calculate reconciliation');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReconciliation();
  }, []);

  const rec = data?.reconciliation || {};
  const credits = rec.credits || {};
  const debits = rec.debits || {};

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Scale className="w-6 h-6 text-lime-700" /> Periodic Balance Reconciliation
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Automated proof of cash & funds ledger: Opening Balance + Credits − Debits = Closing Balance.
          </p>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 text-xs">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <button
            onClick={fetchReconciliation}
            className="bg-lime-600 hover:bg-lime-700 text-white font-semibold px-3 py-1 rounded"
          >
            Reconcile
          </button>
        </div>
      </div>

      {/* Discrepancy Alert Banner */}
      {rec.hasDiscrepancy ? (
        <div className="bg-red-50 border-2 border-red-400 p-4 rounded-xl flex items-center gap-3 text-red-800">
          <AlertTriangle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base">{rec.discrepancyLabel}</h3>
            <p className="text-xs text-red-700 mt-0.5">
              The recorded closing balance differs from the mathematically calculated expected balance. Investigate ledger discrepancies below.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-lime-50 border-2 border-lime-400 p-4 rounded-xl flex items-center gap-3 text-lime-900">
          <CheckCircle className="w-8 h-8 text-lime-600 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-base">LEDGER PERFECTLY RECONCILED (0.00 DIFFERENCE)</h3>
            <p className="text-xs text-lime-700 mt-0.5">
              Opening Balance + Credits − Debits aligns 100% with current recorded closing balances.
            </p>
          </div>
        </div>
      )}

      {/* Equation Visual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Step 1: Opening */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 text-center">
          <span className="text-xs text-gray-500 uppercase tracking-wider block font-semibold">1. Opening Balance</span>
          <div className="text-xl font-bold text-gray-900 mt-2">
            ₦{Number(rec.openingBalance || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-400 block mt-1">Carried forward prior balance</span>
        </div>

        {/* Step 2: Credits */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 text-center">
          <span className="text-xs text-lime-700 uppercase tracking-wider block font-semibold">+ 2. Total Inflow Credits</span>
          <div className="text-xl font-bold text-lime-700 mt-2">
            ₦{Number(credits.totalCredits || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500 block mt-1">
            Contributions & Repayments
          </span>
        </div>

        {/* Step 3: Debits */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 text-center">
          <span className="text-xs text-red-700 uppercase tracking-wider block font-semibold">− 3. Total Outflow Debits</span>
          <div className="text-xl font-bold text-red-600 mt-2">
            ₦{Number(debits.totalDebits || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-gray-500 block mt-1">
            Disbursements & Expenses
          </span>
        </div>

        {/* Step 4: Expected Closing */}
        <div className="bg-lime-50/70 p-5 rounded-xl border border-lime-300 text-center">
          <span className="text-xs text-lime-900 uppercase tracking-wider block font-bold">= 4. Expected Closing</span>
          <div className="text-xl font-extrabold text-lime-900 mt-2">
            ₦{Number(rec.expectedClosingBalance || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-lime-700 block mt-1">
            Mathematical Closing Target
          </span>
        </div>
      </div>

      {/* Breakdown Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Credits Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-lime-800 border-b pb-2 flex justify-between">
            <span>Inflows & Credits Detail</span>
            <span>₦{Number(credits.totalCredits || 0).toLocaleString()}</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Member Contributions (Savings, Investment, Target):</span>
              <span className="font-bold text-gray-900">₦{Number(credits.contributions || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Loan Repayments Verified:</span>
              <span className="font-bold text-gray-900">₦{Number(credits.loanRepayments || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Debits Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-red-800 border-b pb-2 flex justify-between">
            <span>Outflows & Debits Detail</span>
            <span>₦{Number(debits.totalDebits || 0).toLocaleString()}</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Disbursed Loans:</span>
              <span className="font-bold text-gray-900">₦{Number(debits.loanDisbursements || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span className="text-gray-600">Paid Operating Expenses:</span>
              <span className="font-bold text-gray-900">₦{Number(debits.expenses || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
