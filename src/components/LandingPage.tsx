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
 * Premium feature card (clean white, light border, brand accent on hover).
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, body, delay = '' }) => (
    <div className={`group flex flex-col p-8 card-base hover:border-amber-500/50 ${delay}`}>
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-surface-app mb-6 group-hover:bg-brand/5 transition-colors duration-300">
            <Icon className="w-6 h-6 text-blue-500 transition-transform duration-300 group-hover:scale-110" />
        </div>
        <h3 className="text-xl font-bold font-heading text-content-primary mb-3">{title}</h3>
        <p className="text-base leading-relaxed text-content-muted">{body}</p>
    </div>
);

/* ──────────────────────────────────────
   Data
   ────────────────────────────────────── */

const problemCards = [
    {
        icon: AlertTriangle,
        title: 'Disconnected Effort',
        body: 'Kids don’t connect school effort to real rewards. Allowance feels automatic instead of earned.',
    },
    {
        icon: MessageSquareWarning,
        title: 'Endless Disputes',
        body: 'Weekly chore conversations turn into negotiation sessions.',
    },
    {
        icon: BatteryLow,
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

/* ──────────────────────────────────────
   Landing Page
   ────────────────────────────────────── */

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-surface-app font-sans text-content-primary selection:bg-amber-500/30">

            {/* ── Sticky Header ── */}
            <header className="sticky top-0 z-50 w-full bg-surface-base/90 backdrop-blur-md border-b border-stroke-base">
                <div className="max-w-[1240px] mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-none bg-brand text-white shadow-sm">
                            <span className="text-lg font-bold font-heading">HW</span>
                        </div>
                        <span className="text-xl font-bold font-heading tracking-tight text-content-primary">
                            HomeWork
                        </span>
                    </div>

                    <div className="flex items-center gap-5">
                        <ThemeSwitch />
                        <Link to="/login" className="text-sm font-semibold text-content-muted hover:text-blue-500 transition-colors">
                            Log In
                        </Link>
                        <Link to="/signup" className="btn-primary rounded-none text-sm">
                            Sign Up
                        </Link>
                    </div>
                </div>
            </header>

            {/* ── Main Content ── */}
            <div className="relative z-10 mx-auto max-w-[1240px] px-6 sm:px-10 flex flex-col min-h-[calc(100vh-80px)]">
                <main className="flex flex-col items-center text-center pt-20 sm:pt-28">

                    {/* ═══════════════ HERO ═══════════════ */}
                    <div className="flex flex-col items-center max-w-[900px] mb-20 px-4 animate-fade-in-up">

                        {/* Badge */}
                        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-surface-base border border-stroke-base shadow-sm mb-8">
                            <Activity className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-bold tracking-widest text-content-muted uppercase">
                                Family Performance System
                            </span>
                        </div>

                        {/* H1 */}
                        <h1 className="text-5xl sm:text-7xl font-bold font-heading text-content-primary tracking-tight mb-8">
                            Tie Grades to Income.<br />
                            <span className="text-blue-500">End the Arguments.</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl leading-relaxed text-content-muted max-w-[680px] mb-12">
                            Give your kids a real-world system where grades raise their hourly rate, chores earn income, and accountability is built in.
                        </p>

                        {/* Phone Mockup */}
                        <div className="relative w-full max-w-[720px] mb-20 flex justify-center">
                            <div className="relative w-[300px] sm:w-[380px] group transform transition-transform duration-700 hover:scale-[1.02]">
                                <img
                                    src="/images/phone-mockup.png"
                                    alt="HomeWork App Mockup"
                                    className="w-full h-auto drop-shadow-2xl"
                                />
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col items-center gap-6 w-full justify-center">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                                <Link to="/signup" className="btn-primary h-14 px-10 rounded-none text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform transition-all">
                                    Start Free 14-Day Trial
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link to="/login" className="btn-secondary h-14 px-10 rounded-none text-lg flex items-center justify-center">
                                    I Already Have an Account
                                </Link>
                            </div>
                            <p className="text-sm text-content-muted font-medium">No banking. No debit cards. You control the payout.</p>
                        </div>
                    </div>

                    {/* ═══════════════ PROBLEM SECTION ═══════════════ */}
                    <section className="w-full mb-32">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold font-heading text-content-primary mb-4">The Problem Isn&apos;t Chores.</h2>
                            <p className="text-2xl font-medium text-blue-500">It&apos;s Accountability.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {problemCards.map((card, idx) => (
                                <div key={idx} className="flex flex-col p-8 card-base text-left border-l-4 border-l-blue-500">
                                    <div className="w-10 h-10 flex items-center justify-center rounded-none bg-brand/10 mb-5">
                                        <card.icon className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <h3 className="text-xl font-bold font-heading text-content-primary mb-3">{card.title}</h3>
                                    <p className="text-base leading-relaxed text-content-muted">{card.body}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-lg font-bold text-content-primary mt-12 bg-surface-base inline-block px-6 py-2 rounded-full border border-stroke-base shadow-sm">
                            HomeWork fixes the incentive structure.
                        </p>
                    </section>

                    {/* ═══════════════ FEATURES GRID ═══════════════ */}
                    <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
                        {[
                            { icon: TrendingUp, title: 'Performance-Based Rates', body: 'Adjust earnings automatically based on GPA. Higher grades = higher hourly earnings.' },
                            { icon: Clock3, title: 'Structured Weekly System', body: 'Plan chores and expectations before the week begins. No mid-week renegotiating.' },
                            { icon: Sparkles, title: 'Lifetime Earnings Dashboard', body: 'Kids see exactly how effort compounds over time. Nothing hidden. Nothing vague.' }
                        ].map((card, idx) => (
                            <FeatureCard key={idx} icon={card.icon} title={card.title} body={card.body} />
                        ))}
                    </section>

                    {/* ═══════════════ VALUE EXAMPLE ═══════════════ */}
                    <section className="w-full mb-32 max-w-[800px] bg-surface-base rounded-none border border-stroke-base p-12 shadow-sm">
                        <h2 className="text-3xl sm:text-4xl font-bold font-heading text-content-primary mb-4">See How Incentives</h2>
                        <p className="text-2xl font-medium text-blue-500 mb-14">Change Behavior</p>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between rounded-none bg-surface-app p-8 border border-amber-500/30 relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                                <span className="text-xl font-bold text-content-primary">GPA 3.8</span>
                                <div className="h-px flex-1 bg-surface-2 mx-6"></div>
                                <span className="text-3xl font-bold text-blue-500">$12/hour</span>
                            </div>
                            <div className="flex items-center justify-between rounded-none bg-surface-base p-8 border border-stroke-base opacity-60 grayscale">
                                <span className="text-xl font-bold text-content-primary">GPA 2.5</span>
                                <div className="h-px flex-1 bg-surface-2 mx-6"></div>
                                <span className="text-3xl font-bold text-content-muted">$7/hour</span>
                            </div>
                            <p className="text-content-muted mt-6 font-medium italic">When effort affects earnings, motivation changes.</p>
                        </div>
                    </section>

                    {/* ═══════════════ PRICING ═══════════════ */}
                    <section className="w-full mb-32">
                        <h2 className="text-3xl sm:text-4xl font-bold font-heading text-content-primary mb-4">Simple. Transparent.</h2>
                        <p className="text-2xl font-medium text-blue-500 mb-14">Powerful.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] mx-auto">

                            {/* Pro Plan */}
                            <div className="relative p-10 rounded-none card-base text-left border-amber-500 border-2 shadow-lg bg-surface-base">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-6 py-1.5 text-xs font-bold uppercase tracking-wider text-content-primary shadow-sm">
                                    Most Popular
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold font-heading text-content-primary mb-4">HomeWork Pro</h3>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-5xl font-bold text-content-primary">$17</span>
                                        <span className="text-content-muted font-medium">/ month</span>
                                    </div>
                                    <p className="text-sm text-content-muted mb-8">or $149 / year (Save $55)</p>
                                    <ul className="space-y-4 mb-10">
                                        {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                            <li key={f} className="flex items-center gap-3 text-sm text-content-muted">
                                                <CheckCircle2 className="w-5 h-5 text-primary-success flex-shrink-0" />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <Link to="/signup" className="btn-primary block w-full h-14 rounded-none text-lg font-bold text-center leading-[56px] shadow-md hover:shadow-lg">Start Free Trial</Link>
                                </div>
                            </div>

                            {/* Founders Plan */}
                            <div className="p-10 rounded-none card-base text-left bg-surface-app">
                                <h3 className="text-2xl font-bold font-heading text-content-primary mb-2">Founders Plan</h3>
                                <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-4">Limited to First 100 Families</p>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold text-content-primary">$129</span>
                                    <span className="text-content-muted font-medium">/ year</span>
                                </div >
                                <p className="text-sm text-content-muted mb-8">Locked-in pricing for life.</p>
                                <ul className="space-y-4 mb-10">
                                    {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-content-muted">
                                            <CheckCircle2 className="w-5 h-5 text-neutral-200 flex-shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="btn-secondary block w-full h-14 rounded-none text-lg font-bold text-center leading-[56px]">Claim Founder Spot</Link>
                            </div>
                        </div>
                    </section>

                    {/* ═══════════════ VALUE ANCHOR ═══════════════ */}
                    <section className="w-full mb-32 p-12 rounded-none card-base bg-surface-base">
                        <h2 className="text-2xl font-bold font-heading text-content-primary mb-10">Less Than One Tutoring Session Per Month</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Travel Sports', value: '$300+/mo' },
                                { label: 'Tutoring', value: '$200+/mo' },
                                { label: 'Video Games', value: '$60' },
                                { label: 'HomeWork', value: '$17/mo', active: true }
                            ].map((item) => (
                                <div key={item.label} className={`p-6 rounded-none border transition-all duration-300 ${item.active
                                    ? 'border-amber-500 bg-amber-500/5 shadow-sm ring-1 ring-amber-500/20'
                                    : 'border-stroke-base bg-surface-base hover:border-neutral-darkGray'}`}>
                                    <div className="text-xs font-bold text-content-muted uppercase tracking-widest mb-2">{item.label}</div>
                                    <div className={`text-xl font-bold ${item.active ? 'text-blue-500' : 'text-content-primary'}`}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══════════════ FAQS ═══════════════ */}
                    <section className="max-w-[700px] w-full mb-32 text-left">
                        <h2 className="text-3xl sm:text-4xl font-bold font-heading text-content-primary mb-12 text-center">Common Questions</h2>
                        <div className="space-y-2">
                            {faqs.map((faq) => (
                                <div key={faq.q} className="py-6 px-8 rounded-none card-base bg-surface-base hover:bg-surface-app transition-colors">
                                    <h3 className="text-lg font-bold font-heading text-content-primary mb-2">{faq.q}</h3>
                                    <p className="text-base leading-relaxed text-content-muted">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ═══════════════ FINAL CTA ═══════════════ */}
                    <section className="w-full mb-32 py-20 rounded-none bg-surface-base border border-stroke-base shadow-lg relative overflow-hidden">
                        <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-blue-500 to-amber-500" />
                        <div className="relative z-10 px-6">
                            <h2 className="text-4xl sm:text-5xl font-bold font-heading text-content-primary mb-4 leading-tight">Start Building Accountability</h2>
                            <p className="text-4xl sm:text-5xl font-bold font-heading text-blue-500 mb-10 leading-tight">This Week.</p>
                            <div className="flex flex-col items-center gap-6">
                                <Link to="/signup" className="btn-primary h-16 px-12 rounded-none text-lg font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform transition-all">
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
                    <div className="text-sm font-medium text-content-muted">
                        <span className="text-content-primary font-bold">HomeWork.</span> Built for high-trust family systems.
                    </div>
                    <div className="flex items-center gap-8 text-sm font-bold">
                        <Link to="/login" className="text-content-muted hover:text-blue-500 transition-colors">Log In</Link>
                        <Link to="/signup" className="text-content-muted hover:text-blue-500 transition-colors">Sign Up</Link>
                    </div>
                </footer>
            </div>
        </div>
    );
}
