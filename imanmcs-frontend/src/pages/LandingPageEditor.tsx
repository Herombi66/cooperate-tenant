import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Loader2, Layout, Briefcase, ListOrdered,
  Info, HelpCircle, Megaphone, FileText, Plus, Trash2, Eye, Palette
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface LandingPageConfig {
  heroTopChip: string;
  heroTitle: string;
  heroSubtitle: string;
  heroFeatures: { title: string; subtitle: string }[];
  servicesTitle: string;
  servicesDescription: string;
  services: { title: string; description: string }[];
  howTitle: string;
  howDescription: string;
  howSteps: { title: string; body: string }[];
  aboutText: string;
  aboutBullets: string[];
  coreValues: { title: string; body: string }[];
  faqTitle: string;
  faqDescription: string;
  faqs: { q: string; a: string }[];
  ctaTitle: string;
  ctaDescription: string;
  footerDescription: string;
  contactEmail: string;
  contactPhone: string;
}

const defaultConfig: LandingPageConfig = {
  heroTopChip: 'Trusted, transparent, member-first',
  heroTitle: 'Empowering Healthcare Professionals Financially',
  heroSubtitle: 'Join us. Save, invest, and access loans with competitive rates in a secure environment.',
  heroFeatures: [
    { title: 'Biblically Principled', subtitle: 'Justice, fairness, and financial integrity' },
    { title: 'Member Benefits', subtitle: 'High yield investments and tailored loans' },
    { title: 'Clear Approvals', subtitle: 'Transparent review and instant notifications' }
  ],
  servicesTitle: 'Services built for clarity and speed',
  servicesDescription: 'A modern cooperative experience: simple onboarding, clear approvals, and a dashboard that keeps members informed at a glance.',
  services: [
    { title: 'Savings & investment', description: 'Contribute monthly and track balances over time. Investment drives transparent profit sharing.' },
    { title: 'Loans & guarantees', description: 'Apply, review, and manage loans with clear statuses. Guarantee requests are tracked with history and instant notifications.' },
    { title: 'Transparent governance', description: 'Admin workflows include validation, audit trails, and consistent feedback so actions are always traceable and accountable.' }
  ],
  howTitle: 'How it works',
  howDescription: 'A seamless guided flow from onboarding to contributions, loans, and support—designed to be effortless on mobile and fast on any network.',
  howSteps: [
    { title: 'Apply & get verified', body: 'Submit your membership application with accurate details. Our streamlined review process ensures quick verification.' },
    { title: 'Contribute monthly', body: 'Save and invest on a consistent schedule. Your personalized dashboard instantly reflects approvals and tracks your complete history.' },
    { title: 'Access support & loans', body: 'Apply for eligible loans, manage guarantees, securely send complaints, and receive official admin communications directly.' }
  ],
  aboutText: 'Our mission is to foster financial independence, mutual support, and wealth creation for our members.',
  aboutBullets: [
    'Empowering Healthcare Professionals through dedicated financial services',
    'Fostering a Culture of Savings & Investment',
    'Providing Accessible, Biblically-principled Financial Support'
  ],
  coreValues: [
    { title: 'Integrity', body: 'Operating with complete transparency and honesty in all financial dealings.' },
    { title: 'Mutual Support', body: 'A community of healthcare professionals lifting each other up.' },
    { title: 'Excellence', body: 'Delivering professional-grade financial services and responsive support.' },
    { title: 'Growth', body: 'Creating sustainable wealth through strategic investments and profit sharing.' }
  ],
  faqTitle: 'Frequently asked questions',
  faqDescription: 'Quick answers to the most common questions about our cooperative.',
  faqs: [
    { q: 'Are operations Biblically-principled?', a: 'Yes, all operations strictly follow Biblical principles of Justice, fairness, and financial integrity.' },
    { q: 'What loans are available?', a: 'We offer Cash loans, Venture loans, and Emergency loans to active members.' },
    { q: 'How do guarantees work?', a: 'Members can receive guarantee requests and securely respond with approval/rejection directly from their dashboard.' },
    { q: 'How do withdrawals work?', a: 'Eligible members can request exactly 30% of their contributions once per calendar year, subject to no active loans and administrative approval.' }
  ],
  ctaTitle: 'Ready to join us?',
  ctaDescription: 'Apply in minutes. Track approvals, contributions, loans, messages, and guarantees all from one secure, beautifully crafted dashboard.',
  footerDescription: 'A modern cooperative platform for healthcare professionals. Built for transparency, accessibility, and responsible growth.',
  contactEmail: 'contact@example.com',
  contactPhone: '+234 000 000 0000'
};

const tabs = [
  { id: 'colors', label: 'Theme Colors', icon: Palette },
  { id: 'hero', label: 'Hero Section', icon: Layout },
  { id: 'services', label: 'Services', icon: Briefcase },
  { id: 'how', label: 'How it Works', icon: ListOrdered },
  { id: 'about', label: 'About & Values', icon: Info },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'cta', label: 'Call to Action', icon: Megaphone },
  { id: 'footer', label: 'Footer & Contact', icon: FileText },
];

// InputField defined OUTSIDE of LandingPageEditor to avoid re-creating on every render!
const InputField = ({ label, value, onChange, placeholder, multiline = false, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean; rows?: number;
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {multiline ? (
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none resize-none"
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
        placeholder={placeholder}
      />
    )}
  </div>
);

export const LandingPageEditor: React.FC = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('colors');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9');
  const [secondaryColor, setSecondaryColor] = useState('#38bdf8');
  const [config, setConfig] = useState<LandingPageConfig>(defaultConfig);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const token = localStorage.getItem('platformToken');
        if (!token) {
          navigate('/platform/login');
          return;
        }
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await axios.get(`${API_URL}/platform/tenants`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          const tenant = response.data.tenants.find((t: any) => t.id === tenantId);
          if (tenant) {
            setTenantName(tenant.name);
            setPrimaryColor(tenant.theme?.primaryColor || '#0ea5e9');
            setSecondaryColor(tenant.theme?.secondaryColor || '#38bdf8');
            const lp = tenant.theme?.landingPage;
            if (lp) {
              setConfig({
                heroTopChip: lp.heroTopChip ?? defaultConfig.heroTopChip,
                heroTitle: lp.heroTitle ?? defaultConfig.heroTitle,
                heroSubtitle: lp.heroSubtitle ?? defaultConfig.heroSubtitle,
                heroFeatures: Array.isArray(lp.heroFeatures) ? lp.heroFeatures : defaultConfig.heroFeatures,
                servicesTitle: lp.servicesTitle ?? defaultConfig.servicesTitle,
                servicesDescription: lp.servicesDescription ?? defaultConfig.servicesDescription,
                services: Array.isArray(lp.services) ? lp.services : defaultConfig.services,
                howTitle: lp.howTitle ?? defaultConfig.howTitle,
                howDescription: lp.howDescription ?? defaultConfig.howDescription,
                howSteps: Array.isArray(lp.howSteps) ? lp.howSteps : defaultConfig.howSteps,
                aboutText: lp.aboutText ?? defaultConfig.aboutText,
                aboutBullets: Array.isArray(lp.aboutBullets) ? lp.aboutBullets : defaultConfig.aboutBullets,
                coreValues: Array.isArray(lp.coreValues) ? lp.coreValues : defaultConfig.coreValues,
                faqTitle: lp.faqTitle ?? defaultConfig.faqTitle,
                faqDescription: lp.faqDescription ?? defaultConfig.faqDescription,
                faqs: Array.isArray(lp.faqs) ? lp.faqs : defaultConfig.faqs,
                ctaTitle: lp.ctaTitle ?? defaultConfig.ctaTitle,
                ctaDescription: lp.ctaDescription ?? defaultConfig.ctaDescription,
                footerDescription: lp.footerDescription ?? defaultConfig.footerDescription,
                contactEmail: lp.contactEmail ?? defaultConfig.contactEmail,
                contactPhone: lp.contactPhone ?? defaultConfig.contactPhone,
              });
            }
          }
        }
      } catch (error) {
        toast.error('Failed to load tenant data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTenant();
  }, [tenantId, navigate]);

  const updateField = (field: keyof LandingPageConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateArrayItem = (field: keyof LandingPageConfig, index: number, key: string, value: string) => {
    setConfig(prev => {
      const arr = [...(prev[field] as any[])];
      arr[index] = { ...arr[index], [key]: value };
      return { ...prev, [field]: arr };
    });
    setHasChanges(true);
  };

  const addArrayItem = (field: keyof LandingPageConfig, template: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: [...(prev[field] as any[]), template]
    }));
    setHasChanges(true);
  };

  const removeArrayItem = (field: keyof LandingPageConfig, index: number) => {
    setConfig(prev => ({
      ...prev,
      [field]: (prev[field] as any[]).filter((_: any, i: number) => i !== index)
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem('platformToken');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await axios.put(`${API_URL}/platform/tenants/${tenantId}`, {
        theme: {
          primaryColor,
          secondaryColor,
          landingPage: config
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Landing page saved successfully!');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const renderColorsTab = () => {
    const presets = [
      { name: 'Sky Bright (Default)', primary: '#0ea5e9', secondary: '#38bdf8' },
      { name: 'Classic Indigo', primary: '#4f46e5', secondary: '#818cf8' },
      { name: 'Sleek Teal', primary: '#0d9488', secondary: '#2dd4bf' },
      { name: 'Emerald Growth', primary: '#059669', secondary: '#34d399' },
      { name: 'Royal Blue', primary: '#1d4ed8', secondary: '#60a5fa' },
      { name: 'Sunset Amber', primary: '#d97706', secondary: '#fbbf24' },
      { name: 'Charcoal Modern', primary: '#374151', secondary: '#9ca3af' },
    ];

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Theme Customization</h3>
          <p className="text-sm text-gray-500 mb-6">
            Customize the branding colors for this tenant workspace. These colors will be used across the landing page and member dashboards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Color */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Primary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="#000000"
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm uppercase focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                />
              </div>
              <p className="text-xs text-gray-400">Used for primary buttons, active states, and main accents.</p>
            </div>

            {/* Secondary Color */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
              <label className="block text-sm font-semibold text-gray-700">Secondary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => {
                    setSecondaryColor(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-12 h-12 rounded-lg border border-gray-200 cursor-pointer p-0 bg-transparent"
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => {
                    setSecondaryColor(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="#000000"
                  className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm uppercase focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                />
              </div>
              <p className="text-xs text-gray-400">Used for secondary buttons, subtle borders, and backgrounds.</p>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Curated Presets</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrimaryColor(preset.primary);
                  setSecondaryColor(preset.secondary);
                  setHasChanges(true);
                  toast.success(`Applied ${preset.name} preset!`);
                }}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-900 hover:shadow-md transition-all text-left"
              >
                <div>
                  <span className="block text-xs font-semibold text-gray-900">{preset.name}</span>
                  <span className="text-[10px] text-gray-400 uppercase">{preset.primary} / {preset.secondary}</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: preset.primary }} />
                  <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: preset.secondary }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Live Component Preview</h3>
          <div className="p-6 bg-slate-50 rounded-xl border border-gray-200 space-y-6 flex flex-col items-center justify-center">
            <div className="flex gap-4">
              <button
                type="button"
                style={{ backgroundColor: primaryColor }}
                className="px-6 py-2.5 text-white font-medium text-sm rounded-xl shadow-lg transition-transform hover:scale-[1.02]"
              >
                Primary Button
              </button>
              <button
                type="button"
                style={{ borderColor: primaryColor, color: primaryColor }}
                className="px-6 py-2.5 bg-white border font-medium text-sm rounded-xl transition-transform hover:scale-[1.02]"
              >
                Outline Button
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ color: primaryColor }} className="text-sm font-semibold">Active State Link</span>
              <span className="text-gray-400">|</span>
              <span style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }} className="px-3 py-1 rounded-full text-xs font-semibold">
                Badge Pill
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderHeroTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Hero Content</h3>
        <div className="space-y-4">
          <InputField label="Top Chip Text" value={config.heroTopChip} onChange={(v) => updateField('heroTopChip', v)} placeholder="e.g. Trusted, transparent, member-first" />
          <InputField label="Hero Title" value={config.heroTitle} onChange={(v) => updateField('heroTitle', v)} placeholder="Main heading text" />
          <InputField label="Hero Subtitle" value={config.heroSubtitle} onChange={(v) => updateField('heroSubtitle', v)} placeholder="Supporting description" multiline rows={2} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Hero Feature Badges</h3>
          {config.heroFeatures.length < 5 && (
            <button onClick={() => addArrayItem('heroFeatures', { title: '', subtitle: '' })} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4" /> Add
            </button>
          )}
        </div>
        <div className="space-y-4">
          {config.heroFeatures.map((f, i) => (
            <div key={i} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                <InputField label={`Badge ${i + 1} Title`} value={f.title} onChange={(v) => updateArrayItem('heroFeatures', i, 'title', v)} />
                <InputField label={`Badge ${i + 1} Subtitle`} value={f.subtitle} onChange={(v) => updateArrayItem('heroFeatures', i, 'subtitle', v)} />
              </div>
              {config.heroFeatures.length > 1 && (
                <button onClick={() => removeArrayItem('heroFeatures', i)} className="mt-7 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderServicesTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Header</h3>
        <div className="space-y-4">
          <InputField label="Services Title" value={config.servicesTitle} onChange={(v) => updateField('servicesTitle', v)} />
          <InputField label="Services Description" value={config.servicesDescription} onChange={(v) => updateField('servicesDescription', v)} multiline rows={2} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Service Cards</h3>
          {config.services.length < 6 && (
            <button onClick={() => addArrayItem('services', { title: '', description: '' })} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4" /> Add Service
            </button>
          )}
        </div>
        <div className="space-y-4">
          {config.services.map((s, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-gray-500">Service {i + 1}</span>
                {config.services.length > 1 && (
                  <button onClick={() => removeArrayItem('services', i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <InputField label="Title" value={s.title} onChange={(v) => updateArrayItem('services', i, 'title', v)} />
                <InputField label="Description" value={s.description} onChange={(v) => updateArrayItem('services', i, 'description', v)} multiline rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHowTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Header</h3>
        <div className="space-y-4">
          <InputField label="How It Works Title" value={config.howTitle} onChange={(v) => updateField('howTitle', v)} />
          <InputField label="How It Works Description" value={config.howDescription} onChange={(v) => updateField('howDescription', v)} multiline rows={2} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Steps</h3>
          {config.howSteps.length < 6 && (
            <button onClick={() => addArrayItem('howSteps', { title: '', body: '' })} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4" /> Add Step
            </button>
          )}
        </div>
        <div className="space-y-4">
          {config.howSteps.map((s, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">{i + 1}</span>
                  <span className="text-sm font-semibold text-gray-500">Step {i + 1}</span>
                </div>
                {config.howSteps.length > 1 && (
                  <button onClick={() => removeArrayItem('howSteps', i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <InputField label="Step Title" value={s.title} onChange={(v) => updateArrayItem('howSteps', i, 'title', v)} />
                <InputField label="Step Body" value={s.body} onChange={(v) => updateArrayItem('howSteps', i, 'body', v)} multiline rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAboutTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About Section</h3>
        <div className="space-y-4">
          <InputField label="About Text" value={config.aboutText} onChange={(v) => updateField('aboutText', v)} multiline rows={3} placeholder="Describe your cooperative's mission..." />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Key Highlights</h3>
          {config.aboutBullets.length < 6 && (
            <button onClick={() => {
              updateField('aboutBullets', [...config.aboutBullets, '']);
            }} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4" /> Add Bullet
            </button>
          )}
        </div>
        <div className="space-y-3">
          {config.aboutBullets.map((b, i) => (
            <div key={i} className="flex gap-3 items-center">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
              <input
                type="text"
                value={b}
                onChange={(e) => {
                  const arr = [...config.aboutBullets];
                  arr[i] = e.target.value;
                  updateField('aboutBullets', arr);
                }}
                className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                placeholder={`Bullet point ${i + 1}`}
              />
              {config.aboutBullets.length > 1 && (
                <button onClick={() => {
                  updateField('aboutBullets', config.aboutBullets.filter((_: string, idx: number) => idx !== i));
                }} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Core Values</h3>
          {config.coreValues.length < 6 && (
            <button onClick={() => addArrayItem('coreValues', { title: '', body: '' })} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
              <Plus className="w-4 h-4" /> Add Value
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {config.coreValues.map((v, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-gray-500">Value {i + 1}</span>
                {config.coreValues.length > 1 && (
                  <button onClick={() => removeArrayItem('coreValues', i)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <InputField label="Title" value={v.title} onChange={(val) => updateArrayItem('coreValues', i, 'title', val)} />
                <InputField label="Description" value={v.body} onChange={(val) => updateArrayItem('coreValues', i, 'body', val)} multiline rows={2} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderFaqTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Section Header</h3>
        <div className="space-y-4">
          <InputField label="FAQ Title" value={config.faqTitle} onChange={(v) => updateField('faqTitle', v)} />
          <InputField label="FAQ Description" value={config.faqDescription} onChange={(v) => updateField('faqDescription', v)} multiline rows={2} />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Questions & Answers</h3>
          <button onClick={() => addArrayItem('faqs', { q: '', a: '' })} className="flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
            <Plus className="w-4 h-4" /> Add FAQ
          </button>
        </div>
        <div className="space-y-4">
          {config.faqs.map((faq, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-start justify-between mb-3">
                <span className="text-sm font-semibold text-gray-500">FAQ {i + 1}</span>
                {config.faqs.length > 1 && (
                  <button onClick={() => removeArrayItem('faqs', i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3">
                <InputField label="Question" value={faq.q} onChange={(v) => updateArrayItem('faqs', i, 'q', v)} placeholder="Ask a question..." />
                <InputField label="Answer" value={faq.a} onChange={(v) => updateArrayItem('faqs', i, 'a', v)} multiline rows={2} placeholder="Provide the answer..." />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCtaTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Call to Action Section</h3>
        <div className="space-y-4">
          <InputField label="CTA Title" value={config.ctaTitle} onChange={(v) => updateField('ctaTitle', v)} placeholder="e.g. Ready to join us?" />
          <InputField label="CTA Description" value={config.ctaDescription} onChange={(v) => updateField('ctaDescription', v)} multiline rows={2} placeholder="Motivating description..." />
        </div>
      </div>
    </div>
  );

  const renderFooterTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Footer Content</h3>
        <div className="space-y-4">
          <InputField label="Footer Description" value={config.footerDescription} onChange={(v) => updateField('footerDescription', v)} multiline rows={2} placeholder="Brief description for the footer area" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField label="Contact Email" value={config.contactEmail} onChange={(v) => updateField('contactEmail', v)} placeholder="support@example.com" />
          <InputField label="Contact Phone" value={config.contactPhone} onChange={(v) => updateField('contactPhone', v)} placeholder="+234 800 000 0000" />
        </div>
      </div>
    </div>
  );

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'colors': return renderColorsTab();
      case 'hero': return renderHeroTab();
      case 'services': return renderServicesTab();
      case 'how': return renderHowTab();
      case 'about': return renderAboutTab();
      case 'faq': return renderFaqTab();
      case 'cta': return renderCtaTab();
      case 'footer': return renderFooterTab();
      default: return renderColorsTab();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/platform/dashboard')}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div className="h-6 w-px bg-gray-200" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Landing Page Editor</h1>
                <p className="text-xs text-gray-500">{tenantName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hasChanges && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">Unsaved changes</span>
              )}
              <button
                onClick={() => window.open(`/?tenant=${tenantId}`, '_blank')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Preview
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-900/20 hover:-translate-y-0.5 transition-all"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Tabs */}
          <div className="w-56 flex-shrink-0">
            <nav className="sticky top-24 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {renderActiveTab()}
          </div>
        </div>
      </div>
    </div>
  );
};
