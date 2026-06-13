import React, { useState, useEffect } from 'react';
import { User, Briefcase, FileText, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export const MemberApplicationPage: React.FC = () => {
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    personalInfo: {
      psn: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      address: '',
      city: '',
      state: 'Gombe',
      nationality: 'Nigerian'
    },
    professionalInfo: {
      facilityName: '',
      facilityAddress: '',
      position: '',
      yearsOfExperience: '',
      monthlyIncome: '',
      employmentType: ''
    },
    cooperativeInfo: {
      referredBy: '',
      initialSavings: '',
      initialInvestment: '',
      targetSavings: '',
      reasonForJoining: ''
    },
    customFields: {} as Record<string, any>
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await api.get('/custom-fields?entity_type=User');
        if (response.data?.success) {
          setCustomFields(response.data.fields);
          // Initialize formData.customFields with default values
          const initialCustomFields: Record<string, any> = {};
          response.data.fields.forEach((field: any) => {
            initialCustomFields[field.field_key] = '';
          });
          setFormData(prev => ({
            ...prev,
            customFields: { ...initialCustomFields, ...prev.customFields }
          }));
        }
      } catch (error) {
        console.error('Failed to fetch custom fields:', error);
      }
    };
    fetchCustomFields();
  }, []);

  const normalizePsn = (value: string) => value.trim().toUpperCase();
  const isValidPsn = (value: string) => /^[A-Z0-9]{5,20}$/.test(normalizePsn(value));

  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
  const normalizePhone = (value: string) => String(value || '').replace(/[^\d]/g, '');
  const isValidPhone = (value: string) => {
    const digits = normalizePhone(value);
    return digits.length >= 11 && digits.length <= 15;
  };

  const validateCurrentStep = (step: number) => {
    const { personalInfo, professionalInfo, cooperativeInfo } = formData;

    if (step === 1) {
      if (!personalInfo.firstName.trim()) return toast.error('Please enter your first name'), false;
      if (!personalInfo.lastName.trim()) return toast.error('Please enter your last name'), false;
      if (!personalInfo.psn.trim()) return toast.error('Please enter your PSN'), false;
      if (!isValidPsn(personalInfo.psn)) return toast.error('PSN must be 5-20 characters and contain only letters and numbers'), false;
      if (!personalInfo.email.trim() || !isValidEmail(personalInfo.email)) return toast.error('Please enter a valid email address'), false;
      if (!personalInfo.phone.trim() || !isValidPhone(personalInfo.phone)) return toast.error('Please enter a valid phone number (at least 11 digits)'), false;
      if (!personalInfo.dateOfBirth) return toast.error('Please select your date of birth'), false;
      if (!personalInfo.gender) return toast.error('Please select your gender'), false;
      if (!personalInfo.address.trim()) return toast.error('Please enter your address'), false;
      
      // Validate custom fields
      for (const field of customFields) {
        if (field.is_required && !formData.customFields[field.field_key]) {
          return toast.error(`Please enter a value for ${field.field_label}`), false;
        }
      }
      return true;
    }

    if (step === 2) {
      if (!professionalInfo.facilityName.trim()) return toast.error('Please enter your facility name'), false;
      if (!professionalInfo.position.trim()) return toast.error('Please enter your position/title'), false;
      if (!professionalInfo.yearsOfExperience) return toast.error('Please select your years of experience'), false;
      if (!professionalInfo.monthlyIncome) return toast.error('Please select your monthly income range'), false;
      if (!professionalInfo.facilityAddress.trim()) return toast.error('Please enter your facility address'), false;
      return true;
    }

    if (step === 3) {
      const savings = parseFloat(cooperativeInfo.initialSavings) || 0;
      const investment = parseFloat(cooperativeInfo.initialInvestment) || 0;
      const totalContribution = savings + investment;
      if (totalContribution < 5000) {
        toast.error('Combined savings and investment must be at least ₦5,000');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleInputChange = (section: string, field: string, value: string) => {
    if (section === 'customFields') {
      setFormData(prev => ({
        ...prev,
        customFields: {
          ...prev.customFields,
          [field]: value
        }
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: section === 'personalInfo' && field === 'psn' ? normalizePsn(value) : value
      }
    }));
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Form submission started...');
    setIsSubmitting(true);

    try {
      const { personalInfo, professionalInfo, cooperativeInfo } = formData;
      for (const step of [1, 2, 3]) {
        if (!validateCurrentStep(step)) return;
      }

      // Calculate total contribution
      const savings = parseFloat(cooperativeInfo.initialSavings) || 0;
      const investment = parseFloat(cooperativeInfo.initialInvestment) || 0;
      const totalContribution = savings + investment;

      if (totalContribution < 5000) {
        toast.error('Combined savings and investment must be at least ₦5,000');
        return;
      }

      // Prepare data for backend API
      const applicationData = {
        name: `${personalInfo.firstName} ${personalInfo.lastName}`,
        psn: normalizePsn(personalInfo.psn),
        email: personalInfo.email.trim(),
        phone: personalInfo.phone.trim(),
        facility_name: professionalInfo.facilityName,
        next_of_kin_name: `${personalInfo.firstName} ${personalInfo.lastName}`, // Using same as applicant for now
        next_of_kin_phone: personalInfo.phone.trim(), // Using same phone for now
        savings: savings,
        investment: investment,
        target_saving: parseFloat(cooperativeInfo.targetSavings) || 0,
        target_period: 12, // Default to 12 months
        metadata: formData.customFields
      };

      console.log('Submitting application data:', applicationData);

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

      // Make API call to backend
      const response = await api.post('/applications/apply', applicationData);

      console.log('API Response:', response.data);

      const applicationId = response.data?.application?.id || response.data?.application_id;
      const submittedPsn = response.data?.application?.psn || applicationData.psn;

      // Show success message
      toast.success(
        `🎉 Application submitted successfully!\n\nApplication ID: ${applicationId}\nPSN: ${submittedPsn}\n\nThank you for applying to IMAN Cooperative!`,
        { duration: 8000 }
      );

      // Reset form
      setFormData({
        personalInfo: {
          psn: '',
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          gender: '',
          maritalStatus: '',
          address: '',
          city: '',
          state: 'Gombe',
          nationality: 'Nigerian'
        },
        professionalInfo: {
          facilityName: '',
          facilityAddress: '',
          position: '',
          yearsOfExperience: '',
          monthlyIncome: '',
          employmentType: ''
        },
        cooperativeInfo: {
          referredBy: '',
          initialSavings: '',
          initialInvestment: '',
          targetSavings: '',
          reasonForJoining: ''
        },
        customFields: Object.keys(formData.customFields).reduce((acc, key) => ({...acc, [key]: ''}), {})
      });

      // Reset to first step
      setCurrentStep(1);

    } catch (error: any) {
      console.error('Submission error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);

      let message = 'Failed to submit application. Please try again.';

      if (error.response?.status === 409) {
        // Handle duplicate member error specifically
        message = error.response.data?.message || 'A member with this PSN or email already exists. Please use different contact information.';
      } else if (error.response?.status === 400) {
        // Handle validation errors
        message = error.response.data?.message || 'Please check your information and try again.';
      } else if (error.response?.data?.message) {
        // Use backend error message if available
        message = error.response.data.message;
      } else if (error.response?.data?.detail) {
        // Some APIs return error details
        message = error.response.data.detail;
      } else if (error.message) {
        // Network or other errors
        message = `Network error: ${error.message}`;
      }

      toast.error(message, { duration: 6000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <User className="w-5 h-5 text-primary-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="membership-psn" className="block text-sm font-medium text-gray-700 mb-1">PSN (Personal Subhead Number) *</label>
          <input
            id="membership-psn"
            type="text"
            required
            value={formData.personalInfo.psn}
            onChange={(e) => handleInputChange('personalInfo', 'psn', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter your PSN"
          />
          <p className="text-xs text-gray-500 mt-1">5-20 characters (letters and numbers only).</p>
        </div>
        <div>
          <label htmlFor="membership-first-name" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
          <input
            id="membership-first-name"
            type="text"
            required
            value={formData.personalInfo.firstName}
            onChange={(e) => handleInputChange('personalInfo', 'firstName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-last-name" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
          <input
            id="membership-last-name"
            type="text"
            required
            value={formData.personalInfo.lastName}
            onChange={(e) => handleInputChange('personalInfo', 'lastName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-email" className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
          <input
            id="membership-email"
            type="email"
            required
            value={formData.personalInfo.email}
            onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <input
            id="membership-phone"
            type="tel"
            required
            value={formData.personalInfo.phone}
            onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-dob" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
          <input
            id="membership-dob"
            type="date"
            required
            value={formData.personalInfo.dateOfBirth}
            onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-gender" className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
          <select
            id="membership-gender"
            required
            value={formData.personalInfo.gender}
            onChange={(e) => handleInputChange('personalInfo', 'gender', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="membership-address" className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
        <textarea
          id="membership-address"
          required
          rows={3}
          value={formData.personalInfo.address}
          onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Render Dynamic Custom Fields */}
      {customFields.length > 0 && (
        <div className="pt-6 border-t border-gray-200 mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Additional Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customFields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.field_label} {field.is_required && '*'}
                </label>
                {field.field_type === 'text' && (
                  <input
                    type="text"
                    required={field.is_required}
                    value={formData.customFields[field.field_key] || ''}
                    onChange={(e) => handleInputChange('customFields', field.field_key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
                {field.field_type === 'number' && (
                  <input
                    type="number"
                    required={field.is_required}
                    value={formData.customFields[field.field_key] || ''}
                    onChange={(e) => handleInputChange('customFields', field.field_key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
                {field.field_type === 'date' && (
                  <input
                    type="date"
                    required={field.is_required}
                    value={formData.customFields[field.field_key] || ''}
                    onChange={(e) => handleInputChange('customFields', field.field_key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                )}
                {field.field_type === 'boolean' && (
                  <select
                    required={field.is_required}
                    value={formData.customFields[field.field_key] || ''}
                    onChange={(e) => handleInputChange('customFields', field.field_key, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProfessionalInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <Briefcase className="w-5 h-5 text-primary-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Professional Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="membership-facility-name" className="block text-sm font-medium text-gray-700 mb-1">Healthcare Facility Name *</label>
          <input
            id="membership-facility-name"
            type="text"
            required
            value={formData.professionalInfo.facilityName}
            onChange={(e) => handleInputChange('professionalInfo', 'facilityName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-position" className="block text-sm font-medium text-gray-700 mb-1">Position/Title *</label>
          <input
            id="membership-position"
            type="text"
            required
            value={formData.professionalInfo.position}
            onChange={(e) => handleInputChange('professionalInfo', 'position', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="membership-years-exp" className="block text-sm font-medium text-gray-700 mb-1">Years of Experience *</label>
          <select
            id="membership-years-exp"
            required
            value={formData.professionalInfo.yearsOfExperience}
            onChange={(e) => handleInputChange('professionalInfo', 'yearsOfExperience', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select Experience</option>
            <option value="0-2">0-2 years</option>
            <option value="3-5">3-5 years</option>
            <option value="6-10">6-10 years</option>
            <option value="10+">10+ years</option>
          </select>
        </div>
        <div>
          <label htmlFor="membership-monthly-income" className="block text-sm font-medium text-gray-700 mb-1">Monthly Income Range *</label>
          <select
            id="membership-monthly-income"
            required
            value={formData.professionalInfo.monthlyIncome}
            onChange={(e) => handleInputChange('professionalInfo', 'monthlyIncome', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">Select Income Range</option>
            <option value="50000-100000">₦50,000 - ₦100,000</option>
            <option value="100000-200000">₦100,000 - ₦200,000</option>
            <option value="200000-500000">₦200,000 - ₦500,000</option>
            <option value="500000+">₦500,000+</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="membership-facility-address" className="block text-sm font-medium text-gray-700 mb-1">Facility Address *</label>
        <textarea
          id="membership-facility-address"
          required
          rows={3}
          value={formData.professionalInfo.facilityAddress}
          onChange={(e) => handleInputChange('professionalInfo', 'facilityAddress', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>
  );

  const renderCooperativeInfo = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <FileText className="w-5 h-5 text-primary-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Cooperative Information</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="membership-initial-savings" className="block text-sm font-medium text-gray-700 mb-1">Initial Savings (₦) *</label>
          <input
            id="membership-initial-savings"
            type="number"
            required
            min="0"
            value={formData.cooperativeInfo.initialSavings}
            onChange={(e) => handleInputChange('cooperativeInfo', 'initialSavings', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="membership-initial-investment" className="block text-sm font-medium text-gray-700 mb-1">Initial Investment/Shares (₦) *</label>
          <input
            id="membership-initial-investment"
            type="number"
            required
            min="0"
            value={formData.cooperativeInfo.initialInvestment}
            onChange={(e) => handleInputChange('cooperativeInfo', 'initialInvestment', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="0"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Total Initial Contribution:</strong> ₦{((parseFloat(formData.cooperativeInfo.initialSavings) || 0) + (parseFloat(formData.cooperativeInfo.initialInvestment) || 0)).toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Minimum required: ₦5,000 combined. ₦1,500 entrance fee will be deducted from your first contribution.
        </p>
      </div>

      <div>
        <label htmlFor="membership-target-savings" className="block text-sm font-medium text-gray-700 mb-1">Target Monthly Savings (₦) - Optional</label>
        <input
          id="membership-target-savings"
          type="number"
          min="0"
          value={formData.cooperativeInfo.targetSavings}
          onChange={(e) => handleInputChange('cooperativeInfo', 'targetSavings', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="0"
        />
      </div>

      <div>
        <label htmlFor="membership-reason" className="block text-sm font-medium text-gray-700 mb-1">Reason for Joining</label>
        <textarea
          id="membership-reason"
          rows={3}
          value={formData.cooperativeInfo.reasonForJoining}
          onChange={(e) => handleInputChange('cooperativeInfo', 'reasonForJoining', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Tell us why you want to join IMAN Cooperative..."
        />
      </div>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-4">
        <CheckCircle className="w-5 h-5 text-primary-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Review Your Application</h3>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
          <p className="text-sm text-gray-600">
            <strong>Name:</strong> {formData.personalInfo.firstName} {formData.personalInfo.lastName}<br/>
            <strong>PSN:</strong> {formData.personalInfo.psn}<br/>
            <strong>Email:</strong> {formData.personalInfo.email}<br/>
            <strong>Phone:</strong> {formData.personalInfo.phone}<br/>
            <strong>Address:</strong> {formData.personalInfo.address}
          </p>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Professional Information</h4>
          <p className="text-sm text-gray-600">
            <strong>Facility:</strong> {formData.professionalInfo.facilityName}<br/>
            <strong>Position:</strong> {formData.professionalInfo.position}<br/>
            <strong>Experience:</strong> {formData.professionalInfo.yearsOfExperience}<br/>
            <strong>Income:</strong> {formData.professionalInfo.monthlyIncome}
          </p>
        </div>

        <div>
          <h4 className="font-medium text-gray-900 mb-2">Cooperative Information</h4>
          <p className="text-sm text-gray-600">
            <strong>Initial Savings:</strong> ₦{(parseFloat(formData.cooperativeInfo.initialSavings) || 0).toLocaleString()}<br/>
            <strong>Initial Investment:</strong> ₦{(parseFloat(formData.cooperativeInfo.initialInvestment) || 0).toLocaleString()}<br/>
            <strong>Total Contribution:</strong> ₦{((parseFloat(formData.cooperativeInfo.initialSavings) || 0) + (parseFloat(formData.cooperativeInfo.initialInvestment) || 0)).toLocaleString()}<br/>
            <strong>Target Savings:</strong> ₦{(parseFloat(formData.cooperativeInfo.targetSavings) || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-primary-50 p-4 rounded-lg">
        <p className="text-sm text-primary-800">
          <strong>Important:</strong> By submitting this application, you agree to the terms and conditions of IMAN Cooperative.
          Your application will be reviewed and you will be contacted within 3-5 business days.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join FCNACONSGMCS</h1>
          <p className="text-gray-600">Apply to become a member of FCNACONSGMCS. all operation follows Biblical principle of Justice and fairness, and financial integrity.</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {currentStep > step ? <CheckCircle className="w-4 h-4" /> : step}
                </div>
                {step < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-primary-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-2 space-x-8 text-xs text-gray-600">
            <span>Personal</span>
            <span>Professional</span>
            <span>Cooperative</span>
            <span>Review</span>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            {currentStep === 1 && renderPersonalInfo()}
            {currentStep === 2 && renderProfessionalInfo()}
            {currentStep === 3 && renderCooperativeInfo()}
            {currentStep === 4 && renderReview()}
            
            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (!validateCurrentStep(currentStep)) return;
                    setCurrentStep(Math.min(4, currentStep + 1));
                  }}
                  className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
