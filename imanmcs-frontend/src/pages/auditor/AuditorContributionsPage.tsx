import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Filter, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export const AuditorContributionsPage: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('2026');

  const fetchContributions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (month) params.append('month', month);
      if (year) params.append('year', year);

      const res = await api.get(`/audit/contributions?${params.toString()}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching contribution audit', err);
      toast.error('Failed to load contribution audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [month, year]);

  const summary = data?.summary || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-lime-700" /> Contribution Audit & Arrears Tracker
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Audit expected monthly commitments against actual receipts, identify arrears, partial payments, and unusual patterns.
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search member name or PSN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchContributions()}
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
          />
        </div>

        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
        >
          <option value="">All Months</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Month {i + 1}</option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-lime-500"
        >
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>

        <button
          onClick={fetchContributions}
          className="px-4 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs font-semibold rounded-lg"
        >
          Filter
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-gray-500 block">Total Audited Members</span>
          <span className="text-xl font-bold text-gray-900">{data?.totalMembers || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-orange-600 block font-semibold">Members in Arrears</span>
          <span className="text-xl font-bold text-orange-700">{data?.membersWithArrears || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <span className="text-xs text-blue-600 block">Manual Cash Entries</span>
          <span className="text-xl font-bold text-blue-700">{data?.manualEntriesCount || 0}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Auditing contributions...</div>
        ) : summary.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500">No records found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-lime-50 text-lime-900 uppercase font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">PSN</th>
                  <th className="py-3 px-4">Expected Commitment</th>
                  <th className="py-3 px-4">Actual Contributed</th>
                  <th className="py-3 px-4">Arrears</th>
                  <th className="py-3 px-4">Audit Indicators</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {summary.map((row: any) => (
                  <tr key={row.userId} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{row.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-500">{row.psn}</td>
                    <td className="py-3 px-4">₦{Number(row.expectedMonthly).toLocaleString()}</td>
                    <td className="py-3 px-4 font-semibold text-lime-700">₦{Number(row.actualContributed).toLocaleString()}</td>
                    <td className="py-3 px-4">
                      {row.arrears > 0 ? (
                        <span className="font-bold text-orange-600">₦{Number(row.arrears).toLocaleString()}</span>
                      ) : (
                        <span className="text-lime-700">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 space-x-1">
                      {row.hasMissingContribution && (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-red-100 text-red-700 font-semibold">
                          Missing Entry
                        </span>
                      )}
                      {row.hasManualEntry && (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-semibold">
                          Manual Cash
                        </span>
                      )}
                      {!row.hasMissingContribution && !row.hasManualEntry && (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600">
                          Normal
                        </span>
                      )}
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
