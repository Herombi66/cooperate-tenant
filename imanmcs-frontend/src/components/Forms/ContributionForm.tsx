import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Search, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const contributionSchema = z.object({
  member_psn: z.string().min(1, 'Member PSN is required'),
  period: z.string().min(1, 'Period is required'),
  savings: z.number().min(0, 'Savings cannot be negative'),
  investment: z.number().min(0, 'Investment cannot be negative'),
  target_saving: z.number().min(0, 'Target saving cannot be negative'),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface ContributionFormProps {
  onClose: () => void;
}

export const ContributionForm: React.FC<ContributionFormProps> = ({ onClose }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      period: new Date().toISOString().slice(0, 7),
      savings: 0,
      investment: 0,
      target_saving: 0,
    },
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await api.get('/members/');
      setMembers(response.data);
    } catch (error) {
      toast.error('Failed to fetch members');
    }
  };

  const filteredMembers = members.filter((member: any) =>
    member.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.user.psn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectMember = (member: any) => {
    setSelectedMember(member);
    setValue('member_psn', member.user.psn);
    setSearchTerm('');
  };

  const savings = Number(watch('savings')) || 0;
  const investment = Number(watch('investment')) || 0;
  const targetSaving = Number(watch('target_saving')) || 0;
  const totalContribution = savings + investment + targetSaving;

  const onSubmit = async (data: ContributionFormData) => {
    setIsSubmitting(true);
    try {
      await api.post('/contributions/', data);

      toast.success('Contribution recorded successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to record contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Record Contribution</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Member Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Member Information</h3>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Member
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or PSN..."
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              {searchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No members found</div>
                  ) : (
                    filteredMembers.map((member: any) => (
                      <button
                        key={member.user.id}
                        type="button"
                        onClick={() => selectMember(member)}
                        className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{member.user.name}</div>
                        <div className="text-sm text-gray-500">PSN: {member.user.psn}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedMember && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-gray-900">{selectedMember.user.name}</h4>
                <p className="text-sm text-gray-600">PSN: {selectedMember.user.psn}</p>
                <p className="text-sm text-gray-600">Facility: {selectedMember.facility_name}</p>
              </div>
            )}

            <input
              {...register('member_psn')}
              type="hidden"
            />
            {errors.member_psn && (
              <p className="text-sm text-red-600">{errors.member_psn.message}</p>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contribution Period *
            </label>
            <input
              {...register('period')}
              type="month"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            {errors.period && (
              <p className="mt-1 text-sm text-red-600">{errors.period.message}</p>
            )}
          </div>

          {/* Contribution Amounts */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-primary-500" />
              Contribution Amounts
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Savings (₦)
                </label>
                <input
                  {...register('savings', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
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
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
                {errors.investment && (
                  <p className="mt-1 text-sm text-red-600">{errors.investment.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Saving (₦)
                </label>
                <input
                  {...register('target_saving', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
                {errors.target_saving && (
                  <p className="mt-1 text-sm text-red-600">{errors.target_saving.message}</p>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-900">Total Contribution:</span>
                <span className="text-lg font-semibold text-primary-600">
                  ₦{totalContribution.toLocaleString()}
                </span>
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
              disabled={isSubmitting || !selectedMember}
              className="px-6 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Contribution'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};