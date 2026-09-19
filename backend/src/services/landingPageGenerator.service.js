const fs = require('fs');
const path = require('path');

// Determine path to frontend landing-pages directory
const LANDING_PAGES_DIR = process.env.FRONTEND_LANDING_PAGES_DIR || 
  path.resolve(__dirname, '../../../imanmcs-frontend/src/components/landing-pages');

/**
 * Generate clean React/TSX component code for a tenant's landing page
 * @param {Object} tenant - Tenant record
 * @returns {string} React TSX component code
 */
function generateLandingPageCode(tenant) {
  const tenantId = tenant.id;
  const tenantName = tenant.name || 'Cooperative Society';
  const coopType = tenant.cooperative_type || 'islamic';
  const isIslamic = coopType === 'islamic';
  const logoUrl = tenant.theme?.logoUrl || '';

  // Component PascalCase Name
  const safeComponentName = tenantId
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join('') + 'LandingPage';

  const subHeading = isIslamic
    ? 'Ethical, Interest-Free & Shariah-Compliant Financial Solutions'
    : 'Democratic, Community-Driven & Rewarding Cooperative Banking';

  const heroBadge = isIslamic ? '🌿 Shariah-Compliant Financial Cooperative' : '🤝 Member-Owned Cooperative Society';
  const heroTagline = isIslamic 
    ? 'Empowering our members with interest-free savings, ethical investment opportunities, and asset-backed finance governed by principles of fairness and integrity.'
    : 'Building financial resilience through pooled member savings, low-interest credit facilities, transparent governance, and annual dividend distributions.';

  const feature1Title = isIslamic ? 'Halal Savings & Investment' : 'High-Yield Member Savings';
  const feature1Desc = isIslamic
    ? 'Earn ethical returns through asset-backed investments and transparent profit-sharing without usury (riba).'
    : 'Build wealth through disciplined monthly contributions and competitive interest returns.';

  const feature2Title = isIslamic ? 'Murabaha & Ethical Loans' : 'Low-Interest Credit Loans';
  const feature2Desc = isIslamic
    ? 'Access asset financing, emergency support, and ethical credit with transparent cost-plus terms and zero hidden fees.'
    : 'Apply for development, emergency, and venture loans with member-friendly repayment terms and fast approvals.';

  const feature3Title = isIslamic ? 'Mutual Support & Layyah' : 'Annual Dividends & Surplus';
  const feature3Desc = isIslamic
    ? 'Participate in sacrificial animal acquisition groups and communal solidarity funds designed to lift members.'
    : 'Receive your fair share of annual cooperative surpluses and dividends based on your equity contributions.';

  const logoElement = logoUrl
    ? `<img src="${logoUrl}" alt="${tenantName}" className="w-full h-full object-contain" />`
    : `<span className="text-xl">${tenantName.charAt(0).toUpperCase()}</span>`;

  return `import React, { useState } from 'react';
import { 
  TrendingUp, 
  CreditCard, 
  Users, 
  CheckCircle2, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Sparkles
} from 'lucide-react';

/**
 * Custom Landing Page for ${tenantName}
 * Tenant ID: ${tenantId}
 * Cooperative Type: ${coopType}
 * 
 * You can customize the layout, sections, styling, or copy of this page directly.
 */
export default function ${safeComponentName}() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Who is eligible to join ${tenantName}?",
      a: "Membership is open to verified individuals who meet our membership guidelines and commit to our monthly savings and cooperative principles."
    },
    {
      q: "${isIslamic ? 'How does Islamic profit sharing and loan financing work?' : 'What are the interest rates and repayment terms on loans?'}",
      a: "${isIslamic ? 'We operate on strict interest-free principles. Investments share profits and losses, and loan financing uses Murabaha (cost-plus markup) without compounding interest or hidden penalties.' : 'Our loans offer competitive, cooperative-standard rates with flexible repayment terms designed to support member development rather than commercial profit.'}"
    },
    {
      q: "How do I monitor my contributions and loan status?",
      a: "Every verified member has access to a secure personal dashboard where contributions, active loans, dividend allocations, and announcements are tracked in real-time."
    },
    {
      q: "How do member guarantees work?",
      a: "Members can request trusted peers within the cooperative to act as loan guarantors. Guarantors can review and endorse requests directly from their own dashboard."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Navigation Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center text-white font-bold shadow-md shadow-slate-900/10 overflow-hidden">
              ${logoElement}
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                ${tenantName}
              </span>
              <span className="text-xs font-semibold tracking-wider text-primary-600 uppercase block">
                ${coopType.toUpperCase()} COOPERATIVE
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#services" className="hover:text-primary-600 transition-colors">Services</a>
            <a href="#how-it-works" className="hover:text-primary-600 transition-colors">How It Works</a>
            <a href="#faqs" className="hover:text-primary-600 transition-colors">FAQs</a>
          </nav>

          <div className="flex items-center space-x-3">
            <a
              href="/login?tenant=${tenantId}"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Sign In
            </a>
            <a
              href="/apply-membership?tenant=${tenantId}"
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5"
            >
              <span>Join Now</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-slate-200/60 bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-800 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>${heroBadge}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Welcome to <span className="text-primary-600">${tenantName}</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
              ${heroTagline}
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/apply-membership?tenant=${tenantId}"
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-base shadow-lg shadow-primary-600/25 hover:shadow-primary-600/35 transition-all flex items-center justify-center gap-2"
              >
                <span>Apply for Membership</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/login?tenant=${tenantId}"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Member Portal</span>
              </a>
            </div>

            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Instant Digital Onboarding</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Audited Financial Ledgers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Transparent Approvals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Key Value Pillars ── */}
      <section id="services" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-primary-600 tracking-wider uppercase">Our Core Offerings</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Designed for Member Prosperity</p>
            <p className="text-slate-600 text-base">${subHeading}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">${feature1Title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">${feature1Desc}</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">${feature2Title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">${feature2Desc}</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">${feature3Title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">${feature3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-primary-600 tracking-wider uppercase">Simple 3-Step Process</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">How to Get Started</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 relative shadow-sm">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Submit Application</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Complete the online registration form with your personal details and employment or professional records.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 relative shadow-sm">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Review & Verification</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                The cooperative executive committee reviews your submission with transparent audit checks and fast notifications.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 relative shadow-sm">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Access Portal & Benefits</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Log into your personalized dashboard, start contributing, apply for loans, and participate in governance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faqs" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-xs font-bold text-primary-600 tracking-wider uppercase">Got Questions?</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Frequently Asked Questions</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 border-t border-slate-100 bg-slate-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call To Action ── */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to build wealth with ${tenantName}?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Join a cooperative committed to financial transparency, member success, and ethical growth.
          </p>
          <div className="pt-2">
            <a
              href="/apply-membership?tenant=${tenantId}"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-xl shadow-lg transition-all"
            >
              <span>Get Started Today</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white">${tenantName}</p>
            <p className="text-xs text-slate-500 mt-0.5">© {new Date().getFullYear()} ${tenantName}. All rights reserved.</p>
          </div>
          <div className="flex items-center space-x-6 text-xs text-slate-500">
            <a href="/login?tenant=${tenantId}" className="hover:text-white transition">Member Login</a>
            <a href="/apply-membership?tenant=${tenantId}" className="hover:text-white transition">Apply for Membership</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;
}

/**
 * Write landing page TSX file for a tenant
 * @param {Object} tenant 
 * @returns {string} File path written
 */
function writeLandingPageFile(tenant) {
  if (!tenant || !tenant.id) {
    throw new Error('Valid tenant with id is required');
  }

  if (!fs.existsSync(LANDING_PAGES_DIR)) {
    fs.mkdirSync(LANDING_PAGES_DIR, { recursive: true });
  }

  const filePath = path.join(LANDING_PAGES_DIR, `${tenant.id}.tsx`);
  const code = generateLandingPageCode(tenant);
  fs.writeFileSync(filePath, code, 'utf-8');
  console.log(`✅ [LandingPageGenerator] Generated landing page file: ${filePath}`);
  return filePath;
}

/**
 * Read landing page TSX file for a tenant
 * @param {string} tenantId 
 * @returns {string|null} File code
 */
function readLandingPageFile(tenantId) {
  const filePath = path.join(LANDING_PAGES_DIR, `${tenantId}.tsx`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Save custom landing page TSX file for a tenant
 * @param {string} tenantId 
 * @param {string} code 
 * @returns {string} File path
 */
function saveLandingPageFile(tenantId, code) {
  if (!fs.existsSync(LANDING_PAGES_DIR)) {
    fs.mkdirSync(LANDING_PAGES_DIR, { recursive: true });
  }
  const filePath = path.join(LANDING_PAGES_DIR, `${tenantId}.tsx`);
  fs.writeFileSync(filePath, code, 'utf-8');
  console.log(`✅ [LandingPageGenerator] Saved custom landing page file: ${filePath}`);
  return filePath;
}

module.exports = {
  generateLandingPageCode,
  writeLandingPageFile,
  readLandingPageFile,
  saveLandingPageFile,
  LANDING_PAGES_DIR
};
