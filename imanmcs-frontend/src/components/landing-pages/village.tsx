import React from 'react';

export default function VillageLandingPage() {
  // Mock data representing the cooperative's vitals
  const features = [
    {
      title: "Secure Savings",
      description: "Contribute daily, weekly, or monthly with secure tracking and transparent digital ledgers.",
      icon: "💰"
    },
    {
      title: "Easy Agricultural Loans",
      description: "Access low-interest, hassle-free credit options to purchase seeds, fertilizers, or scale your business.",
      icon: "🌾"
    },
    {
      title: "Fair Dividend Shares",
      description: "Every member is an owner. Receive clear, automated year-end dividend distributions based on your stakes.",
      icon: "📊"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-800 selection:bg-emerald-200">
      
      {/* Navigation Header */}
      <header className="border-b border-stone-200/60 bg-white/80 sticky top-0 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-xl shadow-md shadow-emerald-600/20">
              🤝
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-stone-900 block leading-tight">Wurojuli</span>
              <span className="text-xs font-semibold tracking-wider text-emerald-700 uppercase block">Multipurpose Cooperative</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-8 font-medium text-stone-600">
            <a href="#about" className="hover:text-emerald-700 transition">About Us</a>
            <a href="#services" className="hover:text-emerald-700 transition">Services</a>
            <a href="#contact" className="hover:text-emerald-700 transition">Contact</a>
          </nav>
          <div>
            <button className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-emerald-700/10 hover:shadow-lg hover:shadow-emerald-700/20 active:scale-95 transition-all text-sm">
              Member Portal
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Block */}
          <div className="md:col-span-7 space-y-6 text-center md:text-left z-10">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <span>✨</span> <span>Empowering Community Growth</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-stone-900 leading-[1.1]">
              Building Wealth, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-amber-600">
                Supporting Farmers & Traders
              </span>
            </h1>
            <p className="text-lg text-stone-600 max-w-xl mx-auto md:mx-0 leading-relaxed">
              Welcome to the digital portal of Wurojuli Multipurpose Cooperative Society. We bring transparent savings, flexible credit systems, and shared prosperity straight to your smartphone.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <button className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-stone-900/10 transition-all active:scale-95 text-base">
                Apply for Membership
              </button>
              <button className="w-full sm:w-auto bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-8 py-4 rounded-xl font-bold shadow-sm transition-all active:scale-95 text-base">
                View Loan Schemes
              </button>
            </div>
          </div>

          {/* Right Visual Dashboard Display Card */}
          <div className="md:col-span-5 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100 to-amber-100 rounded-3xl blur-2xl transform rotate-3 scale-95 opacity-70"></div>
            <div className="relative bg-white border border-stone-200/80 rounded-3xl p-6 shadow-2xl shadow-stone-900/5 max-w-md mx-auto">
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <span className="font-bold text-stone-900 text-sm">Cooperative Total Vitals</span>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">Live</span>
              </div>
              <div className="py-6 space-y-4">
                <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                  <span className="text-xs text-stone-500 font-medium block">Total Shared Capital</span>
                  <span className="text-2xl font-black text-stone-950 tracking-tight">₦14,850,000.00</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/40">
                    <span className="text-xs text-emerald-800 font-medium block">Active Loans Given</span>
                    <span className="text-lg font-bold text-emerald-950 tracking-tight">₦4,200,000</span>
                  </div>
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100/40">
                    <span className="text-xs text-amber-800 font-medium block">Total Members</span>
                    <span className="text-lg font-bold text-amber-950 tracking-tight">342 Registered</span>
                  </div>
                </div>
              </div>
              <div className="text-center bg-stone-900 rounded-xl p-3 text-xs text-stone-200 font-semibold tracking-wide">
                Governed by SIOSA Management Systems
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Services/Features Grid */}
      <section id="services" className="bg-stone-100/60 border-t border-b border-stone-200/40 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 block">What We Offer</span>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight sm:text-4xl">Designed for Local Progress</h2>
            <p className="text-stone-600 text-sm sm:text-base">
              From smallholder farming projects to market traders, we build financial systems that protect and amplify every Naira contributed.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white border border-stone-200/60 rounded-2xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center text-2xl border border-stone-100 shadow-inner">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-stone-900">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-stone-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Transparency Notice */}
      <footer id="contact" className="bg-white py-12 border-t border-stone-200/80">
        <div className="max-w-7xl mx-auto px-6 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-stone-900">
              © 2026 Wurojuli Multipurpose Cooperative Society. All rights reserved.
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Registered and regulated under Gombe State Cooperative Laws.
            </p>
          </div>
          <div className="flex items-center space-x-6 text-xs font-medium text-stone-500">
            <a href="#" className="hover:text-emerald-700 transition">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-700 transition">Terms of Service</a>
            <a href="#" className="hover:text-emerald-700 transition">System Status</a>
          </div>
        </div>
      </footer>

    </div>
  );
}