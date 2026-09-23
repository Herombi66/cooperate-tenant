import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Lock,
  PieChart,
  Coins,
  Scale,
  Building2,
  FileCheck2,
  HeartHandshake,
  HelpCircle,
  ExternalLink,
  Search,
  Check,
  ChevronRight,
  BarChart3,
  RefreshCw,
  Clock,
  Briefcase
} from 'lucide-react';

const SHARIAH_CONTRACTS = [
  {
    id: 'murabaha',
    name: 'Murabaha',
    tag: 'Cost-Plus Asset Financing',
    subtitle: 'Transparent procurement of physical assets without hidden compounding debt.',
    description:
      'The cooperative purchases high-value assets (such as solar equipment, commercial tools, building supplies, or automotive vehicles) and sells them to you at an upfront, pre-agreed profit margin with fixed, predictable monthly installments.',
    tenor: '6 to 36 Months',
    rateStructure: 'Zero Riba / Fixed Margin Upfront',
    suitableFor: 'Household electronics, vehicle acquisition, project machinery, enterprise equipment',
    badgeColor: 'from-amber-500/20 to-emerald-500/10 text-amber-300 border-amber-500/30'
  },
  {
    id: 'mudarabah',
    name: 'Mudarabah',
    tag: 'Profit-Sharing Savings',
    subtitle: 'Participate as Rab-ul-Maal (capital provider) in audited cooperative ventures.',
    description:
      'Your monthly contributions are pooled into verified, ethically screened agricultural, real estate, and trade ventures managed by FMCK SMCS. Profits are distributed according to a predetermined ratio, safeguarding cooperative transparency.',
    tenor: 'Annual Cycle / Rollover',
    rateStructure: 'Equitable Surplus Ratio (80:20 Pool Distribution)',
    suitableFor: 'Long-term wealth accumulation, retirement cushions, education reserves',
    badgeColor: 'from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/30'
  },
  {
    id: 'qard',
    name: 'Qard Hasan',
    tag: 'Benevolent Interest-Free Loans',
    subtitle: 'Pure community solidarity with 0% interest, 0% markup, and flexible relief.',
    description:
      'Designed exclusively to alleviate urgent financial hardship or emergency medical/educational demands. Members borrow the exact amount required and return the exact principal with zero penalties or usury.',
    tenor: '3 to 12 Months',
    rateStructure: '0.0% Absolute Markup / Pure Benevolent Aid',
    suitableFor: 'Emergency medical bills, acute tuition emergencies, family welfare',
    badgeColor: 'from-blue-500/20 to-cyan-500/10 text-cyan-300 border-cyan-500/30'
  },
  {
    id: 'layyah',
    name: 'Layyah Pool',
    tag: 'Eid Livestock Cooperative',
    subtitle: 'Community bulk livestock procurement with planned monthly micro-contributions.',
    description:
      'Eliminate high seasonal price spikes during Eid-ul-Adha. Members accumulate manageable monthly savings toward vetted healthy livestock sourced directly from partner farms at wholesale prices.',
    tenor: '10 to 12 Months Savings Pool',
    rateStructure: 'Wholesale Group Purchasing Parity',
    suitableFor: 'Eid sacrificial livestock, community meat distributions, farm direct contracts',
    badgeColor: 'from-emerald-600/20 to-emerald-400/10 text-emerald-300 border-emerald-400/30'
  }
];

const FAQS_DATA = [
  {
    category: 'Shariah Compliance',
    q: 'How does FMCK SMCS guarantee 100% compliance with Islamic Law?',
    a: 'All financial activities, contracts, and surplus pools are supervised and audited by our independent Shariah Advisory Board. We strictly prohibit Riba (usury/interest), Gharar (excessive ambiguity), and Maysir (gambling/speculation). All financing contracts are asset-backed and executed using recognized Islamic jurisprudential models including Murabaha, Mudarabah, and Qard Hasan.'
  },
  {
    category: 'Membership',
    q: 'Who is eligible to join FMCK SMCS?',
    a: 'Membership is open to all verified individuals and registered micro-enterprises who align with our cooperative charter and ethical conduct standards. Applicants must complete digital identity verification, provide peer or community references, and commit to regular cooperative savings.'
  },
  {
    category: 'Financing & Murabaha',
    q: 'How does the Murabaha asset financing process operate in practice?',
    a: 'Unlike conventional interest-bearing personal loans, FMCK SMCS directly purchases the physical item you specify (e.g., machinery, vehicles, home improvement materials) from the vendor. We then sell the item to you at an established, fixed cost-plus-profit margin. Once agreed, this repayment schedule never compounds or increases under any circumstances.'
  },
  {
    category: 'Guarantor Endorsements',
    q: 'How do peer guarantees work on the member portal?',
    a: 'To maintain communal trust and zero-interest solidarity, credit applications utilize a peer guarantor protocol. Applicants invite existing verified cooperative members to endorse their request through the dashboard. Guarantors review details securely and sign with encrypted digital verification.'
  },
  {
    category: 'Dividends & Withdrawals',
    q: 'When and how are cooperative investment surpluses distributed?',
    a: 'Surplus allocations are calculated at the end of each audited financial year. Based on the Mudarabah profit ratio and member contribution balances, dividends are credited directly into your cooperative wallet, where they can be reinvested or liquidated to your external commercial bank account.'
  }
];

export default function FmcksmcsLandingPage() {
  // Simulator state
  const [calcMode, setCalcMode] = useState('investment'); // 'investment' | 'murabaha'
  const [monthlyContribution, setMonthlyContribution] = useState(75000);
  const [tenureYears, setTenureYears] = useState(3);
  const [assetFinanceAmount, setAssetFinanceAmount] = useState(1500000);
  const [financeMonths, setFinanceMonths] = useState(18);

  // Active Shariah tab
  const [activeTab, setActiveTab] = useState('murabaha');

  // FAQ state
  const [faqCategory, setFaqCategory] = useState('All');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaq, setOpenFaq] = useState(0);

  // Dashboard preview interactive tab
  const [dashTab, setDashTab] = useState('overview');

  // Modal contact state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [submittedForm, setSubmittedForm] = useState(false);

  // Halal Investment Simulation (Estimated ethical yield ~12.5% p.a.)
  const investmentResults = useMemo(() => {
    const r = 0.125 / 12; // monthly rate
    const n = tenureYears * 12;
    // Future Value of monthly annuity
    const fv = monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
    const totalDeposited = monthlyContribution * n;
    const projectedProfit = Math.max(0, fv - totalDeposited);
    return {
      totalDeposited: Math.round(totalDeposited),
      projectedProfit: Math.round(projectedProfit),
      totalValue: Math.round(fv),
      monthlyProfitShare: Math.round((fv * 0.125) / 12)
    };
  }, [monthlyContribution, tenureYears]);

  // Murabaha Asset Financing Simulation (Transparent upfront fixed cost-plus 11% flat)
  const murabahaResults = useMemo(() => {
    const flatProfitRate = 0.11 * (financeMonths / 12);
    const totalProfitMargin = assetFinanceAmount * flatProfitRate;
    const totalRepayable = assetFinanceAmount + totalProfitMargin;
    const monthlyInstallment = totalRepayable / financeMonths;
    return {
      principal: assetFinanceAmount,
      totalMarkup: Math.round(totalProfitMargin),
      totalRepayable: Math.round(totalRepayable),
      monthlyInstallment: Math.round(monthlyInstallment)
    };
  }, [assetFinanceAmount, financeMonths]);

  const filteredFaqs = useMemo(() => {
    return FAQS_DATA.filter((item) => {
      const matchCat = faqCategory === 'All' || item.category === faqCategory;
      const matchSearch =
        item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
        item.a.toLowerCase().includes(faqSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [faqCategory, faqSearch]);

  const activeContract = SHARIAH_CONTRACTS.find((c) => c.id === activeTab) || SHARIAH_CONTRACTS[0];

  const formatCurrency = (val) => {
    return '₦' + Number(val).toLocaleString('en-NG');
  };

  return (
    <div className="min-h-screen bg-[#031512] text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-x-hidden antialiased">
      {/* ── Sacred Arabesque Ambient Background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-15 overflow-hidden">
        <svg className="w-full h-full text-emerald-400" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <pattern id="islamic-star-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
              <path
                d="M40 0 L52 28 L80 40 L52 52 L40 80 L28 52 L0 40 L28 28 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.8"
                strokeOpacity="0.3"
              />
              <circle cx="40" cy="40" r="14" fill="none" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
              <polygon
                points="40,20 45,35 60,40 45,45 40,60 35,45 20,40 35,35"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeOpacity="0.25"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamic-star-pattern)" />
        </svg>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 -right-40 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/4 w-[700px] h-[700px] bg-teal-600/10 rounded-full blur-[160px]" />
      </div>

      {/* ── Top Shariah Supervisory Ribbon ── */}
      <div className="relative z-50 bg-gradient-to-r from-emerald-950 via-[#062c23] to-emerald-950 border-b border-emerald-800/40 text-xs py-2 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-emerald-200/90 font-medium">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="tracking-wide text-[11px] sm:text-xs">
              Officially Supervised & Shariah Certified • Zero Riba, Transparent Ledgers
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-emerald-300/80 text-[11px]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> AAOIFI Standard Aligned
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" /> Bi-Annual Independent Shariah Audit
            </span>
          </div>
        </div>
      </div>

      {/* ── Premium Navigation Header ── */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#041a15]/85 border-b border-emerald-900/60 shadow-2xl shadow-black/40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Monogram & Title */}
          <div className="flex items-center space-x-3.5 group cursor-pointer">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-900 p-[1.5px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-400/30 transition-all">
                <div className="w-full h-full bg-[#041814] rounded-[14px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-amber-400/10 opacity-60"></div>
                  <span className="font-serif font-black text-2xl text-transparent bg-clip-text bg-gradient-to-br from-amber-200 via-amber-300 to-emerald-300">
                    F
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border-2 border-[#031512]">
                <Sparkles className="w-2.5 h-2.5 text-slate-950 fill-slate-950" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-emerald-300 transition-colors">
                  FMCK SMCS
                </span>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 uppercase">
                  FINTECH
                </span>
              </div>
              <span className="text-[10px] font-medium tracking-widest text-emerald-400/90 uppercase block">
                Islamic Multipurpose Cooperative
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center space-x-9 text-sm font-medium text-slate-300">
            <a href="#contracts" className="hover:text-amber-300 transition-colors py-1">
              Shariah Contracts
            </a>
            <a href="#calculator" className="hover:text-amber-300 transition-colors py-1">
              Profit Simulator
            </a>
            <a href="#transparency" className="hover:text-amber-300 transition-colors py-1">
              Governance & Ledgers
            </a>
            <a href="#portal" className="hover:text-amber-300 transition-colors py-1">
              Member Portal
            </a>
            <a href="#faqs" className="hover:text-amber-300 transition-colors py-1">
              FAQs
            </a>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center space-x-3">
            <a
              href="/login?tenant=fmcksmcs"
              className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-emerald-900/30 border border-transparent hover:border-emerald-700/40 rounded-xl transition-all"
            >
              Sign In
            </a>
            <a
              href="/apply-membership?tenant=fmcksmcs"
              className="relative group overflow-hidden px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 shadow-md shadow-amber-500/20 hover:shadow-amber-400/30 transition-all active:scale-95 inline-flex items-center gap-2"
            >
              <span>Join Cooperative</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative z-10 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Hero Pitch */}
            <div className="lg:col-span-7 space-y-8 text-left">
              <div className="inline-flex items-center space-x-2.5 bg-emerald-950/80 border border-emerald-600/40 px-4 py-2 rounded-full shadow-inner backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                <span className="text-xs font-semibold text-emerald-200 tracking-wide uppercase">
                  Ethical • Interest-Free • Cooperative Prosperity
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
                Elevating Community Wealth with{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300">
                  Pure Islamic Principles.
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl">
                Experience the next standard of Shariah-compliant financial cooperatives. Access interest-free asset
                financing (Murabaha), verifiable profit-sharing dividends (Mudarabah), and mutual solidarity without
                hidden usury.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="/apply-membership?tenant=fmcksmcs"
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 hover:from-emerald-400 hover:to-teal-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-emerald-900/40 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <span>Apply for Membership</span>
                  <ArrowRight className="w-5 h-5 text-emerald-200" />
                </a>

                <a
                  href="#calculator"
                  className="px-8 py-4 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white border border-emerald-800/60 rounded-2xl font-semibold text-base backdrop-blur-md transition-all flex items-center justify-center gap-2 hover:border-amber-400/40"
                >
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <span>Simulate Halal Yield</span>
                </a>
              </div>

              {/* Trust Micro-Badges */}
              <div className="pt-6 border-t border-emerald-900/60 grid grid-cols-3 gap-4 text-left">
                <div>
                  <div className="text-2xl font-black text-white tracking-tight flex items-center gap-1">
                    0%
                    <span className="text-amber-400 text-sm font-semibold">Riba</span>
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Absolute Usury Prohibition</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-300 tracking-tight flex items-center gap-1">
                    100%
                    <ShieldCheck className="w-4 h-4 text-emerald-400 inline" />
                  </div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Shariah Board Certified</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-300 tracking-tight">24/7</div>
                  <div className="text-xs text-slate-400 font-medium mt-0.5">Transparent Member Ledger</div>
                </div>
              </div>
            </div>

            {/* Right Hero Glass Visualizer Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto w-full max-w-md">
                {/* Glow ring */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/30 to-amber-500/30 blur-xl opacity-70 group-hover:opacity-100 transition duration-1000"></div>

                <div className="relative rounded-3xl bg-gradient-to-b from-[#082821]/95 via-[#06201b]/95 to-[#041612]/95 border border-emerald-600/40 shadow-2xl backdrop-blur-2xl p-6 sm:p-7 text-slate-100 space-y-6">
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-emerald-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                        <Scale className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">Live Member Portfolio</h4>
                        <p className="text-[11px] text-emerald-400">Verified Member Node #4092</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-400/10 text-emerald-300 border border-emerald-400/30 rounded-full">
                      Halal Active
                    </span>
                  </div>

                  {/* Portfolio Stats */}
                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 to-[#021813] border border-emerald-800/50">
                      <div className="text-xs text-slate-400 flex justify-between items-center">
                        <span>Total Accumulated Capital</span>
                        <span className="text-[10px] text-emerald-400 font-mono">+14.2% YoY</span>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
                        ₦4,850,000<span className="text-slate-400 text-sm font-normal">.00</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-emerald-900/40 pt-2">
                        <span>Mudarabah Profit Earned:</span>
                        <span className="font-bold text-amber-300">+₦486,200</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-[#06241e] border border-emerald-800/40">
                        <span className="text-[11px] text-slate-400 block">Murabaha Status</span>
                        <span className="text-sm font-bold text-emerald-300 flex items-center gap-1.5 mt-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Paid on Time
                        </span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-[#06241e] border border-emerald-800/40">
                        <span className="text-[11px] text-slate-400 block">Guarantor Rating</span>
                        <span className="text-sm font-bold text-amber-300 flex items-center gap-1 mt-1">
                          ★★★★★ <span className="text-xs text-slate-300">(5.0)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Activity Mini Feed */}
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Recent Activity</div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-slate-200">Annual Dividend Credited</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold">+₦142,500</span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-slate-200">Murabaha Solar Asset Installed</span>
                        </div>
                        <span className="font-mono text-amber-300 font-bold">Approved</span>
                      </div>
                    </div>
                  </div>

                  <a
                    href="/login?tenant=fmcksmcs"
                    className="w-full py-3 bg-emerald-700/40 hover:bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 hover:text-white rounded-xl text-xs font-semibold tracking-wide transition flex items-center justify-center gap-2"
                  >
                    <span>Launch Member Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Live Cooperative Transparency & Metrics Ticker ── */}
      <section id="transparency" className="relative z-20 border-y border-emerald-900/60 bg-[#02100e]/95 py-10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-emerald-900/50">
            <div className="text-center pt-4 md:pt-0">
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-amber-300 tracking-tight">
                ₦1.85B+
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">Total Cooperative Assets Managed</p>
            </div>

            <div className="text-center pt-4 md:pt-0 md:pl-6">
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-amber-300 tracking-tight">
                2,400+
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">Verified Co-op Members</p>
            </div>

            <div className="text-center pt-4 md:pt-0 md:pl-6">
              <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 to-amber-300 tracking-tight">
                ₦420M+
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">Halal Dividends Distributed</p>
            </div>

            <div className="text-center pt-4 md:pt-0 md:pl-6">
              <div className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight flex items-center justify-center gap-1.5">
                0.0% <ShieldCheck className="w-6 h-6 text-amber-400 inline" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">Riba / Compounding Debt</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Shariah Contracts & Pillars Section ── */}
      <section id="contracts" className="py-24 relative z-10 bg-gradient-to-b from-[#031512] via-[#051f1a] to-[#031512]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30">
              <Scale className="w-3.5 h-3.5" />
              <span>Fiqh Al-Mu'amalat Verified</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Shariah Instruments & Financing Frameworks
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Every financial transaction within FMCK SMCS is mapped directly to authenticated Islamic economic
              constructs, ensuring complete protection from usury and unfair risk shifting.
            </p>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-12">
            {SHARIAH_CONTRACTS.map((contract) => {
              const isSelected = activeTab === contract.id;
              return (
                <button
                  key={contract.id}
                  onClick={() => setActiveTab(contract.id)}
                  className={`px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-900/50'
                      : 'bg-[#06241e]/70 text-slate-300 border-emerald-800/40 hover:bg-[#09352c] hover:text-white'
                  }`}
                >
                  <span>{contract.name}</span>
                  <span className="text-xs font-normal opacity-75 hidden sm:inline">({contract.tag.split(' ')[0]})</span>
                </button>
              );
            })}
          </div>

          {/* Selected Contract Feature Card */}
          <div className="rounded-3xl bg-gradient-to-br from-[#082921] to-[#041612] border border-emerald-700/50 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-block px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {activeContract.tag}
                </div>

                <h3 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {activeContract.name} <span className="text-emerald-400 font-serif font-light text-2xl">| المعاملة</span>
                </h3>

                <p className="text-lg text-amber-200/90 font-medium leading-snug">{activeContract.subtitle}</p>

                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">{activeContract.description}</p>

                <div className="grid sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-black/30 border border-emerald-800/40">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                      Repayment Tenor
                    </span>
                    <span className="text-sm font-bold text-white mt-1 block">{activeContract.tenor}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-black/30 border border-emerald-800/40">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                      Pricing & Markup Structure
                    </span>
                    <span className="text-sm font-bold text-emerald-300 mt-1 block">
                      {activeContract.rateStructure}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <a
                    href="/apply-membership?tenant=fmcksmcs"
                    className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
                  >
                    <span>Apply Under {activeContract.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#calculator"
                    className="px-6 py-3 rounded-xl bg-emerald-900/40 hover:bg-emerald-900/70 border border-emerald-700/50 text-slate-200 text-sm font-semibold transition"
                  >
                    Simulate Schedule
                  </a>
                </div>
              </div>

              {/* Visual Shariah Badge Card */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-[#031c17] p-6 border border-emerald-700/40 space-y-5 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-emerald-500 flex items-center justify-center text-slate-950 font-bold">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-white text-base">Shariah Governance Seal</h5>
                      <span className="text-xs text-emerald-400 font-medium">Approved Jurisprudential Template</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Zero compound penal charges on overdue accounts (all penalties diverted to charity).</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Direct title / constructive possession verification before resale.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>Endorsed by independent Shariah supervisory scholars.</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-xs">
                    <span className="text-slate-400 block mb-1">Recommended Usage:</span>
                    <span className="text-white font-medium">{activeContract.suitableFor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Interactive Halal Financing & Profit Simulator ── */}
      <section id="calculator" className="py-24 relative z-10 bg-[#02120f] border-t border-emerald-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Transparent Financial Projections</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Interactive Halal Wealth & Financing Simulator
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Model your prospective wealth growth through ethical Mudarabah ventures or estimate your transparent
              Murabaha asset purchase installments with zero compounding interest.
            </p>
          </div>

          {/* Mode Selector Toggle */}
          <div className="flex justify-center mb-10">
            <div className="p-1.5 rounded-2xl bg-[#041f19] border border-emerald-700/50 flex space-x-2">
              <button
                onClick={() => setCalcMode('investment')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  calcMode === 'investment'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Halal Mudarabah Savings</span>
              </button>
              <button
                onClick={() => setCalcMode('murabaha')}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                  calcMode === 'murabaha'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Murabaha Asset Financing</span>
              </button>
            </div>
          </div>

          {/* Calculator Card Container */}
          <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-b from-[#06241e] to-[#041612] border border-emerald-700/50 p-6 sm:p-10 shadow-2xl">
            {calcMode === 'investment' ? (
              <div className="grid md:grid-cols-12 gap-8 items-center">
                {/* Sliders Input */}
                <div className="md:col-span-7 space-y-7">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-slate-300">Monthly Contribution Amount</label>
                      <span className="text-lg font-black text-amber-300 font-mono">
                        {formatCurrency(monthlyContribution)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10000}
                      max={500000}
                      step={5000}
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>₦10,000 / mo</span>
                      <span>₦250,000 / mo</span>
                      <span>₦500,000 / mo</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-slate-300">Tenure (Years)</label>
                      <span className="text-lg font-black text-emerald-300 font-mono">{tenureYears} Years</span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={tenureYears}
                      onChange={(e) => setTenureYears(Number(e.target.value))}
                      className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>1 Year</span>
                      <span>5 Years</span>
                      <span>10 Years</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#021813] border border-emerald-800/40 text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-amber-300">
                      <Sparkles className="w-4 h-4" />
                      <span>Shariah Ethical Yield Note</span>
                    </div>
                    <p className="text-slate-400">
                      Returns are derived strictly from genuine underlying trade activities, real estate rentals, and
                      agribusiness. Historic average cooperative profit yields average ~12.5% p.a.
                    </p>
                  </div>
                </div>

                {/* Output Breakdown Display */}
                <div className="md:col-span-5">
                  <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#083027] to-[#041914] border border-emerald-600/50 shadow-xl space-y-6">
                    <div>
                      <span className="text-xs text-emerald-300 uppercase tracking-wider font-bold">
                        Projected Total Accumulation
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                        {formatCurrency(investmentResults.totalValue)}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-emerald-800/60 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Your Principal Capital:</span>
                        <span className="font-semibold text-white">
                          {formatCurrency(investmentResults.totalDeposited)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Estimated Halal Surplus:</span>
                        <span className="font-bold text-amber-300">
                          +{formatCurrency(investmentResults.projectedProfit)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Estimated Profit Ratio:</span>
                        <span className="font-semibold text-emerald-400">80% Member / 20% Co-op</span>
                      </div>
                    </div>

                    <a
                      href="/apply-membership?tenant=fmcksmcs"
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
                    >
                      <span>Lock In Savings Plan</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              /* Murabaha Financing Calculator Mode */
              <div className="grid md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7 space-y-7">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-slate-300">Desired Asset Value (Procurement)</label>
                      <span className="text-lg font-black text-amber-300 font-mono">
                        {formatCurrency(assetFinanceAmount)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={200000}
                      max={10000000}
                      step={100000}
                      value={assetFinanceAmount}
                      onChange={(e) => setAssetFinanceAmount(Number(e.target.value))}
                      className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>₦200,000</span>
                      <span>₦5,000,000</span>
                      <span>₦10,000,000</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-semibold text-slate-300">Repayment Period (Months)</label>
                      <span className="text-lg font-black text-emerald-300 font-mono">{financeMonths} Months</span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={36}
                      step={3}
                      value={financeMonths}
                      onChange={(e) => setFinanceMonths(Number(e.target.value))}
                      className="w-full h-2.5 bg-emerald-950 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                      <span>6 Months</span>
                      <span>18 Months</span>
                      <span>36 Months</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#021813] border border-emerald-800/40 text-xs text-slate-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-emerald-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Fixed Murabaha Cost-Plus Principles</span>
                    </div>
                    <p className="text-slate-400">
                      The profit markup is fixed upfront at contract signing. Even in the event of late payments, zero
                      compound interest or punitive fees are retained by the cooperative.
                    </p>
                  </div>
                </div>

                {/* Output Breakdown Display */}
                <div className="md:col-span-5">
                  <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#083027] to-[#041914] border border-emerald-600/50 shadow-xl space-y-6">
                    <div>
                      <span className="text-xs text-amber-300 uppercase tracking-wider font-bold">
                        Fixed Monthly Installment
                      </span>
                      <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
                        {formatCurrency(murabahaResults.monthlyInstallment)}
                        <span className="text-xs text-slate-400 font-normal"> / mo</span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-emerald-800/60 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Purchase Price (Asset):</span>
                        <span className="font-semibold text-white">{formatCurrency(murabahaResults.principal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Agreed Fixed Markup:</span>
                        <span className="font-bold text-amber-300">{formatCurrency(murabahaResults.totalMarkup)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Total Purchase Cost:</span>
                        <span className="font-bold text-white">{formatCurrency(murabahaResults.totalRepayable)}</span>
                      </div>
                    </div>

                    <a
                      href="/apply-membership?tenant=fmcksmcs"
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-700/30 transition flex items-center justify-center gap-2"
                    >
                      <span>Apply for Asset Procurement</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Inside Member Portal / Sleek Interactive Mockup ── */}
      <section id="portal" className="py-24 relative z-10 bg-[#031815]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Proprietary Member Infrastructure</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Inside the Member Dashboard
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Full autonomy at your fingertips. Track contributions in real time, view transparent profit ledgers, endorse
              peer guarantors, and submit financing requests seamlessly.
            </p>
          </div>

          {/* Sleek FinTech Desktop Mockup Window */}
          <div className="max-w-5xl mx-auto rounded-3xl bg-[#02100e] border border-emerald-700/50 shadow-2xl overflow-hidden">
            {/* Window Top Controls */}
            <div className="px-6 py-4 bg-[#051c17] border-b border-emerald-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs text-slate-400 ml-3 font-mono">portal.fmcksmcs.coop/member-app</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold bg-emerald-950 px-3 py-1 rounded-md border border-emerald-700/40">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>256-Bit SSL Encrypted Node</span>
              </div>
            </div>

            {/* Dashboard Mockup Body */}
            <div className="p-6 sm:p-8">
              {/* Mini Nav inside mockup */}
              <div className="flex flex-wrap items-center gap-3 pb-6 mb-6 border-b border-emerald-900/50">
                <button
                  onClick={() => setDashTab('overview')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                    dashTab === 'overview'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-[#06241e]'
                  }`}
                >
                  Account Overview
                </button>
                <button
                  onClick={() => setDashTab('guarantors')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    dashTab === 'guarantors'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-[#06241e]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Guarantor Endorsements (2 Pending)</span>
                </button>
                <button
                  onClick={() => setDashTab('ledger')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    dashTab === 'ledger'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white bg-[#06241e]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Audited Ledgers</span>
                </button>
              </div>

              {/* Dynamic View based on Mockup Tab */}
              {dashTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="p-5 rounded-2xl bg-[#06241e] border border-emerald-800/40">
                      <span className="text-xs text-slate-400 block font-medium">Cumulative Savings Balance</span>
                      <div className="text-2xl font-black text-white mt-1">₦3,420,000.00</div>
                      <span className="text-[11px] text-emerald-400 font-semibold mt-2 inline-block">
                        ↑ ₦120k auto-credited this month
                      </span>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#06241e] border border-emerald-800/40">
                      <span className="text-xs text-slate-400 block font-medium">Active Murabaha Schedule</span>
                      <div className="text-2xl font-black text-amber-300 mt-1">₦850,000.00</div>
                      <span className="text-[11px] text-slate-300 mt-2 inline-block">6 of 18 installments fulfilled</span>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#06241e] border border-emerald-800/40">
                      <span className="text-xs text-slate-400 block font-medium">Next Dividend Payout</span>
                      <div className="text-2xl font-black text-emerald-300 mt-1">Est. ₦184,000</div>
                      <span className="text-[11px] text-slate-400 mt-2 inline-block">Audit cycle closes Dec 31</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-emerald-900/60">
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-300 font-semibold">
                      <span>Monthly Contribution Track (Target: ₦150k)</span>
                      <span className="text-emerald-400">80% Achieved</span>
                    </div>
                    <div className="w-full bg-emerald-950 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-emerald-400 to-amber-400 h-full rounded-full w-4/5" />
                    </div>
                  </div>
                </div>
              )}

              {dashTab === 'guarantors' && (
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-white">Peer Endorsement Requests</div>
                  <div className="p-4 rounded-xl bg-[#06241e] border border-emerald-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-white text-sm">Brother Ahmad Bello (#4011)</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Requests Guarantor Endorsement for Murabaha Vehicle Facility (₦1,200,000)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
                        Endorse Request
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
                        Inspect File
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#06241e] border border-emerald-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-white text-sm">Sister Khadijah Umar (#2998)</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Requests Guarantor Endorsement for Qard Hasan Medical Support (₦300,000)
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition">
                        Endorse Request
                      </button>
                      <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition">
                        Inspect File
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {dashTab === 'ledger' && (
                <div className="space-y-3 font-mono text-xs">
                  <div className="text-slate-400 text-xs font-sans mb-2 font-medium">
                    Immutable Transaction Block Log (SHA-256 Verified)
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-emerald-900/60 flex justify-between items-center text-slate-300">
                    <span>[2026-09-01] MUDARABAH_PROFIT_ALLOCATION #88192</span>
                    <span className="text-emerald-400 font-bold">+₦42,100.00</span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-emerald-900/60 flex justify-between items-center text-slate-300">
                    <span>[2026-08-15] MURABAHA_INSTALLMENT_RECOVERY #77211</span>
                    <span className="text-amber-300 font-bold">-₦65,000.00</span>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-emerald-900/60 flex justify-between items-center text-slate-300">
                    <span>[2026-08-01] REGULAR_MONTHLY_DEPOSIT #66209</span>
                    <span className="text-emerald-400 font-bold">+₦100,000.00</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works / 3-Step Journey ── */}
      <section id="how-it-works" className="py-24 relative z-10 bg-gradient-to-b from-[#031815] to-[#02100e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Fast Digital Onboarding</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Begin Your Halal Financial Journey
            </h2>
            <p className="text-slate-400 text-base sm:text-lg">
              Becoming a verified shareholder and beneficiary in FMCK SMCS takes under ten minutes from start to finish.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#06241e] to-[#041612] border border-emerald-800/50 shadow-xl relative group hover:border-emerald-500/60 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 font-mono font-black text-xl flex items-center justify-center mb-6 border border-emerald-500/40">
                01
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Complete Digital KYC</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Submit verified national identity documentation and employment records via our secure, encrypted onboarding
                portal.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#06241e] to-[#041612] border border-emerald-800/50 shadow-xl relative group hover:border-emerald-500/60 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 font-mono font-black text-xl flex items-center justify-center mb-6 border border-amber-500/40">
                02
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Executive Committee Review</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                The cooperative executive committee conducts ethical screening and validates cooperative share capital
                allocation within 24–48 hours.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-gradient-to-b from-[#06241e] to-[#041612] border border-emerald-800/50 shadow-xl relative group hover:border-emerald-500/60 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-300 font-mono font-black text-xl flex items-center justify-center mb-6 border border-teal-500/40">
                03
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Deploy Capital & Finance</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Start regular halal savings, apply for zero-riba asset procurement, request peer guarantors, and attend
                annual general assemblies.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Filterable FAQ Accordion ── */}
      <section id="faqs" className="py-24 relative z-10 bg-[#020e0c] border-t border-emerald-900/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Direct Transparency</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-base">
              Clear answers regarding governance, Shariah rulings, loan guarantees, and member dividend allocation.
            </p>
          </div>

          {/* Search Bar & Category Filter */}
          <div className="space-y-4 mb-8">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search topics (e.g. Murabaha, Riba, Guarantors, Dividends)..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-[#041a15] border border-emerald-800/60 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', 'Shariah Compliance', 'Financing & Murabaha', 'Guarantor Endorsements', 'Dividends & Withdrawals'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setFaqCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      faqCategory === cat
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#06241e] text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* FAQ Accordions */}
          <div className="space-y-4">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No matching questions found. Contact our Shariah board directly below.
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="border border-emerald-900/70 rounded-2xl overflow-hidden bg-gradient-to-r from-[#041d17] to-[#031512] transition-colors"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left px-6 py-5 flex items-center justify-between font-bold text-slate-100 hover:text-amber-300 transition-colors"
                    >
                      <span className="pr-4 text-sm sm:text-base">{faq.q}</span>
                      {isOpen ? (
                        <ChevronUp className="w-5 h-5 text-amber-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 text-sm text-slate-300 border-t border-emerald-900/50 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── High Conversion Luxury CTA Section ── */}
      <section className="py-24 relative z-10 bg-gradient-to-b from-[#020e0c] via-[#04201a] to-[#02100e] text-white overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30">
            <HeartHandshake className="w-4 h-4" />
            <span>Join Our Growing Brotherhood & Sisterhood</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            Build Pure, Shariah-Compliant Wealth with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-emerald-300 to-teal-200">
              FMCK SMCS
            </span>
          </h2>

          <p className="text-slate-300 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed">
            Free yourself from conventional banking usury. Step into a cooperative society founded on strict Islamic
            principles, equity, transparent asset purchases, and shared prosperity.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/apply-membership?tenant=fmcksmcs"
              className="w-full sm:w-auto px-9 py-4 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-amber-500/20 hover:shadow-amber-400/30 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>Apply for Membership</span>
              <ArrowRight className="w-5 h-5" />
            </a>

            <button
              onClick={() => setIsContactModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 bg-[#051c17] hover:bg-[#082921] border border-emerald-700/60 text-slate-200 hover:text-white font-semibold text-base rounded-2xl transition"
            >
              Inquire with Secretariat
            </button>
          </div>

          <div className="pt-6 flex items-center justify-center gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Instant Digital Identity Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>No Hidden Penalties</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Secretariat & Shariah Advisory Inquiry Modal ── */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#041a15] border border-emerald-700/60 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-emerald-800/50">
              <h3 className="font-bold text-lg text-white">Cooperative Secretariat</h3>
              <button
                onClick={() => {
                  setIsContactModalOpen(false);
                  setSubmittedForm(false);
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕ Close
              </button>
            </div>

            {submittedForm ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-base">Inquiry Dispatched</h4>
                <p className="text-xs text-slate-300">
                  Our administrative committee and Shariah board desk will contact you within 24 business hours.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSubmittedForm(true);
                }}
                className="space-y-4 pt-4 text-left"
              >
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ibrahim Abubakar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-emerald-800 text-white text-sm focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Phone or WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="+234 800 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-emerald-800 text-white text-sm focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Inquiry Type</label>
                  <select className="w-full px-3.5 py-2.5 rounded-xl bg-[#02100e] border border-emerald-800 text-white text-sm focus:border-amber-400 outline-none">
                    <option>Membership Eligibility</option>
                    <option>Murabaha Asset Financing Application</option>
                    <option>Shariah Advisory & Fatwa Review</option>
                    <option>Institutional Cooperative Deposit</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-md transition"
                >
                  Send to Executive Desk
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="bg-[#020a09] text-slate-400 py-16 border-t border-emerald-950 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-emerald-950">
            {/* Brand column */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-amber-500 p-[1.5px]">
                  <div className="w-full h-full bg-[#020a09] rounded-[10px] flex items-center justify-center">
                    <span className="font-serif font-black text-amber-300 text-lg">F</span>
                  </div>
                </div>
                <span className="font-black text-lg text-white tracking-tight">FMCK SMCS</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Shariah-compliant multipurpose cooperative society dedicated to socio-economic elevation, transparent
                co-ownership, and ethical finance.
              </p>
              <div className="text-[11px] text-emerald-400/90 font-medium">Tenant ID: fmcksmcs</div>
            </div>

            {/* Shariah Contracts */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Shariah Instruments</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a href="#contracts" className="hover:text-amber-300 transition">
                    Murabaha (Cost-Plus Trade)
                  </a>
                </li>
                <li>
                  <a href="#contracts" className="hover:text-amber-300 transition">
                    Mudarabah (Profit Sharing)
                  </a>
                </li>
                <li>
                  <a href="#contracts" className="hover:text-amber-300 transition">
                    Qard Hasan (Benevolent Loan)
                  </a>
                </li>
                <li>
                  <a href="#contracts" className="hover:text-amber-300 transition">
                    Layyah Livestock Collective
                  </a>
                </li>
              </ul>
            </div>

            {/* Member Services */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Member Portal</h4>
              <ul className="space-y-2.5 text-xs">
                <li>
                  <a href="/login?tenant=fmcksmcs" className="hover:text-amber-300 transition">
                    Member Dashboard Sign In
                  </a>
                </li>
                <li>
                  <a href="/apply-membership?tenant=fmcksmcs" className="hover:text-amber-300 transition">
                    Online Membership Application
                  </a>
                </li>
                <li>
                  <a href="#calculator" className="hover:text-amber-300 transition">
                    Financing Schedule Simulator
                  </a>
                </li>
                <li>
                  <button onClick={() => setIsContactModalOpen(true)} className="hover:text-amber-300 transition text-left">
                    Guarantor Registry Desk
                  </button>
                </li>
              </ul>
            </div>

            {/* Governance & Assurance */}
            <div>
              <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Governance & Audit</h4>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Audited by Shariah Board</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Bank-Grade Data Encryption</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Scale className="w-4 h-4 text-teal-400" />
                  <span>Strict Zero-Interest Charter</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} FMCK SMCS. All Islamic economic rights and member protections reserved.</p>
            <div className="flex items-center space-x-6">
              <span className="text-emerald-400/80">Regulated Islamic Cooperative Framework</span>
              <a href="/login?tenant=fmcksmcs" className="hover:text-slate-300 transition">
                Staff & Auditor Portal
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}