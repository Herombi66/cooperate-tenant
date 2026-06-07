import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, User, DollarSign, Calendar, Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { LayyahService } from '../../services/layyahService';
import { LayyahKind, AnimalCategory } from '../../types';

const layyahSchema = z.object({
  kind: z.enum(['individual', 'group'] as const),
  animal_category: z.enum(['ram', 'sheep', 'goat', 'cow'] as const),
  price_min: z.number().min(1000, 'Minimum price is ₦1,000'),
  price_max: z.number().min(1000, 'Maximum price is ₦1,000'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
}).refine((data) => {
  return data.price_max >= data.price_min;
}, {
  message: 'Maximum price must be greater than or equal to minimum price',
  path: ['price_max'],
});

type LayyahFormData = z.infer<typeof layyahSchema>;

interface LayyahApplicationFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const LayyahApplicationForm: React.FC<LayyahApplicationFormProps> = ({ 
  onClose, 
  onSuccess 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LayyahFormData>({
    resolver: zodResolver(layyahSchema),
    defaultValues: {
      kind: 'individual',
      animal_category: 'ram',
    },
  });

  const kind = watch('kind');
  const animalCategory = watch('animal_category');
  const priceMin = watch('price_min') || 0;
  const priceMax = watch('price_max') || 0;

  const onSubmit = async (data: LayyahFormData) => {
    setIsSubmitting(true);
    try {
      const myApps = await LayyahService.getMyApplications();
      const duplicate = LayyahService.findDuplicateApplication(myApps, data);
      if (duplicate) {
        toast.error('Duplicate application detected. You already have a Layyah application.');
        setIsSubmitting(false);
        return;
      }

      await LayyahService.createApplication(data);
      toast.success('Layyah application submitted successfully!');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.message || error.response?.data?.detail || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const animalOptions = [
    { value: 'ram', label: 'Ram', icon: '🐏' },
    { value: 'sheep', label: 'Sheep', icon: '🐑' },
    { value: 'goat', label: 'Goat', icon: '🐐' },
    { value: 'cow', label: 'Cow', icon: '🐄' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Layyah Application</h2>
                <p className="text-sm text-gray-600">Apply for commodity trading program</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Application Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Application Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="relative">
                  <input
                    type="radio"
                    value="individual"
                    {...register('kind')}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    kind === 'individual' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">Individual</div>
                        <div className="text-sm text-gray-500">Apply alone</div>
                      </div>
                    </div>
                  </div>
                </label>
                <label className="relative">
                  <input
                    type="radio"
                    value="group"
                    {...register('kind')}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    kind === 'group' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">Group</div>
                        <div className="text-sm text-gray-500">Apply with others (max 5)</div>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              {errors.kind && (
                <p className="mt-1 text-sm text-red-600">{errors.kind.message}</p>
              )}
            </div>

            {/* Animal Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Animal Category
              </label>
              <div className="grid grid-cols-2 gap-4">
                {animalOptions.map((option) => (
                  <label key={option.value} className="relative">
                    <input
                      type="radio"
                      value={option.value}
                      {...register('animal_category')}
                      className="sr-only"
                    />
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      animalCategory === option.value 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div className="font-medium">{option.label}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.animal_category && (
                <p className="mt-1 text-sm text-red-600">{errors.animal_category.message}</p>
              )}
            </div>

            {/* Price Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Price (₦)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    {...register('price_min', { valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="10,000"
                    min="1000"
                    step="1000"
                  />
                </div>
                {errors.price_min && (
                  <p className="mt-1 text-sm text-red-600">{errors.price_min.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Price (₦)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    {...register('price_max', { valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="50,000"
                    min="1000"
                    step="1000"
                  />
                </div>
                {errors.price_max && (
                  <p className="mt-1 text-sm text-red-600">{errors.price_max.message}</p>
                )}
              </div>
            </div>

            {/* Price Range Display */}
            {priceMin > 0 && priceMax > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Price Range:</div>
                <div className="font-medium text-green-600">
                  {LayyahService.formatPriceRange(priceMin, priceMax)}
                </div>
              </div>
            )}

            {/* Date Range (Optional) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Start Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    {...register('start_date')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred End Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    {...register('end_date')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Group Information */}
            {kind === 'group' && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Group Application Information</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Maximum group size is 5 members (including you)</li>
                  <li>• You can invite other members after submitting this application</li>
                  <li>• All group members must accept the invitation</li>
                  <li>• Group applications require approval from all members</li>
                </ul>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Application</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
