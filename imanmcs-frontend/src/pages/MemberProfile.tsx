import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Edit,
  Save,
  X,
  Loader,
  Camera,
  Sliders,
  CheckCircle,
  Shield,
  Heart,
  Building,
  BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { API_URL } from '../config';
import toast from 'react-hot-toast';
import { useTenantTerminology } from '../utils/tenantTerminology';
import { ImageCropModal } from '../components/ImageCropModal';

export const MemberProfile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { idLabel } = useTenantTerminology();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile image & adjustment states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      nextOfKinPhone: '',
    },
    professionalInfo: {
      facilityName: '',
      position: '',
      department: '',
      yearsOfExperience: '',
      employeeId: '',
      monthlyIncome: '',
    },
    cooperativeInfo: {
      psn: '',
      memberSince: '',
      membershipType: 'Regular Member',
      targetSaving: '',
      targetPeriod: '12 months',
      referredBy: '',
      profileImage: '',
    },
  });

  const getProfileImageUrl = (path?: string | null): string => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const base = API_URL.replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/auth/me');
      const userData = response.data.user;
      const applicationData = userData?.profile || {};

      setFormData({
        personalInfo: {
          name: applicationData.name || userData?.name || '',
          email: applicationData.email || userData?.email || '',
          phone: applicationData.phone || userData?.phone || '',
          address: applicationData.address || '',
          dateOfBirth: applicationData.date_of_birth
            ? new Date(applicationData.date_of_birth).toISOString().split('T')[0]
            : '',
          gender: applicationData.gender || '',
          maritalStatus: applicationData.marital_status || '',
          nextOfKin: applicationData.next_of_kin_name || '',
          nextOfKinPhone: applicationData.next_of_kin_phone || '',
        },
        professionalInfo: {
          facilityName: applicationData.facility_name || '',
          position: applicationData.position || '',
          department: applicationData.department || '',
          yearsOfExperience: applicationData.years_of_experience
            ? String(applicationData.years_of_experience)
            : '',
          employeeId: applicationData.employee_id || '',
          monthlyIncome: applicationData.monthly_income ? String(applicationData.monthly_income) : '',
        },
        cooperativeInfo: {
          psn: applicationData.psn || userData?.psn || '',
          memberSince: applicationData.review_date
            ? new Date(applicationData.review_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : applicationData.created_at
            ? new Date(applicationData.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '',
          membershipType: applicationData.status === 'approved' ? 'Regular Member' : 'Active Member',
          targetSaving: applicationData.target_saving
            ? `₦${Number(applicationData.target_saving).toLocaleString()}`
            : '',
          targetPeriod: '12 months',
          referredBy: applicationData.referred_by || '',
          profileImage: applicationData.profile_image || userData?.profile_image || '',
        },
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, []);

  const handleInputChange = (section: 'personalInfo' | 'professionalInfo', field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file (PNG, JPG, JPEG, WEBP)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image size must be 12MB or smaller');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setRawImageForCrop(dataUrl);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected if desired
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCropComplete = (croppedFile: File, previewUrl: string) => {
    setSelectedImage(croppedFile);
    setImagePreview(previewUrl);
    setIsEditing(true);
    toast.success('Picture adjusted to fit! Click "Save Changes" to apply.');
  };

  const handleReAdjustCurrentPicture = () => {
    const currentSrc =
      imagePreview ||
      (formData.cooperativeInfo.profileImage ? getProfileImageUrl(formData.cooperativeInfo.profileImage) : null);
    if (!currentSrc) {
      fileInputRef.current?.click();
      return;
    }
    setRawImageForCrop(currentSrc);
    setCropModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.personalInfo.name.trim()) return toast.error('Full Name is required');
      if (!formData.personalInfo.email.trim()) return toast.error('Email address is required');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalInfo.email.trim())) {
        return toast.error('Please enter a valid email address');
      }
      if (!formData.personalInfo.phone.trim()) return toast.error('Phone number is required');

      setSaving(true);

      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.personalInfo.name.trim());
      formDataToSend.append('email', formData.personalInfo.email.trim());
      formDataToSend.append('phone', formData.personalInfo.phone.trim());
      formDataToSend.append('address', formData.personalInfo.address.trim());
      formDataToSend.append('dateOfBirth', formData.personalInfo.dateOfBirth);
      formDataToSend.append('gender', formData.personalInfo.gender);
      formDataToSend.append('maritalStatus', formData.personalInfo.maritalStatus);
      formDataToSend.append('nextOfKin', formData.personalInfo.nextOfKin.trim());
      formDataToSend.append('nextOfKinPhone', formData.personalInfo.nextOfKinPhone.trim());

      formDataToSend.append('facilityName', formData.professionalInfo.facilityName.trim());
      formDataToSend.append('position', formData.professionalInfo.position.trim());
      formDataToSend.append('department', formData.professionalInfo.department.trim());
      formDataToSend.append('yearsOfExperience', formData.professionalInfo.yearsOfExperience);
      formDataToSend.append('employeeId', formData.professionalInfo.employeeId.trim());
      formDataToSend.append('monthlyIncome', formData.professionalInfo.monthlyIncome.replace(/[₦,]/g, '').trim());

      if (selectedImage) {
        formDataToSend.append('profileImage', selectedImage);
      }

      await api.put('/auth/profile', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSelectedImage(null);
      setImagePreview(null);
      await fetchProfileData();
      await refreshUser();

      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedImage(null);
    setImagePreview(null);
    fetchProfileData();
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader className="w-9 h-9 animate-spin text-primary-600 mb-3" />
        <span className="text-sm font-medium text-muted-foreground">Loading profile details...</span>
      </div>
    );
  }

  const currentDisplayImage =
    imagePreview ||
    (formData.cooperativeInfo.profileImage ? getProfileImageUrl(formData.cooperativeInfo.profileImage) : null);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <User className="w-6 h-6" />
            </div>
            My Profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your personal and professional information
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving Changes...' : 'Save Changes'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 border border-border bg-card hover:bg-muted text-foreground text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Cooperative Overview */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
            {/* Avatar with adjust overlay */}
            <div className="relative w-32 h-32 mx-auto mb-4 group">
              <div className="w-32 h-32 rounded-full ring-4 ring-primary-100 dark:ring-primary-950/80 overflow-hidden bg-muted flex items-center justify-center shadow-inner">
                {currentDisplayImage ? (
                  <img
                    src={currentDisplayImage}
                    alt={formData.personalInfo.name || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-muted-foreground" />
                )}
              </div>

              {/* Upload trigger button on avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-md transition-transform hover:scale-105"
                title="Upload & Adjust Profile Picture"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />

            {/* Adjust Photo Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
              >
                <Camera className="w-3.5 h-3.5 text-primary-600" />
                Change Photo
              </button>
              {currentDisplayImage && (
                <button
                  type="button"
                  onClick={handleReAdjustCurrentPicture}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
                  title="Adjust zoom and fit"
                >
                  <Sliders className="w-3.5 h-3.5 text-primary-600" />
                  Adjust Fit
                </button>
              )}
            </div>

            {selectedImage && (
              <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Adjusted photo ready to save!</span>
              </div>
            )}

            <h3 className="text-lg font-bold text-foreground">{formData.personalInfo.name || 'Member'}</h3>
            <p className="text-sm font-medium text-muted-foreground mt-0.5">
              {idLabel}: <span className="font-semibold text-foreground">{formData.cooperativeInfo.psn || 'N/A'}</span>
            </p>

            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300">
              <BadgeCheck className="w-3.5 h-3.5" />
              {formData.cooperativeInfo.membershipType}
            </div>

            {formData.cooperativeInfo.memberSince && (
              <div className="mt-5 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs text-muted-foreground">
                <Calendar className="w-4 h-4 inline mr-1.5 text-primary-600" />
                Member since <span className="font-semibold text-foreground">{formData.cooperativeInfo.memberSince}</span>
              </div>
            )}
          </div>

          {/* Quick Notice Card */}
          <div className="bg-card border border-border rounded-xl p-5 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <Shield className="w-4 h-4 text-primary-600" />
              Account Security & Verification
            </div>
            <p>
              Your cooperative identifier and official records are verified by the cooperative administration.
              Keep your contact details up to date to receive financial statements and loan notices.
            </p>
          </div>
        </div>

        {/* Right Column: Information Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2 border-b border-border pb-3">
              <User className="w-5 h-5 text-primary-600" />
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.personalInfo.name}
                    onChange={(e) => handleInputChange('personalInfo', 'name', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Enter full name"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">{formData.personalInfo.name || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.personalInfo.email}
                    onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="email@example.com"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    {formData.personalInfo.email || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.personalInfo.phone}
                    onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="+234..."
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {formData.personalInfo.phone || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={formData.personalInfo.dateOfBirth}
                    onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {formData.personalInfo.dateOfBirth
                      ? new Date(formData.personalInfo.dateOfBirth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Gender</label>
                {isEditing ? (
                  <select
                    value={formData.personalInfo.gender}
                    onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">{formData.personalInfo.gender || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Marital Status</label>
                {isEditing ? (
                  <select
                    value={formData.personalInfo.maritalStatus}
                    onChange={(e) => handleInputChange('personalInfo', 'maritalStatus', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">{formData.personalInfo.maritalStatus || '—'}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Residential Address</label>
              {isEditing ? (
                <textarea
                  value={formData.personalInfo.address}
                  onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
                  rows={2}
                  className="w-full border border-border bg-card rounded-lg px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  placeholder="Enter current residential address"
                />
              ) : (
                <p className="text-sm font-medium text-foreground py-2 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  {formData.personalInfo.address || '—'}
                </p>
              )}
            </div>
          </div>

          {/* Professional Information */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2 border-b border-border pb-3">
              <Briefcase className="w-5 h-5 text-primary-600" />
              Professional & Employment Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Organization / Facility</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.facilityName}
                    onChange={(e) => handleInputChange('professionalInfo', 'facilityName', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Federal Medical Centre Kumo"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    {formData.professionalInfo.facilityName || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Position / Job Title</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.position}
                    onChange={(e) => handleInputChange('professionalInfo', 'position', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="e.g. Senior Medical Officer"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">{formData.professionalInfo.position || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Department / Unit</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.professionalInfo.department}
                    onChange={(e) => handleInputChange('professionalInfo', 'department', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="e.g. Clinical Services"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">{formData.professionalInfo.department || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Years of Experience</label>
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.professionalInfo.yearsOfExperience}
                    onChange={(e) => handleInputChange('professionalInfo', 'yearsOfExperience', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="e.g. 5"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {formData.professionalInfo.yearsOfExperience
                      ? `${formData.professionalInfo.yearsOfExperience} years`
                      : '—'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Emergency Contact & Next of Kin */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-foreground mb-5 flex items-center gap-2 border-b border-border pb-3">
              <Heart className="w-5 h-5 text-rose-500" />
              Next of Kin & Emergency Contact
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Next of Kin Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.personalInfo.nextOfKin}
                    onChange={(e) => handleInputChange('personalInfo', 'nextOfKin', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="Full name of next of kin"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">{formData.personalInfo.nextOfKin || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Next of Kin Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.personalInfo.nextOfKinPhone}
                    onChange={(e) => handleInputChange('personalInfo', 'nextOfKinPhone', e.target.value)}
                    className="w-full border border-border bg-card rounded-lg px-3.5 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    placeholder="+234..."
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {formData.personalInfo.nextOfKinPhone || '—'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Image Cropper & Adjuster Modal */}
      <ImageCropModal
        isOpen={cropModalOpen}
        imageSrc={rawImageForCrop}
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};

export default MemberProfile;
