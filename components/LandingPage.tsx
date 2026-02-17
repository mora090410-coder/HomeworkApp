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
    <div className="group flex flex-col p-8 rounded-[32px] glass-dark border border-white/10 transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.05] mb-6 shadow-inner border border-white/5">
            <Icon className="w-6 h-6 text-white/80 group-hover:text-primary-400 transition-colors" />
        </div>
        <h3 className="text-[20px] font-bold text-white/95 mb-3">{title}</h3>
        <p className="text-[15px] leading-relaxed text-white/50">{body}</p>
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
        <div className="relative min-h-screen w-full overflow-hidden bg-gray-950 font-sans selection:bg-primary-500/30">
            {/* Background Radial Glows */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] opacity-20 bg-[radial-gradient(circle_at_center,theme('colors.primary.500'),transparent_70%)] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] opacity-15 bg-[radial-gradient(circle_at_center,theme('colors.primary.500'),transparent_70%)] blur-[100px]" />
            </div>

            <div className="relative z-10 mx-auto max-w-[1240px] px-6 sm:px-10 py-8 flex flex-col min-h-screen">
                {/* Header */}
                <header className="flex items-center justify-between mb-24 sm:mb-32">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 shadow-sm">
                            <span className="text-[14px] font-bold text-white/90">HW</span>
                        </div>
                        <span className="text-[18px] font-bold tracking-tight text-white/90">
                            HomeWork
                        </span>
                    </div>

                    <div className="flex items-center gap-6">
                        <Link to="/login" className="text-[14px] font-semibold text-white/60 hover:text-white transition-colors">
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
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 shadow-[0_0_15px_rgba(244,63,94,0.15)] shadow-primary-500/15 mb-10">
                            <div className="relative flex items-center justify-center">
                                <Activity className="w-3.5 h-3.5 text-primary-500 z-10" />
                                <div className="absolute inset-0 bg-primary-500/50 blur-[6px] rounded-full scale-150 animate-pulse" />
                            </div>
                            <span className="text-[11px] font-bold tracking-[0.15em] text-white/40 uppercase">
                                FAMILY PERFORMANCE SYSTEM
                            </span>
                        </div>

                        <h1 className="text-[48px] sm:text-[64px] lg:text-[80px] leading-[1.1] font-bold text-white tracking-tight mb-8">
                            Tie Grades to Income.<br />
                            <span className="text-white/50">End the Weekly Arguments.</span>
                        </h1>

                        <p className="text-[16px] sm:text-[18px] leading-relaxed text-white/40 max-w-[620px] mb-16">
                            Give your kids a real-world system where grades raise their hourly rate, chores earn income, and accountability is built in.
                        </p>

                        {/* Centered Phone Mockup */}
                        <div className="relative w-full max-w-[720px] mb-20 flex justify-center">
                            <div className="relative w-[340px] sm:w-[440px] group">
                                {/* Glow behind phone */}
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[60%] bg-primary-500/20 blur-[100px] opacity-40 rounded-full scale-125 group-hover:opacity-60 transition-opacity duration-700" />

                                <div className="relative transform transition-transform duration-700 group-hover:scale-[1.03]">
                                    <img
                                        src="/images/phone-mockup.png"
                                        alt="HomeWork App Mockup"
                                        className="w-full h-auto drop-shadow-[0_40px_100px_rgba(0,0,0,0.8)]"
                                    />
                                    {/* Glass Shine Overlay */}

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
                                <Link to="/login" className="h-14 px-10 rounded-full bg-white/[0.05] border border-white/10 text-white/80 text-[16px] font-bold hover:bg-white/10 transition-colors backdrop-blur-md flex items-center justify-center">
                                    I Already Have an Account
                                </Link>
                            </div>
                            <p className="text-[13px] text-white/30">No banking. No debit cards. You control the payout.</p>
                        </div>
                    </div>

                    {/* PROBLEM SECTION */}
                    <section className="w-full mb-32">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-white mb-12">The Problem Isn&apos;t Chores. It&apos;s Accountability.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
                            {problemCards.map((card, idx) => (
                                <div key={idx} className="flex flex-col p-8 rounded-[32px] glass-dark border border-white/10 text-left">
                                    <h3 className="text-[18px] font-bold text-white mb-3">{card.title}</h3>
                                    <p className="text-[14px] leading-relaxed text-white/40">{card.body}</p>
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
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-white mb-12">See How Incentives Change Behavior</h2>
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm">
                                <span className="text-xl font-bold text-white">GPA 3.8</span>
                                <div className="h-px flex-1 bg-white/10 mx-6"></div>
                                <span className="text-3xl font-bold text-primary-400">$12/hour</span>
                            </div>
                            <div className="flex items-center justify-between rounded-[24px] border border-white/10 bg-white/[0.04] p-8 opacity-40 backdrop-blur-sm">
                                <span className="text-xl font-bold text-white">GPA 2.5</span>
                                <div className="h-px flex-1 bg-white/10 mx-6"></div>
                                <span className="text-3xl font-bold text-white">$7/hour</span>
                            </div>
                            <p className="text-white/40 mt-6 font-medium">When effort affects earnings, motivation changes.</p>
                        </div>
                    </section>

                    {/* PRICING SECTION */}
                    <section className="w-full mb-32">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-white mb-12">Simple. Transparent. Powerful.</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] mx-auto">
                            {/* Pro Plan */}
                            <div className="relative p-10 rounded-[40px] glass-dark border-2 border-primary-500/50 shadow-[0_24px_48px_rgba(244,63,94,0.15)] shadow-primary-500/15 text-left">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary-600 px-6 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white">
                                    Most Popular
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">HomeWork Pro</h3>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold text-white">$17</span>
                                    <span className="text-white/40">/ month</span>
                                </div>
                                <p className="text-sm text-white/30 mb-8">or $149 / year (Save $55)</p>
                                <ul className="space-y-4 mb-10">
                                    {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-white/70">
                                            <CheckCircle2 className="w-4 h-4 text-primary-500" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="block w-full h-14 rounded-full bg-primary-600 text-white font-bold text-center leading-[56px] hover:bg-primary-500 transition-colors">Start Free Trial</Link>
                            </div>

                            {/* Founders Plan */}
                            <div className="p-10 rounded-[40px] bg-white/[0.01] border border-white/10 text-left">
                                <h3 className="text-2xl font-bold text-white mb-2">Founders Plan</h3>
                                <p className="text-primary-400 text-xs font-bold uppercase tracking-wider mb-4">Limited to First 100 Families</p>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-5xl font-bold text-white">$129</span>
                                    <span className="text-white/40">/ year</span>
                                </div>
                                <p className="text-sm text-white/30 mb-8">Locked-in pricing for life.</p>
                                <ul className="space-y-4 mb-10">
                                    {['Unlimited children', 'Grade-based hourly engine', 'Earnings dashboard', 'Weekly planning system', 'Two-parent access'].map((f) => (
                                        <li key={f} className="flex items-center gap-3 text-sm text-white/40">
                                            <CheckCircle2 className="w-4 h-4 opacity-20" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="block w-full h-14 rounded-full bg-white/5 border border-white/10 text-white font-bold text-center leading-[56px] hover:bg-white/10 transition-colors">Claim Founder Spot</Link>
                            </div>
                        </div>
                    </section>

                    {/* VALUE ANCHOR */}
                    <section className="w-full mb-32 p-12 rounded-[40px] bg-white/[0.02] border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-10">Less Than One Tutoring Session Per Month</h2>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Travel Sports', value: '$300+/mo' },
                                { label: 'Tutoring', value: '$200+/mo' },
                                { label: 'Video Games', value: '$60' },
                                { label: 'HomeWork', value: '$17/mo', active: true }
                            ].map((item) => (
                                <div key={item.label} className={`p-6 rounded-2xl border ${item.active ? 'border-primary-500/50 bg-primary-500/5 shadow-lg' : 'border-white/5 bg-white/[0.02]'}`}>
                                    <div className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-1">{item.label}</div>
                                    <div className={`text-xl font-bold ${item.active ? 'text-primary-400' : 'text-white/80'}`}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FAQS */}
                    <section className="max-w-[700px] w-full mb-32 text-left">
                        <h2 className="text-[32px] sm:text-[40px] font-bold text-white mb-12 text-center">Common Questions</h2>
                        <div className="space-y-8">
                            {faqs.map((faq) => (
                                <div key={faq.q} className="border-b border-white/10 pb-8">
                                    <h3 className="text-[18px] font-bold text-white/90 mb-3">{faq.q}</h3>
                                    <p className="text-[15px] leading-relaxed text-white/40">{faq.a}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* FINAL CTA */}
                    <section className="w-full mb-32 py-20 rounded-[48px] bg-gradient-to-b from-primary-600/10 to-transparent border border-white/5">
                        <h2 className="text-[40px] sm:text-[56px] font-bold text-white mb-10">Start Building Accountability<br />This Week.</h2>
                        <div className="flex flex-col items-center gap-6">
                            <Link to="/signup" className="h-16 px-12 rounded-full bg-primary-600 text-white text-lg font-bold flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-[0_20px_40px_rgba(244,63,94,0.3)] shadow-primary-500/30">
                                Start 14-Day Trial
                                <ArrowRight className="w-6 h-6" />
                            </Link>
                            <p className="text-white/30 font-medium">Cancel anytime.</p>
                        </div>
                    </section>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-10 pb-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <p className="text-[13px] font-medium text-white/30">
                        <span className="text-white/70">HomeWork.</span> Built for high-trust family systems.
                    </p>
                    <div className="flex items-center gap-8 text-[13px] font-bold">
                        <Link to="/login" className="text-white/40 hover:text-white transition-colors">Log In</Link>
                        <Link to="/signup" className="text-white/40 hover:text-white transition-colors">Sign Up</Link>
                        <div className="pl-4 border-l border-white/10">
                            <ThemeSwitch />
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
