import React from 'react';
import { ArrowRight, LucideIcon, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';
import { landingData } from '@/data/dashboard-landing';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, body }) => (
    <div className="flex flex-col p-6 rounded-card transition-all bg-white/[0.04] border border-white/10 dark:bg-white/[0.04] dark:border-white/10 light:bg-white light:border-secondary-100 hover:bg-white/[0.06] transition-colors shadow-card-soft">
        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-500/10 mb-4">
            <Icon className="w-5 h-5 text-primary-500" />
        </div>
        <h3 className="text-[18px] font-semibold text-white/90 dark:text-white/90 light:text-secondary-900 mb-2">{title}</h3>
        <p className="text-[14px] leading-relaxed text-white/60 dark:text-white/60 light:text-secondary-600">{body}</p>
    </div>
);

export default function DashboardLandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-[#070a0f] dark:bg-[#070a0f] light:bg-secondary-50 font-sans transition-colors duration-300">
            {/* Background Overlays */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] opacity-20 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.3),transparent_70%)]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] opacity-10 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.2),transparent_70%)]" />
            </div>

            <div className="relative z-10 mx-auto max-w-[1440px] px-6 sm:px-10 lg:px-16 py-8 flex flex-col min-h-screen">
                {/* Header */}
                <header className="flex items-center justify-between mb-20 sm:mb-24">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-500/10 border border-primary-500/20">
                            <span className="text-[14px] font-bold text-primary-500">{landingData.header.logo}</span>
                        </div>
                        <span className="text-[20px] font-heading font-bold text-white dark:text-white light:text-secondary-900">
                            {landingData.header.brand}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link to="/login" className="px-6 py-2.5 rounded-full border border-white/10 dark:border-white/10 light:border-secondary-200 text-white/80 dark:text-white/80 light:text-secondary-700 font-medium hover:bg-white/5 transition-colors">
                            {landingData.header.loginLabel}
                        </Link>
                        <Link to="/signup" className="px-6 py-2.5 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition-colors shadow-btn-primary">
                            {landingData.header.signupLabel}
                        </Link>
                    </div>
                </header>

                <main className="flex-grow flex flex-col">
                    {/* Hero Section */}
                    <section className="flex flex-col lg:grid lg:grid-cols-2 lg:items-center gap-16 mb-24 lg:mb-32">
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold tracking-widest bg-white/[0.05] border border-white/10 text-white/50 dark:bg-white/[0.05] dark:border-white/10 dark:text-white/50 light:bg-secondary-900/[0.04] light:border-secondary-900/[0.08] light:text-secondary-700 uppercase">
                                <div className="w-2 h-2 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                {landingData.hero.badge}
                            </div>

                            <h1 className="mt-8 text-[48px] sm:text-[64px] lg:text-[80px] leading-[1.1] font-heading font-bold text-white dark:text-white light:text-secondary-900 tracking-tight">
                                {landingData.hero.title.split(' ').slice(0, 2).join(' ')}<br />
                                {landingData.hero.title.split(' ').slice(2).join(' ')}
                            </h1>

                            <p className="mt-8 text-[18px] sm:text-[20px] leading-relaxed text-white/60 dark:text-white/60 light:text-secondary-600 max-w-[540px]">
                                {landingData.hero.subtext}
                            </p>

                            <div className="mt-10 flex items-center gap-4">
                                <button className="h-14 px-8 rounded-full bg-primary-500 text-white text-[16px] font-bold flex items-center justify-center gap-2 transition-all hover:bg-primary-600 hover:scale-[1.02] active:scale-[0.98] shadow-btn-primary">
                                    {landingData.hero.primaryCTA}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <button className="h-14 px-8 rounded-full bg-white/[0.05] border border-white/10 text-white/80 dark:bg-white/[0.05] dark:border-white/10 dark:text-white/80 light:bg-secondary-900/[0.04] light:border-secondary-900/[0.10] light:text-secondary-800 text-[16px] font-bold transition-colors hover:bg-white/10">
                                    {landingData.hero.secondaryCTA}
                                </button>
                            </div>
                        </div>

                        {/* Hero Media Card */}
                        <div className="flex justify-center lg:justify-end">
                            <div className="w-full max-w-[480px] p-8 rounded-[32px] bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] transform -rotate-[5deg] lg:-rotate-[10deg] hover:rotate-0 transition-transform duration-700">
                                <div className="mb-8">
                                    <h4 className="text-[12px] font-bold tracking-widest text-primary-500 mb-6 uppercase">
                                        {landingData.heroMedia.title}
                                    </h4>
                                    <div className="space-y-4">
                                        {landingData.heroMedia.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.04] border border-white/5">
                                                <span className="text-white/90 font-medium">{item.label}</span>
                                                <CheckCircle2 className="w-6 h-6 text-primary-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Visual Accent */}
                                <div className="absolute -z-10 -bottom-10 -right-10 w-40 h-40 bg-primary-500/20 rounded-full blur-[80px]" />
                            </div>
                        </div>
                    </section>

                    {/* Features Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
                        {landingData.featureCards.map((card, idx) => (
                            <FeatureCard key={idx} icon={card.icon} title={card.title} body={card.body} />
                        ))}
                    </section>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-8 pb-4 border-t border-white/10 dark:border-white/10 light:border-secondary-900/10 flex flex-col sm:flex-row justify-between items-center gap-6 text-[14px]">
                    <p className="text-white/40 dark:text-white/40 light:text-secondary-900/40">{landingData.footer.leftText}</p>
                    <div className="flex items-center gap-6">
                        <ThemeSwitch />
                        <div className="flex items-center gap-6">
                            {landingData.footer.rightLinks.map((link, idx) => (
                                <Link key={idx} to={link.href} className="text-white/60 hover:text-white dark:text-white/60 dark:hover:text-white light:text-secondary-700 light:hover:text-secondary-900 transition-colors">
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
