import React from 'react';
import { ArrowRight, LucideIcon, CheckCircle2, Activity, Clock3, Sparkles, TrendingUp, AlertTriangle, MessageSquareWarning, BatteryLow } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';

/* ──────────────────────────────────────
   Sub-Components
   ────────────────────────────────────── */

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
    delay?: string;
}

/**
 * Premium feature card with icon badge, glass depth, and hover glow.
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, body, delay = '' }) => (
    <div className={`group flex flex-col p-8 glass-card card-glow ${delay}`}>
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-600/5 dark:from-primary-500/20 dark:to-primary-600/10 mb-6 ring-1 ring-primary-500/20 dark:ring-primary-500/30">
            <Icon className="w-6 h-6 text-primary-500 group-hover:scale-110 transition-transform duration-300" />
        </div>
        <h3 className="text-[20px] font-bold text-content-primary mb-3">{title}</h3>
        <p className="text-[15px] leading-relaxed text-content-muted">{body}</p>
    </div>
);

/* ──────────────────────────────────────
   Data
   ────────────────────────────────────── */

const problemCards = [
    {
        icon: AlertTriangle,
        title: 'Disconnected Effort',
        body: 'Kids don\u2019t connect school effort to real rewards. Allowance feels automatic instead of earned.',
    },
    {
        icon: MessageSquareWarning,
        title: 'Endless Disputes',
        body: 'Weekly chore conversations turn into negotiation sessions.',
    },
    {
        icon: BatteryLow,
        title: 'Enforcement Fatigue',
        body: 'Parents want discipline \u2014 not constant enforcement.',
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

/* ──────────────────────────────────────
   Landing Page
   ────────────────────────────────────── */

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-surface-app font-sans selection:bg-primary-500/30 transition-colors duration-300">

            {/* ── Background Radial Glows ── */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] opacity-15 dark:opacity-20 bg-[radial-gradient(circle_at_center,theme('colors.primary.500'),transparent_70%)] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] opacity-10 dark:opacity-15 bg-[radial-gradient(circle_at_center,theme('colors.primary.500'),transparent_70%)] blur-[100px]" />
            </div>

            {/* ── Sticky Header ── */}
            <header className="sticky top-0 z-50 w-full">
                <div className="glass-panel border-b border-stroke-base/50">
                    <div className="max-w-[1240px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-500/15 to-primary-700/10 border border-primary-500/20 shadow-sm">
                                <span className="text-[13px] font-extrabold text-primary-500">HW</span>
                            </div>
                            <span className="text-[17px] font-bold tracking-tight text-content-primary">
                                HomeWork
                            </span>
                        </div>

                        <div className="flex items-center gap-5">
                            <ThemeSwitch />
                            <Link to="/login" className="text-[14px] font-semibold text-content-muted hover:text-content-primary transition-colors">
                                Log In
                            </Link>
                            <Link to="/signup" className="px-5 py-2 rounded-full bg-primary-600 text-white text-[13px] font-bold hover:bg-primary-500 transition-all shadow-btn-primary hover:shadow-btn-primary-hover">
                                Sign Up
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="relative z-10 mx-auto max-w-[1240px] px-6 sm:px-10 flex flex-col min-h-[calc(100vh-64px)]">
                <main className="flex flex-col items-center text-center pt-20 sm:pt-28">

                    {/* ═══════════════ HERO ═══════════════ */}
                    <div className="flex flex-col items-center max-w-[800px] mb-20 px-4 animate-fade-in-up">

                        {/* Badge */}
                        <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-surface-2/80 backdrop-blur-sm border border-primary-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)] mb-10">
                            <div className="relative flex items-center justify-center">
                                <Activity className="w-3.5 h-3.5 text-primary-500 z-10" />
                                <div className="absolute inset-0 bg-primary-500/50 blur-[6px] rounded-full scale-150 animate-pulse" />
                            </div>
                            <span className="text-[11px] font-bold tracking-[0.15em] text-content-muted uppercase">
                                FAMILY PERFORMANCE SYSTEM
                            </span>
                        </div>

                        {/* H1 */}
                        <h1 className="text-[44px] sm:text-[60px] lg:text-[76px] leading-[1.05] font-extrabold text-content-primary tracking-tight mb-8">
                            Tie Grades to Income.<br />
                            <span className="text-gradient-primary">End the Weekly Arguments.</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-[17px] sm:text-[19px] leading-relaxed text-content-muted max-w-[620px] mb-16 tracking-[-0.01em]">
                            Give your kids a real-world system where grades raise their hourly rate, chores earn income, and accountability is built in.
                        </p>

                        {/* Phone Mockup */}
                        <div className="relative w-full max-w-[720px] mb-20 flex justify-center">
                            <div className="relative w-[300px] sm:w-[380px] group">
                                {/* Glow behind phone */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[70%] bg-[radial-gradient(ellipse_at_center,theme('colors.primary.500'),transparent_70%)] opacity-15 dark:opacity-35 blur-[80px] rounded-full scale-150 group-hover:opacity-25 dark:group-hover:opacity-50 transition-opacity duration-700 pointer-events-none" />
                                <div className="relative transform transition-transform duration-700 group-hover:scale-[1.03]">
                                    <img
                                        src="/images/phone-mockup.png"
                                        alt="HomeWork App Mockup"
                                        className="w-full h-auto drop-shadow-[0_24px_60px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_40px_100px_rgba(0,0,0,0.55)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col items-center gap-6 w-full justify-center">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                                <Link to="/signup" className="btn-shimmer relative group overflow-hidden h-14 px-10 rounded-full bg-gradient-to-b from-primary-500 to-primary-700 text-white text-[16px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.04] active:scale-[0.98] shadow-btn-primary hover:shadow-btn-primary-hover">
                                    Start Free 14-Day Trial
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link to="/login" className="h-14 px-10 rounded-full glass-button text-[16px] font-bold flex items-center justify-center backdrop-blur-md">
                                    I Already Have an Account
                                </Link>
                            </div>
                            <p className="text-[13px] text-content-subtle font-medium">No banking. No debit cards. You control the payout.</p>
                        </div>
                    </div>

                    {/* ═══════════════ PROBLEM SECTION ═══════════════ */}
                    <section className="w-full mb-32 animate-fade-in-up-delay-1">
                        <h2 className="text-[32px] sm:text-[40px] font-extrabold text-content-primary mb-4">The Problem Isn&apos;t Chores.</h2>
                        <p className="text-[20px] font-bold text-gradient-primary mb-14">It&apos;s Accountability.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
                            {problemCards.map((card, idx) => (
                                <div key={idx} className="flex flex-col p-8 glass-card text-left border-l-2 border-l-primary-500/30">
                                    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-500/10 dark:bg-primary-500/15 mb-5">
                                        <card.icon className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <h3 className="text-[18px] font-bold text-content-primary mb-3">{card.title}</h3>
                                    <p className="text-[14px] leading-relaxed text-content-muted">{card.body}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-[18px] font-bold text-primary-400">HomeWork fixes the incentive structure.</p>
                    </section>

                    {/* ═══════════════ FEATURES GRID ═══════════════ */}
                    <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-32 animate-fade-in-up-delay-2">
                        {[
                            { icon: TrendingUp, title: 'Performance-Based Rates', body: 'Adjust earnings automatically based on GPA. Higher grades = higher hourly earnings.' },
                            { icon: Clock3, title: 'Structured Weekly System', body: 'Plan chores and expectations before the week begins. No mid-week renegotiating.' },
                            { icon: Sparkles, title: 'Lifetime Earnings Dashboard', body: 'Kids see exactly how effort compounds over time. Nothing hidden. Nothing vague.' }
                        ].map((card, idx) => (
                            <FeatureCard key={idx} icon={card.icon} title={card.title} body={card.body} />
                        ))}
                    </section>

                    {/* ═══════════════ VALUE EXAMPLE ═══════════════ */}
                    <section className="w-full mb-32 max-w-[800px]">
                        <h2 className="text-[32px] sm:text-[40px] font-extrabold text-content-primary mb-4">See How Incentives</h2>
                        <p className="text-[20px] font-bold text-gradient-primary mb-14">Change Behavior</p>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between rounded-[24px] glass-card p-8 border-primary-500/20 dark:border-primary-500/15">
                                <span className="text-xl font-bold text-content-primary">GPA 3.8</span>
                                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent mx-6"></div>
                                <span className="text-3xl font-extrabold text-primary-500">$12/hour</span>
                            </div>
                            <div className="flex items-center justify-between rounded-[24px] glass-card p-8 opacity-50">
                                <span className="text-xl font-bold text-content-primary">GPA 2.5</span>
                                <div className="h-px flex-1 bg-stroke-base mx-6"></div>
                                <span className="text-3xl font-bold text-content-muted">$7/hour</span>
                            </div>
                            <p className="text-content-muted mt-6 font-medium">When effort affects earnings, motivation changes.</p>
                        </div>
                    </section>

                    {/* ═══════════════ PRICING ═══════════════ */}
                    <section className="w-full mb-32">
                        <h2 className="text-[32px] sm:text-[40px] font-extrabold text-content-primary mb-4">Simple. Transparent.</h2>
                        <p className="text-[20px] font-bold text-gradient-primary mb-14">Powerful.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] mx-auto">

                            {/* Pro Plan */}
                            <div className="relative p-10 rounded-[32px] glass-card card-glow text-left border-primary-500/30 dark:border-primary-500/20 shadow-[0_20px_50px_rgba(244,63,94,0.08)] dark:shadow-[0_20px_50px_rgba(244,63,94,0.15)]">
                                <div className="absolute inset-0 rounded-[32px] bg-gradient-to-b from-primary-500/[0.04] to-transparent pointer-events-none" />
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-btn-primary">
                                    Most Popular
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-content-primary mb-4">HomeWork Pro</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-5xl font-extrabold text-content-primary">$17</span>
                                        <span className="text-content-muted font-medium">/ month</span>
                                    </div>
                                    <p className="text-sm text-content-subtle mb-8">or $149 / year (Save $55)</p>
                                    <ul className="space-y-4 mb-10">
                                        {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                            <li key={f} className="flex items-center gap-3 text-sm text-content-muted">
                                                <CheckCircle2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link to="/signup" className="btn-shimmer block w-full h-14 rounded-full bg-gradient-to-b from-primary-500 to-primary-700 text-white font-bold text-center leading-[56px] transition-all hover:scale-[1.02] shadow-btn-primary hover:shadow-btn-primary-hover">Start Free Trial</Link>
                                </div>
                            </div>

                            {/* Founders Plan */}
                            <div className="p-10 rounded-[32px] glass-card card-glow text-left">
                                <h3 className="text-2xl font-bold text-content-primary mb-2">Founders Plan</h3>
                                <p className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-4">Limited to First 100 Families</p>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-extrabold text-content-primary">$129</span>
                                    <span className="text-content-muted font-medium">/ year</span>
                                </div>
                                <p className="text-sm text-content-subtle mb-8">Locked-in pricing for life.</p>
                                <ul className="space-y-4 mb-10">
                                    {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-content-muted">
                                            <CheckCircle2 className="w-4 h-4 text-content-subtle flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="block w-full h-14 rounded-full glass-button font-bold text-center leading-[56px] transition-all hover:scale-[1.02]">Claim Founder Spot</Link>
                            </div>
                        </div>
                    </section>

                    {/* ═══════════════ VALUE ANCHOR ═══════════════ */}
                    <section className="w-full mb-32 p-12 rounded-[32px] glass-card">
                        <h2 className="text-2xl font-bold text-content-primary mb-10">Less Than One Tutoring Session Per Month</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Travel Sports', value: '$300+/mo' },
                                { label: 'Tutoring', value: '$200+/mo' },
                                { label: 'Video Games', value: '$60' },
                                { label: 'HomeWork', value: '$17/mo', active: true }
                            ].map((item) => (
                                <div key={item.label} className={`p-6 rounded-2xl border transition-all duration-300 ${item.active
                                    ? 'border-primary-500/40 bg-primary-500/[0.06] shadow-[0_0_25px_rgba(244,63,94,0.1)] dark:shadow-[0_0_25px_rgba(244,63,94,0.15)] ring-1 ring-primary-500/20'
                                    : 'border-stroke-base bg-surface-app hover:border-stroke-highlight'}`}>
                                    <div className="text-[11px] font-bold text-content-subtle uppercase tracking-widest mb-2">{item.label}</div>
                                    <div className={`text-xl font-extrabold ${item.active ? 'text-primary-500' : 'text-content-primary'}`}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══════════════ FAQS ═══════════════ */}
                    <section className="max-w-[700px] w-full mb-32 text-left">
                        <h2 className="text-[32px] sm:text-[40px] font-extrabold text-content-primary mb-12 text-center">Common Questions</h2>
                        <div className="space-y-0 divide-y divide-stroke-base">
                            {faqs.map((faq) => (
                                <div key={faq.q} className="py-8 group transition-colors hover:bg-surface-2/40 -mx-4 px-4 rounded-xl">
                                    <h3 className="text-[18px] font-bold text-content-primary mb-3 group-hover:text-primary-500 transition-colors">{faq.q}</h3>
                                    <p className="text-[15px] leading-relaxed text-content-muted">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══════════════ FINAL CTA ═══════════════ */}
                    <section className="w-full mb-32 py-20 rounded-[40px] glass-card border-primary-500/20 dark:border-primary-500/15 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-primary-600/[0.06] to-transparent pointer-events-none rounded-[40px]" />
                        <div className="relative z-10">
                            <h2 className="text-[36px] sm:text-[52px] font-extrabold text-content-primary mb-4 leading-tight">Start Building Accountability</h2>
                            <p className="text-[36px] sm:text-[52px] font-extrabold text-gradient-primary mb-10 leading-tight">This Week.</p>
                            <div className="flex flex-col items-center gap-6">
                                <Link to="/signup" className="btn-shimmer h-16 px-12 rounded-full bg-gradient-to-b from-primary-500 to-primary-700 text-white text-lg font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.04] active:scale-[0.98] shadow-btn-primary hover:shadow-btn-primary-hover">
                                    Start 14-Day Trial
                                    <ArrowRight className="w-6 h-6" />
                                </Link>
                                <p className="text-content-muted font-medium">Cancel anytime.</p>
                            </div>
                        </div>
                    </section>
                </main>

                {/* ── Footer ── */}
                <footer className="mt-auto pt-10 pb-6 border-t border-stroke-base flex flex-col sm:flex-row justify-between items-center gap-6">
                    <p className="text-[13px] font-medium text-content-muted">
                        <span className="text-content-primary font-bold">HomeWork.</span> Built for high-trust family systems.
                    </p>
                    <div className="flex items-center gap-8 text-[13px] font-bold">
                        <Link to="/login" className="text-content-muted hover:text-content-primary transition-colors">Log In</Link>
                        <Link to="/signup" className="text-content-muted hover:text-content-primary transition-colors">Sign Up</Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}
