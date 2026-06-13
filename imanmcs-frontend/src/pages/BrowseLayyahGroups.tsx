import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Heart, DollarSign, Calendar, UserPlus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { LayyahService } from '../services/layyahService';
import { LayyahApplication, AnimalCategory } from '../types';

export const BrowseLayyahGroups: React.FC = () => {
  const [groups, setGroups] = useState<LayyahApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    animal_category?: AnimalCategory;
    price_range?: string;
  }>({});

  useEffect(() => {
    loadAvailableGroups();
  }, []);

  const loadAvailableGroups = async () => {
    try {
      setLoading(true);
      const data = await LayyahService.getAvailableGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
      toast.error('Failed to load available groups');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (applicationId: number) => {
    try {
      const response = await LayyahService.requestToJoinGroup(applicationId);
      toast.success(response.message || 'Join request sent! The group leader will be notified.');
      loadAvailableGroups();
    } catch (error: any) {
      console.error('Error joining group:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to join group';
      toast.error(errorMessage);
    }
  };

  const filteredGroups = groups.filter(group => {
    if (filter.animal_category && group.animal_category !== filter.animal_category) {
      return false;
    }
    if (filter.price_range) {
      const [min, max] = filter.price_range.split('-').map(Number);
      if (group.price_min < min || group.price_max > max) {
        return false;
      }
    }
    return true;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-lg">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Layyah Groups</h1>
            <p className="text-gray-600">Join existing groups or find partners for commodity trading</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="font-medium text-gray-700">Filters:</span>
          </div>
          
          <select
            value={filter.animal_category || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, animal_category: e.target.value as AnimalCategory || undefined }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Animals</option>
            <option value="ram">Ram 🐏</option>
            <option value="sheep">Sheep 🐑</option>
            <option value="goat">Goat 🐐</option>
            <option value="cow">Cow 🐄</option>
          </select>

          <select
            value={filter.price_range || ''}
            onChange={(e) => setFilter(prev => ({ ...prev, price_range: e.target.value || undefined }))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Price Ranges</option>
            <option value="0-50000">₦0 - ₦50,000</option>
            <option value="50000-100000">₦50,000 - ₦100,000</option>
            <option value="100000-200000">₦100,000 - ₦200,000</option>
            <option value="200000-999999999">₦200,000+</option>
          </select>

          {(filter.animal_category || filter.price_range) && (
            <button
              onClick={() => setFilter({})}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </motion.div>

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <motion.div variants={itemVariants} className="text-center py-12">
          <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Groups</h3>
          <p className="text-gray-600">
            {groups.length === 0 
              ? "There are no groups available at the moment. Create your own group to get started!"
              : "No groups match your current filters. Try adjusting your search criteria."
            }
          </p>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-primary-600" />
                  <span className="font-medium">Group</span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${LayyahService.getStatusColor(group.status)}`}>
                  {LayyahService.getStatusLabel(group.status)}
                </span>
              </div>

              {/* Animal Category */}
              <div className="mb-4">
                <div className="text-2xl mb-2">
                  {group.animal_category === 'ram' && '🐏'}
                  {group.animal_category === 'sheep' && '🐑'}
                  {group.animal_category === 'goat' && '🐐'}
                  {group.animal_category === 'cow' && '🐄'}
                </div>
                <h3 className="font-semibold text-gray-900 capitalize">
                  {LayyahService.getAnimalCategoryLabel(group.animal_category)}
                </h3>
              </div>

              {/* Group Leader */}
              <div className="mb-4">
                <div className="text-sm text-gray-600 mb-1">Group Leader</div>
                <div className="font-medium">{group.applicant_name || 'Unknown'}</div>
              </div>

              {/* Price Range */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span>Price Range</span>
                </div>
                <div className="font-medium text-green-600">
                  {LayyahService.formatPriceRange(group.price_min, group.price_max)}
                </div>
              </div>

              {/* Group Size */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <Users className="h-4 w-4" />
                  <span>Members</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="font-medium">
                    {(group.group_member_count || 0) + 1} / 5
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((group.group_member_count || 0) + 1) * 20}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created</span>
                </div>
                <div className="text-sm">
                  {new Date(group.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Join Button */}
              <button
                onClick={() => handleJoinGroup(group.id)}
                disabled={(group.group_member_count || 0) >= 4} // Max 4 additional members
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus className="h-4 w-4" />
                <span>
                  {(group.group_member_count || 0) >= 4 ? 'Group Full' : 'Request to Join'}
                </span>
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};
