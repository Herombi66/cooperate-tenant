import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette, Printer, History, RotateCcw, Save, CheckCircle,
  Eye, Monitor, Smartphone, Layout, Type, Shield,
  Layers, ChevronDown, ChevronRight, AlertCircle, FileText,
  Sliders, Loader2, Sparkles, Check, X
} from 'lucide-react';
import receiptTemplateService, {
  ReceiptTemplate,
  ReceiptLayoutConfig,
  ReceiptTemplateVersion
} from '../services/receiptTemplateService';
import { ReceiptPreview } from '../components/Receipt/ReceiptPreview';
import toast from 'react-hot-toast';

// 8 Professional Pre-Curated Color Palettes
const COLOR_PRESETS = [
  {
    id: 'iman_emerald',
    name: 'IMAN Emerald (Standard)',
    primary: '#0F766E',
    secondary: '#D97706',
    accent: '#F0FDFA',
    border: '#E5E7EB',
    text: '#1F2937',
    background: '#FFFFFF'
  },
  {
    id: 'royal_navy',
    name: 'Royal Navy Blue',
    primary: '#1E3A8A',
    secondary: '#C2410C',
    accent: '#EFF6FF',
    border: '#CBD5E1',
    text: '#1F2937',
    background: '#FFFFFF'
  },
  {
    id: 'executive_slate',
    name: 'Executive Slate',
    primary: '#334155',
    secondary: '#D97706',
    accent: '#F8FAFC',
    border: '#CBD5E1',
    text: '#0F172A',
    background: '#FFFFFF'
  },
  {
    id: 'modern_teal',
    name: 'Modern Teal',
    primary: '#0D9488',
    secondary: '#E11D48',
    accent: '#F0FDFA',
    border: '#E5E7EB',
    text: '#111827',
    background: '#FFFFFF'
  },
  {
    id: 'crimson_warm',
    name: 'Crimson Warm',
    primary: '#991B1B',
    secondary: '#D97706',
    accent: '#FEF2F2',
    border: '#FECACA',
    text: '#1F2937',
    background: '#FFFFFF'
  },
  {
    id: 'classic_monochrome',
    name: 'Classic Monochrome',
    primary: '#111827',
    secondary: '#4B5563',
    accent: '#F9FAFB',
    border: '#D1D5DB',
    text: '#111827',
    background: '#FFFFFF'
  },
  {
    id: 'forest_gold',
    name: 'Forest Gold',
    primary: '#14532D',
    secondary: '#CA8A04',
    accent: '#F0FDF4',
    border: '#BBF7D0',
    text: '#1F2937',
    background: '#FFFFFF'
  },
  {
    id: 'imperial_purple',
    name: 'Imperial Purple',
    primary: '#581C87',
    secondary: '#C026D3',
    accent: '#FAF5FF',
    border: '#E9D5FF',
    text: '#1F2937',
    background: '#FFFFFF'
  }
];

export const ReceiptDesignerPage: React.FC = () => {
  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<ReceiptTemplate | null>(null);
  const [config, setConfig] = useState<ReceiptLayoutConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<ReceiptLayoutConfig | null>(null);
  const [paperSize, setPaperSize] = useState<'A4' | 'A5' | 'thermal_80' | 'thermal_58'>('A4');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'print'>('desktop');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Version History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<ReceiptTemplateVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<number | null>(null);

  // Active accordion section
  const [activeAccordion, setActiveAccordion] = useState<string>('header');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await receiptTemplateService.getTemplates();
      setTemplates(data);
      if (data.length > 0) {
        selectTemplate(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      toast.error(err?.response?.data?.message || 'Failed to load receipt templates');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: ReceiptTemplate) => {
    setCurrentTemplate(template);
    setConfig(JSON.parse(JSON.stringify(template.layout_config)));
    setOriginalConfig(JSON.parse(JSON.stringify(template.layout_config)));
    setPaperSize(template.paper_size || 'A4');
    setHasChanges(false);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    const found = templates.find(t => t.id === id);
    if (found) {
      if (hasChanges && !window.confirm('You have unsaved changes. Discard and switch template?')) {
        return;
      }
      selectTemplate(found);
    }
  };

  // Helper to update layout configuration
  const updateConfig = (path: string, value: any) => {
    if (!config) return;
    const newConfig = { ...config };
    const parts = path.split('.');
    let current: any = newConfig;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    setConfig(newConfig);
    setHasChanges(true);
  };

  // Apply a color preset
  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    if (!config) return;
    const newConfig = {
      ...config,
      theme: preset.id,
      colors: {
        primary: preset.primary,
        secondary: preset.secondary,
        accent: preset.accent,
        border: preset.border,
        text: preset.text,
        background: preset.background
      },
      stamp: {
        ...config.stamp,
        color: preset.primary
      }
    };
    setConfig(newConfig);
    setHasChanges(true);
    toast.success(`Applied ${preset.name} palette`);
  };

  // Save changes
  const handleSave = async () => {
    if (!currentTemplate || !config) return;
    try {
      setSaving(true);
      const updated = await receiptTemplateService.updateTemplate(currentTemplate.id, {
        name: currentTemplate.name,
        paper_size: paperSize,
        layout_config: config,
        change_summary: `Admin updated layout (colors/typography/sections)`
      });

      setCurrentTemplate(updated);
      setOriginalConfig(JSON.parse(JSON.stringify(updated.layout_config)));
      setHasChanges(false);

      // Update in templates array
      setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
      toast.success(`Template saved successfully (v${updated.version})!`);
    } catch (err: any) {
      console.error('Save error:', err);
      toast.error(err?.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Activate / Set Default
  const handleActivate = async () => {
    if (!currentTemplate) return;
    try {
      const updated = await receiptTemplateService.activateTemplate(currentTemplate.id, true);
      setCurrentTemplate(updated);
      setTemplates(prev => prev.map(t => {
        if (t.id === updated.id) return updated;
        if (t.type === updated.type) return { ...t, is_default: false };
        return t;
      }));
      toast.success(`"${updated.name}" is now the active default receipt!`);
    } catch (err: any) {
      toast.error('Failed to set template as active default');
    }
  };

  // Test Print
  const handleTestPrint = async () => {
    if (!config) return;
    try {
      setTestPrinting(true);
      const blob = await receiptTemplateService.testPrint({
        template_id: currentTemplate?.id,
        paper_size: paperSize,
        layout_config: config
      });

      // Open PDF in new tab for direct printing
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        // Fallback: trigger download if pop-up blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `receipt_sample_${paperSize}.pdf`;
        link.click();
      }
      toast.success('Test print generated (Watermarked Sample - No financial record altered)');
    } catch (err: any) {
      console.error('Test print error:', err);
      toast.error('Failed to generate test print PDF');
    } finally {
      setTestPrinting(false);
    }
  };

  // Open Version History
  const handleOpenHistory = async () => {
    if (!currentTemplate) return;
    try {
      setIsHistoryOpen(true);
      setLoadingVersions(true);
      const list = await receiptTemplateService.getTemplateVersions(currentTemplate.id);
      setVersions(list);
    } catch (err: any) {
      toast.error('Failed to load version history');
    } finally {
      setLoadingVersions(false);
    }
  };

  // Rollback Version
  const handleRollback = async (version: ReceiptTemplateVersion) => {
    if (!currentTemplate) return;
    if (!window.confirm(`Roll back to version v${version.version}? This will replace current layout.`)) {
      return;
    }
    try {
      setRollingBackId(version.id);
      const restored = await receiptTemplateService.rollbackVersion(currentTemplate.id, version.id);
      selectTemplate(restored);
      setTemplates(prev => prev.map(t => t.id === restored.id ? restored : t));
      setIsHistoryOpen(false);
      toast.success(`Restored layout from v${version.version} (now v${restored.version})`);
    } catch (err: any) {
      toast.error('Failed to restore version');
    } finally {
      setRollingBackId(null);
    }
  };

  // Reset to Factory Default
  const handleResetToDefault = async () => {
    if (!currentTemplate) return;
    if (!window.confirm(`Reset "${currentTemplate.name}" to factory default baseline?`)) {
      return;
    }
    try {
      setSaving(true);
      const reset = await receiptTemplateService.resetToDefault(currentTemplate.id);
      selectTemplate(reset);
      setTemplates(prev => prev.map(t => t.id === reset.id ? reset : t));
      toast.success('Reset template to system default baseline');
    } catch (err: any) {
      toast.error('Failed to reset template');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        <p className="text-gray-600 font-medium">Loading Receipt Designer...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Palette className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Receipt Designer & Branding</h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Visual template designer & presentation engine for all IMAN cooperative receipts
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTestPrint}
            disabled={testPrinting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            {testPrinting ? <Loader2 className="w-4 h-4 animate-spin text-teal-600" /> : <Printer className="w-4 h-4 text-teal-600" />}
            Test Print (Sample)
          </button>

          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold shadow-sm transition"
          >
            <History className="w-4 h-4 text-indigo-600" />
            Version History (v{currentTemplate?.version || 1})
          </button>

          <button
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 text-xs sm:text-sm transition"
            title="Reset to Factory Default"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold shadow-md transition ${
              hasChanges && !saving
                ? 'bg-teal-700 text-white hover:bg-teal-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Main Grid: Controls (Left) and Live Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Controls Panel (5 Columns) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Template Selector & Format Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Select Receipt Template
              </label>
              {currentTemplate?.is_default ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Check className="w-3 h-3" /> Active Default
                </span>
              ) : (
                <button
                  onClick={handleActivate}
                  className="text-[11px] text-teal-700 hover:underline font-bold"
                >
                  Set as Active Default
                </button>
              )}
            </div>

            <select
              value={currentTemplate?.id || ''}
              onChange={handleTemplateChange}
              className="w-full text-sm font-semibold border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.type.toUpperCase()}) {t.is_default ? '★ Default' : ''}
                </option>
              ))}
            </select>

            {/* Paper Size Selector */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Paper Format</div>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                {[
                  { id: 'A4', name: 'A4 Page' },
                  { id: 'A5', name: 'A5 Slip' },
                  { id: 'thermal_80', name: 'POS 80mm' },
                  { id: 'thermal_58', name: 'POS 58mm' }
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => {
                      setPaperSize(fmt.id as any);
                      setHasChanges(true);
                    }}
                    className={`py-1.5 px-2 rounded text-center transition ${
                      paperSize === fmt.id
                        ? 'bg-teal-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {fmt.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accordion Configurations */}
          <div className="space-y-3">
            {/* 1. Branding & Colors */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'colors' ? '' : 'colors')}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-gray-800 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-teal-600" />
                  Color Palettes & Theme
                </span>
                {activeAccordion === 'colors' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {activeAccordion === 'colors' && (
                <div className="p-4 pt-0 space-y-4 border-t border-gray-100 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-2">Preset Palettes</label>
                    <div className="grid grid-cols-2 gap-2">
                      {COLOR_PRESETS.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => applyPreset(preset)}
                          className={`p-2 rounded-lg border text-left flex items-center gap-2 transition ${
                            config.theme === preset.id ? 'border-teal-600 ring-2 ring-teal-500/20 bg-teal-50/30' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex -space-x-1 overflow-hidden">
                            <span className="inline-block w-4 h-4 rounded-full border border-white" style={{ backgroundColor: preset.primary }} />
                            <span className="inline-block w-4 h-4 rounded-full border border-white" style={{ backgroundColor: preset.secondary }} />
                          </div>
                          <span className="font-medium text-gray-800 text-[11px] truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Hex Inputs */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <label className="font-semibold text-gray-700 block">Custom Colors</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[11px] text-gray-500 block mb-1">Primary Color</span>
                        <div className="flex items-center gap-1.5 border rounded-lg p-1">
                          <input
                            type="color"
                            value={config.colors?.primary || '#0F766E'}
                            onChange={(e) => updateConfig('colors.primary', e.target.value)}
                            className="w-7 h-7 rounded border-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.colors?.primary || ''}
                            onChange={(e) => updateConfig('colors.primary', e.target.value)}
                            className="w-full text-xs font-mono uppercase focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-500 block mb-1">Secondary Color</span>
                        <div className="flex items-center gap-1.5 border rounded-lg p-1">
                          <input
                            type="color"
                            value={config.colors?.secondary || '#D97706'}
                            onChange={(e) => updateConfig('colors.secondary', e.target.value)}
                            className="w-7 h-7 rounded border-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.colors?.secondary || ''}
                            onChange={(e) => updateConfig('colors.secondary', e.target.value)}
                            className="w-full text-xs font-mono uppercase focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-500 block mb-1">Text Color</span>
                        <div className="flex items-center gap-1.5 border rounded-lg p-1">
                          <input
                            type="color"
                            value={config.colors?.text || '#1F2937'}
                            onChange={(e) => updateConfig('colors.text', e.target.value)}
                            className="w-7 h-7 rounded border-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.colors?.text || ''}
                            onChange={(e) => updateConfig('colors.text', e.target.value)}
                            className="w-full text-xs font-mono uppercase focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <span className="text-[11px] text-gray-500 block mb-1">Background Tint</span>
                        <div className="flex items-center gap-1.5 border rounded-lg p-1">
                          <input
                            type="color"
                            value={config.colors?.background || '#FFFFFF'}
                            onChange={(e) => updateConfig('colors.background', e.target.value)}
                            className="w-7 h-7 rounded border-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={config.colors?.background || ''}
                            onChange={(e) => updateConfig('colors.background', e.target.value)}
                            className="w-full text-xs font-mono uppercase focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Organization Header & Title */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'header' ? '' : 'header')}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-gray-800 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  Header & Organization Details
                </span>
                {activeAccordion === 'header' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {activeAccordion === 'header' && (
                <div className="p-4 pt-0 space-y-3 border-t border-gray-100 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Receipt Title</label>
                    <input
                      type="text"
                      value={config.header?.receipt_title || ''}
                      onChange={(e) => updateConfig('header.receipt_title', e.target.value)}
                      placeholder="e.g. OFFICIAL RECEIPT, CONTRIBUTION RECEIPT"
                      className="w-full border rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Organization Name</label>
                    <input
                      type="text"
                      value={config.header?.org_name || ''}
                      onChange={(e) => updateConfig('header.org_name', e.target.value)}
                      className="w-full border rounded-lg p-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Tagline / Motto</label>
                    <input
                      type="text"
                      value={config.header?.tagline || ''}
                      onChange={(e) => updateConfig('header.tagline', e.target.value)}
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Registration No</label>
                      <input
                        type="text"
                        value={config.header?.registration_no || ''}
                        onChange={(e) => updateConfig('header.registration_no', e.target.value)}
                        className="w-full border rounded-lg p-2"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-gray-700 block mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={config.header?.phone || ''}
                        onChange={(e) => updateConfig('header.phone', e.target.value)}
                        className="w-full border rounded-lg p-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Address / State</label>
                    <input
                      type="text"
                      value={config.header?.address || ''}
                      onChange={(e) => updateConfig('header.address', e.target.value)}
                      className="w-full border rounded-lg p-2"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. Logo & Layout Settings */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'logo' ? '' : 'logo')}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-gray-800 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-teal-600" />
                  Logo & Typography
                </span>
                {activeAccordion === 'logo' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {activeAccordion === 'logo' && (
                <div className="p-4 pt-0 space-y-3 border-t border-gray-100 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Logo Placement</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['left', 'center', 'right'].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => updateConfig('logo.position', pos)}
                          className={`p-2 rounded border capitalize text-center font-medium ${
                            config.logo?.position === pos ? 'bg-teal-50 border-teal-600 text-teal-700' : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-gray-700">Logo Size ({config.logo?.width || 64}px)</label>
                    </div>
                    <input
                      type="range"
                      min="40"
                      max="110"
                      value={config.logo?.width || 64}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updateConfig('logo.width', val);
                        updateConfig('logo.height', val);
                      }}
                      className="w-full accent-teal-600"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="font-semibold text-gray-700 block mb-1">Font Family</label>
                    <select
                      value={config.typography?.font_family || 'Inter, sans-serif'}
                      onChange={(e) => updateConfig('typography.font_family', e.target.value)}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="Inter, sans-serif">Inter (Clean Modern Sans-Serif)</option>
                      <option value="Roboto, sans-serif">Roboto (Structured Technical)</option>
                      <option value="Merriweather, serif">Merriweather (Classic Serif)</option>
                      <option value="Courier, monospace">Courier (Thermal Receipt Monospace)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Border Styling</label>
                    <select
                      value={config.border_style || 'solid'}
                      onChange={(e) => updateConfig('border_style', e.target.value)}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="solid">Standard Solid Border</option>
                      <option value="dashed">Dashed Border (Thermal Vouchers)</option>
                      <option value="double">Executive Double Border</option>
                      <option value="minimal">Minimal Top/Bottom Line</option>
                      <option value="none">Borderless Clean</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Sections Visibility */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'sections' ? '' : 'sections')}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-gray-800 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Section Visibility Toggles
                </span>
                {activeAccordion === 'sections' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {activeAccordion === 'sections' && (
                <div className="p-4 pt-0 space-y-2.5 border-t border-gray-100 text-xs">
                  {[
                    { key: 'show_logo', label: 'Cooperative Logo' },
                    { key: 'show_header', label: 'Organization Header & Contact' },
                    { key: 'show_metadata', label: 'Receipt Number & Date' },
                    { key: 'show_member_details', label: 'Member Information' },
                    { key: 'show_breakdown', label: 'Transaction Breakdown Items' },
                    { key: 'show_summary', label: 'Total Paid & Words' },
                    { key: 'show_qr_code', label: 'Verification QR Code' },
                    { key: 'show_barcode', label: 'Barcode Slip' },
                    { key: 'show_signatures', label: 'Authorized Signatures' },
                    { key: 'show_stamp', label: 'Official Digital Stamp / Seal' },
                    { key: 'show_watermark', label: 'Background Watermark' },
                    { key: 'show_notes', label: 'Footer Policies & Disclaimers' }
                  ].map(sec => (
                    <label key={sec.key} className="flex items-center justify-between p-1.5 rounded hover:bg-gray-50 cursor-pointer">
                      <span className="text-gray-700 font-medium">{sec.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(config.sections?.[sec.key as keyof typeof config.sections])}
                        onChange={(e) => updateConfig(`sections.${sec.key}`, e.target.checked)}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Watermark, Signatures & Stamp */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <button
                onClick={() => setActiveAccordion(activeAccordion === 'security' ? '' : 'security')}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-gray-800 hover:bg-gray-50"
              >
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-teal-600" />
                  Watermark, Seal & Signatures
                </span>
                {activeAccordion === 'security' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {activeAccordion === 'security' && (
                <div className="p-4 pt-0 space-y-3 border-t border-gray-100 text-xs">
                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Watermark Text</label>
                    <input
                      type="text"
                      value={config.watermark?.text || ''}
                      onChange={(e) => updateConfig('watermark.text', e.target.value)}
                      placeholder="e.g. OFFICIAL RECEIPT, PAID"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="font-semibold text-gray-700">Watermark Opacity ({Math.round((config.watermark?.opacity || 0.1) * 100)}%)</label>
                    </div>
                    <input
                      type="range"
                      min="0.04"
                      max="0.25"
                      step="0.01"
                      value={config.watermark?.opacity || 0.1}
                      onChange={(e) => updateConfig('watermark.opacity', parseFloat(e.target.value))}
                      className="w-full accent-teal-600"
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <label className="font-semibold text-gray-700 block mb-1">Signatory Title</label>
                    <input
                      type="text"
                      value={config.signature?.title || ''}
                      onChange={(e) => updateConfig('signature.title', e.target.value)}
                      placeholder="e.g. Treasurer / Financial Secretary"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Official Stamp Text</label>
                    <input
                      type="text"
                      value={config.stamp?.text || ''}
                      onChange={(e) => updateConfig('stamp.text', e.target.value)}
                      placeholder="e.g. IMAN COOPERATIVE • OFFICIAL SEAL"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-gray-700 block mb-1">Footer Notes & Disclaimers</label>
                    <textarea
                      rows={3}
                      value={config.notes?.text || ''}
                      onChange={(e) => updateConfig('notes.text', e.target.value)}
                      placeholder="Enter legal notice, payment policies or Shari'ah compliance statement"
                      className="w-full border rounded-lg p-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Canvas: Responsive Live Preview (7 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-teal-700" />
              <span className="font-bold text-sm text-gray-900">Live Preview Canvas</span>
            </div>

            {/* Preview Mode Switcher */}
            <div className="flex items-center bg-gray-100 p-1 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                  previewMode === 'desktop' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-1 px-3 py-1 rounded transition ${
                  previewMode === 'mobile' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
            </div>
          </div>

          {/* Canvas Container with Scroll */}
          <div className="bg-gray-100/80 p-4 sm:p-8 rounded-2xl border border-gray-200 min-h-[640px] flex items-start justify-center overflow-x-auto shadow-inner">
            <ReceiptPreview
              config={config}
              paperSize={paperSize}
              previewMode={previewMode}
            />
          </div>
        </div>
      </div>

      {/* Version History Modal / Drawer */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-200"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-gray-900">Version History</h3>
                </div>
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-200 text-gray-500 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {loadingVersions ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading version history...
                  </div>
                ) : versions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No historical versions recorded yet.
                  </div>
                ) : (
                  versions.map(v => (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 bg-white transition flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">Version {v.version}</span>
                          {currentTemplate?.version === v.version && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              Current Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600">{v.change_summary || 'Layout update'}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(v.created_at).toLocaleString('en-NG')}
                        </p>
                      </div>

                      {currentTemplate?.version !== v.version && (
                        <button
                          onClick={() => handleRollback(v)}
                          disabled={rollingBackId === v.id}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                        >
                          {rollingBackId === v.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                          Rollback
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                <button
                  onClick={() => setIsHistoryOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
