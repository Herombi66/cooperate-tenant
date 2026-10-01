import React, { useEffect, useState } from 'react';
import { FileText, Download, ExternalLink, Calendar, HardDrive, User, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { settingsService, BylawInfo } from '../services/settingsService';
import toast from 'react-hot-toast';
import { NavLink } from 'react-router-dom';

export const BylawsPage: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [bylaw, setBylaw] = useState<BylawInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);

  const isAdminRole = user && ['admin', 'super_admin', 'chairman', 'president', 'treasurer'].includes(user.role);

  const fetchBylaw = async () => {
    try {
      setLoading(true);
      const res = await settingsService.getBylaw();
      if (res.success && res.bylaw) {
        setBylaw(res.bylaw);
      } else {
        setBylaw(null);
      }
    } catch (err: any) {
      console.error('Failed to load bylaws:', err);
      toast.error('Could not load cooperative bylaws information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBylaw();
  }, []);

  const handleDownload = async () => {
    if (!bylaw) return;
    try {
      setDownloading(true);
      await settingsService.downloadBylawFile(bylaw.filename);
      toast.success('Bylaws download started');
    } catch (err: any) {
      toast.error('Failed to download bylaw file');
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenInNewTab = () => {
    const url = settingsService.getDownloadBylawUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <FileText className="w-7 h-7" />
            </div>
            Cooperative Bylaws & Constitution
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Official operational guidelines, regulatory constitution, and rules governing{' '}
            <span className="font-semibold text-foreground">{tenant?.name || 'the Cooperative'}</span>.
          </p>
        </div>

        <button
          onClick={fetchBylaw}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-sm text-muted-foreground">Retrieving cooperative bylaws...</p>
        </div>
      ) : bylaw ? (
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 dark:text-red-400 font-black text-sm tracking-wider uppercase">PDF</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground">{bylaw.filename}</h2>
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Official
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <HardDrive className="w-3.5 h-3.5" />
                      {formatFileSize(bylaw.size)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Uploaded: {new Date(bylaw.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    {bylaw.uploaded_by_name && (
                      <span className="inline-flex items-center gap-1">
                        <User className="w-3.5 h-3.5" />
                        By: {bylaw.uploaded_by_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  <Download className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
                  {downloading ? 'Downloading...' : 'Download Bylaws (PDF)'}
                </button>
                <button
                  onClick={handleOpenInNewTab}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-card hover:bg-muted text-foreground font-medium rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </button>
              </div>
            </div>
          </div>

          {/* Embedded Document Viewer */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-600" />
                Document Preview
              </h3>
              <span className="text-xs text-muted-foreground">
                Having trouble previewing? Use the Download button above.
              </span>
            </div>
            <div className="w-full h-[750px] bg-neutral-900/5">
              <iframe
                src={`${settingsService.getDownloadBylawUrl()}#toolbar=1`}
                title="Cooperative Bylaws Document Preview"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-card border border-border rounded-xl p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">No Bylaws Uploaded Yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            The official cooperative bylaws and constitution have not yet been uploaded by the administration.
            Please check back later or contact management for further inquiries.
          </p>
          {isAdminRole && (
            <NavLink
              to="/settings"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              Upload Bylaws in Settings
            </NavLink>
          )}
        </div>
      )}
    </div>
  );
};

export default BylawsPage;
