import React, { useState, useEffect } from 'react';
import { FileText, Download, Printer, Calendar, Shield, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'financial_summary', title: '1. Cooperative Financial Summary' },
  { id: 'member_statement', title: '2. Member Account Statement' },
  { id: 'member_contribution', title: '3. Member Contribution Report' },
  { id: 'loan_portfolio', title: '4. Loan Portfolio Report' },
  { id: 'loan_repayment', title: '5. Loan Repayment Report' },
  { id: 'investment', title: '6. Investment Report' },
  { id: 'profit_distribution', title: '7. Profit Distribution Report' },
  { id: 'income', title: '8. Income Report' },
  { id: 'expense', title: '9. Expense Report' },
  { id: 'transaction', title: '10. Transaction Report' },
  { id: 'outstanding_loan', title: '11. Outstanding Loan Report' },
  { id: 'contribution_arrears', title: '12. Contribution Arrears Report' },
  { id: 'audit_exception', title: '13. Audit Exception Report' },
  { id: 'user_activity', title: '14. User Activity Report' },
  { id: 'monthly_financial', title: '15. Monthly Financial Report' },
  { id: 'annual_financial', title: '16. Annual Financial Report' },
];

export const AuditorReportsPage: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string>('financial_summary');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('type', selectedReport);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit/reports?${params.toString()}`);
      if (res.data.success) {
        setReportData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to generate audit report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport]);

  const handleExportCsv = async () => {
    try {
      const res = await api.get(`/audit/reports?type=${selectedReport}&format=csv`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_report_${selectedReport}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported to CSV');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const rows = reportData?.rows || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-lime-700" /> Cooperative Audit Reports Module
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Generate and export all 16 official cooperative audit reports with verifiable auditor sign-off timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg transition"
          >
            <Download className="w-4 h-4 text-gray-600" /> Export CSV/Excel
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-lime-600 hover:bg-lime-700 text-white text-xs font-semibold rounded-lg transition"
          >
            <Printer className="w-4 h-4" /> Print Report
          </button>
        </div>
      </div>

      {/* Select Report & Date Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[280px]">
          <label className="text-xs font-semibold text-gray-500 block mb-1">Select Audit Report Type</label>
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value)}
            className="w-full text-sm font-semibold border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-lime-500"
          >
            {REPORT_TYPES.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs pt-4">
          <Calendar className="w-4 h-4 text-amber-600" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1.5"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1.5"
          />
          <button
            onClick={fetchReport}
            className="bg-lime-600 hover:bg-lime-700 text-white font-semibold px-3 py-1.5 rounded"
          >
            Generate
          </button>
        </div>
      </div>

      {/* Printable Report Surface */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
        {/* Official Header */}
        <div className="text-center border-b pb-6 space-y-1">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-lime-800 bg-lime-100 px-3 py-0.5 rounded-full uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" /> Official Cooperative Oversight Document
          </div>
          <h2 className="text-xl font-bold text-gray-900 uppercase">{reportData?.title || 'AUDIT REPORT'}</h2>
          <p className="text-xs text-gray-500">Period: {reportData?.period || 'All Time'}</p>

          <div className="flex justify-center items-center gap-6 text-xs text-gray-600 pt-3">
            <span><strong>Generated by:</strong> {reportData?.generatedBy || 'Independent Auditor'}</span>
            <span>•</span>
            <span><strong>Generated on:</strong> {reportData?.generatedOn || new Date().toLocaleString()}</span>
          </div>
        </div>

        {/* Report Content Table */}
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">Compiling official audit dataset...</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-500">No data found for this report and period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-700 uppercase font-bold border-b">
                <tr>
                  {Object.keys(rows[0]).map((col) => (
                    <th key={col} className="py-3 px-4 uppercase">{col.replace(/_/g, ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {rows.map((row: any, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {Object.keys(row).map((col) => (
                      <td key={col} className="py-3 px-4 text-gray-900">{row[col]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Signature Box */}
        <div className="pt-8 border-t flex flex-col md:flex-row justify-between items-end text-xs text-gray-500 gap-4">
          <div>
            <p>IMAN Multi-Purpose Cooperative Society Management System</p>
            <p>Auditing Module • Cryptographic Ledger Verification</p>
          </div>
          <div className="text-right">
            <div className="border-t border-gray-400 w-48 mb-1"></div>
            <p className="font-bold text-gray-700">{reportData?.generatedBy}</p>
            <p className="text-[10px]">Independent Cooperative Auditor Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};
