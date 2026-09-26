import React, { useState, useEffect } from 'react';
import { TrendingUp, Search, DollarSign, Calendar } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorInvestmentsPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchInvestments = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit/investments?search=${search}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load investment audit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestments();
  }, []);

  const investments = data?.investments || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-lime-700" /> Investment Portfolio Audit
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Independent trace of member investment funds back to original deposit transactions and verification of pool balances.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Audited Investment Pool</span>
          <div className="text-2xl font-bold text-lime-700 mt-1">
            ₦{Number(data?.totalInvestmentPool || 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Verified Investments</span>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {data?.totalInvestmentsCount || 0} Records
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Auditing investment pool...</div>
        ) : investments.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No investment records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lime-50 text-lime-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Investment ID</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">PSN</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source Ref</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {investments.map((inv: any) => (
                  <tr key={inv.investment_id} className="hover:bg-gray-50 font-mono">
                    <td className="py-3 px-4 font-bold text-gray-900">{inv.investment_id}</td>
                    <td className="py-3 px-4 font-sans font-bold text-gray-900">{inv.member_name}</td>
                    <td className="py-3 px-4 text-gray-500">{inv.member_psn}</td>
                    <td className="py-3 px-4 font-sans text-gray-700">{inv.investment_type}</td>
                    <td className="py-3 px-4 font-bold text-lime-700">₦{Number(inv.amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-500">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-gray-400">Contribution #{inv.contribution_id}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-lime-100 text-lime-800 uppercase font-bold">
                        {inv.status}
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
