import React, { useState, useEffect } from 'react';
import {
  FileText,
  Save,
  Printer,
  RotateCcw,
  History,
  Palette,
  Layout,
  Sliders,
  CheckCircle,
  AlertCircle,
  Eye,
  Building,
  Image,
  Stamp,
  BookOpen
} from 'lucide-react';
import DocumentTemplateService, {
  DocumentTemplate,
  DocumentTemplateVersion,
  ContractLayoutConfig,
  COLOR_PALETTES
} from '../services/documentTemplateService';
import { ContractPreview } from '../components/Contract/ContractPreview';

export const DocumentDesignerPage: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [layout, setLayout] = useState<ContractLayoutConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'theme' | 'header' | 'logo' | 'sections' | 'terms' | 'stamp'>('theme');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testPrinting, setTestPrinting] = useState<boolean>(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Version history modal state
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [versions, setVersions] = useState<DocumentTemplateVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState<boolean>(false);
  const [changeSummary, setChangeSummary] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const list = await DocumentTemplateService.getTemplates();
      setTemplates(list);
      if (list.length > 0) {
        setSelectedTemplate(list[0]);
        setLayout(JSON.parse(JSON.stringify(list[0].layout_config)));
      }
    } catch (err: any) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load document templates' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setLayout(JSON.parse(JSON.stringify(template.layout_config)));
    setAlert(null);
  };

  const handleApplyPalette = (paletteKey: string) => {
    if (!layout) return;
    const palette = COLOR_PALETTES[paletteKey];
    if (!palette) return;

    setLayout({
      ...layout,
      theme: paletteKey,
      colors: {
        ...layout.colors,
        ...palette.colors
      }
    });
  };

  const handleSave = async () => {
    if (!selectedTemplate || !layout) return;
    try {
      setSaving(true);
      const updated = await DocumentTemplateService.updateTemplate(selectedTemplate.id, {
        layout_config: layout,
        change_summary: changeSummary || `Updated ${selectedTemplate.name} design`
      });

      setSelectedTemplate(updated);
      setChangeSummary('');
      setAlert({
        type: 'success',
        message: `Template successfully saved as Version ${updated.version}! Historical snapshot preserved.`
      });
      // Refresh templates list
      const list = await DocumentTemplateService.getTemplates();
      setTemplates(list);
    } catch (err: any) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save template changes' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    if (!layout || !selectedTemplate) return;
    try {
      setTestPrinting(true);
      await DocumentTemplateService.testPrintContract(layout, selectedTemplate.type);
      setAlert({ type: 'success', message: 'Sample watermarked contract PDF downloaded successfully' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to generate sample PDF' });
    } finally {
      setTestPrinting(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!selectedTemplate) return;
    if (!window.confirm('Reset this contract template to factory defaults? You can always restore from history.')) return;
    try {
      setSaving(true);
      const reset = await DocumentTemplateService.resetTemplate(selectedTemplate.id);
      setSelectedTemplate(reset);
      setLayout(JSON.parse(JSON.stringify(reset.layout_config)));
      setAlert({ type: 'success', message: 'Template successfully reset to factory preset' });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to reset template' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenVersions = async () => {
    if (!selectedTemplate) return;
    setShowVersionHistory(true);
    try {
      setLoadingVersions(true);
      const history = await DocumentTemplateService.getTemplateVersions(selectedTemplate.id);
      setVersions(history);
    } catch (err: any) {
      setAlert({ type: 'error', message: 'Failed to load version history' });
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionId: number) => {
    if (!selectedTemplate) return;
    if (!window.confirm('Restore this historical version? Current state will be preserved as a new version.')) return;
    try {
      setSaving(true);
      const restored = await DocumentTemplateService.restoreTemplateVersion(selectedTemplate.id, versionId);
      setSelectedTemplate(restored);
      setLayout(JSON.parse(JSON.stringify(restored.layout_config)));
      setShowVersionHistory(false);
      setAlert({
        type: 'success',
        message: `Template successfully restored! Now saved as Version ${restored.version}.`
      });
    } catch (err: any) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to restore version' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!layout || !selectedTemplate) {
    return (
      <div className="p-8 text-center text-gray-500">
        No document templates found.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Alert Notification */}
      {alert && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between shadow-sm border ${
            alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="text-sm font-medium">{alert.message}</span>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header & Global Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 text-primary-700">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Document Designer</h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Official branding & layout designer for Islamic Murabaha Contracts and Agreements
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Template Selector Dropdown */}
          <select
            value={selectedTemplate.id}
            onChange={(e) => {
              const found = templates.find((t) => t.id === Number(e.target.value));
              if (found) handleSelectTemplate(found);
            }}
            className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (v{t.version})
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenVersions}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            title="Version History & Rollback"
          >
            <History className="w-4 h-4 text-gray-500" />
            <span>Versions (v{selectedTemplate.version})</span>
          </button>

          <button
            onClick={handleTestPrint}
            disabled={testPrinting}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
            title="Download watermarked sample PDF"
          >
            <Printer className="w-4 h-4 text-gray-500" />
            <span>{testPrinting ? 'Generating...' : 'Test Print'}</span>
          </button>

          <button
            onClick={handleResetToDefault}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 text-rose-700 rounded-lg text-xs sm:text-sm font-medium bg-rose-50 hover:bg-rose-100 shadow-sm"
            title="Reset to factory preset"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto space-x-1 pb-1">
            {[
              { id: 'theme', label: 'Theme & Colors', icon: Palette },
              { id: 'header', label: 'Header & Org', icon: Building },
              { id: 'logo', label: 'Logo', icon: Image },
              { id: 'sections', label: 'Sections', icon: Sliders },
              { id: 'terms', label: 'Clauses', icon: BookOpen },
              { id: 'stamp', label: 'Stamp & Seal', icon: Stamp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab 1: Theme & Color Palettes */}
          {activeTab === 'theme' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 shadow-sm">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                  Curated Islamic Color Palettes
                </h3>
                <p className="text-[11px] text-gray-500 mb-3">
                  Select a pre-designed palette suitable for official Islamic cooperative agreements:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(COLOR_PALETTES).map(([key, pal]) => (
                    <button
                      key={key}
                      onClick={() => handleApplyPalette(key)}
                      className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between ${
                        layout.theme === key
                          ? 'border-primary-600 ring-2 ring-primary-100 bg-primary-50/40'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-medium text-gray-800">{pal.label}</span>
                      <div className="flex items-center gap-1">
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: pal.colors.primary }}
                        />
                        <span
                          className="w-3 h-3 rounded-full border border-black/10"
                          style={{ backgroundColor: pal.colors.secondary }}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Hex Color Overrides */}
              <div className="pt-4 border-t border-gray-100 space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Custom Color Overrides
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Primary Brand</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layout.colors.primary}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, primary: e.target.value } })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={layout.colors.primary}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, primary: e.target.value } })
                        }
                        className="w-full px-2 py-1 text-xs border rounded font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Secondary Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layout.colors.secondary}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, secondary: e.target.value } })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={layout.colors.secondary}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, secondary: e.target.value } })
                        }
                        className="w-full px-2 py-1 text-xs border rounded font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Card Tint / Accent</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layout.colors.accent || '#ECFDF5'}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, accent: e.target.value } })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={layout.colors.accent || '#ECFDF5'}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, accent: e.target.value } })
                        }
                        className="w-full px-2 py-1 text-xs border rounded font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Border Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={layout.colors.border || '#E5E7EB'}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, border: e.target.value } })
                        }
                        className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={layout.colors.border || '#E5E7EB'}
                        onChange={(e) =>
                          setLayout({ ...layout, colors: { ...layout.colors, border: e.target.value } })
                        }
                        className="w-full px-2 py-1 text-xs border rounded font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Header & Org Info */}
          {activeTab === 'header' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-gray-900 uppercase tracking-wide">
                Organization & Header Branding
              </h3>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Cooperative Name</label>
                <input
                  type="text"
                  value={layout.header.org_name}
                  onChange={(e) =>
                    setLayout({ ...layout, header: { ...layout.header, org_name: e.target.value } })
                  }
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Branch / Chapter</label>
                <input
                  type="text"
                  value={layout.header.chapter}
                  onChange={(e) =>
                    setLayout({ ...layout, header: { ...layout.header, chapter: e.target.value } })
                  }
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Contract Title Banner</label>
                <input
                  type="text"
                  value={layout.header.contract_title}
                  onChange={(e) =>
                    setLayout({ ...layout, header: { ...layout.header, contract_title: e.target.value } })
                  }
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Registration No</label>
                  <input
                    type="text"
                    value={layout.header.registration_no || ''}
                    onChange={(e) =>
                      setLayout({ ...layout, header: { ...layout.header, registration_no: e.target.value } })
                    }
                    className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Official Phone</label>
                  <input
                    type="text"
                    value={layout.header.phone || ''}
                    onChange={(e) =>
                      setLayout({ ...layout, header: { ...layout.header, phone: e.target.value } })
                    }
                    className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Official Address</label>
                <input
                  type="text"
                  value={layout.header.address || ''}
                  onChange={(e) =>
                    setLayout({ ...layout, header: { ...layout.header, address: e.target.value } })
                  }
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={layout.header.email || ''}
                    onChange={(e) =>
                      setLayout({ ...layout, header: { ...layout.header, email: e.target.value } })
                    }
                    className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={layout.header.website || ''}
                    onChange={(e) =>
                      setLayout({ ...layout, header: { ...layout.header, website: e.target.value } })
                    }
                    className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Logo Settings */}
          {activeTab === 'logo' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 shadow-sm text-xs">
              <h3 className="font-bold text-gray-900 uppercase tracking-wide">Logo Configuration</h3>

              <div>
                <label className="block font-medium text-gray-700 mb-2">Logo Placement</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['left', 'center', 'right'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() =>
                        setLayout({ ...layout, logo: { ...layout.logo, position: pos } })
                      }
                      className={`py-2 px-3 rounded-lg border text-center font-medium capitalize ${
                        layout.logo.position === pos
                          ? 'border-primary-600 bg-primary-50 text-primary-700 font-bold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Width (pt)</label>
                  <input
                    type="number"
                    value={layout.logo.width || 60}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        logo: { ...layout.logo, width: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-gray-700 mb-1">Height (pt)</label>
                  <input
                    type="number"
                    value={layout.logo.height || 60}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        logo: { ...layout.logo, height: Number(e.target.value) }
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="font-medium text-gray-800">Print Logo on Document</span>
                  <p className="text-[11px] text-gray-500">Include official cooperative emblem in header</p>
                </div>
                <input
                  type="checkbox"
                  checked={layout.logo.show_on_print !== false}
                  onChange={(e) =>
                    setLayout({
                      ...layout,
                      logo: { ...layout.logo, show_on_print: e.target.checked }
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Tab 4: Section Toggles */}
          {activeTab === 'sections' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-gray-900 uppercase tracking-wide">
                Document Section Visibility
              </h3>
              <p className="text-[11px] text-gray-500 mb-2">
                Control which structural sections appear on the generated agreement:
              </p>

              <div className="divide-y divide-gray-100">
                {[
                  { key: 'show_header', label: 'Official Header Banner', desc: 'Organization name & contact details' },
                  { key: 'show_metadata', label: 'Document Information Panel', desc: 'Reference ID, version & status badge' },
                  { key: 'show_borrower_card', label: 'Borrower Details Card', desc: 'Buyer name, PSN, phone, email' },
                  { key: 'show_financing_card', label: 'Financing Details Card', desc: 'Tenure & monthly repayment' },
                  { key: 'show_breakdown_card', label: 'Cost-Plus-Profit Breakdown', desc: 'Principal, Murabaha profit & total price' },
                  { key: 'show_schedule', label: 'Repayment Schedule Table', desc: 'Numbered monthly installments' },
                  { key: 'show_terms', label: 'Islamic Agreement Clauses', desc: 'Numbered legal terms & declaration' },
                  { key: 'show_signatures', label: 'Electronic Signature Box', desc: 'Audit certification & signature reference' },
                  { key: 'show_stamp', label: 'Official Circular Seal', desc: 'Verified cooperative stamp emblem' },
                  { key: 'show_qr_code', label: 'Verification QR Code', desc: 'Resolves to public verification registry' },
                  { key: 'show_footer', label: 'Running Page Footer', desc: 'Page numbers & authenticity statement' },
                  { key: 'show_watermark', label: 'Sample Watermark', desc: 'Applied during preview & draft status' }
                ].map((sec) => (
                  <div key={sec.key} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-800">{sec.label}</span>
                      <p className="text-[10px] text-gray-400">{sec.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(layout.sections as any)[sec.key] !== false}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          sections: {
                            ...layout.sections,
                            [sec.key]: e.target.checked
                          }
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Agreement Clauses Editor */}
          {activeTab === 'terms' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4 shadow-sm text-xs">
              <h3 className="font-bold text-gray-900 uppercase tracking-wide">
                Islamic Murabaha Contract Clauses
              </h3>
              <p className="text-[11px] text-gray-500">
                Draft and review the Shari'ah-compliant legal clauses included in the contract:
              </p>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {(layout.terms || []).map((term, index) => (
                  <div key={term.clause_no || index} className="p-3 border rounded-lg bg-gray-50/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary-700 w-5">#{term.clause_no || index + 1}</span>
                      <input
                        type="text"
                        value={term.title}
                        onChange={(e) => {
                          const newTerms = [...layout.terms];
                          newTerms[index].title = e.target.value;
                          setLayout({ ...layout, terms: newTerms });
                        }}
                        className="flex-1 px-2 py-1 text-xs border rounded bg-white font-semibold"
                        placeholder="Clause Title"
                      />
                    </div>
                    <textarea
                      rows={3}
                      value={term.text}
                      onChange={(e) => {
                        const newTerms = [...layout.terms];
                        newTerms[index].text = e.target.value;
                        setLayout({ ...layout, terms: newTerms });
                      }}
                      className="w-full p-2 text-xs border rounded bg-white leading-relaxed"
                      placeholder="Clause terms and legal obligations..."
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 6: Stamp & Seal */}
          {activeTab === 'stamp' && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3 shadow-sm text-xs">
              <h3 className="font-bold text-gray-900 uppercase tracking-wide">Official Circular Stamp</h3>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">Enable Digital Seal</span>
                  <p className="text-[11px] text-gray-500">Render circular cooperative seal on acceptance</p>
                </div>
                <input
                  type="checkbox"
                  checked={layout.stamp.show !== false}
                  onChange={(e) =>
                    setLayout({
                      ...layout,
                      stamp: { ...layout.stamp, show: e.target.checked }
                    })
                  }
                  className="w-4 h-4 text-primary-600 rounded cursor-pointer"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Stamp Seal Text</label>
                <input
                  type="text"
                  value={layout.stamp.text}
                  onChange={(e) =>
                    setLayout({
                      ...layout,
                      stamp: { ...layout.stamp, text: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 border rounded focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Seal Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={layout.stamp.color || layout.colors.primary}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        stamp: { ...layout.stamp, color: e.target.value }
                      })
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-gray-300"
                  />
                  <input
                    type="text"
                    value={layout.stamp.color || layout.colors.primary}
                    onChange={(e) =>
                      setLayout({
                        ...layout,
                        stamp: { ...layout.stamp, color: e.target.value }
                      })
                    }
                    className="w-full px-2 py-1 text-xs border rounded font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live A4 Preview Canvas (7 cols) */}
        <div className="lg:col-span-7 sticky top-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Live A4 Contract Preview
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              Interactive Live Canvas • Standard A4 Portrait
            </span>
          </div>

          <div className="bg-gray-100/90 rounded-xl p-3 sm:p-6 border border-gray-300/80 shadow-inner overflow-x-auto max-h-[85vh] overflow-y-auto">
            <ContractPreview layout={layout} contractType={selectedTemplate.type} />
          </div>
        </div>
      </div>

      {/* Version History Modal / Drawer */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-primary-600" />
                <h3 className="text-base font-bold text-gray-900">
                  Version History: {selectedTemplate.name}
                </h3>
              </div>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Immutable version history logs all design modifications. You can safely rollback to any past version without disrupting previously signed agreements.
            </p>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-2">
              {loadingVersions ? (
                <div className="text-center py-8 text-gray-400">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No previous versions recorded.</div>
              ) : (
                versions.map((ver) => (
                  <div key={ver.id} className="pt-3 pb-2 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">Version {ver.version}</span>
                        {ver.version === selectedTemplate.version && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600">{ver.change_summary || 'Standard update'}</p>
                      <span className="text-[10px] text-gray-400">
                        {new Date(ver.created_at).toLocaleString('en-GB')}
                      </span>
                    </div>

                    {ver.version !== selectedTemplate.version && (
                      <button
                        onClick={() => handleRestoreVersion(ver.id)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-primary-50 text-gray-700 hover:text-primary-700 border rounded text-xs font-semibold transition-colors"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowVersionHistory(false)}
                className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
