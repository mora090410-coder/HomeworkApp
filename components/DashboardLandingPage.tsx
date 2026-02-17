import React from 'react';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';
import { landingData } from '@/data/dashboard-landing';

interface FeatureCardProps {
    icon: LucideIcon;
    title: string;
    body: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, body }) => (
    <div className="flex flex-col p-3.5 rounded-card min-h-[92px] transition-all bg-white/[0.06] border border-white/10 dark:bg-white/[0.06] dark:border-white/10 light:bg-white light:border-secondary-100 hover:-translate-y-1 shadow-card-soft">
        <div className="w-7 h-7 flex items-center justify-center rounded-[10px] bg-white/[0.06] dark:bg-white/[0.06] light:bg-secondary-50">
            <Icon className="w-4 h-4 text-white/70 dark:text-white/70 light:text-secondary-600" />
        </div>
        <h3 className="mt-2.5 text-card-title text-white/90 dark:text-white/90 light:text-secondary-900">{title}</h3>
        <p className="mt-1.5 text-card-body text-white/65 dark:text-white/65 light:text-secondary-600">{body}</p>
    </div>
);

export default function DashboardLandingPage() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-gray-950 dark:bg-gray-950 light:bg-secondary-50 font-sans transition-colors duration-300">
            {/* Background Overlays */}
            <div className="pointer-events-none absolute inset-0 z-0">
                {/* Dark Mode Glows */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] opacity-20 dark:opacity-20 light:opacity-10 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.4),transparent_70%)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[600px] opacity-10 dark:opacity-10 light:opacity-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.2),transparent_70%)]" />
            </div>

            <div className="relative z-10 mx-auto max-w-[1280px] px-5 sm:px-6 lg:px-10 py-6 sm:py-8 lg:py-12 flex flex-col min-h-screen">
                {/* Header/Top Brand */}
                <header className="flex items-center justify-between mb-14 sm:mb-18">
                    <div className="flex items-center gap-2">
                        <div className="w-[22px] h-[22px] flex items-center justify-center rounded bg-gray-850 dark:bg-gray-850 light:bg-secondary-100">
                            <span className="text-[10px] font-bold text-white dark:text-white light:text-secondary-900">HW</span>
                        </div>
                        <span className="text-[16px] font-heading font-semibold text-white dark:text-white light:text-secondary-900">HomeWork</span>
                    </div>
                    <ThemeSwitch />
                </header>

                <main className="flex-grow flex flex-col">
                    {/* Hero Section */}
                    <section className="flex flex-col lg:grid lg:grid-cols-2 lg:items-center gap-10 lg:gap-16 mb-18 lg:mb-26">
                        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-section-label bg-white/[0.06] border border-white/10 text-white/75 dark:bg-white/[0.06] dark:border-white/10 dark:text-white/75 light:bg-secondary-900/[0.04] light:border-secondary-900/[0.08] light:text-secondary-700">
                                <div className="w-3 h-3 rounded-full flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
                                </div>
                                FAMILY ECONOMY SYSTEM
                            </div>

                            <h1 className="mt-4 sm:mt-6 text-hero-base sm:text-hero-sm md:text-hero-md lg:text-hero-lg max-w-[340px] sm:max-w-[520px] lg:max-w-[560px] text-white dark:text-white light:text-secondary-900">
                                Build discipline without the chaos
                            </h1>

                            {/* Mobile Hero Media (centered) */}
                            <div className="mt-8 mb-4 lg:hidden max-w-[320px] sm:max-w-[360px]">
                                <div className="relative transform -rotate-[15deg] perspective-[1000px] rotate-x-[10deg] rotate-y-[5deg] rounded-phoneMock border border-white/20 dark:border-white/20 bg-gray-900 shadow-hero-media overflow-hidden">
                                    <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800" alt="App Preview" className="w-full h-auto opacity-90" />
                                </div>
                            </div>

                            {/* CTAs */}
                            <div className="mt-6 flex flex-col gap-2.5 w-full max-w-[360px]">
                                <button className="h-11 rounded-full bg-primary-gradient text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-btn-primary border border-white/10">
                                    Get Started
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <button className="h-11 rounded-full bg-white/[0.06] border border-white/10 text-white/80 dark:bg-white/[0.06] dark:border-white/10 dark:text-white/80 light:bg-secondary-900/[0.04] light:border-secondary-900/[0.10] light:text-secondary-800 text-[14px] font-semibold transition-colors hover:bg-white/[0.1]">
                                    I Have an Account
                                </button>
                            </div>
                        </div>

                        {/* Desktop Hero Media (right column) */}
                        <div className="hidden lg:flex justify-end pr-4">
                            <div className="relative max-w-[420px] xl:max-w-[460px] transform -rotate-[18deg] perspective-[1000px] rotate-x-[12deg] rotate-y-[8deg] rounded-phoneMock border border-white/20 dark:border-white/20 bg-gray-900 shadow-hero-media overflow-hidden">
                                <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800" alt="App Preview" className="w-full h-auto opacity-90" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/10 to-transparent pointer-events-none" />
                            </div>
                        </div>
                    </section>

                    {/* Features Grid */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-12">
                        {landingData.featureCards.map((card, idx) => (
                            <FeatureCard key={idx} icon={card.icon} title={card.title} body={card.body} />
                        ))}
                    </section>
                </main>

                {/* Footer */}
                <footer className="mt-auto pt-4 pb-2 border-t border-white/10 dark:border-white/10 light:border-secondary-900/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-footer-sm">
                    <p className="text-white/55 dark:text-white/55 light:text-secondary-900/55">{landingData.footer.leftText}</p>
                    <div className="flex items-center gap-3">
                        {landingData.footer.rightLinks.map((link, idx) => (
                            <React.Fragment key={idx}>
                                {idx > 0 && <span className="text-white/20 dark:text-white/20 light:text-secondary-900/20 px-1">•</span>}
                                <Link to={link.href} className="text-white/70 hover:text-white dark:text-white/70 dark:hover:text-white light:text-secondary-700 light:hover:text-secondary-900 transition-colors">
                                    {link.label}
                                </Link>
                            </React.Fragment>
                        ))}
                    </div>
                </footer>
            </div>
        </div>
    );
}
