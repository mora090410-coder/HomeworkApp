import React from 'react';
import { ArrowRight, LucideIcon, CheckCircle2, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';
import { landingData } from '@/data/dashboard-landing';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, body }) => (
    <div className="group flex flex-col p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_24px_48px_rgba(0,0,0,0.3)] transition-all duration-300 hover:bg-white/[0.06] hover:-translate-y-1">
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/[0.05] mb-6 shadow-inner border border-white/5">
            <Icon className="w-6 h-6 text-white/80" />
        </div>
        <h3 className="text-[20px] font-bold text-white/95 mb-3">{title}</h3>
        <p className="text-[15px] leading-relaxed text-white/50">{body}</p>
    </div>
);

export default function DashboardLandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0c10] dark:bg-[#0a0c10] font-sans selection:bg-primary-500/30">
            {/* Background Radial Glows */}
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[80%] h-[60%] opacity-20 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.35),transparent_70%)] blur-[100px]" />
                <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] opacity-15 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.25),transparent_70%)] blur-[100px]" />
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
                        <Link to="/signup" className="px-5 py-2 rounded-full bg-primary-500 text-white text-[14px] font-bold hover:bg-primary-600 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                            Sign Up
                        </Link>
                    </div>
                </header>

                <main className="flex flex-col items-center text-center">
                    {/* Centered Hero Content */}
                    <div className="flex flex-col items-center max-w-[800px] mb-20 px-4">
                        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 shadow-[0_0_15px_rgba(244,63,94,0.15)] mb-10">
                            <div className="relative flex items-center justify-center">
                                <Activity className="w-3.5 h-3.5 text-primary-500 z-10" />
                                <div className="absolute inset-0 bg-primary-500/50 blur-[6px] rounded-full scale-150 animate-pulse" />
                            </div>
                            <span className="text-[11px] font-bold tracking-[0.15em] text-white/40 uppercase">
                                {landingData.hero.badge}
                            </span>
                        </div>

                        <h1 className="text-[56px] sm:text-[72px] lg:text-[88px] leading-[1] font-bold text-white tracking-tight mb-8">
                            Build discipline<br />
                            without the chaos
                        </h1>

                        <p className="text-[16px] sm:text-[18px] leading-relaxed text-white/40 max-w-[620px] mb-16">
                            {landingData.hero.subtext}
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
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-[48px]" />
                                </div>
                            </div>
                        </div>

                        {/* CTA Buttons - Centered */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
                            <button className="relative group overflow-hidden h-14 px-10 rounded-full bg-gradient-to-b from-primary-600 to-primary-700 text-white text-[16px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.05] active:scale-[0.98] shadow-[0_10px_30px_rgba(244,63,94,0.4)]">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                Get Started
                                <ArrowRight className="w-5 h-5" />
                            </button>
                            <button className="h-14 px-10 rounded-full bg-white/[0.05] border border-white/10 text-white/80 text-[16px] font-bold hover:bg-white/10 transition-colors backdrop-blur-md">
                                I Have an Account
                            </button>
                        </div>
                    </div>

                    {/* Features Grid - 3 Columns Centered */}
                    <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-32">
                        {landingData.featureCards.map((card, idx) => (
                            <FeatureCard key={idx} icon={card.icon} title={card.title} body={card.body} />
                        ))}
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
