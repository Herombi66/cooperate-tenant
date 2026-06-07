import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Plus, Eye, CheckCircle, XCircle, Clock,
  Receipt, DollarSign, Calendar, Download, Upload, User, CreditCard, Loader
} from 'lucide-react';
import { ExpenseForm } from '../components/Forms/ExpenseForm';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  type: 'loan_disbursement' | 'office_expense' | 'maintenance' | 'utilities' | 'salary' | 'other';
  description: string;
  amount: number;
  requestedBy: string;
  approvedBy?: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque';
  recipient: string;
  recipientAccount?: string;
  date: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  category: string;
  receiptUrl?: string;
  notes?: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  },
  hover: {
    y: -2,
    transition: { duration: 0.2 }
  }
};

const tableRowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3 }
  },
  hover: {
    backgroundColor: "#f9fafb",
    transition: { duration: 0.2 }
  }
};

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchExpenses();
  }, [page, searchTerm, statusFilter, typeFilter]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(typeFilter !== 'all' && { category: typeFilter })
      });

      const response = await api.get(`/expenses/?${params}`);
      const expenseData = response.data.expenses.map((exp: any) => ({
        id: exp.id.toString(),
        type: exp.type || 'office_expense',
        description: exp.description || '',
        amount: parseFloat(exp.amount || 0), // Ensure it's a number
        requestedBy: 'ADMIN001', // Default for now
        approvedBy: exp.approved_by,
        paymentMethod: exp.payment_method || 'bank_transfer',
        recipient: exp.recipient || '',
        recipientAccount: exp.recipient_account || '',
        date: exp.expense_date ? new Date(exp.expense_date).toISOString().split('T')[0] : (exp.created_at ? new Date(exp.created_at).toISOString().split('T')[0] : ''),
        status: exp.status || 'pending',
        category: exp.category || '',
        receiptUrl: exp.attachments && exp.attachments.length > 0 ? exp.attachments[0].url : null,
        notes: exp.notes || exp.rejected_reason || ''
      }));
      setExpenses(expenseData);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Expenses are now fetched from backend

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesType = typeFilter === 'all' || expense.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return <Receipt className="w-4 h-4" />;
    }
  };

  const handleApprove = async (expense: Expense) => {
    // Check if user has permission to approve expenses
    if (!user || !['admin', 'treasurer', 'chairman'].includes(user.role)) {
      toast.error('You do not have permission to approve expenses');
      return;
    }

    if (confirm(`Approve expense: ${expense.description}?\n\nAmount: ₦${expense.amount.toLocaleString()}`)) {
      try {
        console.log('Approving expense with user ID:', user.id);
        await api.put(`/expenses/${expense.id}`, {
          status: 'approved',
          approved_by: user.id // Current user ID from auth context
        });
        toast.success('Expense approved successfully!');
        fetchExpenses(); // Refresh the list
      } catch (error: any) {
        console.error('Failed to approve expense:', error);
        const message = error.response?.data?.message || 'Failed to approve expense';
        toast.error(message);
      }
    }
  };

  const handlePay = async (expense: Expense) => {
    // Check if user has permission to process payments
    if (!user || !['admin', 'treasurer'].includes(user.role)) {
      toast.error('You do not have permission to process payments');
      return;
    }

    if (confirm(`Process payment for: ${expense.description}?\n\nAmount: ₦${expense.amount.toLocaleString()}\nRecipient: ${expense.recipient}`)) {
      try {
        console.log('Processing payment with user ID:', user.id);
        await api.put(`/expenses/${expense.id}`, {
          status: 'paid',
          paid_by: user.id, // Current user ID from auth context
          payment_date: new Date().toISOString()
        });
        toast.success('Payment processed successfully!');
        fetchExpenses(); // Refresh the list
      } catch (error: any) {
        console.error('Failed to process payment:', error);
        const message = error.response?.data?.message || 'Failed to process payment';
        toast.error(message);
      }
    }
  };

  const handleReject = async (expense: Expense) => {
    const reason = prompt(`Reject expense: ${expense.description}?\n\nPlease provide a reason:`);
    if (reason) {
      try {
        await api.put(`/expenses/${expense.id}`, {
          status: 'rejected',
          notes: reason
        });
        toast.success('Expense rejected successfully!');
        fetchExpenses(); // Refresh the list
      } catch (error) {
        console.error('Failed to reject expense:', error);
        toast.error('Failed to reject expense');
      }
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const paidExpenses = expenses.filter(exp => exp.status === 'paid').reduce((sum, exp) => sum + exp.amount, 0);
  const pendingExpenses = expenses.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0);
  const approvedExpenses = expenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <motion.div
      className="p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="mb-6" variants={cardVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
        <p className="text-gray-600">Manage cooperative expenses, disbursements, and payments</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6" variants={cardVariants}>
        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <Receipt className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                  <p className="text-2xl font-bold text-gray-900">₦{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-gray-900">₦{paidExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">₦{pendingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="bg-white p-6 rounded-lg shadow"
          variants={cardVariants}
          whileHover="hover"
        >
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900">₦{approvedExpenses.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Controls */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full md:w-80"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="loan_disbursement">Loan Disbursement</option>
              <option value="office_expense">Office Expense</option>
              <option value="utilities">Utilities</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => {
                // Export expenses data
                const csvContent = [
                  ['Expense ID', 'Type', 'Description', 'Amount', 'Recipient', 'Status', 'Date'].join(','),
                  ...filteredExpenses.map(exp => [
                    exp.id,
                    exp.type,
                    `"${exp.description}"`,
                    exp.amount,
                    `"${exp.recipient}"`,
                    exp.status,
                    exp.date
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
              }}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-primary-500" />
            <span className="ml-2 text-gray-600">Loading expenses...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expense Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                      <div className="text-sm text-gray-500">{expense.id} • {expense.category}</div>
                      <div className="text-sm text-gray-500 capitalize">{expense.type ? expense.type.replace('_', ' ') : 'Office Expense'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₦{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-sm text-gray-500 capitalize">{expense.paymentMethod ? expense.paymentMethod.replace('_', ' ') : 'Bank Transfer'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{expense.recipient}</div>
                    {expense.recipientAccount && (
                      <div className="text-sm text-gray-500">{expense.recipientAccount}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                      {getStatusIcon(expense.status)}
                      <span className="ml-1 capitalize">{expense.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setShowViewModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {expense.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(expense)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleReject(expense)}
                            className="text-red-600 hover:text-red-900"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {expense.status === 'approved' && (
                        <button
                          onClick={() => handlePay(expense)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Process Payment"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Showing page <span className="font-medium">{page}</span> of{' '}
                <span className="font-medium">{totalPages}</span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                if (pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 text-sm font-medium rounded-md ${
                      pageNum === page
                        ? 'text-primary-600 bg-primary-50 border border-primary-500'
                        : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Expense Modal */}
      {showViewModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Expense Details</h3>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedExpense(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expense ID</label>
                    <p className="text-sm text-gray-900">{selectedExpense.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <p className="text-sm text-gray-900">{selectedExpense.date}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedExpense.status)}`}>
                      {getStatusIcon(selectedExpense.status)}
                      <span className="ml-1 capitalize">{selectedExpense.status}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Expense Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="text-sm text-gray-900">{selectedExpense.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900">{selectedExpense.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedExpense.type ? selectedExpense.type.replace('_', ' ') : 'Office Expense'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount</label>
                    <p className="text-lg font-semibold text-green-600">₦{selectedExpense.amount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Payment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recipient</label>
                    <p className="text-sm text-gray-900">{selectedExpense.recipient}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <p className="text-sm text-gray-900 capitalize">{selectedExpense.paymentMethod ? selectedExpense.paymentMethod.replace('_', ' ') : 'Bank Transfer'}</p>
                  </div>
                  {selectedExpense.recipientAccount && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Account Details</label>
                      <p className="text-sm text-gray-900">{selectedExpense.recipientAccount}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedExpense.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900 bg-white p-3 rounded border">{selectedExpense.notes}</p>
                </div>
              )}

              {/* Receipt Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Receipt/Document</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {selectedExpense.receiptUrl ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Receipt Attached</p>
                          <p className="text-xs text-gray-500">Click to view</p>
                        </div>
                      </div>
                      <button
                        onClick={() => window.open(`${API_URL}${selectedExpense.receiptUrl}`, '_blank')}
                        className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                      >
                        View Receipt
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No receipt attached</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
              <div className="flex space-x-3">
                {selectedExpense.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedExpense);
                        setShowViewModal(false);
                        setSelectedExpense(null);
                      }}
                      className="flex items-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedExpense);
                        setShowViewModal(false);
                        setSelectedExpense(null);
                      }}
                      className="flex items-center px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </button>
                  </>
                )}
                {selectedExpense.status === 'approved' && (
                  <button
                    onClick={() => {
                      handlePay(selectedExpense);
                      setShowViewModal(false);
                      setSelectedExpense(null);
                    }}
                    className="flex items-center px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-sm"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Process Payment
                  </button>
                )}
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedExpense(null);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddModal && (
        <ExpenseForm
          onClose={() => setShowAddModal(false)}
          onSubmit={async (data) => {
            console.log('ExpensesPage: onSubmit called with data:', data);
            // The ExpenseForm now handles the API call directly
            // Refresh the expenses list after successful submission
            await fetchExpenses();
          }}
        />
      )}
    </motion.div>
  );
};
