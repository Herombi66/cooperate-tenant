import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Calculator,
  DollarSign,
  Users,
  Calendar,
  Download,
  Upload,
  PlusCircle,
  BarChart3,
  Percent,
  Loader
} from "lucide-react";
import { ProfitShareService, ProfitShare, ProfitShareStats } from "../services/profitShareService";
import toast from "react-hot-toast";

export const ProfitSharingPage: React.FC = () => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedShare, setSelectedShare] = useState<ProfitShare | null>(null);
  const [profitShares, setProfitShares] = useState<ProfitShare[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);

  // Separate period selectors for different purposes
  const [mainPagePeriod, setMainPagePeriod] = useState(""); // For filtering profit shares table
  const [modalPeriod, setModalPeriod] = useState(""); // For loading data in calculate modal

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [calculatingProfit, setCalculatingProfit] = useState(false);

  // Period data states for auto-populated fields
  const [periodData, setPeriodData] = useState<any>(null);
  const [loadingPeriodData, setLoadingPeriodData] = useState(false);

  useEffect(() => {
    loadProfitShares();
    loadAvailablePeriods();
  }, []);

  useEffect(() => {
    if (availablePeriods.length > 0 && !mainPagePeriod) {
      setMainPagePeriod(availablePeriods[0]);
    }
  }, [availablePeriods]);

  // Load financial data when modal period changes (INSIDE MODAL)
  useEffect(() => {
    if (modalPeriod) {
      loadPeriodData(modalPeriod);
    }
  }, [modalPeriod]);

  const loadProfitShares = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProfitShareService.getProfitShares();
      setProfitShares(data.profitShares);
    } catch (err: any) {
      console.error("Failed to load profit shares:", err);
      setError(err.message || "Failed to load profit shares");
      toast.error("Failed to load profit shares");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailablePeriods = async () => {
    try {
      const periods = await ProfitShareService.getProfitSharePeriods();
      setAvailablePeriods(periods);
    } catch (err) {
      console.error("Failed to load periods:", err);
      setAvailablePeriods(["2024-Q4", "2024-Q3", "2024-Q2", "2024-Q1"]);
    }
  };

  const loadPeriodData = async (period: string) => {
    try {
      setLoadingPeriodData(true);
      console.log(`Loading period data for: ${period}`);
      const data = await ProfitShareService.getPeriodData(period);
      console.log("Period data loaded:", data);
      setPeriodData(data);
    } catch (error: any) {
      console.error("Failed to load period data:", error);
      toast.error("Failed to load period data: " + (error.response?.data?.message || error.message));
      setPeriodData(null);
    } finally {
      setLoadingPeriodData(false);
    }
  };

  const filteredShares = profitShares.filter(share => {
    const matchesPeriod = !mainPagePeriod || share.period === mainPagePeriod;
    const matchesSearch =
      !searchTerm ||
      (share.user?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (share.membershipApplication?.psn || share.user?.psn || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPeriod && matchesSearch;
  });

  // Calculate totals for selected period
  const totalInvestment = filteredShares.reduce((sum, share) => sum + Number(share.member_investment || 0), 0);
  const totalProfit = filteredShares.reduce((sum, share) => sum + Number(share.profit_amount || 0), 0);
  const paidAmount = filteredShares.filter(s => s.status === "paid").reduce((sum, share) => sum + Number(share.profit_amount || 0), 0);
  const pendingAmount = filteredShares.filter(s => s.status !== "paid").reduce((sum, share) => sum + Number(share.profit_amount || 0), 0);

  // Create derived properties for display
  const enrichedShares = filteredShares.map(share => ({
    ...share,
    memberName: share.membershipApplication?.name || share.user?.name || `User ${share.user_id}`,
    memberPsn: share.membershipApplication?.psn || share.user?.psn || `ID:${share.user_id}`,
    investmentContribution: share.member_investment,
    sharePercentage: Number(share.share_percentage) || 0,
    profitAmount: share.profit_amount,
    calculatedDate: share.calculated_at,
    paidDate: share.paid_at
  }));

  // Handler functions for profit share actions
  const handleApproveProfitShare = async (shareId: number) => {
    try {
      const response = await ProfitShareService.approveProfitShares({
        profitShareIds: [shareId]
      });

      if (response.success) {
        toast.success(`✅ Profit share approved successfully!`);
        loadProfitShares(); // Refresh the table
      } else {
        toast.error(`❌ Failed to approve: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Approve error:", error);
      toast.error(`❌ Approval failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRejectProfitShare = async (shareId: number) => {
    const reason = prompt("Please provide a reason for rejection (optional):");
    try {
      const response = await ProfitShareService.cancelProfitShares({
        profitShareIds: [shareId],
        reason: reason || undefined
      });

      if (response.success) {
        toast.success(`❌ Profit share rejected successfully!`);
        loadProfitShares(); // Refresh the table
      } else {
        toast.error(`❌ Failed to reject: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Reject error:", error);
      toast.error(`❌ Rejection failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleMarkAsPaid = async (shareId: number) => {
    try {
      const response = await ProfitShareService.payProfitShares({
        profitShareIds: [shareId]
      });

      if (response.success) {
        toast.success(`💰 Profit share marked as paid successfully!`);
        loadProfitShares(); // Refresh the table
      } else {
        toast.error(`❌ Failed to mark as paid: ${response.message}`);
      }
    } catch (error: any) {
      console.error("Mark as paid error:", error);
      toast.error(`❌ Failed to mark as paid: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleViewReceipt = (share: any) => {
    setSelectedShare(share);
    setShowReceiptModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "calculated": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-blue-100 text-blue-800";
      case "paid": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profit Sharing</h1>
          <p className="text-gray-600">Sharia-compliant profit distribution based on investment contributions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </button>
          <button
            onClick={() => {
              const csvContent = [
                ["PSN", "Member Name", "Period", "Investment", "Share %", "Profit Amount", "Status", "Calculated Date", "Paid Date"].join(","),
                ...filteredShares.map(share => [
                  share.user?.psn || share.membershipApplication?.psn || "",
                  `"${share.user?.name || share.membershipApplication?.name || ""}"`,
                  share.period,
                  share.member_investment,
                  share.share_percentage.toFixed(2),
                  share.profit_amount,
                  share.status,
                  share.calculated_at,
                  share.paid_at || ""
                ].join(","))
              ].join("\n");
              const blob = new Blob([csvContent], { type: "text/csv" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `profit_sharing_${mainPagePeriod}_${new Date().toISOString().split("T")[0]}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            }}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={() => {
              setModalPeriod(mainPagePeriod); // Pre-populate modal with current outside period
              setShowCalculateModal(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            <Calculator className="w-4 h-4 mr-2" />
            Calculate Profits
          </button>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Select Period:</label>
            <select
              value={mainPagePeriod}
              onChange={(e) => setMainPagePeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="2030">2030</option>
              <option value="2029">2029</option>
              <option value="2028">2028</option>
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
              <option value="2021">2021</option>
              <option value="2020">2020</option>
            </select>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Investment</p>
              <p className="text-2xl font-bold text-gray-900">${totalInvestment.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Profit</p>
              <p className="text-2xl font-bold text-gray-900">${totalProfit.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid Out</p>
              <p className="text-2xl font-bold text-gray-900">${paidAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Users className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">${pendingAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profit Shares Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Profit Distribution - {mainPagePeriod}</h3>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-primary-500 mr-3" />
              <span className="text-gray-600">Loading profit shares...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              <p className="font-semibold">Error loading profit shares</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Share %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Calculated Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {enrichedShares.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {mainPagePeriod ? `No profit shares found for ${mainPagePeriod}` : "No profit shares found"}
                    </td>
                  </tr>
                ) : (
                  enrichedShares.map((share) => (
                    <tr key={share.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {(share.memberName || "").split(" ").map((n: any) => n[0]).join("") || "?"}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{share.memberName}</div>
                            <div className="text-sm text-gray-500">{share.memberPsn}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${(share.investmentContribution || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Percent className="w-4 h-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">{share.sharePercentage.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                        ${(share.profitAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          share.status === 'paid' ? 'bg-green-100 text-green-800' :
                          share.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                          share.status === 'calculated' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {share.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {share.calculatedDate ? new Date(share.calculatedDate).toLocaleDateString() : 'N/A'}
                        {share.paidDate && (
                          <div className="text-xs text-green-600">Paid: {new Date(share.paidDate).toLocaleDateString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {share.status === 'calculated' && (
                            <>
                              <button
                                onClick={() => handleApproveProfitShare(share.id)}
                                className="text-green-600 hover:text-green-900 font-medium"
                                disabled={loading}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectProfitShare(share.id)}
                                className="text-red-600 hover:text-red-900 font-medium"
                                disabled={loading}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {share.status === 'approved' && (
                            <button
                              onClick={() => handleMarkAsPaid(share.id)}
                              className="text-blue-600 hover:text-blue-900 font-medium"
                              disabled={loading}
                            >
                              Mark Paid
                            </button>
                          )}
                          {share.status === 'paid' && (
                            <button
                              onClick={() => handleViewReceipt(share)}
                              className="text-gray-600 hover:text-gray-900 font-medium"
                            >
                              View Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary - {mainPagePeriod}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${totalInvestment.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Investment Pool</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">${totalProfit.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Profit Generated</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totalInvestment > 0 ? ((totalProfit / totalInvestment) * 100).toFixed(1) : '0.0'}%</div>
            <div className="text-sm text-gray-600">Return on Investment</div>
          </div>
        </div>
      </div>

      {/* Calculate Profits Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Calculate Profit Distribution - {modalPeriod}</h3>
              <button
                onClick={() => setShowCalculateModal(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              {loadingPeriodData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-primary-500 mr-3" />
                  <span className="text-gray-600">Loading period financial data...</span>
                </div>
              ) : (
                <form className="p-6 space-y-6">
                  {/* Period Selection - MODAL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profit Sharing Period *
                    </label>
                    <select
                      value={modalPeriod}
                      onChange={(e) => setModalPeriod(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      required
                    >
                      <option value="2030">2030</option>
                      <option value="2029">2029</option>
                      <option value="2028">2028</option>
                      <option value="2027">2027</option>
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                      <option value="2024">2024</option>
                      <option value="2023">2023</option>
                      <option value="2022">2022</option>
                      <option value="2021">2021</option>
                      <option value="2020">2020</option>
                    </select>
                    <p className="text-xs text-gray-600 mt-1">📅 Changing period will auto-update financial data for calculations</p>
                  </div>

                  {/* Financial Data - Auto-Loaded */}
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">🔒 Auto-Calculated Financial Data</h4>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Investment Pool (From Member Contributions) $
                      </label>
                      <input
                        type="number"
                        value={(periodData?.totalInvestmentPool || 0)}
                        readOnly
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 cursor-not-allowed"
                        placeholder="Calculated from member contributions..."
                      />
                      <p className="text-xs text-gray-600 mt-1">Auto-calculated from member investment contributions for {modalPeriod}</p>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Profit Generated (Revenue - Expenses) $
                      </label>
                      <input
                        type="number"
                        value={(periodData?.totalProfit || 0)}
                        readOnly
                        className="w-full bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-gray-700 cursor-not-allowed"
                        placeholder="Calculated from cooperative financials..."
                      />
                      <p className="text-xs text-gray-600 mt-1">Calculated as: Total Revenues - Operating Expenses for {modalPeriod}</p>
                    </div>
                  </div>

                  {/* Member Investment Breakdown */}
                  {periodData?.memberInvestments && periodData.memberInvestments.length > 0 && (
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-green-900 mb-3">👥 Member Investment Breakdown (Auto-Loaded)</h4>
                      <div className="space-y-2">
                        {periodData.memberInvestments.map((member: any, idx: number) => (
                          <div key={member.user_id || idx} className="flex justify-between items-center py-2 px-3 bg-white rounded border">
                            <div>
                              <span className="text-sm font-medium text-gray-900">{member.name || "Unknown"}</span>
                              <span className="text-xs text-gray-500 ml-2">({member.psn || "No PSN"})</span>
                            </div>
                            <div className="text-sm font-semibold text-green-600 text-right">
                              ${(member.amount || 0).toLocaleString()}
                              <span className="text-xs text-gray-500 block">
                                ({(((member.amount || 0) / (periodData.totalInvestmentPool || 1)) * 100).toFixed(1)}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-2">🔄 Data automatically refreshes when you change the period above</p>
                    </div>
                  )}

                  {/* Calculation Preview */}
                  {periodData && (
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold text-orange-900 mb-3">📊 Profit Calculation Preview</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Contributions:</span>
                          <div className="font-semibold text-green-600">
                            ${(periodData.calculations?.totalContributions || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Expenses:</span>
                          <div className="font-semibold text-red-600">
                            ${(periodData.calculations?.totalExpenses || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Net Profit for Sharing:</span>
                          <div className="font-semibold text-blue-600">
                            ${(periodData.totalProfit || 0).toLocaleString()} (after 24.3% deductions)
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Members Eligible:</span>
                          <div className="font-semibold text-purple-600">
                            {periodData.calculations?.memberCountWithInvestments || 0}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sharia Compliance */}
                  <div className="bg-green-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-green-900 mb-1">🕌 Sharia Compliance Check</h4>
                    <div className="space-y-1 text-xs text-green-700">
                      <p>✅ No interest (Riba) calculations</p>
                      <p>✅ Profit sharing based on actual business performance</p>
                      <p>✅ Proportional distribution based on investment</p>
                      <p>✅ Financial data auto-calculated from database</p>
                      <p>✅ 24.3% mandatory deductions applied</p>
                    </div>
                  </div>

                  {/* Notes Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      placeholder="Add any additional notes about this profit calculation period..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-vertical min-h-[80px]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowCalculateModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={async (e) => {
                        e.preventDefault();
                        if (!periodData || !periodData.totalInvestmentPool || !periodData.totalProfit) {
                          toast.error("Financial data not loaded. Please wait for data to load or contact administrator.");
                          return;
                        }
                        setCalculatingProfit(true);
                        try {
                          const requestData = {
                            period: modalPeriod,
                            totalProfit: periodData.totalProfit,
                            totalInvestmentPool: periodData.totalInvestmentPool,
                            memberInvestments: periodData.memberInvestments.map((member: any) => ({
                              user_id: member.user_id,
                              amount: member.amount
                            }))
                          };
                          console.log("📊 Calculating profit shares for", modalPeriod, "with auto-loaded data");
                          const response = await ProfitShareService.calculateProfitShares(requestData);
                          if (response.success) {
                            const sharesCreated = response.data?.profitShares?.length || 0;
                            toast.success(`🧮 Successfully calculated profit shares for ${sharesCreated} members in ${modalPeriod}!`);
                            console.log("✅ PROFIT SHARES CALCULATED:", response.data.profitShares);
                            setShowCalculateModal(false);
                            setPeriodData(null);
                            loadProfitShares();
                          } else {
                            toast.error(`❌ Calculation failed: ${response.message}`);
                          }
                        } catch (error: any) {
                          console.error("❌ Calculation error:", error);
                          toast.error(`❌ Failed: ${error.response?.data?.message || error.message}`);
                        } finally {
                          setCalculatingProfit(false);
                        }
                      }}
                      disabled={calculatingProfit || !periodData}
                      className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {calculatingProfit ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin inline" />
                          Calculating...
                        </>
                      ) : (
                        <>Calculate Sharia-Compliant Shares</>
                      )}
                    </button>
                  </div>

                  {!periodData && !loadingPeriodData && (
                    <div className="text-center py-4 text-orange-600">
                      ⚠️ Financial data not available for {modalPeriod}. Please select a different period.
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && selectedShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900">Payment Receipt</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Receipt Header */}
              <div className="text-center pb-4 border-b">
                <h4 className="text-xl font-bold text-gray-900">IMAN Cooperatives</h4>
                <p className="text-sm text-gray-600">Profit Share Payment Receipt</p>
                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm inline-block mt-2">
                  ✓ Paid Successfully
                </div>
              </div>

              {/* Member Details */}
              <div className="space-y-3">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">Member Information</h5>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">Name:</span> {selectedShare.memberName}</p>
                    <p><span className="font-medium">PSN:</span> {selectedShare.memberPsn}</p>
                    <p><span className="font-medium">Member ID:</span> {selectedShare.user_id}</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">Payment Details</h5>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Profit Share Period:</span>
                      <span className="font-medium">{selectedShare.period}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Investment Amount:</span>
                      <span className="font-medium">${Number(selectedShare.member_investment || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Share Percentage:</span>
                      <span className="font-medium">{selectedShare.sharePercentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Amount Paid:</span>
                      <span className="font-bold text-green-600 text-lg">${Number(selectedShare.profitAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">Payment Status</h5>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between items-center">
                      <span>Status:</span>
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">PAID</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Date:</span>
                      <span className="font-medium">{selectedShare.paidDate ? new Date(selectedShare.paidDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calculated Date:</span>
                      <span className="font-medium">{selectedShare.calculatedDate ? new Date(selectedShare.calculatedDate).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Sharia Compliance */}
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-gray-900 mb-2">🕌 Sharia Compliance</h5>
                  <div className="text-xs space-y-1 text-purple-700">
                    <p>✅ No interest (Riba) used in calculations</p>
                    <p>✅ Profit sharing based on actual investment</p>
                    <p>✅ Proportional distribution verified</p>
                    <p>✅ All deductions applied (24.3%)</p>
                  </div>
                </div>

                {/* Receipt Footer */}
                <div className="text-center text-xs text-gray-500 border-t pt-4">
                  <p>This is an official payment receipt from IMAN Cooperatives.</p>
                  <p className="mt-1">Receipt ID: {selectedShare.id}</p>
                  <p className="mt-1">Generated: {new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-6 py-4 bg-gray-50 border-t flex space-x-3">
              <button
                onClick={() => {
                  // Print functionality could be added later
                  window.print();
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                🖨️ Print Receipt
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitSharingPage;
