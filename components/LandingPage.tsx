import React from 'react';
import { ArrowRight, LucideIcon, CheckCircle2, Activity, Clock3, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, body }) => (
    <div className="group flex flex-col p-8 rounded-[32px] card-base transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-2 mb-6 shadow-sm border border-stroke-highlight">
            <Icon className="w-6 h-6 text-content-muted group-hover:text-primary-500 transition-colors" />
        </div>
        <h3 className="text-[20px] font-bold text-content-primary mb-3">{title}</h3>
        <p className="text-[15px] leading-relaxed text-content-muted">{body}</p>
    </div>
);

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

export default function LandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-surface-app font-sans selection:bg-primary-500/30 transition-colors duration-300">
            {/* Background Radial Glows */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] opacity-15 dark:opacity-20 bg-[radial-gradient(circle_at_center,theme('colors.primary.500'),transparent_70%)] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] opacity-10 dark:opacity-15 bg-[radial-gradient(circle_at_center,theme('colors.primary.500'),transparent_70%)] blur-[100px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-[1240px] px-6 sm:px-10 py-8 flex flex-col min-h-screen">
                {/* Header */}
                <header className="flex items-center justify-between mb-24 sm:mb-32">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-2 border border-stroke-highlight shadow-sm">
                            <span className="text-[14px] font-bold text-content-primary">HW</span>
                        </div>
                        <span className="text-[18px] font-bold tracking-tight text-content-primary">
                            HomeWork
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link to="/login" className="text-[14px] font-semibold text-content-muted hover:text-content-primary transition-colors">
                            Log In
                        </Link>
                        <Link to="/signup" className="px-5 py-2 rounded-full bg-primary-600 text-white text-[14px] font-bold hover:bg-primary-500 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] shadow-primary-500/30">
                            Sign Up
                        </Link>
                    </div>
                </header>

                <main className="flex flex-col items-center text-center">
                    {/* Centered Hero Content */}
                    <div className="flex flex-col items-center max-w-[800px] mb-20 px-4">
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-surface-2 border border-stroke-highlight shadow-[0_0_15px_rgba(244,63,94,0.15)] shadow-primary-500/15 mb-10">
                            <div className="relative flex items-center justify-center">
                                <Activity className="w-3.5 h-3.5 text-primary-500 z-10" />
                                <div className="absolute inset-0 bg-primary-500/50 blur-[6px] rounded-full scale-150 animate-pulse" />
                            </div>
                            <span className="text-[11px] font-bold tracking-[0.15em] text-muted uppercase">
                                FAMILY PERFORMANCE SYSTEM
                            </span>
                        </div>

                        <h1 className="text-[48px] sm:text-[64px] lg:text-[80px] leading-[1.1] font-bold text-content-primary tracking-tight mb-8">
                            Tie Grades to Income.<br />
                            <span className="text-content-muted">End the Weekly Arguments.</span>
                        </h1>

                        <p className="text-[16px] sm:text-[18px] leading-relaxed text-content-muted max-w-[620px] mb-16">
                            Give your kids a real-world system where grades raise their hourly rate, chores earn income, and accountability is built in.
                        </p>

                        {/* Centered Phone Mockup */}
                        <div className="relative w-full max-w-[720px] mb-20 flex justify-center">
                            <div className="relative w-[340px] sm:w-[440px] group bg-transparent">
                                {/* Glow behind phone - DARK MODE ONLY */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[70%] bg-[radial-gradient(circle,theme('colors.primary.500'),transparent_70%)] opacity-0 dark:opacity-40 blur-[80px] rounded-full scale-150 group-hover:dark:opacity-60 transition-opacity duration-700 pointer-events-none" />

                                <div className="relative transform transition-transform duration-700 group-hover:scale-[1.03] bg-transparent">
                                    <img
                                        src="/images/phone-mockup.png"
                                        alt="HomeWork App Mockup"
                                        className="w-full h-auto drop-shadow-[0_28px_70px_rgba(0,0,0,0.18)] dark:drop-shadow-[0_40px_110px_rgba(0,0,0,0.55)]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* CTA Buttons - Centered */}
                        <div className="flex flex-col items-center gap-6 w-full justify-center">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                                <Link to="/signup" className="relative group overflow-hidden h-14 px-10 rounded-full bg-gradient-to-b from-primary-600 to-primary-700 text-white text-[16px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.05] active:scale-[0.98] shadow-[0_10px_30px_rgba(244,63,94,0.4)] shadow-primary-500/40">
                                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    Start Free 14-Day Trial
                                    <ArrowRight className="w-5 h-5" />
                                </Link>
                                <Link to="/login" className="h-14 px-10 rounded-full bg-surface-2 border border-stroke-base text-content-primary text-[16px] font-bold hover:bg-surface-elev transition-colors backdrop-blur-md flex items-center justify-center">
                                    I Already Have an Account
                                </Link>
                            </div>
                            <p className="text-[13px] text-muted">No banking. No debit cards. You control the payout.</p>
                        </div>
                    </div>

                    {/* PROBLEM SECTION */}
                    <section className="w-full mb-32">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-content-primary mb-12">The Problem Isn&apos;t Chores. It&apos;s Accountability.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
                            {problemCards.map((card, idx) => (
                                <div key={idx} className="flex flex-col p-8 rounded-[32px] card-base text-left">
                                    <h3 className="text-[18px] font-bold text-content-primary mb-3">{card.title}</h3>
                                    <p className="text-[14px] leading-relaxed text-content-muted">{card.body}</p>
                                </div>
                            ))}
                        </div>
                        <p className="text-[18px] font-bold text-primary-400">HomeWork fixes the incentive structure.</p>
                    </section>

                    {/* Features Grid - 3 Columns Centered */}
                    <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-32">
                        {[
                            { icon: TrendingUp, title: 'Performance-Based Rates', body: 'Adjust earnings automatically based on GPA. Higher grades = higher hourly earnings.' },
                            { icon: Clock3, title: 'Structured Weekly System', body: 'Plan chores and expectations before the week begins. No mid-week renegotiating.' },
                            { icon: Sparkles, title: 'Lifetime Earnings Dashboard', body: 'Kids see exactly how effort compounds over time. Nothing hidden. Nothing vague.' }
                        ].map((card, idx) => (
                            <FeatureCard key={idx} icon={card.icon} title={card.title} body={card.body} />
                        ))}
                    </section>

                    {/* VALUE EXAMPLE SECTION */}
                    <section className="w-full mb-32 max-w-[800px]">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-primary mb-12">See How Incentives Change Behavior</h2>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between rounded-[24px] border border-stroke-highlight bg-surface-2 p-8 backdrop-blur-sm">
                                <span className="text-xl font-bold text-primary">GPA 3.8</span>
                                <div className="h-px flex-1 bg-stroke-base mx-6"></div>
                                <span className="text-3xl font-bold text-primary-500">$12/hour</span>
                            </div>
                            <div className="flex items-center justify-between rounded-[24px] border border-stroke-base bg-surface-2 p-8 opacity-40 backdrop-blur-sm">
                                <span className="text-xl font-bold text-primary">GPA 2.5</span>
                                <div className="h-px flex-1 bg-stroke-base mx-6"></div>
                                <span className="text-3xl font-bold text-content-primary">$7/hour</span>
                            </div>
                            <p className="text-muted mt-6 font-medium">When effort affects earnings, motivation changes.</p>
                        </div>
                    </section>

                    {/* PRICING SECTION */}
                    <section className="w-full mb-32">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-primary mb-12">Simple. Transparent. Powerful.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] mx-auto">
                            {/* Pro Plan */}
                            <div className="relative p-10 rounded-[40px] card-base border-2 border-primary-500/50 shadow-[0_24px_48px_rgba(244,63,94,0.15)] shadow-primary-500/15 text-left">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                                    Most Popular
                                </div>
                                <h3 className="text-2xl font-bold text-primary mb-4">HomeWork Pro</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold text-primary">$17</span>
                                    <span className="text-muted">/ month</span>
                                </div>
                                <p className="text-sm text-subtle mb-8">or $149 / year (Save $55)</p>
                                <ul className="space-y-4 mb-10">
                                    {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-muted">
                                            <CheckCircle2 className="w-4 h-4 text-primary-500" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="block w-full h-14 rounded-full bg-primary-600 text-white font-bold text-center leading-[56px] hover:bg-primary-500 transition-colors">Start Free Trial</Link>
                            </div>

                            {/* Founders Plan */}
                            <div className="p-10 rounded-[40px] bg-surface-2 border border-stroke-base text-left">
                                <h3 className="text-2xl font-bold text-primary mb-2">Founders Plan</h3>
                                <p className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-4">Limited to First 100 Families</p>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold text-primary">$129</span>
                                    <span className="text-muted">/ year</span>
                                </div>
                                <p className="text-sm text-subtle mb-8">Locked-in pricing for life.</p>
                                <ul className="space-y-4 mb-10">
                                    {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-muted">
                                            <CheckCircle2 className="w-4 h-4 text-subtle" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="block w-full h-14 rounded-full bg-surface-app border border-stroke-highlight text-content-primary font-bold text-center leading-[56px] hover:bg-surface-2 transition-colors">Claim Founder Spot</Link>
                            </div>
                        </div>
                    </section>

                    {/* VALUE ANCHOR */}
                    <section className="w-full mb-32 p-12 rounded-[40px] bg-surface-2 border border-stroke-highlight">
                        <h2 className="text-2xl font-bold text-primary mb-10">Less Than One Tutoring Session Per Month</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Travel Sports', value: '$300+/mo' },
                                { label: 'Tutoring', value: '$200+/mo' },
                                { label: 'Video Games', value: '$60' },
                                { label: 'HomeWork', value: '$17/mo', active: true }
                            ].map((item) => (
                                <div key={item.label} className={`p-6 rounded-2xl border ${item.active ? 'border-primary-500/50 bg-primary-500/5 shadow-lg' : 'border-stroke-base bg-surface-app'}`}>
                                    <div className="text-[11px] font-bold text-muted uppercase tracking-widest mb-1">{item.label}</div>
                                    <div className={`text-xl font-bold ${item.active ? 'text-primary-500' : 'text-primary'}`}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FAQS */}
                    <section className="max-w-[700px] w-full mb-32 text-left">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-primary mb-12 text-center">Common Questions</h2>
                        <div className="space-y-8">
                            {faqs.map((faq) => (
                                <div key={faq.q} className="border-b border-stroke-base pb-8">
                                    <h3 className="text-[18px] font-bold text-primary mb-3">{faq.q}</h3>
                                    <p className="text-[15px] leading-relaxed text-muted">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FINAL CTA */}
                    <section className="w-full mb-32 py-20 rounded-[48px] bg-gradient-to-b from-primary-600/10 to-transparent border border-stroke-highlight">
                        <h2 className="text-[40px] sm:text-[56px] font-bold text-primary mb-10">Start Building Accountability<br />This Week.</h2>
                        <div className="flex flex-col items-center gap-6">
                            <Link to="/signup" className="h-16 px-12 rounded-full bg-primary-600 text-white text-lg font-bold flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-[0_20px_40px_rgba(244,63,94,0.3)] shadow-primary-500/30">
                                Start 14-Day Trial
                                <ArrowRight className="w-6 h-6" />
                            </Link>
                            <p className="text-content-muted font-medium">Cancel anytime.</p>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-10 pb-6 border-t border-stroke-base flex flex-col sm:flex-row justify-between items-center gap-6">
                    <p className="text-[13px] font-medium text-content-muted">
                        <span className="text-content-primary">HomeWork.</span> Built for high-trust family systems.
                    </p>
                    <div className="flex items-center gap-8 text-[13px] font-bold">
                        <Link to="/login" className="text-content-muted hover:text-content-primary transition-colors">Log In</Link>
                        <Link to="/signup" className="text-content-muted hover:text-content-primary transition-colors">Sign Up</Link>
                        <div className="pl-4 border-l border-stroke-base">
                            <ThemeSwitch />
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
