import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Upload, User, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const loanSchema = z.object({
  type: z.enum(['cash', 'investment']),
  amount: z.number().min(1000, 'Minimum loan amount is ₦1,000'),
  tenure: z.number().min(1, 'Minimum tenure is 1 month').max(24, 'Maximum tenure is 24 months'),
  grantorPsn: z.string().min(1, 'Grantor PSN is required'),
  purpose: z.string().min(10, 'Please provide a detailed purpose (minimum 10 characters)'),
  payslip: z.any().refine((files) => files?.length > 0, 'Payslip is required'),
}).refine((data) => {
  if (data.type === 'cash' && data.amount > 100000) {
    return false;
  }
  return true;
}, {
  message: 'Cash loan cannot exceed ₦100,000',
  path: ['amount'],
});

type LoanFormData = z.infer<typeof loanSchema>;

interface LoanApplicationFormProps {
  onClose: () => void;
  memberInvestment?: number; // For calculating investment loan limit
}

export const LoanApplicationForm: React.FC<LoanApplicationFormProps> = ({ 
  onClose, 
  memberInvestment = 0 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoanFormData>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      type: 'cash',
      tenure: 6,
    },
  });

  const loanType = watch('type');
  const amount = watch('amount') || 0;
  
  const maxAmount = loanType === 'cash' ? 100000 : memberInvestment * 3;
  const adminFee = loanType === 'cash' ? 1000 : 0;
  const totalDeduction = amount + adminFee;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast.error('Please upload a JPG or PNG file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
      setValue('payslip', event.target.files);
    }
  };

  const onSubmit = async (data: LoanFormData) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('type', data.type);
      formData.append('amount', data.amount.toString());
      formData.append('tenure', data.tenure.toString());
      formData.append('grantorPsn', data.grantorPsn);
      formData.append('purpose', data.purpose);
      if (selectedFile) {
        formData.append('payslip', selectedFile);
      }

      await api.post('/loans/apply', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Loan application submitted successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit loan application');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Apply for Loan</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Loan Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-primary-500" />
              Loan Type
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="relative">
                <input
                  {...register('type')}
                  type="radio"
                  value="cash"
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  loanType === 'cash' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <h4 className="font-medium text-gray-900">Cash Loan</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Maximum: ₦100,000<br />
                    Admin Fee: ₦1,000<br />
                    Quick processing
                  </p>
                </div>
              </label>

              <label className="relative">
                <input
                  {...register('type')}
                  type="radio"
                  value="investment"
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  loanType === 'investment' 
                    ? 'border-primary-500 bg-primary-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <h4 className="font-medium text-gray-900">Investment Loan</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Maximum: ₦{(memberInvestment * 3).toLocaleString()}<br />
                    No Admin Fee<br />
                    Based on investment
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Loan Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-500" />
              Loan Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loan Amount (₦) *
                </label>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  min="1000"
                  max={maxAmount}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={`Max: ₦${maxAmount.toLocaleString()}`}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Repayment Tenure (Months) *
                </label>
                <select
                  {...register('tenure', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1} month{i > 0 ? 's' : ''}
                    </option>
                  ))}
                </select>
                {errors.tenure && (
                  <p className="mt-1 text-sm text-red-600">{errors.tenure.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Loan Amount:</span>
                  <span>₦{amount.toLocaleString()}</span>
                </div>
                {adminFee > 0 && (
                  <div className="flex justify-between">
                    <span>Admin Fee:</span>
                    <span>₦{adminFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Deduction:</span>
                  <span>₦{totalDeduction.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-primary-600 font-medium">
                  <span>You'll Receive:</span>
                  <span>₦{(amount - adminFee).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grantor Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-500" />
              Grantor Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grantor PSN *
              </label>
              <input
                {...register('grantorPsn')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter grantor's PSN"
              />
              {errors.grantorPsn && (
                <p className="mt-1 text-sm text-red-600">{errors.grantorPsn.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Grantor must be a valid cooperative member and will need to approve this request
              </p>
            </div>
          </div>

          {/* Purpose */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Loan Purpose
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose of Loan *
              </label>
              <textarea
                {...register('purpose')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Please provide a detailed explanation of how you intend to use this loan..."
              />
              {errors.purpose && (
                <p className="mt-1 text-sm text-red-600">{errors.purpose.message}</p>
              )}
            </div>
          </div>

          {/* Payslip Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-primary-500" />
              Payslip Upload
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recent Payslip (JPG/PNG) *
              </label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
              {errors.payslip && (
                <p className="mt-1 text-sm text-red-600">{String(errors.payslip.message)}</p>
              )}
              {selectedFile && (
                <p className="mt-1 text-sm text-green-600">
                  ✓ {selectedFile.name} selected
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Upload your most recent payslip (Max 5MB, JPG/PNG only)
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};