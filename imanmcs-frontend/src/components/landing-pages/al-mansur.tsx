import React, { useState } from 'react';
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
 * Custom Landing Page for Al-Mansur Cooperative
 * Tenant ID: al-mansur
 * Cooperative Type: islamic
 * 
 * You can customize the layout, sections, styling, or copy of this page directly.
 */
export default function AlMansurLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "Who is eligible to join Al-Mansur Cooperative?",
      a: "Membership is open to verified individuals who meet our membership guidelines and commit to our monthly savings and cooperative principles."
    },
    {
      q: "How does Islamic profit sharing and loan financing work?",
      a: "We operate on strict interest-free principles. Investments share profits and losses, and loan financing uses Murabaha (cost-plus markup) without compounding interest or hidden penalties."
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
              <span className="text-xl">A</span>
            </div>
            <div>
              <span className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                Al-Mansur Cooperative
              </span>
              <span className="text-xs font-semibold tracking-wider text-primary-600 uppercase block">
                ISLAMIC COOPERATIVE
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
              href="/login?tenant=al-mansur"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Sign In
            </a>
            <a
              href="/apply-membership?tenant=al-mansur"
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
              <span>🌿 Shariah-Compliant Financial Cooperative</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Welcome to <span className="text-primary-600">Al-Mansur Cooperative</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
              Empowering our members with interest-free savings, ethical investment opportunities, and asset-backed finance governed by principles of fairness and integrity.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/apply-membership?tenant=al-mansur"
                className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-base shadow-lg shadow-primary-600/25 hover:shadow-primary-600/35 transition-all flex items-center justify-center gap-2"
              >
                <span>Apply for Membership</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="/login?tenant=al-mansur"
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
            <p className="text-slate-600 text-base">Ethical, Interest-Free & Shariah-Compliant Financial Solutions</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Halal Savings & Investment</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Earn ethical returns through asset-backed investments and transparent profit-sharing without usury (riba).</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Murabaha & Ethical Loans</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Access asset financing, emergency support, and ethical credit with transparent cost-plus terms and zero hidden fees.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mutual Support & Layyah</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Participate in sacrificial animal acquisition groups and communal solidarity funds designed to lift members.</p>
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
            Ready to build wealth with Al-Mansur Cooperative?
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Join a cooperative committed to financial transparency, member success, and ethical growth.
          </p>
          <div className="pt-2">
            <a
              href="/apply-membership?tenant=al-mansur"
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
            <p className="font-semibold text-white">Al-Mansur Cooperative</p>
            <p className="text-xs text-slate-500 mt-0.5">© {new Date().getFullYear()} Al-Mansur Cooperative. All rights reserved.</p>
          </div>
          <div className="flex items-center space-x-6 text-xs text-slate-500">
            <a href="/login?tenant=al-mansur" className="hover:text-white transition">Member Login</a>
            <a href="/apply-membership?tenant=al-mansur" className="hover:text-white transition">Apply for Membership</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
