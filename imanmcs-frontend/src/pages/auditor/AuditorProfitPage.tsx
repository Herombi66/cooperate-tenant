import React, { useState, useEffect } from 'react';
import { Percent, Shield, CheckCircle, Calculator } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorProfitPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<string>('2026');

  const fetchProfitAudit = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit/profit-distribution?period=${period}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load profit distribution audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitAudit();
  }, [period]);

  const trail = data?.calculationTrail || {};
  const distributions = data?.distributions || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Percent className="w-6 h-6 text-lime-700" /> Profit Distribution & Calculation Audit
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Audit the mathematical trail of statutory reserves, education fund, committee provisions, and net dividend payouts. Strictly read-only.
          </p>
        </div>

        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500 font-semibold"
        >
          <option value="2026">Financial Year 2026</option>
          <option value="2025">Financial Year 2025</option>
        </select>
      </div>

      {/* Statutory Reserve Deductions Trail */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          <Calculator className="w-4 h-4 text-lime-700" /> Statutory Deductions & Net Distributable Trail
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-gray-50 rounded-lg border">
            <span className="text-gray-500 block">Gross Cooperative Profit:</span>
            <span className="text-base font-bold text-gray-900">₦{Number(trail.grossProfit || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border">
            <span className="text-gray-500 block">Reserve Fund (10%):</span>
            <span className="text-base font-bold text-gray-900">₦{Number(trail.reserveDeduction || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border">
            <span className="text-gray-500 block">Education Fund (5%):</span>
            <span className="text-base font-bold text-gray-900">₦{Number(trail.educationDeduction || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border">
            <span className="text-gray-500 block">Committee Bonus (5%):</span>
            <span className="text-base font-bold text-gray-900">₦{Number(trail.committeeBonus || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border">
            <span className="text-gray-500 block">Bad Debt Provision (3.5%):</span>
            <span className="text-base font-bold text-gray-900">₦{Number(trail.badDebtProvision || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border">
            <span className="text-gray-500 block">General Reserve (2.8%):</span>
            <span className="text-base font-bold text-gray-900">₦{Number(trail.generalReserve || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-lime-50 rounded-lg border border-lime-300">
            <span className="text-lime-800 block font-semibold">Net Distributable:</span>
            <span className="text-base font-extrabold text-lime-900">₦{Number(trail.netDistributableProfit || 0).toLocaleString()}</span>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg border border-purple-300">
            <span className="text-purple-800 block font-semibold">Distributed to Members:</span>
            <span className="text-base font-extrabold text-purple-900">₦{Number(trail.totalDistributedToMembers || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Member Allocations Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b font-bold text-sm text-gray-900">
          Member Allocations Ledger ({trail.eligibleMembersCount || 0} Eligible Members)
        </div>
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Auditing distribution...</div>
        ) : distributions.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No member dividend distributions found for this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lime-50 text-lime-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">PSN</th>
                  <th className="py-3 px-4">Investment Weight</th>
                  <th className="py-3 px-4">Share (%)</th>
                  <th className="py-3 px-4">Dividend Amount</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {distributions.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{d.member_name}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{d.member_psn}</td>
                    <td className="py-3 px-4">₦{Number(d.member_investment).toLocaleString()}</td>
                    <td className="py-3 px-4">{d.share_percentage}%</td>
                    <td className="py-3 px-4 font-bold text-purple-700">₦{Number(d.profit_amount).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-lime-100 text-lime-800 uppercase font-bold">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
