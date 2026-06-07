import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Heart,
  Menu,
  Shield,
  Star,
  TrendingUp,
  Users,
  X,
  Facebook,
  Twitter,
  Linkedin
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const contactTriggerRef = useRef<HTMLButtonElement | null>(null);
  const contactCloseRef = useRef<HTMLButtonElement | null>(null);

  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll as any);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).setAttribute('data-reveal', 'visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    if (!contactOpen) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContactOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => contactCloseRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (prev) prev.focus();
      else contactTriggerRef.current?.focus();
    };
  }, [contactOpen]);

  const navLinks = [
    { label: 'Services', href: '#services' },
    { label: 'How It Works', href: '#how' },
    { label: 'About', href: '#about' },
    { label: 'FAQ', href: '#faq' }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className={`fixed top-0 left-0 right-0 z-50 ${scrolled ? 'bg-background/80 backdrop-blur border-b border-border' : 'bg-transparent'}`}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="inline-flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Heart className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">FCNACONSGMCS Limited</div>
                <div className="text-xs text-muted-foreground">Biblically-principled finance</div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6" aria-label="Primary">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md px-1 py-1"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border bg-background hover:bg-muted text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Login
              </Link>
              <Link
                to="/apply-membership"
                className="group inline-flex items-center justify-center h-10 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Apply
                <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>

            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-background hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 space-y-3" role="dialog" aria-label="Mobile menu">
              <div className="grid gap-2">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border bg-background hover:bg-muted text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Login
                </Link>
                <Link
                  to="/apply-membership"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Apply
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main id="main" className="pt-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_10%,hsl(var(--primary))_0%,transparent_55%),radial-gradient(900px_circle_at_80%_0%,hsl(var(--secondary))_0%,transparent_55%)] opacity-25" />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--background))_0%,hsl(var(--background))_55%,transparent_100%)]" />
          </div>

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24">
            <div className="grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-7" data-reveal="init">
                <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-foreground">
                    <Shield className="w-4 h-4" aria-hidden="true" />
                  </span>
                  Trusted, transparent, member-first
                </p>
                <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-tight">
                  Empowering <span className="text-primary">Healthcare Professionals</span> Financially
                </h1>
                <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
                  Join the Fellowship of Christian Nurses Alumni, College of Nursing Sciences Gombe Multipurpose Cooperative Society Limited. Save, invest, and access loans with competitive rates in a Biblically-principled environment.
                </p>

                <div className="mt-8 flex flex-col sm:flex-row gap-4">
                  <Link
                    to="/apply-membership"
                    className="group inline-flex items-center justify-center h-14 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 text-base font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Apply for membership
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center h-14 px-8 rounded-full border-2 border-border bg-background hover:border-primary hover:text-primary hover:bg-primary/5 text-base font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Member login
                  </Link>
                </div>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-base">Biblically Principled</div>
                      <div className="text-muted-foreground mt-0.5 leading-snug">Justice, fairness, and financial integrity</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-base">Member Benefits</div>
                      <div className="text-muted-foreground mt-0.5 leading-snug">High yield investments and tailored loans</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-base">Clear Approvals</div>
                      <div className="text-muted-foreground mt-0.5 leading-snug">Transparent review and instant notifications</div>
                    </div>
                  </div>
                </div>

                <a
                  href="#services"
                  className="mt-12 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md group"
                >
                  Explore services
                  <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-1" aria-hidden="true" />
                </a>
              </div>

              <div className="lg:col-span-5" data-reveal="init">
                <div className="relative rounded-3xl border border-border/50 bg-background/50 backdrop-blur-xl shadow-2xl shadow-primary/5 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
                  <div className="relative p-2">
                    <img
                      src="/hero-illustration.png"
                      alt="Healthcare professionals financial dashboard"
                      className="w-full h-auto rounded-2xl object-cover transform transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="py-16 sm:py-20 relative">
          <div className="absolute inset-0 bg-primary/5 skew-y-3 -z-10" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto" data-reveal="init">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Services built for clarity and speed</h2>
              <p className="mt-4 text-muted-foreground text-lg">
                A modern cooperative experience: simple onboarding, clear approvals, and a dashboard that keeps members informed at a glance.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="group relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-md p-8 shadow-xl shadow-primary/5 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300" data-reveal="init">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <TrendingUp className="w-7 h-7" aria-hidden="true" />
                  </span>
                  <div className="text-xl font-bold text-foreground mb-3">Savings & investment</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Contribute monthly and track balances over time. Investment drives transparent profit sharing.
                  </p>
                </div>
              </div>

              <div className="group relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-md p-8 shadow-xl shadow-primary/5 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300" data-reveal="init">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Users className="w-7 h-7" aria-hidden="true" />
                  </span>
                  <div className="text-xl font-bold text-foreground mb-3">Loans & guarantees</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Apply, review, and manage loans with clear statuses. Guarantee requests are tracked with history and instant notifications.
                  </p>
                </div>
              </div>

              <div className="group relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-md p-8 shadow-xl shadow-primary/5 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300" data-reveal="init">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Shield className="w-7 h-7" aria-hidden="true" />
                  </span>
                  <div className="text-xl font-bold text-foreground mb-3">Transparent governance</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Admin workflows include validation, audit trails, and consistent feedback so actions are always traceable and accountable.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="py-20 sm:py-28 bg-muted/20 border-y border-border overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-16 items-center">
              <div className="lg:col-span-5 relative z-10" data-reveal="init">
                <div className="absolute -left-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl -z-10" />
                <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">How it works</h2>
                <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                  A seamless guided flow from onboarding to contributions, loans, and support—designed to be effortless on mobile and fast on any network.
                </p>
                <div className="mt-8">
                  <Link
                    to="/apply-membership"
                    className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-lg shadow-primary/20"
                  >
                    Start your journey
                  </Link>
                </div>
              </div>
              <div className="lg:col-span-7 relative">
                {/* Vertical line connecting steps */}
                <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gradient-to-b from-primary/50 via-primary/20 to-transparent hidden sm:block" />

                <ol className="grid gap-8 relative z-10">
                  {[
                    { title: 'Apply & get verified', body: 'Submit your membership application with accurate details. Our streamlined review process ensures quick verification.' },
                    { title: 'Contribute monthly', body: 'Save and invest on a consistent schedule. Your personalized dashboard instantly reflects approvals and tracks your complete history.' },
                    { title: 'Access support & loans', body: 'Apply for eligible loans, manage guarantees, securely send complaints, and receive official admin communications directly.' }
                  ].map((s, idx) => (
                    <li key={s.title} className="relative group" data-reveal="init">
                      <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8 p-6 sm:p-8 rounded-3xl border border-border/50 bg-background/80 backdrop-blur-sm shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
                        <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform duration-300">
                          {idx + 1}
                        </div>
                        <div className="pt-1">
                          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-300">{s.title}</h3>
                          <p className="mt-3 text-base text-muted-foreground leading-relaxed">{s.body}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6" data-reveal="init">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">About FCNACONSGMCS</h2>
                <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
                  We are the Fellowship of Christian Nurses Alumni, College of Nursing Sciences Gombe Multipurpose Cooperative Society Limited. Our mission is to foster financial independence, mutual support, and wealth creation for nurses and midwives.
                </p>
                <div className="mt-8 grid gap-4">
                  {[
                    'Empowering Healthcare Professionals through dedicated financial services',
                    'Fostering a Culture of Savings & Investment',
                    'Providing Accessible, Biblically-principled Financial Support'
                  ].map((t) => (
                    <div key={t} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                        <CheckCircle className="w-4 h-4 text-primary" aria-hidden="true" />
                      </div>
                      <div className="text-base text-foreground font-medium pt-1">{t}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6" data-reveal="init">
                <div className="relative rounded-3xl border border-border/50 bg-background/60 backdrop-blur-md shadow-2xl shadow-primary/5 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
                  <div className="relative p-8 sm:p-10">
                    <div className="text-lg font-bold text-foreground mb-6">Our Core Values</div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-base font-bold text-foreground mb-2">Integrity</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">Operating with complete transparency and honesty in all financial dealings.</div>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-base font-bold text-foreground mb-2">Mutual Support</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">A community of healthcare professionals lifting each other up.</div>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-base font-bold text-foreground mb-2">Excellence</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">Delivering professional-grade financial services and responsive support.</div>
                      </div>
                      <div className="rounded-2xl border border-border/50 bg-background/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="text-base font-bold text-foreground mb-2">Growth</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">Creating sustainable wealth through strategic investments and profit sharing.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 sm:py-28 bg-background border-y border-border">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center" data-reveal="init">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Frequently asked questions</h2>
              <p className="mt-4 text-lg text-muted-foreground">Quick answers to the most common questions about our cooperative.</p>
            </div>

            <div className="mt-12 space-y-4">
              {[
                {
                  q: 'Are operations Biblically-principled?',
                  a: 'Yes, all operations strictly follow Biblical principles of Justice, fairness, and financial integrity.'
                },
                {
                  q: 'What loans are available?',
                  a: 'We offer Cash loans (up to ₦500k, 3x 50% total monthly contribution), Venture loans (up to ₦1M, 10x 30% contribution), and Emergency loans (₦20k max) to active members.'
                },
                {
                  q: 'How do guarantees work?',
                  a: 'Members can receive guarantee requests and securely respond with approval/rejection directly from their dashboard, complete with status tracking and history.'
                },
                {
                  q: 'How do withdrawals work?',
                  a: 'Eligible members can request exactly 30% of their contributions once per calendar year, subject to no active loans and administrative approval.'
                }
              ].map((item) => (
                <details key={item.q} className="group rounded-2xl border border-border/60 bg-card p-6 shadow-sm hover:shadow-md transition-shadow duration-300" data-reveal="init">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
                    <span className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{item.q}</span>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary group-open:bg-primary group-open:text-primary-foreground transition-colors duration-300">
                      <ChevronDown className="w-5 h-5 transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <p className="mt-4 text-base text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/20">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 sm:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-primary text-primary-foreground p-10 sm:p-14 lg:p-16 shadow-2xl overflow-hidden" data-reveal="init">
              <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-center">
                <div className="lg:col-span-8 text-center lg:text-left">
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">Ready to join FCNACONSGMCS?</h2>
                  <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    Apply in minutes. Track approvals, contributions, loans, messages, and guarantees all from one secure, beautifully crafted dashboard.
                  </p>
                </div>
                <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-4 items-center lg:items-end justify-center lg:justify-end">
                  <Link
                    to="/apply-membership"
                    className="group inline-flex items-center justify-center w-full sm:w-auto lg:w-full h-14 px-8 rounded-full bg-white text-primary hover:bg-gray-50 text-base font-bold transition-all duration-300 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                  >
                    Apply now
                    <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center w-full sm:w-auto lg:w-full h-14 px-8 rounded-full border-2 border-white/20 hover:bg-white/10 text-white text-base font-bold transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
                  >
                    Member login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
                  <Heart className="w-5 h-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="text-sm font-semibold">FCNACONSGMCS Limited</div>
                  <div className="text-xs text-muted-foreground">Fellowship of Christian Nurses Alumni College Of Nursing Sciences Gombe Multipurpose Cooperative Society Limited</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground max-w-md">
                A modern cooperative platform for Muslim healthcare professionals. Built for transparency, accessibility, and responsible growth.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <a href="#" aria-label="Facebook" className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Facebook className="w-5 h-5" aria-hidden="true" />
                </a>
                <a href="#" aria-label="Twitter" className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Twitter className="w-5 h-5" aria-hidden="true" />
                </a>
                <a href="#" aria-label="LinkedIn" className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Linkedin className="w-5 h-5" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 grid gap-8 sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold">Get started</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/apply-membership" className="hover:text-foreground transition-colors">Apply for membership</Link></li>
                  <li><Link to="/login" className="hover:text-foreground transition-colors">Login</Link></li>
                  <li><a href="#services" className="hover:text-foreground transition-colors">Services</a></li>
                </ul>
              </div>
              <div>
                <div className="text-sm font-semibold">Explore</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li><a href="#how" className="hover:text-foreground transition-colors">How it works</a></li>
                  <li><a href="#about" className="hover:text-foreground transition-colors">About FCNACONSGMCS</a></li>
                  <li><a href="#faq" className="hover:text-foreground transition-colors">FAQ</a></li>
                </ul>
              </div>
              <div>
                <div className="text-sm font-semibold">Legal</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Terms</a></li>
                  <li>
                    <button
                      ref={contactTriggerRef}
                      type="button"
                      onClick={() => setContactOpen(true)}
                      className="group text-left hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md inline-flex items-center gap-2"
                      aria-haspopup="dialog"
                      aria-expanded={contactOpen}
                    >
                      Contact
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100" />
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} FCNACONSGMCS Limited. All rights reserved.</div>
            <div className="text-xs text-muted-foreground">Developed by C&S Company Limited</div>
          </div>
        </div>
      </footer>

      <div
        className={[
          'fixed inset-0 z-[60] flex items-center justify-center p-4',
          reducedMotion ? '' : 'transition-opacity duration-200',
          contactOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        ].join(' ')}
        aria-hidden={!contactOpen}
      >
        <div
          className={[
            'absolute inset-0 bg-black/45',
            reducedMotion ? '' : 'transition-opacity duration-200',
            contactOpen ? 'opacity-100' : 'opacity-0'
          ].join(' ')}
          onClick={() => setContactOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Office contact information"
          className={[
            'relative w-full max-w-xl rounded-2xl border border-border bg-card shadow-lg',
            reducedMotion ? '' : 'transition-transform duration-200',
            contactOpen ? 'translate-y-0 scale-100' : 'translate-y-2 scale-95'
          ].join(' ')}
        >
          <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-foreground">FCNACONSGMCS Secretariat</div>
              <div className="text-xs text-muted-foreground">Office contact details</div>
            </div>
            <button
              ref={contactCloseRef}
              type="button"
              onClick={() => setContactOpen(false)}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-border bg-background hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div>
              <div className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Location</div>
              <div className="mt-2 text-sm text-foreground leading-relaxed">

              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Phone</div>
                <a
                  href="tel:+2348105880201"
                  className="mt-2 inline-flex text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
                >
                  12345678901
                </a>
                <div className="mt-1 text-xs text-muted-foreground">Mon–Fri during office hours</div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4">
                <div className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Email</div>
                <a
                  href="mailto:imanmcos@gmail.com"
                  className="mt-2 inline-flex text-sm font-semibold text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md break-all"
                >
                  fcnaconsgmcs@gmail.com
                </a>
                <div className="mt-1 text-xs text-muted-foreground">We typically respond promptly</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setContactOpen(false)}
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Close
              </button>
              <a
                href="mailto:imanmcos@gmail.com"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Send email
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
