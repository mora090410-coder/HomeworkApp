import React from 'react';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

const featureCards = [
  {
    icon: TrendingUp,
    title: 'Performance-Based Hourly Rate',
    body: 'Adjust earnings automatically based on GPA. Higher grades = higher hourly earnings.',
  },
  {
    icon: Clock3,
    title: 'Structured Weekly System',
    body: 'Plan chores and expectations before the week begins. No mid-week renegotiating.',
  },
  {
    icon: Sparkles,
    title: 'Lifetime Earnings Dashboard',
    body: 'Kids see exactly how effort compounds over time. Nothing hidden. Nothing vague.',
  },
];

const problemCards = [
  {
    title: 'Disconnected Effort',
    body: 'Kids don’t connect school effort to real rewards. Allowance feels automatic instead of earned.',
  },
  {
    title: 'Endless Disputes',
    body: 'Weekly chore conversations turn into negotiation sessions.',
  },
  {
    title: 'Enforcement Fatigue',
    body: 'Parents want discipline — not constant enforcement.',
  },
];

const faqs = [
  {
    q: 'Does this handle real money?',
    a: 'No. You control all payouts. We provide structure and tracking.',
  },
  {
    q: 'Is this complicated?',
    a: 'Setup takes 10 minutes.',
  },
  {
    q: 'What if I forget to update grades?',
    a: 'Weekly reminders are built in.',
  },
  {
    q: 'Can both parents manage the account?',
    a: 'Yes. Shared household access included.',
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

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-32 px-6 pb-24 pt-8 md:px-10 md:pt-16">
        {/* HERO SECTION */}
        <section className="flex flex-col items-center text-center">
          <div className="space-y-8">
            <div className="animate-rise-fade inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80">
              <span className="h-2 w-2 rounded-full bg-[#C41E3A]" />
              FAMILY PERFORMANCE SYSTEM
            </div>
            <h1 className="font-heading animate-rise-fade mx-auto max-w-4xl text-5xl leading-[1.1] tracking-tight md:text-7xl">
              Tie Grades to Income.
              <br />
              <span className="text-white/60">End the Weekly Arguments.</span>
            </h1>
            <p className="animate-rise-fade mx-auto max-w-2xl text-base text-slate-300 md:text-lg">
              Give your kids a real-world system where grades raise their hourly rate, chores earn income, and accountability is built in.
            </p>
            <div className="animate-rise-fade flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  to="/signup"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#C41E3A] px-8 py-4 text-sm font-semibold text-white transition hover:bg-[#d5334d]"
                >
                  Start Free 14-Day Trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-8 py-4 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  I Already Have an Account
                </Link>
              </div>
              <p className="text-sm text-slate-400">No banking. No debit cards. You control the payout.</p>
            </div>
          </div>

          <div className="animate-float mt-20 w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-b from-white/10 to-white/[0.02] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-sm">
            <p className="mb-4 text-left text-xs uppercase tracking-[0.2em] text-slate-300">This week at a glance</p>
            <div className="space-y-3">
              {['Tasks Completed 14/18', 'Allowance Approved $92.00', 'Reading Streak 6 days'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-white/15 bg-[#0d161f] px-4 py-4 text-sm text-slate-100">
                  <span>{item}</span>
                  <CheckCircle2 className="h-4 w-4 text-[#C41E3A]" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROBLEM SECTION */}
        <section className="space-y-12">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-tight md:text-4xl">The Problem Isn&apos;t Chores. It&apos;s Accountability.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {problemCards.map((card, index) => (
              <article
                key={card.title}
                className="animate-rise-fade rounded-2xl border border-white/15 bg-white/[0.04] p-8 transition duration-300"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <h3 className="font-heading mb-4 text-xl leading-tight text-white">{card.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{card.body}</p>
              </article>
            ))}
          </div>
          <div className="text-center text-lg font-medium text-[#ff9bad]">
            HomeWork fixes the incentive structure.
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="grid gap-5 md:grid-cols-3">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="animate-rise-fade rounded-2xl border border-white/15 bg-white/[0.04] p-8 transition duration-300 hover:-translate-y-1 hover:border-[#C41E3A]/60 hover:bg-white/[0.06]"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <Icon className="mb-4 h-6 w-6 text-[#ff9bad]" />
                <h2 className="font-heading mb-3 text-2xl leading-tight">{feature.title}</h2>
                <p className="text-sm leading-relaxed text-slate-300">{feature.body}</p>
              </article>
            );
          })}
        </section>

        {/* VALUE EXAMPLE SECTION */}
        <section className="space-y-12">
          <div className="text-center">
            <h2 className="font-heading text-3xl tracking-tight md:text-4xl">See How Incentives Change Behavior</h2>
          </div>
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 p-6 backdrop-blur-sm">
              <span className="text-xl font-bold">GPA 3.8</span>
              <div className="h-px flex-1 bg-white/10 mx-6"></div>
              <span className="text-3xl font-heading text-[#ff9bad]">$12/hour</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/20 bg-white/5 p-6 opacity-60 backdrop-blur-sm">
              <span className="text-xl font-bold">GPA 2.5</span>
              <div className="h-px flex-1 bg-white/10 mx-6"></div>
              <span className="text-3xl font-heading">$7/hour</span>
            </div>
            <p className="text-center text-slate-400 mt-4">When effort affects earnings, motivation changes.</p>
          </div>
        </section>

        {/* PRICING SECTION */}
        <section className="space-y-12 pt-12">
          <div className="text-center">
            <h2 className="font-heading text-4xl tracking-tight md:text-5xl">Simple. Transparent. Powerful.</h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
            <article className="relative rounded-3xl border-2 border-[#C41E3A] bg-white/[0.04] p-8 shadow-[0_0_40px_rgba(196,30,58,0.1)]">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#C41E3A] px-4 py-1 text-xs font-bold uppercase tracking-wider text-white">
                Most Popular
              </div>
              <h3 className="font-heading text-2xl">HomeWork Pro</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$17</span>
                <span className="text-slate-400">/ month</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">or $149 / year (Save $55)</p>
              <ul className="mt-8 space-y-4 text-sm">
                {[
                  'Unlimited children',
                  'Grade-based hourly engine',
                  'Earnings dashboard',
                  'Weekly planning system',
                  'Two-parent access',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#C41E3A]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="mt-10 block w-full rounded-full bg-[#C41E3A] py-4 text-center text-sm font-semibold transition hover:bg-[#d5334d]"
              >
                Start Free Trial
              </Link>
            </article>

            <article className="rounded-3xl border border-white/15 bg-white/[0.02] p-8">
              <h3 className="font-heading text-2xl text-slate-100">Founders Plan</h3>
              <p className="mt-1 text-sm text-[#ff9bad]">Limited to First 100 Families</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold">$129</span>
                <span className="text-slate-400">/ year</span>
              </div>
              <p className="mt-2 text-sm text-slate-400">Locked-in pricing for life.</p>
              <ul className="mt-8 space-y-4 text-sm text-slate-400">
                {[
                  'Unlimited children',
                  'Grade-based hourly engine',
                  'Earnings dashboard',
                  'Weekly planning system',
                  'Two-parent access',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 opacity-40" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="mt-10 block w-full rounded-full border border-white/20 bg-white/5 py-4 text-center text-sm font-semibold transition hover:bg-white/10"
              >
                Claim Founder Spot
              </Link>
            </article>
          </div>
        </section>

        {/* VALUE ANCHOR SECTION */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 md:p-12">
          <div className="mb-12 text-center">
            <h2 className="font-heading text-3xl">Less Than One Tutoring Session Per Month</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {[
              { label: 'Travel Sports', value: '$300+/month' },
              { label: 'Tutoring', value: '$200+/month' },
              { label: 'Video Games', value: '$60' },
              { label: 'HomeWork', value: '$17/month', accent: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`flex flex-col gap-2 rounded-2xl border p-6 text-center ${item.accent ? 'border-[#C41E3A] bg-[#C41E3A]/5 shadow-lg' : 'border-white/10 bg-white/[0.02]'
                  }`}
              >
                <dt className="text-sm text-slate-400">{item.label}</dt>
                <dd className={`text-xl font-bold ${item.accent ? 'text-[#ff9bad]' : 'text-white'}`}>{item.value}</dd>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="mx-auto max-w-3xl space-y-12">
          <div className="text-center">
            <h2 className="font-heading text-4xl">Common Questions</h2>
          </div>
          <div className="divide-y divide-white/10 border-t border-b border-white/10">
            {faqs.map((faq) => (
              <div key={faq.q} className="py-6 space-y-2">
                <h3 className="text-lg font-medium text-white">{faq.q}</h3>
                <p className="text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA SECTION */}
        <section className="text-center py-12">
          <div className="space-y-8">
            <h2 className="font-heading text-4xl leading-tight md:text-5xl">
              Start Building Accountability This Week.
            </h2>
            <div className="flex flex-col items-center gap-4">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[#C41E3A] px-10 py-5 text-lg font-bold text-white transition hover:bg-[#d5334d]"
              >
                Start 14-Day Trial
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-slate-400">Cancel anytime.</p>
            </div>
          </div>
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
