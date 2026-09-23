import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  ExternalLink, 
  ArrowRight, 
  Sparkles, 
  Shield, 
  Users, 
  Search, 
  CheckCircle2, 
  TrendingUp, 
  CreditCard 
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../config';

interface CooperativeItem {
  id: string;
  name: string;
  cooperative_type: 'islamic' | 'conventional';
  domain?: string | null;
  subdomain?: string | null;
  theme?: any;
}

const FALLBACK_COOPERATIVES: CooperativeItem[] = [
  { id: 'habu', name: 'Habu Hashidu', cooperative_type: 'islamic' },
  { id: 'tafida', name: 'Tafida Cooperative', cooperative_type: 'islamic' },
  { id: 'kumo', name: 'kumo Cooperative', cooperative_type: 'islamic' },
  { id: 'al-mansur', name: 'Al-Mansur Cooperative', cooperative_type: 'islamic' },
  { id: 'wurojuli', name: 'Wuro Juli Women Cooperative', cooperative_type: 'islamic' },
  { id: 'fmcksmcs', name: 'FMCK SMCS', cooperative_type: 'islamic' },
  { id: 'cands', name: 'CandS Cooperatives', cooperative_type: 'islamic' },
  { id: 'hero', name: 'Hero Cooperative', cooperative_type: 'conventional' }
];

export default function DefaultLandingPage() {
  const [cooperatives, setCooperatives] = useState<CooperativeItem[]>(FALLBACK_COOPERATIVES);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'islamic' | 'conventional'>('all');

  useEffect(() => {
    const fetchCoops = async () => {
      try {
        const res = await axios.get(`${API_URL}/tenant/list`);
        if (res.data?.success && Array.isArray(res.data.tenants) && res.data.tenants.length > 0) {
          setCooperatives(res.data.tenants);
        }
      } catch (err) {
        // Use fallback silently
      }
    };
    fetchCoops();
  }, []);

  const filteredCoops = cooperatives.filter(c => {
    const matchesQuery = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || c.cooperative_type === filterType;
    return matchesQuery && matchesType;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── Navigation Header ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-900/10">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                IMAN MCS
              </span>
              <span className="text-xs font-semibold tracking-wider text-emerald-600 uppercase block">
                Multi-Tenant Cooperative Platform
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-600">
            <a href="#cooperatives" className="hover:text-emerald-600 transition-colors">Cooperatives Directory</a>
            <a href="#features" className="hover:text-emerald-600 transition-colors">Platform Features</a>
            <a href="#about" className="hover:text-emerald-600 transition-colors">About Us</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              to="/platform/login"
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Platform Admin
            </Link>
            <a
              href="#cooperatives"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm hover:shadow transition-all inline-flex items-center gap-1.5"
            >
              <span>Find Cooperative</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-200/60 bg-gradient-to-b from-white via-slate-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-800 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Independent & Customized Portals for Each Society</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Next-Generation <span className="text-emerald-600">Cooperative Banking</span> & Management
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 font-normal leading-relaxed">
              Every cooperative on IMAN MCS operates with its own independent landing page, customized branding, Shariah-compliant or conventional financing rules, and secure member portal.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#cooperatives"
                className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-base shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 transition-all flex items-center justify-center gap-2"
              >
                <span>Browse Cooperatives</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                to="/platform/login"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl font-bold text-base shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Platform Admin Portal</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Cooperatives Directory Section ── */}
      <section id="cooperatives" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <h2 className="text-xs font-bold text-emerald-600 tracking-wider uppercase">Independent Society Portals</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Select Your Cooperative Society
            </p>
            <p className="text-slate-600 text-base">
              Each cooperative has an independent, fully dedicated landing page and member portal. Click below to explore your society.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-xl mx-auto mb-10 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search cooperative by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('islamic')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'islamic' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Islamic
              </button>
              <button
                onClick={() => setFilterType('conventional')}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  filterType === 'conventional' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Conventional
              </button>
            </div>
          </div>

          {/* Cooperatives Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCoops.map((coop) => {
              const isIslamic = coop.cooperative_type === 'islamic';
              return (
                <div
                  key={coop.id}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white font-black text-xl flex items-center justify-center shadow-md">
                        {coop.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                        isIslamic 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70' 
                          : 'bg-blue-50 text-blue-700 border border-blue-200/70'
                      }`}>
                        {isIslamic ? '🌿 Islamic' : '🤝 Conventional'}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 mb-1">
                      {coop.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mb-4">
                      /{coop.id}
                    </p>

                    <p className="text-sm text-slate-600 mb-6 line-clamp-2">
                      {isIslamic 
                        ? 'Interest-free savings, ethical investment, and Shariah-compliant Murabaha financing.' 
                        : 'Member-driven pooled savings, low-interest credit facilities, and annual dividend sharing.'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-slate-200/60">
                    <Link
                      to={`/${coop.id}`}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>Visit Separate Landing Page</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/login?tenant=${coop.id}`}
                      className="w-full py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Member Login ({coop.name})</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCoops.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <Building2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold">No cooperative societies found matching "{searchQuery}"</p>
              <p className="text-xs text-slate-400 mt-1">Try a different search keyword or filter.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <h2 className="text-xs font-bold text-emerald-600 tracking-wider uppercase">Built for Flexibility</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Why Multi-Tenancy Matters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Separate Data & Isolation</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Complete database row-level separation ensures no member records, contributions, or loan ledgers ever leak between cooperatives.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Tailored Financing Modes</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Support both Islamic cooperatives (Murabaha markup, Layyah animal procurement, profit-sharing) and Conventional cooperatives (interest dividends).
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Dedicated Code Files</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Each cooperative has its own physical React TSX file in the frontend repository, giving platform admins full power to customize copy, layout, and branding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-white text-sm">IMAN MCS Platform</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex items-center space-x-6">
            <a href="#cooperatives" className="hover:text-white transition-colors">Cooperatives</a>
            <Link to="/platform/login" className="hover:text-white transition-colors">Admin Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
