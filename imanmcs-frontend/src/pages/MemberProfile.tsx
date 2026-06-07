import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Calendar, Edit, Save, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { API_URL } from '../config';
import toast from 'react-hot-toast';

export const MemberProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phone: '',
      address: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      nextOfKin: '',
      nextOfKinPhone: ''
    },
    professionalInfo: {
      facilityName: '',
      position: '',
      department: '',
      yearsOfExperience: '',
      employeeId: '',
      monthlyIncome: ''
    },
    cooperativeInfo: {
      psn: '',
      memberSince: '',
      membershipType: 'Regular Member',
      targetSaving: '',
      targetPeriod: '12 months',
      referredBy: '',
      profileImage: ''
    }
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      const applicationData = userData?.profile || {};

      setFormData({
        personalInfo: {
          name: applicationData.name || '',
          email: applicationData.email || '',
          phone: applicationData.phone || '',
          address: applicationData.address || '',
          dateOfBirth: applicationData.date_of_birth ? new Date(applicationData.date_of_birth).toISOString().split('T')[0] : '',
          gender: applicationData.gender || '',
          maritalStatus: applicationData.marital_status || '',
          nextOfKin: applicationData.next_of_kin_name || '',
          nextOfKinPhone: applicationData.next_of_kin_phone || ''
        },
        professionalInfo: {
          facilityName: applicationData.facility_name || '',
          position: applicationData.position || '',
          department: applicationData.department || '',
          yearsOfExperience: applicationData.years_of_experience || '',
          employeeId: applicationData.employee_id || '',
          monthlyIncome: applicationData.monthly_income || ''
        },
        cooperativeInfo: {
          psn: applicationData.psn || '',
          memberSince: applicationData.review_date ? new Date(applicationData.review_date).toLocaleDateString() : (applicationData.created_at ? new Date(applicationData.created_at).toLocaleDateString() : ''),
          membershipType: applicationData.status === 'approved' ? 'Regular Member' : 'Pending',
          targetSaving: applicationData.target_saving ? `₦${applicationData.target_saving.toLocaleString()}` : '',
          targetPeriod: '12 months',
          referredBy: applicationData.referred_by || '',
          profileImage: applicationData.profile_image || userData?.profile_image || ''
        }
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.personalInfo.name.trim()) return toast.error('Name is required');
      if (!formData.personalInfo.email.trim()) return toast.error('Email is required');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalInfo.email.trim())) return toast.error('Enter a valid email address');
      if (!formData.personalInfo.phone.trim()) return toast.error('Phone is required');

      if (selectedImage) {
        if (selectedImage.size > 5 * 1024 * 1024) return toast.error('Profile image must be 5MB or smaller');
        if (!selectedImage.type.startsWith('image/')) return toast.error('Profile image must be an image file');
      }

      setSaving(true);

      // Create FormData for file upload
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append('name', formData.personalInfo.name);
      formDataToSend.append('email', formData.personalInfo.email);
      formDataToSend.append('phone', formData.personalInfo.phone);
      formDataToSend.append('address', formData.personalInfo.address);
      formDataToSend.append('dateOfBirth', formData.personalInfo.dateOfBirth);
      formDataToSend.append('gender', formData.personalInfo.gender);
      formDataToSend.append('maritalStatus', formData.personalInfo.maritalStatus);
      formDataToSend.append('nextOfKin', formData.personalInfo.nextOfKin);
      formDataToSend.append('nextOfKinPhone', formData.personalInfo.nextOfKinPhone);
      formDataToSend.append('facilityName', formData.professionalInfo.facilityName);
      formDataToSend.append('position', formData.professionalInfo.position);
      formDataToSend.append('department', formData.professionalInfo.department);
      formDataToSend.append('yearsOfExperience', formData.professionalInfo.yearsOfExperience);
      formDataToSend.append('employeeId', formData.professionalInfo.employeeId);
      formDataToSend.append('monthlyIncome', formData.professionalInfo.monthlyIncome.replace(/[₦,]/g, ''));

      // Add image file if selected
      if (selectedImage) {
        formDataToSend.append('profileImage', selectedImage);
      }

      await api.put('/auth/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reset image states
      setSelectedImage(null);
      setImagePreview(null);

      // Refresh data from server to show updated information
      await fetchProfileData();

      // Refresh user data in AuthContext to update header
      await refreshUser();

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error((error as any)?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original values by refetching
    fetchProfileData();
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-2 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your personal and professional information</p>
        </div>
        <div className="flex space-x-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                {imagePreview || formData.cooperativeInfo.profileImage ? (
                  <img
                    src={imagePreview || (formData.cooperativeInfo.profileImage ? `${API_URL}${formData.cooperativeInfo.profileImage}` : '')}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary-500" />
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 bg-primary-500 text-white rounded-full p-1 cursor-pointer hover:bg-primary-600">
                  <Edit className="w-3 h-3" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedImage(file);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          setImagePreview(e.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{formData.personalInfo.name}</h3>
            <p className="text-gray-600">{formData.cooperativeInfo.psn}</p>
            <p className="text-sm text-gray-500">{formData.cooperativeInfo.membershipType}</p>

            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <Calendar className="w-4 h-4 inline mr-1" />
                Member since {formData.cooperativeInfo.memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.personalInfo.name}
                    onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.personalInfo.email}
                    onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.email}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.personalInfo.phone}
                    onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.dateOfBirth}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                {isEditing ? (
                  <select
                    value={formData.personalInfo.gender}
                    onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.gender}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                {isEditing ? (
                  <select
                    value={formData.personalInfo.maritalStatus}
                    onChange={(e) => handleInputChange('personalInfo', 'maritalStatus', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.maritalStatus}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              {isEditing ? (
                <textarea
                  value={formData.personalInfo.address}
                  onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              ) : (
                <p className="text-sm text-gray-900 py-2">{formData.personalInfo.address}</p>
              )}
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Briefcase className="w-5 h-5 mr-2" />
              Professional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Healthcare Facility</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.facilityName}
                    onChange={(e) => handleInputChange('professionalInfo', 'facilityName', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.professionalInfo.facilityName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.position}
                    onChange={(e) => handleInputChange('professionalInfo', 'position', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.professionalInfo.position}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.department}
                    onChange={(e) => handleInputChange('professionalInfo', 'department', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.professionalInfo.department}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.yearsOfExperience}
                    onChange={(e) => handleInputChange('professionalInfo', 'yearsOfExperience', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.professionalInfo.yearsOfExperience} years</p>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Phone className="w-5 h-5 mr-2" />
              Emergency Contact
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.personalInfo.nextOfKin}
                    onChange={(e) => handleInputChange('personalInfo', 'nextOfKin', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.nextOfKin}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next of Kin Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.personalInfo.nextOfKinPhone}
                    onChange={(e) => handleInputChange('personalInfo', 'nextOfKinPhone', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-sm text-gray-900 py-2">{formData.personalInfo.nextOfKinPhone}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
