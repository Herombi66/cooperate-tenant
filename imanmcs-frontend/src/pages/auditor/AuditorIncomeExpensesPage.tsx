import React, { useState, useEffect } from 'react';
import { Receipt, DollarSign, Calendar, Filter, TrendingUp, Eye, Shield } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { InvestmentProfitsModal } from '../../components/auditor/InvestmentProfitsModal';

export const AuditorIncomeExpensesPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [category, setCategory] = useState<string>('');
  const [isProfitModalOpen, setIsProfitModalOpen] = useState<boolean>(false);

  const fetchIncomeExpenses = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit/income-expenses?category=${category}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load income & expenses audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomeExpenses();
  }, [category]);

  const summary = data?.summary || {};
  const incomeStreams = data?.incomeStreams || [];
  const expenses = data?.expenses || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-lime-700" /> Income & Expense Audit
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Reconcile organizational income receipts, administrative charges, operating expenses, and net surplus.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Audited Income</span>
          <div className="text-2xl font-bold text-lime-700 mt-1">
            ₦{Number(summary.totalIncome || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Audited Expenses</span>
          <div className="text-2xl font-bold text-red-600 mt-1">
            ₦{Number(summary.totalExpenses || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Net Operating Surplus</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            ₦{Number(summary.netBalance || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Income Streams */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
              Revenue & Income Sources
            </h3>
            <p className="text-xs text-gray-500">
              Formula: <strong>Total Revenue = Registration Fees + Administrative Monthly Fees + Investment Profits + Other Revenue Sources</strong>
            </p>
          </div>
          <button
            onClick={() => setIsProfitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-700 hover:bg-lime-800 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <TrendingUp className="w-3.5 h-3.5" /> Deep Murabaha Profit Audit
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {incomeStreams.map((inc: any, idx: number) => {
            const isInvestmentProfit = inc.source === 'Investment Profits';
            return (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border text-xs space-y-1.5 transition ${
                  isInvestmentProfit
                    ? 'border-lime-400 bg-lime-50/50 shadow-sm'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 block text-sm">{inc.source}</span>
                  {isInvestmentProfit && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-lime-200 text-lime-800">
                      MURABAHA
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-[11px] leading-tight">{inc.description}</p>
                <div className="font-extrabold text-lime-800 text-base pt-1">
                  ₦{Number(inc.amount).toLocaleString()}
                </div>

                {isInvestmentProfit && inc.collected !== undefined && (
                  <div className="pt-2 border-t border-lime-200/80 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Collected to Date:</span>
                      <span className="font-bold text-emerald-700">₦{Number(inc.collected).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding:</span>
                      <span className="font-bold text-amber-700">₦{Number(inc.outstanding).toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => setIsProfitModalOpen(true)}
                      className="w-full mt-2 py-1 px-2 text-center rounded bg-lime-700 hover:bg-lime-800 text-white font-semibold text-[11px] transition flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Contracts Ledger
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b font-bold text-sm text-gray-900">Operating Expenses Ledger</div>
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Auditing expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No expense records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lime-50 text-lime-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Expense ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-gray-900">EXP-{e.id}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-700 uppercase">{e.category}</td>
                    <td className="py-3 px-4 text-gray-800">{e.description}</td>
                    <td className="py-3 px-4 text-gray-600">{e.recipient}</td>
                    <td className="py-3 px-4 font-bold text-red-600">₦{Number(e.amount).toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{e.receipt_number || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-lime-100 text-lime-800 uppercase font-bold">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deep Investment Profits Audit Modal */}
      <InvestmentProfitsModal
        isOpen={isProfitModalOpen}
        onClose={() => setIsProfitModalOpen(false)}
      />
    </div>
  );
};
