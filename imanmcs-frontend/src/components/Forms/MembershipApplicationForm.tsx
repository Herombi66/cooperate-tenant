import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Building, Phone, DollarSign, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const membershipSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  psn: z.string().min(1, 'PSN is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(11, 'Phone number must be at least 11 digits'),
  facilityName: z.string().min(1, 'Facility name is required'),
  nextOfKinName: z.string().min(2, 'Next of kin name is required'),
  nextOfKinPhone: z.string().min(11, 'Next of kin phone is required'),
  savings: z.number().min(0, 'Savings cannot be negative'),
  investment: z.number().min(0, 'Investment cannot be negative'),
  targetSaving: z.number().min(0, 'Target saving cannot be negative').optional(),
  targetPeriod: z.number().min(1, 'Target period must be at least 1 month').optional(),
}).refine((data) => data.savings + data.investment >= 5000, {
  message: 'Combined savings and investment must be at least ₦5,000',
  path: ['investment'],
});

type MembershipFormData = z.infer<typeof membershipSchema>;

interface MembershipApplicationFormProps {
  onClose: () => void;
}

export const MembershipApplicationForm: React.FC<MembershipApplicationFormProps> = ({ onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<MembershipFormData>({
    resolver: zodResolver(membershipSchema),
    defaultValues: {
      savings: 0,
      investment: 0,
      targetSaving: 0,
      targetPeriod: 12,
    },
  });

  const savingsVal = watch('savings');
  const investmentVal = watch('investment');
  const targetSavingVal = watch('targetSaving');

  const parseAmount = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const savings = parseAmount(savingsVal);
  const investment = parseAmount(investmentVal);
  const targetSaving = parseAmount(targetSavingVal);
  
  const totalContribution = savings + investment + targetSaving;

  const onSubmit = async (data: MembershipFormData) => {
    setIsSubmitting(true);
    try {
      // Transform data to match backend schema
      const applicationData = {
        name: data.name,
        psn: data.psn,
        email: data.email,
        phone: data.phone,
        facility_name: data.facilityName,
        next_of_kin_name: data.nextOfKinName,
        next_of_kin_phone: data.nextOfKinPhone,
        savings: data.savings,
        investment: data.investment,
        target_saving: data.targetSaving || 0,
        target_period: data.targetPeriod || 12,
      };

      try {
        await api.post('/applications/check-duplicate', {
          psn: applicationData.psn,
          email: applicationData.email
        });
      } catch (error: any) {
        if (error?.response?.status === 409) {
          const message =
            error.response?.data?.message ||
            'Duplicate application detected. You already submitted a membership application recently.';
          toast.error(message);
          return;
        }
        throw error;
      }

      await api.post('/applications/apply', applicationData);
      toast.success('Application submitted successfully! You will be contacted soon.');
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to submit application. Please try again.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Apply for Membership</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <User className="w-5 h-5 mr-2 text-primary-500" />
              Personal Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PSN (Personal Service Number) *
                </label>
                <input
                  {...register('psn')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your PSN"
                />
                {errors.psn && (
                  <p className="mt-1 text-sm text-red-600">{errors.psn.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="08012345678"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Facility Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Building className="w-5 h-5 mr-2 text-primary-500" />
              Facility Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility Name *
              </label>
              <input
                {...register('facilityName')}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter your workplace/facility name"
              />
              {errors.facilityName && (
                <p className="mt-1 text-sm text-red-600">{errors.facilityName.message}</p>
              )}
            </div>
          </div>

          {/* Next of Kin */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Phone className="w-5 h-5 mr-2 text-primary-500" />
              Next of Kin
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next of Kin Name *
                </label>
                <input
                  {...register('nextOfKinName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter next of kin name"
                />
                {errors.nextOfKinName && (
                  <p className="mt-1 text-sm text-red-600">{errors.nextOfKinName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next of Kin Phone *
                </label>
                <input
                  {...register('nextOfKinPhone')}
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="08012345678"
                />
                {errors.nextOfKinPhone && (
                  <p className="mt-1 text-sm text-red-600">{errors.nextOfKinPhone.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Initial Contributions */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-500" />
              Initial Contributions (Minimum ₦5,000 combined)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Savings (₦)
                </label>
                <input
                  {...register('savings', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                {errors.savings && (
                  <p className="mt-1 text-sm text-red-600">{errors.savings.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Investment/Shares (₦)
                </label>
                <input
                  {...register('investment', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                {errors.investment && (
                  <p className="mt-1 text-sm text-red-600">{errors.investment.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                Total Initial Contribution: <span className="font-semibold">₦{totalContribution.toLocaleString()}</span>
                {totalContribution < 5000 && (
                  <span className="text-red-600 ml-2">
                    (Minimum ₦5,000 required)
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Note: ₦1,500 entrance fee will be deducted from your first contribution
              </p>
            </div>
          </div>

          {/* Optional Target Savings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary-500" />
              Target Savings (Optional)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount (₦)
                </label>
                <input
                  {...register('targetSaving', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0"
                />
                {errors.targetSaving && (
                  <p className="mt-1 text-sm text-red-600">{errors.targetSaving.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Period (Months)
                </label>
                <input
                  {...register('targetPeriod', { valueAsNumber: true })}
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="12"
                />
                {errors.targetPeriod && (
                  <p className="mt-1 text-sm text-red-600">{errors.targetPeriod.message}</p>
                )}
              </div>
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
              disabled={isSubmitting || totalContribution < 5000}
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
