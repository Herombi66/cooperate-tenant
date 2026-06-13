import React, { useEffect, useMemo, useState } from 'react';
import { X, Upload, Download, AlertCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface BulkContributionUploadProps {
  onClose: () => void;
}

export const BulkContributionUpload: React.FC<BulkContributionUploadProps> = ({ onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const lower = selectedFile.name.toLowerCase();
      const ok = lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls');
      if (!ok) {
        toast.error('Please select a CSV or Excel file (.csv, .xlsx, .xls)');
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadTemplate = () => {
    const csvContent = `PSN,Period,Savings,Investment,Target_Saving
12345,2024-01,50000,25000,10000
67890,2024-01,75000,30000,15000`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contribution_template.csv';
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

    try {
      const response = await api.post('/contributions/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const id = response.data?.batch_id;
      if (!id) {
        toast.error('Upload started but no batch id was returned');
        return;
      }
      setBatchId(id);
      toast.success('Upload started. Processing in background…');
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || error.message || 'Upload failed';
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const progress = useMemo(() => {
    const batch = report?.batch || report?.report?.batch;
    const summary = report?.summary || report?.report?.summary;
    const total = Number(batch?.total_records || 0);
    const processed = Number(summary?.processed || 0);
    const percent = total > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
    return { total, processed, percent, status: batch?.status || 'PROCESSING' };
  }, [report]);

  const fetchReport = async (id: number) => {
    setLoadingReport(true);
    try {
      const res = await api.get(`/bulk-uploads/${id}/report`);
      if (res.data?.success) setReport(res.data.report);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load report');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (!batchId) return;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      await fetchReport(batchId);
    };

    tick();
    const timer = setInterval(tick, 1200);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [batchId]);

  const downloadReport = async (format: 'csv' | 'pdf') => {
    if (!batchId) return;
    try {
      const exportDate = new Date().toISOString().slice(0, 10);
      const filename = `contributions_upload_report_${batchId}_${exportDate}.${format}`;
      const res = await api.get(`/bulk-uploads/${batchId}/report.${format}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: format === 'pdf' ? 'application/pdf' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || `Failed to download ${format.toUpperCase()} report`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Bulk Upload Contributions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {!batchId ? (
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
                        <li>Fill in the contribution data for each member</li>
                        <li>Ensure PSN values match existing members</li>
                        <li>Use YYYY-MM format for periods (e.g., 2024-01)</li>
                        <li>Upload the completed CSV/Excel file</li>
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
                  Select CSV/Excel File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label
                    htmlFor="csv-upload"
                    className="cursor-pointer text-primary-600 hover:text-primary-500"
                  >
                    Click to select CSV/Excel file
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Upload Status</h3>
                <div className="text-sm text-gray-600">Batch #{batchId}</div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    {progress.status === 'PROCESSING' ? 'Processing…' : progress.status}
                  </div>
                  <div className="text-sm text-gray-700">
                    {progress.processed}/{progress.total || '—'} ({progress.percent}%)
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${progress.percent}%` }} />
                </div>
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => downloadReport('csv')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Report
                  </button>
                  <button
                    onClick={() => downloadReport('pdf')}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download PDF Report
                  </button>
                </div>
              </div>

              {loadingReport ? (
                <div className="text-sm text-gray-600">Loading report…</div>
              ) : report?.failed_records?.length > 0 ? (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">Failed Records</h4>
                  <div className="max-h-56 overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-red-900/80">
                        <tr>
                          <th className="py-1 pr-3">Row</th>
                          <th className="py-1 pr-3">Code</th>
                          <th className="py-1 pr-3">Message</th>
                        </tr>
                      </thead>
                      <tbody className="text-red-900/90">
                        {report.failed_records.slice(0, 50).map((e: any) => (
                          <tr key={e.id}>
                            <td className="py-1 pr-3 whitespace-nowrap">{e.row_number ?? '—'}</td>
                            <td className="py-1 pr-3 whitespace-nowrap">{e.error_code}</td>
                            <td className="py-1 pr-3">
                              <div>{e.message}</div>
                              {e.fields?.suggestion ? (
                                <div className="text-xs text-red-900/70 mt-1">Suggestion: {e.fields.suggestion}</div>
                              ) : null}
                              {Array.isArray(e.remediation) && e.remediation.length > 0 ? (
                                <div className="text-xs text-red-900/70 mt-1">Fix: {e.remediation[0]}</div>
                              ) : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {report.failed_records.length > 50 ? (
                    <div className="text-xs text-red-900/70 mt-2">Showing first 50 failures. Download the report for full details.</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-sm text-gray-600">No failed records.</div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {batchId ? 'Close' : 'Cancel'}
            </button>
            {!batchId && (
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="px-6 py-2 text-sm font-medium text-white bg-primary-500 border border-transparent rounded-md hover:bg-primary-600 disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload Contributions'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
