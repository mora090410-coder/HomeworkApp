import React from 'react';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

const featureCards = [
  {
    icon: Clock3,
    title: 'Sunday Night Lock',
    body: 'Plan chores, allowances, and expectations before the week starts so everyone knows the playbook.',
  },
  {
    icon: ShieldCheck,
    title: 'Family Ledger',
    body: 'Track earnings, advances, and balance history in one place with clean accountability.',
  },
  {
    icon: Sparkles,
    title: 'Progress Visibility',
    body: 'Turn everyday work into visible progress your kids can understand and stay motivated by.',
  },
];

export default function MarketingLandingPage() {
  return (
    <div className="homework-landing min-h-screen bg-[#0a1117] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(196,30,58,0.24),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(196,30,58,0.12),transparent_32%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '52px 52px' }} />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-[#ffb6c1]">
            HW
          </span>
          <span className="font-heading text-lg tracking-tight">HomeWork</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Log In
          </Link>
          <Link
            to="/signup"
            className="rounded-full bg-[#C41E3A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#d5334d]"
          >
            Sign Up
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-16 pt-8 md:px-10 md:pt-16">
        <section className="grid items-center gap-12 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="animate-rise-fade inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#C41E3A]" />
              Family economy system
            </div>
            <h1 className="font-heading animate-rise-fade text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Build discipline
              <br />
              without the chaos.
            </h1>
            <p className="animate-rise-fade max-w-2xl text-base text-slate-300 md:text-lg">
              HomeWork gives parents a premium command center for chores, learning effort, and allowance outcomes.
            </p>
            <div className="animate-rise-fade flex flex-wrap items-center gap-4">
              <Link
                to="/signup"
                className="group inline-flex items-center gap-2 rounded-full bg-[#C41E3A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d5334d]"
              >
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                I Have an Account
              </Link>
            </div>
          </div>

          <div className="animate-float rounded-3xl border border-white/20 bg-gradient-to-b from-white/10 to-white/[0.02] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <p className="mb-4 text-xs uppercase tracking-[0.2em] text-slate-300">This week at a glance</p>
            <div className="space-y-3">
              {['Tasks Completed 14/18', 'Allowance Approved $92.00', 'Reading Streak 6 days'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-white/15 bg-[#0d161f] px-4 py-3 text-sm text-slate-100">
                  <span>{item}</span>
                  <CheckCircle2 className="h-4 w-4 text-[#C41E3A]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="animate-rise-fade rounded-2xl border border-white/15 bg-white/[0.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#C41E3A]/60 hover:bg-white/[0.06]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Icon className="mb-4 h-6 w-6 text-[#ff9bad]" />
                <h2 className="font-heading mb-2 text-2xl leading-tight">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-slate-300">{feature.body}</p>
              </article>
            );
          })}
        </section>
      </main>

      <footer className="relative z-10 mt-8 border-t border-white/10 px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>HomeWork. Built for high-trust family systems.</p>
          <div className="flex items-center gap-3">
            <Link to="/login" className="transition hover:text-white">
              Log In
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/signup" className="transition hover:text-white">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
