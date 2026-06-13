import React, { useState } from 'react';
import { X, Upload, Download, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface BulkMembershipUploadProps {
  onClose: () => void;
}

export const BulkMembershipUpload: React.FC<BulkMembershipUploadProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `Name,PSN,Email,Phone,Facility_Name,Next_Of_Kin_Name,Next_Of_Kin_Phone,Savings,Investment,Target_Saving,Target_Period
John Doe,PSN001,john@example.com,08012345678,General Hospital,Jane Doe,08087654321,30000,20000,10000,12
Jane Smith,PSN002,jane@example.com,08023456789,Teaching Hospital,John Smith,08098765432,25000,25000,15000,24`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'membership_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    console.log('🔍 DEBUG: Attempting bulk membership upload to /applications/admin/bulk-import');
    console.log('🔍 DEBUG: File selected:', file.name, 'Size:', file.size);

    try {
      // Use the correct admin endpoint for bulk import
      const response = await api.post('/applications/admin/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('🔍 DEBUG: Response status:', response.status);
      
      const results = response.data;
      console.log('🔍 DEBUG: Upload successful:', results);
      setUploadResults(results);
      toast.success(`Successfully uploaded ${results.successful} applications`);
    } catch (error: any) {
      console.error('🔍 DEBUG: Upload error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Membership Applications</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!uploadResults ? (
            <>
              {/* Instructions */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-primary-400 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-primary-800">Upload Instructions</h3>
                    <div className="mt-2 text-sm text-primary-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Download the CSV template below</li>
                        <li>Fill in the membership application data for each member</li>
                        <li>Ensure PSN and email values are unique</li>
                        <li>Combined savings and investment must be at least ₦5,000</li>
                        <li>Upload the completed CSV file</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Download Template */}
              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center mx-auto px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </button>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Select CSV File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="membership-csv-upload"
                  />
                  <label
                    htmlFor="membership-csv-upload"
                    className="cursor-pointer text-primary-600 hover:text-primary-500"
                  >
                    Click to select CSV file
                  </label>
                  {file && (
                    <p className="mt-2 text-sm text-gray-600">
                      Selected: {file.name}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Upload Results */
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Results</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{uploadResults.successful}</div>
                  <div className="text-sm text-green-700">Successful</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{uploadResults.failed}</div>
                  <div className="text-sm text-red-700">Failed</div>
                </div>
              </div>

              {uploadResults.errors && uploadResults.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {uploadResults.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {uploadResults ? 'Close' : 'Cancel'}
            </button>
            {!uploadResults && (
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Applications'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};